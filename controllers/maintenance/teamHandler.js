const Match = require('../../models/Match')
const Team = require('../../models/Team');
const Player = require('../../models/Player');
const Competition = require('../../models/Competition');
const { fetchHandler, prepareForBulkWrite, convertToTimeNumber } = require('../../utils/match');

const THREE_DAYS_IN_MS = 259200000;

const getDateFrom = () => (new Date('01/01/2023')).toLocaleDateString();
const getDateTo = () => (new Date((new Date()).getTime() + THREE_DAYS_IN_MS)).toLocaleDateString();
const getTodayDate = () => (new Date).toLocaleDateString();

function getDateFilters() {
    const [fromMonth, fromDay, fromYear] = getDateFrom().split('/');
    const [toMonth, toDay, toYear] = getDateTo().split('/');
    const dateFrom = `${fromYear}-${convertToTimeNumber(fromMonth)}-${convertToTimeNumber(fromDay)}`;
    const dateTo = `${toYear}-${convertToTimeNumber(toMonth)}-${convertToTimeNumber(toDay)}`;
    return { dateFrom, dateTo };
};

const teamHandler = () => new Promise(
    async function (resolve, reject) {
        try {
            await getAndUpdateTeams();
            await deleteIrrelevantTeams();
            await deleteIrrelevantPlayers();
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const getAndUpdateTeams = () => new Promise(
    async function (resolve, reject) {
        try {
            const todayDate = getTodayDate();
            const recentlyUpdatedMatches = await Match.find({ updatedAt: { $gte: todayDate } }, 'homeTeam awayTeam').lean();
            const matchTeamIds = recentlyUpdatedMatches.reduce(resolvematchesToJustIds, []);
            const teams = await Team.find({ $or: [{ _id: { $in: matchTeamIds } }, { updatedAt: { $gte: todayDate } }] }).lean();
            await updateTeams(teams);
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

function resolvematchesToJustIds(matchIds, match) {
    const filteredMatchIds = matchIds.filter(matchId => matchId !== match.homeTeam && matchId !== match.awayTeam);
    return [...filteredMatchIds, match.homeTeam, match.awayTeam]
}

const updateTeams = (teams) => new Promise(
    async function (resolve, reject) {
        try {
            for (let team of teams) {
                console.log('Updating Team: %s ...', team._id);
                const { wins, draws, losses, played, matches } = await getTeamMatchDetails(team._id);
                const savedMatchesIds = await saveTeamMatches(matches);
                const updateData = { wins, draws, losses, played, matches: savedMatchesIds };
                await Team.findByIdAndUpdate(team._id, { $set: updateData });
                await delay();
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const getTeamMatchDetails = (teamId) => new Promise(
    async function (resolve, reject) {
        try {
            const { dateFrom, dateTo } = getDateFilters();
            const url = `${process.env.FOOTBALL_API_URL}/teams/${teamId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
            const teamMatchesResult = await fetchHandler(url);
            console.log('matches fetched!');
            resolve(teamMatchesResult);
        } catch (error) {
            reject(error);
        }
    }
);

const saveTeamMatches = (matches) => new Promise(
    async function (resolve, reject) {
        try {
            const teamMatches = matches.map(refineMatch);
            const preparedMatches = teamMatches.map(prepareForBulkWrite);
            await Match.bulkWrite(preparedMatches);
            const matchesIds = preparedMatches.map(match => match._id);
            resolve(matchesIds);
        } catch (error) {
            reject(error);
        }
    }
);

async function deleteIrrelevantTeams() { 
    const competitions = await Competition.find().lean();
    const competitionTeams = competitions.reduce((a, b) => [...a, ...b.teams], []);
    return Team.findAndDelete({ _id: { $not: { $in: competitionTeams } } });
};

async function deleteIrrelevantPlayers() { 
    const teams = await Team.find().lean();
    const teamPlayers = teams.reduce((a, b) => [...a, ...b.squad], []);
    return Player.findAndDelete({ _id: { $not: { $in: teamPlayers } } });
};

const refineMatch = (match) => ({ ...match, _id: match.id, competition: match.competition.id, homeTeam: match.homeTeam.id, awayTeam: match.awayTeam.id });

module.exports = teamHandler;