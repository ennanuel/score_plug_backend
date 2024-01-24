const { getFromToDates } = require("../helpers/getDate");
const Competition = require("../models/Competition");
const Match = require("../models/Match");
const { reduceToActiveCompetitionsIds } = require("../utils/competition");

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
        const { from, to } = req.query;
        const { dateFrom, dateTo } = getFromToDates(from, to);

        const activeMatches = await Match.find({ utcDate: { gte: dateFrom, lt: dateTo } }, '_id').lean();
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