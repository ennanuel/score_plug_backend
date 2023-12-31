const Competition = require('../../models/Competition');
const Team = require('../../models/Team');
const axios = require('axios');
const { headers } = require('../../data');
const { APICallsHandler } = require('../../utils/match');

const ONE_DAY_IN_MS = 86400000;

const getYesterdayDate = () => new Date((new Date()).getTime() - ONE_DAY_IN_MS);

const apiHandler = APICallsHandler(10000);

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

const getCompetitions = () => new Promise(
    async function (resolve, reject) {
        try {
            let competitions = await Competition.find();
            if (competitions.length <= 0) {
                const result = await axios.get(`${process.env.FOOTBALL_API_URL}/competitions`, { headers });
                const newCompetitions = result.data.competitions.map(comp => ({ ...comp, _id: comp.id }));
                competitions = await Competition.insertMany(newCompetitions);
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
            const preparedCompetitions = outdatedCompetitions.map(prepareCompetitionForUpdate);
            const competitionsToUpdate = await Promise.all(preparedCompetitions);
            const filteredCompetitions = competitionsToUpdate.filter(competition => competition);
            await Promise.all(filteredCompetitions);
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const prepareCompetitionForUpdate = (competition) => new Promise(
    async function (resolve, reject) {
        try {
            const { name, emblem, currentSeason, lastUpdated } = await getCompetitionData(competition._doc.code);
            if (lastUpdated == competition._doc.lastUpdated) resolve(null);
            const standings = await getCompetitionStandings(competition._doc._id);
            const updateData = { standings, name, emblem, currentSeason };
            const shouldUpdateTeams = competition._doc.startDate !== currentSeason.startDate || competition._doc.teams.length <= 0;
            if (shouldUpdateTeams) updateData.teams = await updateCompetitionTeams(competition._doc._id);
            console.log('%s competition updated', competition._doc.name);
            resolve(Competition.findByIdAndUpdate(competition._doc._id, { $set: updateData }));
        } catch (error) {
            reject(error);
        }
    }
);

const getCompetitionData = (competitionCode) => new Promise(
    async function (resolve, reject) {
        try {
            await apiHandler.start();
            const result = await axios.get(`${process.env.FOOTBALL_API_URL}/competitions/${competitionCode}`, { headers });
            apiHandler.restart();
            resolve(result.data)
        } catch (error) {
            reject(error);
        }
    }
);

const getCompetitionStandings = (competitionId) => new Promise(
    async function (resolve, reject) {
        try {
            await apiHandler.start();
            const result = await axios.get(`${process.env.FOOTBALL_API_URL}/competitions/${competitionId}/standings`, { headers });
            apiHandler.restart();
            resolve(result.data.standings)
        } catch (error) {
            reject(error);
        }
    }
);

const updateCompetitionTeams = (competitionId) => new Promise(
    async function (resolve, reject) {
        try {
            const teamResult = await axios.get(`${process.env.FOOTBALL_API_URL}/competitions/${competitionId}/teams`, { headers });
            const teamsToUpdate = teamResult.data.teams.map(team => prepareTeamForBulkWrite({ _id: team.id, ...team }));
            await Team.bulkWrite(teamsToUpdate);
            const teamIds = teamsToUpdate.map(team => team._id);
            resolve(teamIds);
        } catch (error) {
            reject(error);
        }
    }
);

const prepareTeamForBulkWrite = (team) => ({
    ...team,
    updateOne: {
        filter: { _id: team._id },
        update: { team },
        upsert: true
    }
});

const filterCompWithUpToDateData = (competition) => {
    const lastUpdatedCompetition = (new Date(competition._doc.updatedAt)).getTime();
    const competitionDateIsOutdated = lastUpdatedCompetition < getYesterdayDate().getTime();
    const noStandings = competition._doc.standings.length <= 0;
    return competitionDateIsOutdated || noStandings;
}

module.exports = competitionHandler;