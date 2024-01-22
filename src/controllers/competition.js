const Competition = require("../models/Competition");
const Match = require("../models/Match");
const Team = require('../models/Team');
const { reduceToActiveCompetitionsIds } = require("../utils/competition");

const ONE_DAY_IN_MS = 86400000;

const getTodayDate = () => (new Date()).toLocaleDateString();
const getTomorrowDate = () => (new Date((new Date()).getTime() + ONE_DAY_IN_MS)).toLocaleDateString();

async function getAllCompetitions(req, res) {
    try {
        const competitions = await Competition.find().lean();
        return res.status(200).json(competitions);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message });
    }
}

async function getActiveCompetitions(req, res) {
    try {
        const today = getTodayDate();
        const tomorrow = getTomorrowDate();
        const activeMatches = await Match.find({ utcDate: { gte: today, lt: tomorrow } }, '_id').lean();
        const activeCompetitionIds = activeMatches.reduce(reduceToActiveCompetitionsIds, []);
        const activeCompetitions = await Competition.find({ _id: { $in: activeCompetitionIds } });
        return res.status(200).json(activeCompetitions);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message });
    }
};

async function getCompetitionDetails(req, res) {
    try {
        const { competitionId } = req.params;
        const competition = await Competition.findById(competitionId).lean();
        if (!competition) throw new Error('Could not find competition');
        const competitionTeams = await Team.find({ _id: { $in: competition.teams } }).lean();
        const competitionMatches = await Match.find({ competition: competitionId }).lean();
        competition.teams = competitionTeams;
        competition.matches = competitionMatches;
        return res.status(200).json(competition);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message });
    }
}

module.exports = {
    getAllCompetitions,
    getActiveCompetitions,
    getCompetitionDetails
}