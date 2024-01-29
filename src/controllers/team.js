const { convertToNumber } = require("../helpers");
const Team = require("../models/Team");
const Match = require("../models/Match");
const Player = require("../models/Player");

const { getFromToDates } = require("../helpers/getDate");
const { getMatchWithTeamData, expandMatchTeamsAndCompetition } = require("../utils/match");

async function getAllTeams(req, res) { 
    try {
        const { limit = 20, page = 0, sortBy } = req.query;
        const limitNum = convertToNumber(limit);
        const pageNum = convertToNumber(page);
        const teams = await Team.find().sort({ name: -1 }).limit(limitNum).skip(limitNum * pageNum).lean();
        console.warn(limitNum * pageNum, (limitNum * pageNum) + limitNum);
        const totalTeams = await Team.find().sort({ name: -1 }).count();
        return res.status(200).json({ teams, totalPages: totalTeams, currentPage: pageNum });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message })
    }
};

async function getTeamDetails(req, res) { 
    try {
        const { teamId } = req.params;
        const team = await Team.findById(teamId).lean();
        if (!team) throw new Error("No teams found");
        return res.status(200).json(team);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

async function getTeamMatches(req, res) { 
    try {
        const { teamId } = req.params;
        const { from, to } = req.query;
        const { dateFrom, dateTo } = getFromToDates(from, to);
        const matches = await Match.find({
            utcDate: { $gte: dateFrom, $lt: dateTo },
            $or: [{ homeTeam: teamId }, { awayTeam: teamId }]
        }).lean();
        const matchesToExpand = matches.map(expandMatchTeamsAndCompetition);
        const expandedMatches = await Promise.all(matchesToExpand);
        return res.status(200).json(expandedMatches);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

async function getTeamPlayers(req, res) { 
    try {
        const { teamId } = req.params;
        const team = await Team.findById(teamId).lean();
        if (!team) throw new Error("No teams found");
        const teamPlayers = await Player.find({ _id: { $in: team.squad } }).lean();
        return res.status(200).json(teamPlayers);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllTeams,
    getTeamDetails,
    getTeamMatches,
    getTeamPlayers
}