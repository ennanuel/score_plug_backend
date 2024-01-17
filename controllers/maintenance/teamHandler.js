const Match = require('../../models/Match')
const Team = require('../../models/Team');
const Player = require('../../models/Player');
const Competition = require('../../models/Competition');
const { fetchHandler, prepareForBulkWrite, delay } = require('../../utils/match');

const teamHandler = () => new Promise(
    async function (resolve, reject) {
        try {
            await handleTeamPreviousMatches();
            await deleteIrrelevantPlayers();
            await deleteIrrelevantTeams();
            await deleteIrrelevantPreviousMatches();
            resolve();
        } catch (error) {
            reject(error);
        }
    }
)

const handleTeamPreviousMatches = () => new Promise(
    async function (resolve, reject) {
        try {
            const competitions = await Competition.find().lean();
            for (let competition of competitions) {
                const matches = await getCompetitionMatches(competition);
                const matchesToSave = matches.map(prepareForBulkWrite);
                await Match.bulkWrite(matchesToSave);
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const sortByDate = (itemA, itemB) => (new Date(itemA.utcDate)).getTime() - (new Date(itemB.utcDate)).getTime();
const prepareMatchesForSave = ({ id, competition, homeTeam, awayTeam, ...match }) => ({ _id: id, competition: competition.id, homeTeam: homeTeam.id, awayTeam: awayTeam.id,  isPrevMatch: true, ...match });

const getCompetitionMatches = ({ name, _id, currentSeason, type }) => new Promise(
    async function (resolve, reject) {
        try {
            console.log('fetching %s previous matches', name)
            const result = [];
            const stageFilter = type === 'CUP' ? '&stage=GROUP_STAGE' : '';
            const { currentMatchday } = currentSeason;
            for (let i = 1; i <= currentMatchday && i <= 5; i++) {
                const matchDay = currentMatchday - i;
                if (matchDay <= 0) continue;
                const url = `${process.env.FOOTBALL_API_URL}/competitions/${_id}/matches?status=FINISHED&matchday=${matchDay}${stageFilter}&limit=50`;
                const matchesResult = await fetchHandler(url);
                const { matches } = matchesResult;
                result.push(...matches);
                await delay(10000);
            }
            const sortedResult = result.map(prepareMatchesForSave).sort(sortByDate);
            console.log('Gotten %s previous matches', name)
            resolve(sortedResult);
        } catch (error) {
            reject(error);
        }
    }
);

async function deleteIrrelevantTeams() { 
    const competitions = await Competition.find().lean();
    const competitionTeams = competitions.reduce((a, b) => [...a, ...b.teams], []);
    return Team.deleteMany({ _id: { $not: { $in: competitionTeams } } });
};

async function deleteIrrelevantPlayers() { 
    const teams = await Team.find().lean();
    const teamPlayers = teams.reduce((a, b) => [...a, ...b.squad], []);
    return Player.deleteMany({ _id: { $not: { $in: teamPlayers } } });
};

async function deleteIrrelevantPreviousMatches() {
    const teams = await Team.find({}, { _id: 1 }).lean();
    const matchIdsInArray = await Promise.all(teams.map(getTeamMatches));
    const matchesWithTheirPositionForEachTeam = matchIdsInArray.reduce(reduceToObjectWithIdAsKey, {});
    console.log(matchesWithTheirPositionForEachTeam);
    // for (let [matchId, matchPositions] of Object.entries(matchesWithTheirPositionForEachTeam)) {
    //     if (matchPositions.some(position => position < 4)) continue;
    //     await Match.delete({ _id: matchId });
    // }
}

function reduceToObjectWithIdAsKey(objectWithMatchIdsAsKeys, matchIds) {
    const result = { ...objectWithMatchIdsAsKeys };
    for (let i = 0; i < matchIds.length; i++) {
        const matchId = matchIds[i];
        if (result[matchId]) {
            result[matchId] = [...result[matchId], i];
        } else {
            result[matchId] = [i];
        }
    }
    return result;
}

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

module.exports = teamHandler;