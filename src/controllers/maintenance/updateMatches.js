const { fetchHandler } = require("../../helpers/fetchHandler");
const { reduceToObjectWithIdAsKeys } = require("../../helpers/reduce");

const Match = require("../../models/Match");

const { changeMatchScoreFormat, getMatchMinutesPassed, getTimeRemainingForGameToStart } = require("../../utils/match");
const { getTimeForNextUpdateCall, updateMatchSchedule, checkIfServerIsUpdating } = require("../../utils/scheduler");
const { getFromToDates } = require("../../helpers/getDate");

const { io } = require("../../../app");

// const MOCK_MATCHES = [
//         {
//             "area": {
//                 "id": 2072,
//                 "name": "England",
//                 "code": "ENG",
//                 "flag": "https://crests.football-data.org/770.svg"
//             },
//             "competition": {
//                 "id": 2021,
//                 "name": "Premier League",
//                 "code": "PL",
//                 "type": "LEAGUE",
//                 "emblem": "https://crests.football-data.org/PL.png"
//             },
//             "season": {
//                 "id": 2287,
//                 "startDate": "2024-08-16",
//                 "endDate": "2025-05-25",
//                 "currentMatchday": 37,
//                 "winner": null
//             },
//             "id": 497773,
//             "utcDate": "2025-05-19T19:00:00Z",
//             "status": "Happy Birthday!",
//             "matchday": 37,
//             "stage": "REGULAR_SEASON",
//             "group": null,
//             "lastUpdated": "2025-05-21T00:20:47Z",
//             "homeTeam": {
//                 "id": 397,
//                 "name": "Brighton & Hove Albion FC",
//                 "shortName": "Brighton Hove",
//                 "tla": "BHA",
//                 "crest": "https://crests.football-data.org/397.png"
//             },
//             "awayTeam": {
//                 "id": 64,
//                 "name": "Liverpool FC",
//                 "shortName": "Liverpool",
//                 "tla": "LIV",
//                 "crest": "https://crests.football-data.org/64.png"
//             },
//             "score": {
//                 "winner": "HOME_TEAM",
//                 "duration": "REGULAR",
//                 "fullTime": {
//                     "home": 3,
//                     "away": 2
//                 },
//                 "halfTime": {
//                     "home": 0,
//                     "away": 0
//                 }
//             },
//             "odds": {
//                 "msg": "Activate Odds-Package in User-Panel to retrieve odds."
//             },
//             "referees": [
//                 {
//                     "id": 11327,
//                     "name": "John Brooks",
//                     "type": "REFEREE",
//                     "nationality": "England"
//                 },
//                 {
//                     "id": 11423,
//                     "name": "Andy Madley",
//                     "type": "REFEREE",
//                     "nationality": "England"
//                 }
//             ]
//         }
//     ];

async function executeMatchUpdate() {
    let status;
    let updatedMatchIds = [];
    let updatedMatchScores = [];

    try {
        const serverIsUpdating = checkIfServerIsUpdating();
        if (serverIsUpdating) throw new Error("Daily Server Update is running");

        const { matches } = await fetchHandler(`${process.env.FOOTBALL_API_URL}/matches?dateFrom=2025-05-19&dateTo=2025-05-20`);
        // const matches = MOCK_MATCHES;
        console.log(matches);

        const matchIds = matches.map(match => match.id);
        const matchesObjectWithIdAsKey = matches.reduce(reduceToObjectWithIdAsKeys, {});
        const matchesInDB = await Match.find({ _id: { $in: matchIds } }).lean();
        const matchesToSave = [];

        for (const match of matchesInDB) {
            const matchWithUpdatedValue = matchesObjectWithIdAsKey[match._id];
            const formattedMatchScore = changeMatchScoreFormat(matchWithUpdatedValue.score);
            const matchStatusHasChange = matchWithUpdatedValue.status !== match.status;
            const matchScoreHasChange = match.score.fullTime.home !== formattedMatchScore.fullTime.home || match.score.fullTime.away !== formattedMatchScore.fullTime.away;

            if (!matchStatusHasChange && !matchScoreHasChange) continue;
            
            if (matchScoreHasChange) updatedMatchScores.push(match._id);
                
            const updatedMatchValue = {
                score: formattedMatchScore,
                status: matchWithUpdatedValue.status,
                lastUpdated: matchWithUpdatedValue.lastUpdated
            };

            matchesToSave.push(Match.findByIdAndUpdate(match._id, { $set: updatedMatchValue }));
            updatedMatchIds.push(match._id);
        };

        await Promise.all(matchesToSave);

        console.log(`${updatedMatchIds.length} Match${updatedMatchIds.length === 1 ? '' : 'es'} Updated!`);

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
                        { utcDate: { $gt: startDate } },
                        { status: { $ne: "TIMED" } }
                    ]
                },
                '_id homeTeam awayTeam score status utcDate competition'
            )
            .lean();
        
        const matches = fetchedMatches.reduce((matchesObject, match) => ({
            ...matchesObject,
            [match._id]: {
                score: {
                    fullTime: match.score.fullTime
                },
                status: match.status,
                wasUpdated: updatedMatchIds.includes(match._id),
                scoreWasUpdated: updatedMatchScores.includes(match._id),
                minute: getMatchMinutesPassed(match),
                timeRemaining: getTimeRemainingForGameToStart(match)
            }
        }), {});
        
        const competitions = fetchedMatches
            .filter(match => updatedMatchIds.includes(match._id) && /in_play|paused/i.test(match.status))
            .map(match => match.competition);
        const teams = fetchedMatches
            .filter(match => updatedMatchIds.includes(match._id) && /in_play|paused/.test(match.status)).
            reduce((teamIds, match) => [...teamIds, match.homeTeam, match.awayTeam], []);
        
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