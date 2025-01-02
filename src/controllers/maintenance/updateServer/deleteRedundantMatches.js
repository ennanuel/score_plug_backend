const Match = require('../../../models/Match');
const H2H = require('../../../models/H2H');
const Team = require('../../../models/Team');
const { reduceToObjectWithIdAsKey, reduceToH2HDetails, reduceToMatchDetails } = require('../../../helpers/reduce');
const { getDateFrom } = require("../../../helpers/getDate");
const { expandMatchTeamsAndCompetition, getMatchHead2HeadAndPreviousMatches, getMatchPrediction, rearrangeMatchScore } = require('../../../utils/match');
const { prepareForBulkWrite } = require('../../../helpers/mongoose');
        
const assignMainAndOtherTeam = (homeTeamId, teamId) => homeTeamId === teamId ? { main: 'home', other: 'away' } : { main: 'away', other: 'home' };

const deleteRedundantMatches = () => new Promise(
    async function (resolve, reject) { 
        try {
            await handleIrrelevantMatches();
            await handleOutdatedHead2Head();

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

async function checkAndUpdateMainMatches() {
    const expiredMatches = await getExpiredMatches();
    const updatedExpiredMatches = Promise.all(expiredMatches.map(updateExpiredMatches));
    await updatedExpiredMatches;
    return expiredMatches;
};

async function handleIrrelevantMatches() {
    await handleExpiredH2HMatches();
    await handleExpiredPreviousMatches();
};

async function handleOutdatedHead2Head(matches) {
    const outdatedMatches = await checkAndUpdateMainMatches();

    for(let match of outdatedMatches) {
        const otherMatchesWithSameHead2Head = await Match.countDocuments({ head2head: match.head2head });

        if(otherMatchesWithSameHead2Head) continue;
        const head2headToDelete = await H2H.findById(match.head2head);
        const matchesIdsInH2HThatAreStillPrevMatches = await Match
            .find({ _id: { $in: head2headToDelete.matches }, isPrevMatch: true }, '_id')
            .lean()
            .map(({ _id }) => _id);

        const matchesToDelete = head2headToDelete.matches.filter((matchId) => !matchesIdsInH2HThatAreStillPrevMatches.includes(matchId));

        await head2headToDelete.remove();
        await Match.updateMany({ _id: { $in: [match._id, ...matchesIdsInH2HThatAreStillPrevMatches] } }, { isHead2Head: false, head2head: null });
        await Match.deleteMany({ $or: [{ _id: { $in: matchesToDelete } }, { isPrevMatch: false, isHead2Head: true }] });
    }
};

async function handleExpiredPreviousMatches() {
    const teams = await Team.find({}, "_id").lean();
    const arrayOfPreviousMatchIds = await Promise.all(teams.map(getTeamPreviousMatchIds));

    const matchesWithTheirPositionForEachTeam = arrayOfPreviousMatchIds.reduce(reduceToObjectWithIdAsKey, {});

    for (let [matchId, matchPositions] of Object.entries(matchesWithTheirPositionForEachTeam)) {
        if (matchPositions.some(position => position < 4)) continue;
        await Match.findByIdAndUpdate(matchId, { isPrevMatch: false });
    }
};

async function handleExpiredH2HMatches() {
    const h2hs = await H2H.find({}, 'matches');

    for(let h2h of h2hs) {
        const matches = await Match
            .find({ _id: { $in: h2h.matches } })
            .sort({ utcDate: -1 });
        
        await Match.updateMany({ _id: { $in: matches.slice(5, ) } }, { $set: { isHead2Head: false } });
        await Match.updateMany({ _id: { $in: matches.slice(0, 5) } }, { $set: { isHead2Head: true } });
    }
};

async function getTeamPreviousMatchIds (team) {
    const teamPrevMatches = await Match.find(
        {
            isPrevMatch: true,
            $or: [
                { awayTeam: team._id },
                { homeTeam: team._id }
            ]
        }
    ).sort({ utcDate: -1 }).lean();

    const prevMatchesIds = teamPrevMatches.map(match => match._id);
    return prevMatchesIds;
};

const updateExpiredMatches = (match) => {
    match.isMain = false;
    return match.save();
}

const getExpiredMatches = () => Match.find({ 
    isMain: true,
    utcDate: { 
        $lt: getDateFrom() 
    } 
}).lean();

async function updateTeamPreviousMatches() {
    const teams = await Team.find().lean();
    const matchesToUpdate = [];

    for (const team of teams) {
        const matches = await Match.find({
            $or: [{ homeTeam: team._id }, { awayTeam: team._id }],
            status: 'FINISHED'
        }).lean();

        const teamMatches = matches.map(match => ({ ...match, teams: assignMainAndOtherTeam(match.homeTeam, team._id) }));
        const initialValues = {
            matchesPlayed: 0,
            firstHalf: { wins: 0, draws: 0, losses: 0, goalsScored: 0, goalsConceded: 0 },
            fullTime: { wins: 0, draws: 0, losses: 0, goalsScored: 0, goalsConceded: 0 }
        };

        const { matchesPlayed, firstHalf, fullTime } = teamMatches.reduce(reduceToMatchDetails, initialValues);
        const updatedTeam = { ...team, matchesPlayed, halfTime: firstHalf, fullTime };

        const matchIds = matches.map(match => match._id);
        matchesToUpdate.push(...matchIds);

        await Team.findByIdAndUpdate(team._id, { $set: updatedTeam });
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
                    { homeTeam: headToHead.aggregates.homeTeam, awayTeam: headToHead.aggregates.awayTeam },
                    { awayTeam: headToHead.aggregates.homeTeam, homeTeam: headToHead.aggregates.awayTeam }
                ],
                status: 'FINISHED'
            }).lean();

            const initialValues = {
                numberOfMatches: 0,
                firstHalf: {
                    homeTeam: { id: headToHead.aggregates.homeTeam, wins: 0, draws: 0, losses: 0, totalGoals: 0 },
                    awayTeam: { id: headToHead.aggregates.awayTeam, wins: 0, draws: 0, losses: 0, totalGoals: 0 }
                },
                fullTime: {
                    homeTeam: { id: headToHead.aggregates.homeTeam, wins: 0, draws: 0, losses: 0, totalGoals: 0 },
                    awayTeam: { id: headToHead.aggregates.awayTeam, wins: 0, draws: 0, losses: 0, totalGoals: 0 }
                }
            };
            const { numberOfMatches, firstHalf, fullTime } = matches
                .map(match => rearrangeMatchScore(match, headToHead.aggregates))
                .reduce(reduceToH2HDetails, initialValues);

            headToHead.aggregates.numberOfMatches = numberOfMatches;
            headToHead.aggregates.halfTime = firstHalf;
            headToHead.aggregates.fullTime = fullTime;

            const matchIds = matches.map(match => match._id);
            matchesToUpdate.push(...matchIds);

            headToHead.matches = matchIds;
            await H2H.findByIdAndUpdate(headToHead._id, { $set: headToHead });
        } else {
            await H2H.findByIdAndDelete(headToHead._id);
            await Match.updateMany({ head2head: headToHead._id }, { $set: { head2head: null } });
        }
    }

    return Match.updateMany({ _id: { $in: matchesToUpdate } }, { $set: { isHead2Head: true }});
};


const updateMatchesOutcomes = () => new Promise(
    async function (resolve, reject) {
        try {
            const matches = await Match.find({
                isMain: true,
                head2head: { $ne: null },
                homeTeam: { $ne: null },
                awayTeam: { $ne: null },
                $or: [
                    { predictions: null },
                    { predictions: undefined }
                ]
            }).lean();

            const matchesToExpand = matches.map(expandMatchTeamsAndCompetition);
            const expandedMatches = await Promise.all(matchesToExpand);

            const matchesToGetH2HandPrevMatches = expandedMatches.map(getMatchHead2HeadAndPreviousMatches);
            const matchesWithH2HandPrevMatches = await Promise.all(matchesToGetH2HandPrevMatches);

            const matchesWithOutcome = matchesWithH2HandPrevMatches.map(getMatchPrediction);
            const preparedMatches = matchesWithOutcome.map(prepareForBulkWrite);
            await Match.bulkWrite(preparedMatches);
            resolve();
        } catch (error) {
            reject(error);
        }
    }
)

module.exports = deleteRedundantMatches;