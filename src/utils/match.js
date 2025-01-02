const H2H = require('../models/H2H');
const Team = require("../models/Team");
const Competition = require('../models/Competition');
const Match = require('../models/Match');

const {
    ONE_DAY_IN_MS,
    ONE_HOUR_IN_MS,
    ONE_MINUTE_IN_MS,
    VALID_MATCH_STATUS_REGEX
} = require("../constants");

const { getRegularMatchMinutes, getExtraMatchTimeMinutes } = require('../helpers');

const getCompetition = (competitionId) => Competition.findById(competitionId, 'area name emblem').lean();


const DEFAULT_TEAM_AGGREGATE = {
    wins: 0,
    draws: 0,
    losses: 0,
    totalGoals: 0
};

const rearrangeMatchScore = (match, headToHeadAggregates) => ({ 
    ...match, 
        score: { 
        ...match.score, 
        firstHalf: { 
            home: match.homeTeam === headToHeadAggregates.homeTeam ? match.score.firstHalf.home : match.score.firstHalf.away, 
            away: match.awayTeam === headToHeadAggregates.awayTeam ? match.score.firstHalf.away : match.score.firstHalf.home
        }, 
        secondHalf: { 
            home: match.homeTeam === headToHeadAggregates.homeTeam ? match.score.secondHalf.home : match.score.secondHalf.away, 
            away: match.awayTeam === headToHeadAggregates.awayTeam ? match.score.secondHalf.away : match.score.secondHalf.home
        }, 
        fullTime: { 
            home: match.homeTeam === headToHeadAggregates.homeTeam ? match.score.fullTime.home : match.score.fullTime.away, 
            away: match.awayTeam === headToHeadAggregates.awayTeam ? match.score.fullTime.away : match.score.fullTime.home
        }
    } 
});

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

async function getMatchWithTeamData(match) {
    const teams = await Team.find({ _id: { $in: [match.homeTeam, match.awayTeam] } }).lean();
    const [homeTeam, awayTeam] = teams.sort((team) => team._id == match.homeTeam ? -1 : 1);
    const newMatchData = { ...match, homeTeam, awayTeam };
    return newMatchData;
}

async function expandMatchTeamsAndCompetition(match) {
    const competition = await getCompetition(match.competition);
    const { homeTeam, awayTeam } = await getMatchWithTeamData(match);
    const expandedMatch = { ...match, homeTeam, awayTeam, competition };
    return expandedMatch;
};

async function getMatchHead2Head(h2hId) {
    const head2head = await H2H.findById(h2hId).lean();
    if (!head2head) return [];
    const head2headMatches = await Match.find({ _id: { $in: head2head.matches } }).lean();
    head2head.matches = head2headMatches;
    return head2head;
};

function arrangeHead2HeadTeams({ head2head, homeTeamId, awayTeamId }) {
    const arrangedHead2Head = { ...head2head };
    if (head2head.aggregates) {
        const { homeTeam, awayTeam } = head2head.aggregates;

        if (homeTeam.id === awayTeamId && awayTeam.id === homeTeamId) {
            arrangedHead2Head.homeTeam = awayTeam;
            arrangedHead2Head.awayTeam = homeTeam;
        }
    }
    return arrangedHead2Head;
}

