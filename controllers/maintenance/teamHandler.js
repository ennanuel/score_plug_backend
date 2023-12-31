const axios = require('axios');
const Match = require('../../models/Match')
const Team = require('../../models/Team');
const Player = require('../../models/Player');
const Competition = require('../../models/Competition');
const { APICallsHandler, prepareForBulkWrite } = require('../../utils/match');

const { headers } = require('../../data');

const THREE_DAYS_IN_MS = 259200000;

const getDateFrom = () => (new Date('01/01/2022')).toLocaleDateString();
const getDateTo = () => (new Date((new Date()).getTime() + THREE_DAYS_IN_MS)).toLocaleDateString();

function getDateFilters() {
    const [fromMonth, fromDay, fromYear] = getDateFrom().split('/');
    const [toMonth, toDay, toYear] = getDateTo().split('/');
    const dateFrom = `${fromYear}-${fromMonth}-${fromDay}`;
    const dateTo = `${toYear}-${toMonth}-${toDay}`;
    return { dateFrom, dateTo };
};

const apiHandler = APICallsHandler(20000);

const teamHandler = () => new Promise(
    async function (resolve, reject) {
        try {
            const teams = await Team.find({ $expr: { $lte: [{ $size: '$squad' }, 0] } }, 'name _id').lean();
            if (teams.length < 1) resolve();
            const teamsToUpdate = await Promise.all(teams.map(updateTeams));
            await Promise.all(teamsToUpdate);
            await deleteIrrelevantTeams();
            await deleteIrrelevantPlayers();
            resolve();
        } catch (error) {
            console.error(error.message);
            reject(error);
        }
    }
);

const updateTeams = (team) => new Promise(
    async function (resolve, reject) {
        try {
            console.log('Updating Team: %s ...', team._id);
            const { teamDetails, teamMatchesDetails } = await getTeamDetails(team._id);
            const { squad, ...otherTeamDetails } = teamDetails;
            const { wins, draws, losses, played, matches } = teamMatchesDetails;
            const savedMatchesIds = await saveTeamMatches(matches);
            const savedPlayersIds = await saveTeamPlayers(squad);
            const updateData = { ...otherTeamDetails, wins, draws, losses, played, matches: savedMatchesIds, squad: savedPlayersIds };
            console.log('%s team prepared', teamDetails.name);
            resolve(Team.findByIdAndUpdate(team._id, { $set: updateData }));
        } catch (error) {
            reject(error);
        }
    }
);

const getTeamDetails = (teamId) => new Promise(
    async function (resolve, reject) {
        try {
            await apiHandler.start();
            const { dateFrom, dateTo } = getDateFilters();
            const teamDetailsResult = await axios.get(`${process.env.FOOTBALL_API_URL}/teams/${teamId}`, { headers });
            const teamMatchesResult = await axios.get(`${process.env.FOOTBALL_API_URL}/teams/${teamId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, { headers });
            apiHandler.restart();
            const result = { teamMatchesDetails: teamMatchesResult.data, teamDetails: teamDetailsResult.data };
            console.log(result.teamDetails.name);
            resolve(result);
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

const saveTeamPlayers = (players) => new Promise(
    async function (resolve, reject) {
        try {
            const teamPlayers = players.map(player => ({ ...player, _id: player.id }));
            const preparedPlayers = teamPlayers.map(prepareForBulkWrite);
            await Player.bulkWrite(preparedPlayers);
            const savedPlayersIds = preparedPlayers.map(player => player._id);
            resolve(savedPlayersIds);
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