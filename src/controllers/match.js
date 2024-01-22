const axios = require('axios');
const Match = require('../models/Match');
const Team = require('../models/Team');
const H2H = require('../models/H2H');

const { headers } = require('../constants');

const { getFromToDates } = require("../helpers/getDate")
const { createMatchFilterRegExp, getMatchesHead2Head, expandAllPreviousMatches, expandH2HMatches, joinH2HandMatches, updateMatchStatusAndScore } = require('../utils/match');

const API_URL = process.env.FOOTBALL_API_URL;

async function getMatchDetails(req, res) {
    try {
        const { matchId } = req.params;
        const match = await Match.findById(matchId).lean();

        if (!match) throw new Error('No matches found');

        const matchTeamIds = [match.homeTeam, match.awayTeam];
        const teams = await Team.find({ _id: { $in: matchTeamIds } }).lean();
        const [homeTeam, awayTeam] = teams.sort(team => team._id === match.homeTeam ? -1 : 1);
        const homeTeamPreviousMatches = await Match.find({ $or: [{ homeTeam: match.homeTeam, awayTeam: match.homeTeam }] }).lean();
        const awayTeamPreviousMatches = await Match.find({ $or: [{ homeTeam: match.awayTeam, awayTeam: match.awayTeam }] }).lean();
        match.homeTeam = { ...homeTeam, previousMatches: homeTeamPreviousMatches };
        match.awayTeam = { ...awayTeam, previousMatches: awayTeamPreviousMatches };
        
        const headToHead = await H2H.findById(match.head2head).lean();
        const headToHeadMatches = await Match.find({ _id: { $in: headToHead.matches } }).lean();
        match.head2head = { ...headToHead, matches: headToHeadMatches };

        return res.status(200).json(match);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

async function getAllMatches (req, res) {
    try {
        const { filter, from, to } = req.query;
        const statusRegexp = createMatchFilterRegExp(filter);
        const { startDate, endDate } = getFromToDates(from, to);
        const matches = await Match.find({
            $and: [
                { status: { $regex: statusRegexp } },
                { utcDate: { $gte: startDate } },
                { utcDate: { $lte: endDate } }
            ]
        }).lean();
        return res.status(200).json(matches);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message });
    }
}

async function getMatchPicks(req, res) {
    try {
        const { from, to } = req.params;
        const { startDate, endDate } = getFromToDates(from, to);
        const matches = await Match.find({
            $and: [
                { utcDate: { $gt: startDate } },
                { utcDate: { $lte: endDate } }
            ]
        }).lean();
        const matchesHeadToHeads = await getMatchesHead2Head(matches);
        const head2headMatchIds = matchesHeadToHeads.reduce(expandH2HMatches, []);
        const head2headMatches = await Match.find({ _id: { $in: head2headMatchIds } }).lean();
        const previousMatchIds = matchesHeadToHeads.reduce(expandAllPreviousMatches, []);
        const previousMatches = await Match.find({ _id: { $in: previousMatchIds } }).lean();
        const joinedMatchH2Hs = joinH2HandMatches({ previousMatches, head2headMatches, matchesHeadToHeads });
        return res.status(200).json(joinedMatchH2Hs);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message });
    }
};

async function updateMatches (req, res) {
    try {
        const { from, to } = getFromToDates();
        const previousMatches = await Match.find({ utcDate: { $gte: from, $lt: to } });
        const matchIds = previousMatches.map(match => match._doc._id).join(',');
        const response = await axios.get(`${API_URL}/matches?ids=${matchIds}`, { headers });
        const currentMatches = response.data.matches;
        await Promise.all(updateMatchStatusAndScore({ previousMatches, currentMatches }));
        return res.status(200).json({ message: 'Matches updated' });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    updateMatches,
    getMatchDetails,
    getAllMatches,
    getMatchPicks
}