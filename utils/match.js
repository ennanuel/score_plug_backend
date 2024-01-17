const Match = require('../models/Match');
const H2H = require('../models/H2H');
const axios = require('axios');
const { headers } = require('../data');

const VALID_FILTER_RGX = /(in_play|timed|finished)/i;
const ONE_DAY_IN_MS = 86400000;

function updateMatchStatusAndScore({ previousMatches, currentMatches }) {
    const matchesToUpdate = [];
    for (let currentMatch of currentMatches) {
        const previousMatch = previousMatches.find(match => match._doc._id === currentMatch.id);
        if (previousMatch.lastUpdated === currentMatch.lastUpdated) continue;
        previousMatch.score = currentMatch.score;
        previousMatch.stauts = currentMatch.status;
        matchesToUpdate.push(previousMatch.save());
    }
    return matchesToUpdate;
}

function getFromToDates(from, to) {
    let fromDate, toDate;
    if (from) fromDate = new Date(from);
    else fromDate = new Date();
    if (to) toDate = new Date(to);
    else toDate = getToDate(fromDate);
    return { startDate: fromDate.toLocaleDateString(), endDate: toDate.toLocaleDateString() };
}

const getToDate = (date) => new Date(date.getTime() + ONE_DAY_IN_MS);

function createMatchFilterRegExp(filter) {
    const filterIsInPlay = filter?.toLowerCase() === 'in_play';
    const filterValue = filterIsInPlay ? 'in_play|paused' : filter;
    const noFilter = '[a-z]'
    const regExp = new RegExp(VALID_FILTER_RGX.test(filter) ? filterValue : noFilter, 'i');
    return regExp;
};

async function getMatchesHead2Head(matches) {
    if (!matches) return []
    const matchesHead2HeadIds = matches.map(match => match.head2head);
    const H2Hs = await H2H.find({ _id: { $in: matchesHead2HeadIds } });
    return H2H;
};

const expandAllPreviousMatches = (previousMatches, head2head) => [...previousMatches, ...head2head.aggregates.homeTeam.previousMatches, ...head2head.aggregates.awayTeam.previousMatches];

const expandH2HMatches = (h2hMatches, head2head) => [...h2hMatches, ...head2head.matches];

const createObjectWithIdAsKeys = (objectWithIds, object) => ({ ...objectWithIds, [object._id]: object });

function joinH2HandMatches({ head2headMatches, previousMatches, matchesHeadToHeads }) {
    const reducedH2HMatches = head2headMatches.reduce(createObjectWithIdAsKeys, {});
    const reducedPreviousMatches = previousMatches.reduce(createObjectWithIdAsKeys, {});
    const joinedH2Hs = [];
    for (let headToHead of matchesHeadToHeads) {
        const newH2H = { ...headToHead };
        const homeTeamPreviousMatches = headToHead.aggregates.homeTeam.previousMatches.map(match => reducedPreviousMatches[match]);
        const awayTeamPreviousMatches = headToHead.aggregates.awayTeam.previousMatches.map(match => reducedPreviousMatches[match]);
        const h2hMatches = headToHead.matches.map(match => reducedH2HMatches[match]);
        newH2H.aggregates.homeTeam.previousMatches = homeTeamPreviousMatches;
        newH2H.aggregates.awayTeam.previousMatches = awayTeamPreviousMatches;
        newH2H.matches = h2hMatches;
        joinedH2Hs.push(newH2H);
    }
    return joinedH2Hs;
};

const fetchHandler = (url) => new Promise(
    async function (resolve, reject) {
        try {
            const result = await axios.get(url, { headers });
            resolve(result.data);
        } catch (error) {
            reject(error);
        }
    }
);

// There is a limit to how many times I can the API I use, so this is like a cool down;

const delay = (delayInMs = 10000) => new Promise(resolve => setTimeout(resolve, delayInMs));

const prepareForBulkWrite = (doc) => ({
    ...doc,
    updateOne: {
        filter: { _id: doc._id },
        update: doc,
        upsert: true
    }
});

const convertToTimeNumber = (time) => Number(time) < 10 ? '0' + time : time;

module.exports = {
    delay,
    updateMatchStatusAndScore,
    getFromToDates,
    createMatchFilterRegExp,
    getFromToDates,
    getMatchesHead2Head,
    expandAllPreviousMatches,
    expandH2HMatches,
    joinH2HandMatches,
    createObjectWithIdAsKeys,
    fetchHandler,
    prepareForBulkWrite,
    convertToTimeNumber
}