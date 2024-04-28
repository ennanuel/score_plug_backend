const { default: axios } = require("axios");
const { fetchHandler } = require("../../helpers/fetchHandler");
const { reduceToObjectWithIdAsKeys } = require("../../helpers/reduce");

const Match = require("../../models/Match");

const { changeMatchScoreFormat, getMatchMinutesPassed, getTimeRemainingForGameToStart } = require("../../utils/match");
const { getTimeForNextUpdateCall, updateMatchSchedule, checkIfServerIsUpdating } = require("../../utils/scheduler");
const { getFromToDates } = require("../../helpers/getDate");

const { io } = require("../../../app");

async function executeMatchUpdate() {
    let status;
    let updatedMatchIds = [];

    try {
        const serverIsUpdating = checkIfServerIsUpdating();
        if (serverIsUpdating) throw new Error("Daily Server Update is running");

        const { matches } = await fetchHandler(`${process.env.FOOTBALL_API_URL}/matches`);
        const matchIds = matches.map(match => match.id);
        const matchesObjectWithIdAsKey = matches.reduce(reduceToObjectWithIdAsKeys, {});
        const matchesInDB = await Match.find({ _id: { $in: matchIds } });
        const matchesToSave = [];

        for (const match of matchesInDB) {
            const matchWithUpdatedValue = matchesObjectWithIdAsKey[match._id];
            const matchScore = changeMatchScoreFormat(matchWithUpdatedValue.score);

            if (matchWithUpdatedValue.status === match._doc.status && (match._doc.score.fullTime.home === matchScore.fullTime.home && match._doc.score.fullTime.away === matchScore.fullTime.away)) continue;

            match.status = matchWithUpdatedValue.status;
            match.score = matchScore;
            match.lastUpdated = matchWithUpdatedValue.lastUpdated;
            matchesToSave.push(match.save());
        };

        const matchesToUpdate = await Promise.all(matchesToSave);
        updatedMatchIds = matchesToUpdate.map(match => match._id);

        console.log("%s Matches Updated!", updatedMatchIds.length);

        status = 'SUCCESS';
    } catch (error) {
        console.error(error.message);
        status = 'FAILED';
    } finally {
        updateMatchSchedule(status);

        const { startDate, endDate } = getFromToDates();
        const fetchedMatches = await Match
            .find(
                { 
                    $and: [
                        { utcDate: { $lte: endDate } },
                        { utcDate: { $gt: startDate } }
                    ]
                },
                '_id homeTeam awayTeam score status utcDate competition'
            )
            .lean();
        
        const matches = fetchedMatches.reduce((matchesObject, match) => ({
            ...matchesObject,
            [match._id]: {
                score: match.score,
                status: match.status,
                wasUpdated: updatedMatchIds.includes(match._id),
                minute: getMatchMinutesPassed(match),
                timeRemaining: getTimeRemainingForGameToStart(match)
            }
        }), {});
        
        const competitions = fetchedMatches.filter(match => updatedMatchIds.includes(match._id) && /in_play|paused/i.test(match.status)).map(match => match.competition);
        const teams = fetchedMatches.filter(match => updatedMatchIds.includes(match._id) && /in_play|paused/.test(match.status)).reduce((teamIds, match) => [...teamIds, match.homeTeam, match.awayTeam], []);
        
        io.emit('match-update', { matches, teams, competitions });
    }
}

function updateMatches(req, res) {
    try {
        executeMatchUpdate();

        const nextUpdateCallTime = getTimeForNextUpdateCall();

        return res.status(200).json({ message: `Match update started`, nextCall: nextUpdateCallTime });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = updateMatches;