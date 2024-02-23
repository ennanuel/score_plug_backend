const axios = require('axios');
const Match = require('../models/Match');
const H2H = require('../models/H2H');

const { headers } = require('../constants');

const { getFromToDates } = require("../helpers/getDate")
const { createMatchFilterRegExp, expandMatchTeamsAndCompetition, getMatchHead2HeadAndPreviousMatches, resolveMatchTimeFormat } = require('../utils/match');
const { convertToNumber } = require('../helpers');

async function getMatchDetails(req, res) {
    try {
        const { matchId } = req.params;
        const match = await Match.findById(matchId).lean();

        if (!match) throw new Error('No matches found');

        const expandedMatch = await expandMatchTeamsAndCompetition(match);
        const matchWithH2HAndPrevMatches = await getMatchHead2HeadAndPreviousMatches(expandedMatch);
        const matchWithCompleteData = resolveMatchTimeFormat(matchWithH2HAndPrevMatches);

        return res.status(200).json(matchWithCompleteData);
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
        const matchesWithCompleteData = expandedMatches.map(resolveMatchTimeFormat);

        const result = { matches: matchesWithCompleteData, totalPages: totalMatches, currentPage: pageNum };
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
        const matchesWithCompleteData = expandedMatches.map(resolveMatchTimeFormat);

        const result = { matches: matchesWithCompleteData, totalPages: totalMatches, currentPage: pageNum };
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMatchDetails,
    getAllMatches,
    getMatchPicks
}