async function getMatchHead2HeadAndPreviousMatches(match) {
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

function calculateOutcomePercentage({ homeTeam, awayTeam, total }, [key1, key2]) {
    const firstFactor = ((homeTeam.h2h[key1] + awayTeam.h2h[key2]) * 2);
    const secondFactor = homeTeam.prevMatches[key1] + awayTeam.prevMatches[key2];
    const totalFactors = firstFactor + secondFactor;
    const outcomePercentage = ((totalFactors * 100) / (total + 0.00001)).toFixed(2);
    if (/nan/i.test(+outcomePercentage)) console.log(outcomePercentage, firstFactor, secondFactor, totalFactors, total);
    return +outcomePercentage;
};

function calculateGoalOutcomePercentage({ homeTeam, awayTeam, total, goals }) {
    const h2hGoals = homeTeam.h2h.totalGoals + awayTeam.h2h.totalGoals;
    const prevMatchesGoals = homeTeam.prevMatches.goalsScored + homeTeam.prevMatches.goalsConceded + awayTeam.prevMatches.goalsScored + awayTeam.prevMatches.goalsConceded;
    
    const totalGoals = (h2hGoals + prevMatchesGoals) + 0.000001
    const averageGoals = Number((totalGoals / total).toFixed(2)) + 0.000001;

    const goalsPercentage = Number(((averageGoals * 100) / goals).toFixed(2));

    const overGoalsPrediction = Math.min(goalsPercentage, 100);
    const underGoalsPrediction = 100 - overGoalsPrediction;

    if ([overGoalsPrediction, goalsPercentage, totalGoals, averageGoals, total].includes("NaN")) console.log(overGoalsPrediction, goalsPercentage, totalGoals, averageGoals, total)

    return { over: overGoalsPrediction, under: underGoalsPrediction };
};

const getTotal = (match) => (match.head2head.aggregates.numberOfMatches * 4) + match.homeTeam.matchesPlayed + match.awayTeam.matchesPlayed;

function getMatchOutcome(match) {
    const result = {};
    const total = getTotal(match);
   
    for (let timePeriod of ["halfTime", "fullTime"]) {
        const homeTeam = { h2h: match.head2head.aggregates[timePeriod]?.homeTeam || DEFAULT_TEAM_AGGREGATE, prevMatches: match.homeTeam[timePeriod] };
        const awayTeam = { h2h: match.head2head.aggregates[timePeriod]?.awayTeam || DEFAULT_TEAM_AGGREGATE, prevMatches: match.awayTeam[timePeriod] };
    
        const homeWinOutcome = calculateOutcomePercentage({ homeTeam, awayTeam, total }, ['wins', 'losses']);
        const drawOutcome = calculateOutcomePercentage({ homeTeam, awayTeam, total }, ['draws', 'draws']);
        const awayWinOutcome = calculateOutcomePercentage({ awayTeam, homeTeam, total }, ['losses', 'wins']);

        const outcome = { homeWin: homeWinOutcome, draw: drawOutcome, awayWin: awayWinOutcome };

        result[timePeriod] = outcome
    }

    return result;
};

function getMatchGoalsPrediction(match) {
    const total = getTotal(match);
    const goalsOutcome = ["_1", "_2", "_3", "_4"];
    const result = {};

    for (let timePeriod of ["halfTime", "fullTime"]) {
        const goalOutcome = {};

        for (let key of goalsOutcome) { 
            const homeTeam = { h2h: match.head2head.aggregates[timePeriod]?.homeTeam || DEFAULT_TEAM_AGGREGATE, prevMatches: match.homeTeam[timePeriod] };
            const awayTeam = { h2h: match.head2head.aggregates[timePeriod]?.awayTeam || DEFAULT_TEAM_AGGREGATE, prevMatches: match.awayTeam[timePeriod] };
            
            const goals = Number(key.replace(/\D+/, ""));
            const outcome = calculateGoalOutcomePercentage({ homeTeam, awayTeam, total, goals });
            goalOutcome[key] = outcome;
        }
        
        result[timePeriod] = goalOutcome;
    };

    return result;
}


function getMatchPrediction(match) {
    const predictions = { halfTime: {}, fullTime: {} };
    const matchOutcome = getMatchOutcome(match);
    const goalPredictions = getMatchGoalsPrediction(match);

    for (let timePeriod of Object.keys(predictions)) {
        predictions[timePeriod].outcome = matchOutcome[timePeriod];
        predictions[timePeriod].goals = goalPredictions[timePeriod];
    }

    return { _id: match._id, predictions };
}


function changeMatchScoreFormat({ halfTime, fullTime, winner, duration }) {
    // The fulltime property for home or away is null if the match has not started yet, hence the 'firstHalf' property logic.

    const newMatchScoreFormat = {
        winner,
        duration,
        firstHalf: {
            home: (halfTime.home === null && fullTime.home !== null) ? fullTime.home : halfTime.home,
            away: (halfTime.away === null && fullTime.away !== null) ? fullTime.away : halfTime.away
        },
        secondHalf: {
            home: (halfTime.home !== null && fullTime.home !== null) ? fullTime.home - halfTime.home : null,
            away: (halfTime.away !== null && fullTime.away !== null) ? fullTime.away - halfTime.away : null
        },
        fullTime: {
            home: fullTime.home,
            away: fullTime.away
        }
    }

    return newMatchScoreFormat;
}

function getTimeRemainingForGameToStart(matchDate) {
    const matchTime = new Date(matchDate);
    const currentTime = Date.now();
    const timeLeft = matchTime.getTime() - currentTime;

    const days = Math.floor(timeLeft / ONE_DAY_IN_MS);
    const hours = Math.floor(timeLeft / ONE_HOUR_IN_MS);
    const minutes = Math.floor(timeLeft / ONE_MINUTE_IN_MS);
    
    const timeRemaining = {
        days: days >= 0 ? days : null,
        hours: hours >= 0 ? hours : null,
        minutes: minutes >= 0 ? minutes : null
    };
    
    return timeRemaining;
}

function getMatchMinutesPassed({ status, utcDate, score }) {
    if (status === "TIMED") return;
    if (status === 'PAUSED') return "HT";
    else if (status === "FINISHED") return "FT";

    const currentTime = Date.now();
    const matchTime = (new Date(utcDate)).getTime();
    const timePassed = currentTime - matchTime;
    const minutesPassed = Math.round(timePassed / ONE_MINUTE_IN_MS);

    const getMatchMinutes = /regular/i.test(score.duration) ? getRegularMatchMinutes : getExtraMatchTimeMinutes;

    const matchMinutes = getMatchMinutes(minutesPassed)
    return matchMinutes;
};

function resolveMatchTimeFormat(match) {
    const matchWithTimeFormat = { ...match };
    matchWithTimeFormat.timeRemaining = getTimeRemainingForGameToStart(match.utcDate);
    matchWithTimeFormat.minutes = getMatchMinutesPassed(match);
    return matchWithTimeFormat;
}

module.exports = {
    rearrangeMatchScore,
    updateMatchStatusAndScore,
    createMatchFilterRegExp,
    getMatchWithTeamData,
    expandMatchTeamsAndCompetition,
    getMatchHead2HeadAndPreviousMatches,
    getMatchOutcome,
    getMatchPrediction,
    changeMatchScoreFormat,
    getTimeRemainingForGameToStart,
    getMatchMinutesPassed,
    resolveMatchTimeFormat
}