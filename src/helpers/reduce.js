const { ONE_HOUR_IN_MS } = require("../constants");

const getKeysToUpdate = ({ home, away }) => home > away ? ['wins', 'losses'] : home < away ? ['losses', 'wins'] : ['draws', 'draws'];

function reduceToObjectWithIdAsKey(objectWithMatchIdsAsKeys, matchIds) {
    const result = { ...objectWithMatchIdsAsKeys };
    for (let i = 0; i < matchIds.length; i++) {
        const matchId = matchIds[i];
        if (result[matchId]) {
            result[matchId] = [...result[matchId], i];
        } else {
            result[matchId] = [i];
        }
    }
    return result;
};

const reduceToMatchCompetitionsIds = (competitionIds, match) => {
    const competitionId = match.competition;
    if (competitionIds.includes(competitionId)) return competitionIds;
    return [...competitionIds, competitionId]
};

const reduceToArrayOfMatchIds = (matchIds, { matches }) => [...matchIds, ...matches];

function reduceToMatchDetails(matchDetails, match) {
    const result = {};

    for (const timePeriod of ["firstHalf", "fullTime"]) {
        let { wins, draws, losses, goalsScored, goalsConceded } = matchDetails[timePeriod];

        const lostMatch = match.score[timePeriod][match.teams.main] < match.score[timePeriod][match.teams.other];
        const wonMatch = match.score[timePeriod][match.teams.main] > match.score[timePeriod][match.teams.other];
        const drewMatch = match.score[timePeriod][match.teams.main] == match.score[timePeriod][match.teams.other];

        if (wonMatch) wins += 1;
        else if (drewMatch) draws += 1;
        else if (lostMatch) losses += 1;
        
        goalsConceded += match.score[timePeriod][match.teams.other];
        goalsScored += match.score[timePeriod][match.teams.main];

        result[timePeriod] = { wins, draws, losses, goalsConceded, goalsScored };
    }

    result.matchesPlayed = matchDetails.matchesPlayed + 1;
    return result;
};

function reduceToH2HDetails(H2HDetails, match) {
    let { numberOfMatches, ...timePeriods } = H2HDetails;
    const result = {};

    for (let [key, value] of Object.entries(timePeriods)) {
        let { homeTeam, awayTeam } = value;

        const [homeMatchOutcome, awayMatchOutcome] = getKeysToUpdate(match.score[key]);
        homeTeam = { ...homeTeam, [homeMatchOutcome]: homeTeam[homeMatchOutcome] + 1, totalGoals: homeTeam.totalGoals + match.score[key].home };
        awayTeam = { ...awayTeam, [awayMatchOutcome]: awayTeam[awayMatchOutcome] + 1, totalGoals: awayTeam.totalGoals + match.score[key].away };
        
        result[key] = { homeTeam, awayTeam };
    }

    result.numberOfMatches = numberOfMatches + 1;
    return result;
};

function reduceMatchToUpdateSchedule(arrayOfUpdateSchedule, match) {
    const ARROUND_TWO_HOURS_IN_MS = ONE_HOUR_IN_MS * 2.3
    const result = [...arrayOfUpdateSchedule];
    const matchTimeInMilliseconds = new Date(match.utcDate).getTime();
    const start = (new Date(matchTimeInMilliseconds)).toUTCString()
    const end = (new Date(matchTimeInMilliseconds + ARROUND_TWO_HOURS_IN_MS)).toUTCString();
    if (result.length < 1) result.push({ start, end });
    else {
        const currentSchedule = result.shift();
        const currentScheduleEndTime = (new Date(currentSchedule.end)).getTime();
        const matchStartTime = (new Date(start)).getTime();
        if (currentScheduleEndTime > matchStartTime) result.unshift({ start: currentSchedule.start, end });
        else result.unshift({ start, end }, currentSchedule);
    }
    return result;
}

const reduceToObjectWithIdAsKeys = (objectWithIds, object) => ({ ...objectWithIds, [object._id || object.id]: object });

module.exports = {
    reduceToObjectWithIdAsKey,
    reduceToArrayOfMatchIds,
    reduceToH2HDetails,
    reduceToMatchDetails,
    reduceToObjectWithIdAsKeys,
    reduceToMatchCompetitionsIds,
    reduceMatchToUpdateSchedule
}