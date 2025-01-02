const Competition = require('../../../models/Competition');
const Team = require('../../../models/Team');
const Player = require('../../../models/Player');
const { fetchHandler, delay } = require('../../../helpers/fetchHandler');
const { preparePlayerForBulkWrite } = require("../../../helpers/mongoose");

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

const getCompetitions = () => new Promise(
    async function (resolve, reject) {
        try {
            let DBCompetitions = await Competition.find();
            if (DBCompetitions.length <= 0) {
                const { competitions } = await fetchHandler(`${process.env.FOOTBALL_API_URL}/competitions`);
                const preparedCompetitions = competitions.map(prepareCompetitionForUpload);
                DBCompetitions = await Competition.insertMany(preparedCompetitions);
            };
            resolve(DBCompetitions);
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

const prepareCompetitionForUpload = ({ currentSeason, ...competition }) => {
    const competitionRanking = COMPETITION_RANKINGS.findIndex(comp => comp.code === competition.code);
    const competitionRankingDetails = COMPETITION_RANKINGS[competitionRanking];
    const result = { 
        ...competition, 
        name: competitionRankingDetails?.name || competition.name, 
        emblem: competitionRankingDetails?.emblem || competition.emblem,
        ranking: competitionRanking
    };
    result._id = competition.id;
    result.currentSeason = { ...currentSeason, winner: currentSeason.winner?.id };
    return result;
}

const filterCompWithUpToDateData = (competition) => {
    const lastUpdatedCompetition = (new Date(competition._doc.updatedAt)).getTime();
    const competitionDateIsOutdated = lastUpdatedCompetition < getYesterdayDate().getTime();
    const noStandings = competition._doc.standings.length <= 0;
    return competitionDateIsOutdated || noStandings;
}

const prepareCompetitionForUpdate = (competitions) => new Promise(
    async function (resolve, reject) {
        try {
            for (let competition of competitions) {
                // If we get to fetch all the competitions with their currentSeason and lastUpdated, we can save 10 seconds
                const { currentSeason, lastUpdated } = await getCompetitionData(competition._doc.code);
                
                if (lastUpdated == competition._doc.lastUpdated) resolve(null);

                const standings = await getCompetitionStandings(competition._doc._id);
                const competitionWinnerId = currentSeason.winner?.id;
                const updateData = { standings, currentSeason: { ...currentSeason, winner: competitionWinnerId } };
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

function changeCompetitionStandingsTeamsToJustId (standing) { 
    return {
        ...standing, 
        table: standing
            .table
            .map(position => ({ 
                ...position, 
                team: position.team.id
            })) 
    }
}

async function saveTeamPlayers (team, i) {
    try {
        const players = team.squad.map(player => preparePlayerForBulkWrite({ ...player, _id: player.id, position: player.position?.toLowerCase() }));
        await Player.bulkWrite(players);
        const squad = players.map(player => player._id);

        return Team.findOneAndUpdate({ _id: team.id }, { $set: { ...team, _id: team.id, squad } }, { new: true, upsert: true });
    } catch (error) {
        throw error;
    }
};

module.exports = competitionHandler;