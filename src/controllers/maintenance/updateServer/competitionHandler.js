const Competition = require('../../../models/Competition');
const Team = require('../../../models/Team');
const { fetchHandler, delay } = require('../../../helpers/fetchHandler');
const { prepareForBulkWrite } = require("../../../helpers/mongoose");
const Player = require('../../../models/Player');

const { getYesterdayDate } = require("../../../helpers/getDate");
const { COMPETITION_RANKINGS } = require('../../../constants');

const competitionHandler = () => new Promise(
    async function (resolve, reject) {
        try {
            const competitions = await getCompetitions();
            await updateCompetitionDetails(competitions);
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const changeCompetitionName = ({ name, code, ...competition }) => ({ ...competition, ...(COMPETITION_RANKINGS.find(comp => comp.code === code) || { name, code }) });

const getCompetitions = () => new Promise(
    async function (resolve, reject) {
        try {
            let competitions = await Competition.find();
            if (competitions.length <= 0) {
                const result = await fetchHandler(`${process.env.FOOTBALL_API_URL}/competitions`);
                const newCompetitions = result.competitions.map(comp => ({ ...comp, _id: comp.id, currentSeason: { ...comp.currentSeason, winner: comp.currentSeason.winner?.id } }));
                const competitionsWithNewName = newCompetitions.map(changeCompetitionName);
                competitions = await Competition.insertMany(competitionsWithNewName);
            };
            resolve(competitions);
        } catch (error) {
            reject(error);
        }
    }
);

const updateCompetitionDetails = (competitions) => new Promise(
    async function (resolve, reject) {
        try {
            const outdatedCompetitions = competitions.filter(filterCompWithUpToDateData);
            await prepareCompetitionForUpdate(outdatedCompetitions);
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const prepareCompetitionForUpdate = (competitions) => new Promise(
    async function (resolve, reject) {
        try {
            for (let competition of competitions) {
                const { name, emblem, currentSeason, lastUpdated } = await getCompetitionData(competition._doc.code);
                if (lastUpdated == competition._doc.lastUpdated) resolve(null);
                const standings = await getCompetitionStandings(competition._doc._id);
                const competitionWinnerId = currentSeason.winner?.id;
                const updateData = { standings, name, emblem, currentSeason: { ...currentSeason, winner: competitionWinnerId } };
                const shouldUpdateTeams = competition._doc.startDate !== currentSeason.startDate || competition._doc.teams.length <= 0;
                if (shouldUpdateTeams) updateData.teams = await updateCompetitionTeams(competition._doc._id);
                console.log('%s competition updated', competition._doc.name);
                await Competition.findByIdAndUpdate(competition._doc._id, { $set: updateData });
                await delay(20000);
            }
            resolve();
        } catch (error) {
            reject(error)
        }
    }
);

const getCompetitionData = (competitionCode) => new Promise(
    async function (resolve, reject) {
        try {
            console.log('getting competition data...');
            const result = await fetchHandler(`${process.env.FOOTBALL_API_URL}/competitions/${competitionCode}`);
            console.log('data fetch successful!');
            resolve(result);
        } catch (error) {
            reject(error);
        }
    }
);

const changeCompetitionStandingsTeamsToJustId = (standing) => ({ ...standing, table: standing.table.map(position => ({ ...position, team: position.team.id })) });

const getCompetitionStandings = (competitionId) => new Promise(
    async function (resolve, reject) {
        try {
            console.log('getting competition standings...');
            const result = await fetchHandler(`${process.env.FOOTBALL_API_URL}/competitions/${competitionId}/standings`);
            console.log('standings fetch successful!');
            const standingWithTeamId = result.standings.map(changeCompetitionStandingsTeamsToJustId);
            resolve(standingWithTeamId);
        } catch (error) {
            reject(error);
        }
    }
);

const updateCompetitionTeams = (competitionId) => new Promise(
    async function (resolve, reject) {
        try {
            console.log('getting competition teams...');
            const teamResult = await fetchHandler(`${process.env.FOOTBALL_API_URL}/competitions/${competitionId}/teams`);
            const competitionTeams = teamResult.teams;
            const teamsToUpdate = competitionTeams.map(saveTeamPlayers);
            const updatedTeams = await Promise.all(teamsToUpdate);
            const teamIds = updatedTeams.map(team => team._id);
            console.log('team fetch successful!')
            resolve(teamIds);
        } catch (error) {
            reject(error);
        }
    }
);

async function saveTeamPlayers (team, i) {
    try {
        const players = team.squad.map(player => prepareForBulkWrite({ ...player, _id: player.id }));
        await Player.bulkWrite(players);
        const squad = players.map(player => player._id);
        return Team.findOneAndUpdate({ _id: team.id }, { $set: { ...team, _id: team.id, squad } }, { new: true, upsert: true });
    } catch (error) {
        throw error;
    }
};

const filterCompWithUpToDateData = (competition) => {
    const lastUpdatedCompetition = (new Date(competition._doc.updatedAt)).getTime();
    const competitionDateIsOutdated = lastUpdatedCompetition < getYesterdayDate().getTime();
    const noStandings = competition._doc.standings.length <= 0;
    return competitionDateIsOutdated || noStandings;
}

module.exports = competitionHandler;