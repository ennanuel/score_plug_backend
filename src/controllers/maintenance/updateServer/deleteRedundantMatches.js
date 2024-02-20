const Match = require('../../../models/Match');
const H2H = require('../../../models/H2H');
const Team = require('../../../models/Team');
const { reduceToObjectWithIdAsKey, reduceToH2HDetails, reduceToMatchDetails, reduceToArrayOfMatchIds } = require('../../../helpers/reduce');
const { getDateFrom } = require("../../../helpers/getDate");
const { expandMatchTeamsAndCompetition, getMatchHead2HeadAndPreviousMatches, getMatchOutcome } = require('../../../utils/match');
const { prepareForBulkWrite } = require('../../../helpers/mongoose');
        
const assignMainAndOtherTeam = (homeTeamId, teamId) => homeTeamId === teamId ? { main: 'home', other: 'away' } : { main: 'away', other: 'home' };

const deleteRedundantMatches = () => new Promise(
    async function (resolve, reject) { 
        try {
            await deleteIrrelevantH2HMatches();
            await deleteIrrelevantPreviousMatches();
            await checkUpdateAndDeleteMatchesAndH2H();

            console.warn("Updating Head to Heads");
            await updateHeadToHeadMatches();

            console.warn("Updating Team previous matches");
            await updateTeamPreviousMatches();

            console.warn("Calculating match outcomes...");
            await updateMatchesOutcomes();
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

async function checkUpdateAndDeleteMatchesAndH2H() {
    const expiredMatches = await getExpiredMatches();
    const { teamMatchIds, h2hMatchIds } = await getAllH2HAndPreviousMatchIds(expiredMatches);
    const irrelevantMatches = await checkIrrelevantMatches({ teamMatchIds, h2hMatchIds, matches: expiredMatches });
    const matchesToDelete = Promise.all(irrelevantMatches.map(deleteH2HAndMatches));
    return matchesToDelete;
};

const getExpiredMatches = () => Match.find({ isMain: true, utcDate: { $lt: getDateFrom() } }).lean();

async function getAllH2HAndPreviousMatchIds(matches) {
    const teamIds = matches.reduce((homeAndAwayTeamIds, { homeTeam, awayTeam }) => [...homeAndAwayTeamIds, homeTeam, awayTeam], []);
    const h2hMatches = await Match.find({
        $and: [
            { isHead2Head: true },
            { homeTeam: { $not: { $in: teamIds } } },
            { awayTeam: { $not: { $in: teamIds } } }
        ]
    }).lean();
    const teamMatches = await Match.find({
        $and: [
            { isPrevMatch: true },
            { homeTeam: { $not: { $in: teamIds } } },
            { awayTeam: { $not: { $in: teamIds } } }
        ]
    }).lean();
    const teamMatchIds = teamMatches.map(({ _id }) => _id);
    const h2hMatchIds = h2hMatches.map(({ _id}) => _id);
    return { teamMatchIds, h2hMatchIds };
};

async function checkIrrelevantMatches({ teamMatchIds, h2hMatchIds, matches }) {
    let irrelevantMatches = [];
    for (let match of matches) {
        const matchId = match._id;
        const isATeamMatch = teamMatchIds.includes(matchId);
        const isAH2HMatch = h2hMatchIds.includes(matchId);
        if (isATeamMatch || isAH2HMatch) continue;
        else irrelevantMatches.push(match);
    }
    return irrelevantMatches;
};

async function deleteH2HAndMatches(irrelevantMatch) {
    const h2h = await Match.findOne({ _id: { $ne: irrelevantMatch._id }, h2h: irrelevantMatch.h2h, isMain: true });
    if (!h2h) return;
    await H2H.deleteMany({ _id: irrelevantMatch.h2h });
};

async function deleteIrrelevantH2HMatches() {
    const h2hs = await H2H.find().lean();

    const h2hMatchIds = h2hs.reduce(reduceToArrayOfMatchIds, []);

    return Match.deleteMany({
        _id: { $not: { $in: h2hMatchIds } },
        isPrevMatch: { $ne: true },
        isHead2Head: true
    });
};

async function updateTeamPreviousMatches() {
    const teams = await Team.find();
    const matchesToUpdate = [];
    for (let team of teams) {
        const matches = await Match.find({
            $or: [{ homeTeam: team._doc._id }, { awayTeam: team._doc._id }],
            status: 'FINISHED'
        }).lean();

        const teamMatches = matches.map(match => ({ ...match, teams: assignMainAndOtherTeam(match.homeTeam, team._doc._id) }));
        const { matchesPlayed, wins, draws, losses } = teamMatches.reduce(reduceToMatchDetails, { matchesPlayed: 0, wins: 0, draws: 0, losses: 0 });

        team.matchesPlayed = matchesPlayed;
        team.wins = wins;
        team.draws = draws;
        team.losses = losses;

        const matchIds = matches.map(match => match._id);
        matchesToUpdate.push(...matchIds);
        await team.save();
    };

    return Match.updateMany({ _id: { $in: matchesToUpdate } }, { $set: { isPrevMatch: true } });
};

async function updateHeadToHeadMatches() {
    const matchesToUpdate = [];
    const headToHeads = await H2H.find().lean();

    for (const headToHead of headToHeads) {
        if (headToHead.aggregates) {
            const matches = await Match.find({
                $or: [
                    { homeTeam: headToHead.aggregates.homeTeam.id, awayTeam: headToHead.aggregates.awayTeam.id },
                    { awayTeam: headToHead.aggregates.homeTeam.id, homeTeam: headToHead.aggregates.awayTeam.id }
                ],
                status: 'FINISHED'
            }).lean();

            const initialValues = { numberOfMatches: 0, totalGoals: 0, homeTeam: 0, awayTeam: 0 };
            const { numberOfMatches, totalGoals, homeTeam, awayTeam } = matches.reduce(reduceToH2HDetails, initialValues);

            headToHead.numberOfMatches = numberOfMatches;
            headToHead.totalGoals = totalGoals;
            headToHead.homeTeam = homeTeam;
            headToHead.awayTeam = awayTeam;

            const matchIds = matches.map(match => match._id);
            matchesToUpdate.push(...matchIds);

            await H2H.findByIdAndUpdate(headToHead._id, { $set: { matches: matchIds } });
        } else {
            await H2H.findByIdAndDelete(headToHead._id);
            await Match.updateMany({ head2head: headToHead._id }, { head2head: null });
        }
    }

    return Match.updateMany({ _id: { $in: matchesToUpdate } }, { $set: { isHead2Head: true }});
};

async function deleteIrrelevantPreviousMatches() {
    const teams = await Team.find({}, { _id: 1 }).lean();
    const matchIdsInArray = await Promise.all(teams.map(getTeamMatches));

    const matchesWithTheirPositionForEachTeam = matchIdsInArray.reduce(reduceToObjectWithIdAsKey, {});

    for (let [matchId, matchPositions] of Object.entries(matchesWithTheirPositionForEachTeam)) {
        if (matchPositions.some(position => position < 4)) continue;
        await Match.deleteOne({ _id: matchId });
    }
};


const updateMatchesOutcomes = () => new Promise(
    async function (resolve, reject) {
        try {
            const matches = await Match.find({
                isMain: true,
                head2head: { $ne: null },
                homeTeam: { $ne: null },
                awayTeam: { $ne: null }
            }).lean();

            const matchesToExpand = matches.map(expandMatchTeamsAndCompetition);
            const expandedMatches = await Promise.all(matchesToExpand);

            const matchesToGetH2HandPrevMatches = expandedMatches.map(getMatchHead2HeadAndPreviousMatches);
            const matchesWithH2HandPrevMatches = await Promise.all(matchesToGetH2HandPrevMatches);

            const matchesWithOutcome = matchesWithH2HandPrevMatches.map(getMatchOutcome);
            const preparedMatches = matchesWithOutcome.map(prepareForBulkWrite);
            await Match.bulkWrite(preparedMatches);
            resolve();
        } catch (error) {
            reject(error);
        }
    }
)

async function getTeamMatches (team) {
    const teamPrevMatches = await Match.find(
        {
            isPrevMatch: true,
            isHead2Head: { $ne: true },
            $or: [
                { awayTeam: team._id },
                { homeTeam: team._id }
            ]
        }
    ).sort({ utcDate: -1 }).lean();

    const prevMatchesIds = teamPrevMatches.map(match => match._id);
    return prevMatchesIds;
}

module.exports = deleteRedundantMatches;