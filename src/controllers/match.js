const axios = require('axios');
const Match = require('../models/Match');
const H2H = require('../models/H2H');

const { headers } = require('../constants');

const { getFromToDates } = require("../helpers/getDate")
const { createMatchFilterRegExp, updateMatchStatusAndScore, expandMatchTeamsAndCompetition, getMatchHead2HeadAndPreviousMatches, getMatchOutcome } = require('../utils/match');
const { convertToNumber } = require('../helpers');

async function getMatchDetails(req, res) {
    try {
        const { matchId } = req.params;
        const match = await Match.findById(matchId).lean();

        if (!match) throw new Error('No matches found');

        const expandedMatch = await expandMatchTeamsAndCompetition(match);
        const matchWithH2HAndPrevMatches = await getMatchHead2HeadAndPreviousMatches(expandedMatch);

        return res.status(200).json(matchWithH2HAndPrevMatches);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

async function getAllMatches (req, res) {
    try {
        const { status, from, to, page = 9, limit = 5 } = req.query;

        const limitNum = convertToNumber(limit);
        const pageNum = convertToNumber(page);

        const statusRegExp = createMatchFilterRegExp(status);
        const { startDate, endDate } = getFromToDates(from, to);

        const matches = await Match.find({
            $and: [
                { status: { $regex: statusRegExp } },
                { utcDate: { $gte: startDate } },
                { utcDate: { $lte: endDate } }
            ]
        }).limit(limitNum).skip(limitNum * pageNum).lean();

        const totalMatches = await Match.find({
            $and: [
                { status: { $regex: statusRegExp } },
                { utcDate: { $gte: startDate } },
                { utcDate: { $lte: endDate } }
            ]
        }).count();

        const matchesToExpand = matches.map(expandMatchTeamsAndCompetition)
        const expandedMatches = await Promise.all(matchesToExpand);

        const result = { matches: expandedMatches, totalPages: totalMatches, currentPage: pageNum };
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
}

async function getMatchPicks(req, res) {
    try {
        const { from, to, limit, page } = req.query;
        const { startDate, endDate } = getFromToDates(from, to);

        const limitNum = convertToNumber(limit);
        const pageNum = convertToNumber(page);

        const matches = await Match.find({
            $and: [
                { utcDate: { $gt: startDate } },
                { utcDate: { $lte: endDate } }
            ]
        }).limit(limitNum).skip(pageNum * limitNum).lean();

        const totalMatches = await Match.find({
            $and: [
                { utcDate: { $gt: startDate } },
                { utcDate: { $lte: endDate } }
            ]
        }).count();

        const matchesToExpand = matches.map(expandMatchTeamsAndCompetition);
        const expandedMatches = await Promise.all(matchesToExpand);

        const matchesToGetH2HandPrevMatches = expandedMatches.map(getMatchHead2HeadAndPreviousMatches);
        const matchesWithH2HandPrevMatches = await Promise.all(matchesToGetH2HandPrevMatches);

        const matchesWithOutcome = matchesWithH2HandPrevMatches.map(getMatchOutcome);

        const result = { matches: matchesWithOutcome, totalPages: totalMatches, currentPage: pageNum };
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

async function updateMatches (req, res) {
    try {
        const { from, to } = getFromToDates();
        const previousMatches = await Match.find({ utcDate: { $gte: from, $lt: to } });
        const matchIds = previousMatches.map(match => match._doc._id).join(',');
        const response = await axios.get(`${process.env.FOOTBALL_API_URL}/matches?ids=${matchIds}`, { headers });
        const currentMatches = response.data.matches;
        await Promise.all(updateMatchStatusAndScore({ previousMatches, currentMatches }));
        return res.status(200).json({ message: 'Matches updated' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    updateMatches,
    getMatchDetails,
    getAllMatches,
    getMatchPicks
}