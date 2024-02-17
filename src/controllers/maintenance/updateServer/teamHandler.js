const Match = require('../../../models/Match')
const Team = require('../../../models/Team');
const Player = require('../../../models/Player');
const Competition = require('../../../models/Competition');
const { fetchHandler, delay } = require('../../../helpers/fetchHandler');
const { prepareForBulkWrite, refineMatchValues } = require('../../../helpers/mongoose');
const { checkIfCompetitionHasEnded } = require('../../../helpers/getDate');

const teamHandler = () => new Promise(
    async function (resolve, reject) {
        try {
            await handleTeamPreviousMatches();
            await deleteIrrelevantPlayers();
            await deleteIrrelevantTeams();
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

async function checkIfPreviousMatchesAlreadyExist({ competitionId, currentSeason }) {
    const matches = await Match.find({ competition: competitionId, status: "FINISEHED", isPrevMatch: true }).lean();
    const competitionHasEnded = checkIfCompetitionHasEnded(currentSeason.endDate);
    const isValid = matches.length <= 0 || !competitionHasEnded;
    return isValid;
}

const getCompetitionMatches = ({ name, _id, currentSeason, type }) => new Promise(
    async function (resolve, reject) {
        try {
            const result = [];
            const shouldFetchCompetitionMatches = await checkIfPreviousMatchesAlreadyExist({ currentSeason, competitionId: _id });
            if (shouldFetchCompetitionMatches) {
                console.log('fetching %s previous matches', name);
                const { currentMatchday } = currentSeason;
                const getMatches = type === 'CUP' ?
                    fetchMatchesForCupCompetition({ competitionId: _id, limit: 50 }) :
                    fetchMatchesForNormalCompetition({ competitionId: _id, currentMatchday, limit: 50 });
                const matches = await getMatches;
                const sortedResult = matches
                    .map((match) => refineMatchValues({ ...match, isPrevMatch: true }))
                    .sort(sortByDate);
                result.push(...sortedResult);
                console.log('Gotten %s previous matches', name);
            }
            resolve(result);
        } catch (error) {
            reject(error);
        }
    }
);

const fetchMatchesForNormalCompetition = ({ competitionId, currentMatchday, limit }) => new Promise(
    async function (resolve, reject) {
        try {
            const result = []
            for (let i = 1; i <= currentMatchday && i <= 5; i++) {
                const matchDay = currentMatchday - i;
                if (matchDay <= 0) break;
                
                const matchesFromMatchDay = await Match.find({ matchday: matchDay, competition: competitionId }).lean();
                if (matchesFromMatchDay.length > 0) continue;

                const url = `${process.env.FOOTBALL_API_URL}/competitions/${competitionId}/matches?status=FINISHED&matchday=${matchDay}&limit=${limit}`;
                const matchResult = await fetchHandler(url);
                const { matches } = matchResult;
                result.push(...matches);

                await delay(10000);
            }
            resolve(result);
        } catch (error) {
            reject(error);
        }
    }
);

const fetchMatchesForCupCompetition = ({ competitionId, limit }) => new Promise(
    async function (resolve, reject) {
        try {
            const url = `${process.env.FOOTBALL_API_URL}/competitions/${competitionId}/matches?status=FINISHED&stage=GROUP_STAGE&limit=${limit}`;
            const matchResult = await fetchHandler(url);
            const { matches } = matchResult;
            await delay(10000);
            resolve(matches);
        } catch (error) {
            reject(error);
        }
    }
)

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

module.exports = teamHandler;