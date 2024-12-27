const Match = require('../../../models/Match');
const H2H = require('../../../models/H2H');
const Team = require('../../../models/Team');
const { reduceToObjectWithIdAsKey, reduceToH2HDetails, reduceToMatchDetails, reduceToArrayOfMatchIds } = require('../../../helpers/reduce');
const { getDateFrom } = require("../../../helpers/getDate");
const { expandMatchTeamsAndCompetition, getMatchHead2HeadAndPreviousMatches, getMatchPrediction } = require('../../../utils/match');
const { prepareForBulkWrite } = require('../../../helpers/mongoose');
        
const assignMainAndOtherTeam = (homeTeamId, teamId) => homeTeamId === teamId ? { main: 'home', other: 'away' } : { main: 'away', other: 'home' };

const deleteRedundantMatches = () => new Promise(
    async function (resolve, reject) { 
        try {
            const mainMatchesUpdated = await checkAndUpdateMainMatches();
            await deleteIrrelevantPreviousMatches();
            await handleOutdatedHead2Head(mainMatchesUpdated);

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

async function deleteIrrelevantPreviousMatches() {
    const teams = await Team.find({}, "_id").lean();
    const h2hs = await H2H.find({}, "matches").lean();
    const arrayOfPreviousMatchIdsMatchIds = await Promise.all(teams.map(getTeamPreviousMatchIds));
    const arrayOfH2HMatchIds = await Promise.all(h2hs.map(getH2HMatchIds));

    const totalArrayOfMatchIds = [...arrayOfH2HMatchIds, ...arrayOfPreviousMatchIdsMatchIds];
    const matchesWithTheirPositionForEachTeam = totalArrayOfMatchIds.reduce(reduceToObjectWithIdAsKey, {});

    for (let [matchId, matchPositions] of Object.entries(matchesWithTheirPositionForEachTeam)) {
        if (matchPositions.some(position => position < 4)) continue;
        await Match.findByIdAndDelete(matchId);
    }
};

async function handleOutdatedHead2Head(matches) {
    for(let match of matches) {
        const otherMatchesWithSameHead2Head = await Match.countDocuments({ head2head: match.head2head });

        if(otherMatchesWithSameHead2Head) continue;
        const head2headToDelete = await H2H.findById(match.head2head);
        const matchesIdsInH2HThatAreStillPrevMatches = await Match
            .find({ _id: { $in: head2headToDelete.matches }, isPrevMatch: true }, '_id')
            .lean()
            .map(({ _id }) => _id);

        const matchesToDelete = head2headToDelete.matches.filter((matchId) => !matchesIdsInH2HThatAreStillPrevMatches.includes(matchId));

        await head2headToDelete.remove();
        await Match.deleteMany({ _id: { $in: [matchesToDelete] }});
        await Match.updateMany({ _id: { $in: [match._id, ...matchesIdsInH2HThatAreStillPrevMatches] } }, { isHead2Head: false, head2head: null });
    }
}

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
}

async function getH2HMatchIds (h2h) {
    const h2hMatches = await Match.find(
        {
            head2head: h2h._id,
            isHead2Head: true
        }
    ).sort({ utcDate: -1 }).lean();

    const h2hMatchesIds = h2hMatches.map(match => match._id);
    return h2hMatchesIds;
}

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
            const { numberOfMatches, firstHalf, fullTime } = matches.reduce(reduceToH2HDetails, initialValues);

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