const H2H = require('../models/H2H');
const Team = require("../models/Team");
const Competition = require('../models/Competition');
const Match = require('../models/Match');

const { VALID_MATCH_STATUS_REGEX } = require("../constants");

const { getDateFrom } = require("../helpers/getDate");


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
    const noFilter = '[a-z]';
    const regExp = new RegExp(VALID_MATCH_STATUS_REGEX.test(filter) ? filterValue : noFilter, 'i');
    return regExp;
};

async function getMatchTeams(match) {
    const matchTeamIds = [match.homeTeam, match.awayTeam];
    const teams = await Team.find({ _id: { $in: matchTeamIds } }).lean();
    const [homeTeam, awayTeam] = teams.sort(team => team._id === match.homeTeam ? -1 : 1);
    return { homeTeam, awayTeam };
};

const getCompetition = (competitionId) => Competition.findById(competitionId).lean();

async function expandMatchTeamsAndCompetition(match) {
    const competition = await getCompetition(match.competition);
    const { homeTeam, awayTeam } = await getMatchTeams(match);
    const expandedMatch = { ...match, homeTeam, awayTeam, competition };
    return expandedMatch;
};

async function getMatchHead2Head(h2hId, includeMatches) {
    const head2head = await H2H.findById(h2hId).lean();
    const head2headMatches = await Match.find({ _id: { $in: head2head.matches } }).lean();
    head2head.matches = head2headMatches;
    return head2head;
};

function arrangeHead2HeadTeams({ head2head, homeTeamId, awayTeamId }) {
    const arrangedHead2Head = { ...head2head };
    const { homeTeam, awayTeam } = head2head.aggregates;

    if (homeTeam.id === awayTeamId && awayTeam.id === homeTeamId) {
        arrangedHead2Head.homeTeam = awayTeam;
        arrangedHead2Head.awayTeam = homeTeam;
    }

    return arrangedHead2Head;
}

async function getMatchHead2HeadAndPreviousMatches(match, includeMatches) {
    const matchHead2Head = await getMatchHead2Head(match.head2head);
    const arrangedHead2Head = arrangeHead2HeadTeams({ head2head: matchHead2Head, homeTeamId: match.homeTeam._id, awayTeamId: match.awayTeam._id });

    const homeTeamPreviousMatches = await Match.find({
        $or: [{ homeTeam: match.homeTeam._id }, { awayTeam: match.homeTeam._id }],
        isPrevMatch: true
    }).lean();
    const awayTeamPreviousMatches = await Match.find({
        $or: [{ homeTeam: match.awayTeam._id }, { awayTeam: match.awayTeam._id }],
        isPrevMatch: true
    }).lean();

    const result = { ...match, head2head: arrangedHead2Head };
    
    result.homeTeam.previousMatches = homeTeamPreviousMatches;
    result.awayTeam.previousMatches = awayTeamPreviousMatches;

    return result;
};

function calculateOutcomePercentage({ team1, team2, total }, [key1, key2]) {
    const firstFactor = ((team1.h2h[key1] + team2.h2h[key2]) * 2);
    const secondFactor = team1.prevMatches[key1] + team2.prevMatches[key2];
    const totalFactors = firstFactor + secondFactor;
    const outcomePercentage = ((totalFactors * 100) / total).toFixed(2);
    return outcomePercentage;
}

function getMatchOutcome(match) {
    const totalMatchesPlayed = (match.head2head.aggregates.numberOfMatches * 4) + match.homeTeam.matchesPlayed + match.awayTeam.matchesPlayed;
    const homeTeam = { h2h: match.head2head.aggregates.homeTeam, prevMatches: match.homeTeam };
    const awayTeam = { h2h: match.head2head.aggregates.awayTeam, prevMatches: match.awayTeam };
    const homeWinOutcome = calculateOutcomePercentage({ team1: homeTeam, team2: awayTeam, total: totalMatchesPlayed }, ['wins', 'losses']);
    const drawOutcome = calculateOutcomePercentage({ team1: homeTeam, team2: awayTeam, total: totalMatchesPlayed }, ['draws', 'draws']);
    const awayWinOutcome = calculateOutcomePercentage({ team1: awayTeam, team2: homeTeam, total: totalMatchesPlayed }, ['wins', 'losses']);
    const outcome = { homeWin: +homeWinOutcome, draw: +drawOutcome, awayWin: +awayWinOutcome };
    const matchWithOutcome = { ...match, outcome };
    return matchWithOutcome;
}

const checkIfIsMainMatch = (matchDate) => (new Date(matchDate)).getTime() >= (new Date(getDateFrom())).getTime();

module.exports = {
    updateMatchStatusAndScore,
    createMatchFilterRegExp,
    checkIfIsMainMatch,
    getMatchTeams,
    expandMatchTeamsAndCompetition,
    getMatchHead2HeadAndPreviousMatches,
    getMatchOutcome
}