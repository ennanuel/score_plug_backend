const H2H = require('../models/H2H');

const { VALID_MATCH_STATUS_REGEX } = require("../constants");

const { getDateFrom } = require("../helpers/getDate");
const { reduceToObjectWithIdAsKey } = require('../helpers/reduce');


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

function createMatchFilterRegExp(filter) {
    const filterIsInPlay = filter?.toLowerCase() === 'in_play';
    const filterValue = filterIsInPlay ? 'in_play|paused' : filter;
    const noFilter = '[a-z]'
    const regExp = new RegExp(VALID_MATCH_STATUS_REGEX.test(filter) ? filterValue : noFilter, 'i');
    return regExp;
};

async function getMatchesHead2Head(matches) {
    if (!matches) return []
    const matchesHead2HeadIds = matches.map(match => match.head2head);
    const H2Hs = await H2H.find({ _id: { $in: matchesHead2HeadIds } });
    return H2Hs;
};

const expandAllPreviousMatches = (previousMatches, head2head) => [...previousMatches, ...head2head.aggregates.homeTeam.previousMatches, ...head2head.aggregates.awayTeam.previousMatches];

const expandH2HMatches = (head2headMatches, head2head) => [...head2headMatches, ...head2head.matches];

function joinH2HandMatches({ head2headMatches, previousMatches, matchesHeadToHeads }) {
    const reducedH2HMatches = head2headMatches.reduce(reduceToObjectWithIdAsKey, {});
    const reducedPreviousMatches = previousMatches.reduce(reduceToObjectWithIdAsKey, {});
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

const checkIfIsMainMatch = (matchDate) => (new Date(matchDate)).getTime() >= (new Date(getDateFrom())).getTime();

module.exports = {
    updateMatchStatusAndScore,
    createMatchFilterRegExp,
    getMatchesHead2Head,
    expandAllPreviousMatches,
    expandH2HMatches,
    joinH2HandMatches,
    checkIfIsMainMatch
}