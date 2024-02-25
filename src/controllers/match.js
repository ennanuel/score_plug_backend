const Match = require('../models/Match');

const { getFromToDates } = require("../helpers/getDate")
const { createMatchFilterRegExp, expandMatchTeamsAndCompetition, getMatchHead2HeadAndPreviousMatches, resolveMatchTimeFormat } = require('../utils/match');
const { convertToNumber } = require('../helpers');

async function getMatchDetails(req, res) {
    try {
        const { matchId } = req.params;
        const match = await Match.findById(matchId, { isMain: 0, isPrevMatch: 0, isHead2Head: 0 }).lean();

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
        const { status, from, to, page = 0, limit = 5 } = req.query;

        const limitNum = convertToNumber(limit);
        const pageNum = convertToNumber(page);

        const statusRegExp = createMatchFilterRegExp(status);
        const { startDate, endDate } = getFromToDates(from, to);

        const matches = await Match.find(
            {
                $and: [
                    { status: { $regex: statusRegExp } },
                    { utcDate: { $gte: startDate } },
                    { utcDate: { $lte: endDate } }
                ]
            },
            { isMain: 0, isPrevMatch: 0, isHead2Head: 0, outcome: 0 }
        ).limit(limitNum).skip(limitNum * pageNum).lean();

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

        const totalPages = Math.ceil(totalMatches / limitNum);
        const result = { matches: matchesWithCompleteData, totalPages, currentPage: pageNum };
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
}

async function getMatchPicks(req, res) {
    try {
        const { from, to, limit = 5, page = 0 } = req.query;
        const { startDate, endDate } = getFromToDates(from, to);

        const limitNum = convertToNumber(limit);
        const pageNum = convertToNumber(page);

        const matches = await Match.find(
            {
                $and: [
                    { utcDate: { $gt: startDate } },
                    { utcDate: { $lte: endDate } }
                ]
            },
            { isMain: 0, isPrevMatch: 0, isHead2Head: 0 }
        ).limit(limitNum).skip(pageNum * limitNum).lean();

        const totalMatches = await Match.find({
            $and: [
                { utcDate: { $gt: startDate } },
                { utcDate: { $lte: endDate } }
            ]
        }).count();

        const matchesToExpand = matches.map(expandMatchTeamsAndCompetition);
        const expandedMatches = await Promise.all(matchesToExpand);
        const matchesWithCompleteData = expandedMatches.map(resolveMatchTimeFormat);

        const totalPages = Math.ceil(totalMatches / limitNum);
        const result = { matches: matchesWithCompleteData, totalPages, currentPage: pageNum };
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