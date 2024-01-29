const Competition = require("../models/Competition");
const Match = require("../models/Match");

const { expandCompetitionsMatches, expandTableTeams } = require("../utils/competition");

const { getFromToDates } = require("../helpers/getDate");
const { reduceToMatchCompetitionsIds } = require("../helpers/reduce");
const { getMatchWithTeamData } = require("../utils/match");
const Team = require("../models/Team");

async function getCompetitions(req, res) {
    try {
        const competitions = await Competition.find().lean();
        return res.status(200).json(competitions);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message });
    }
};

async function getActiveCompetitions(req, res) {
    try {
        const { from, to } = req.query;
        const { dateFrom, dateTo } = getFromToDates(from, to);

        const activeMatches = await Match.find({ utcDate: { gte: dateFrom, lt: dateTo } }).lean();
        const activeCompetitionIds = activeMatches.reduce(reduceToMatchCompetitionsIds, []);

        const activeCompetitions = await Competition.find({ _id: { $in: activeCompetitionIds } }).lean();

        const expandedCompetitions = await expandCompetitionsMatches({ competitions: activeCompetitions, matches: activeMatches });

        return res.status(200).json(expandedCompetitions);
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
};

async function getCompetitionStandings(req, res) {
    try {
        const { competitionId } = req.params;
        const competition = await Competition.findById(competitionId).lean();
        if (!competition) throw new Error('Could not find competition');
        const standings = competition.standings;
        const standingsToExpand = standings.map(expandTableTeams);
        const expandedStandings = await Promise.all(standingsToExpand);
        return res.status(200).json(expandedStandings);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message });
    }
};

async function getCompetitionMatches(req, res) {
    try {
        const { competitionId } = req.params;
        const { from, to } = req.query;
        const { dateFrom, dateTo } = getFromToDates(from, to);

        const competitionMatches = await Match.find({ utcDate: { gte: dateFrom, lt: dateTo }, competition: competitionId }).lean();
        
        const matchesToExpand = competitionMatches.map(getMatchWithTeamData);
        const expandedMatches = await Promise.all(matchesToExpand);

        return res.status(200).json(expandedMatches);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

async function getCompetitionTeams(req, res) { 
    try {
        const { competitionId } = req.params;
        const competition = await Competition.findById(competitionId).lean();
        if (!competition) throw new Error("No competitions found");
        
        const competitionTeams = await Team.find({ _id: { $in: competition.teams } }).lean();
        return res.status(200).json(competitionTeams);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCompetitions,
    getCompetitionMatches,
    getCompetitionTeams,
    getActiveCompetitions,
    getCompetitionDetails,
    getCompetitionStandings
}