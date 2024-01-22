const axios = require('axios');
const dotenv = require('dotenv');
const Match = require('../src/models/Match');

const { headers } = require('../src/constants');

const { updateMatchDetails, createMatchFilterRegExp, getFromToDates, getMatchesHead2Head, expandAllPreviousMatches, expandH2HMatches, joinH2HandMatches, updateMatchStatusAndScore } = require('../src/utils/match');
const Team = require('../src/models/Team');
const H2H = require('../src/models/H2H');

dotenv.config();

const API_URL = process.env.FOOTBALL_API_URL;

async function getMatchDetails(req, res) {
    try {
        const { matchId } = req.params;
        const match = await Match.findById(matchId).lean();
        if (!match) throw new Erro('No matches found');
        const teamIds = [match.homeTeam, match.awayTeam];
        const teams = await Team.find({ _id: { $in: teamIds } }).lean();
        const headToHead = await H2H.findById(match.h2h).lean();
        const [homeTeam, awayTeam] = teams.sort(team => team._id === match.homeTeam ? -1 : 1);
        match.homeTeam = homeTeam;
        match.awayTeam = awayTeam;
        match.h2h = headToHead;
        return res.stauts(200).json(match);
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
        const matchIds = matches.map(match => match._doc._id).join(',');
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