const getKeysToUpdate = ({ home, away }) => home > away ? ['wins', 'losses'] : home < away ? ['wins', 'losses'] : ['draws', 'draws'];

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
    let { matchesPlayed, wins, draws, losses } = matchDetails;

    const lostMatch = match.score.fullTime[match.teams.main] < match.score.fullTime[match.teams.other];
    const wonMatch = match.score.fullTime[match.teams.main] > match.score.fullTime[match.teams.other];
    const drewMatch = match.score.fullTime[match.teams.main] == match.score.fullTime[match.teams.other];

    if (wonMatch) wins += 1;
    else if (drewMatch) draws += 1;
    else if (lostMatch) losses += 1;

    matchesPlayed += 1;

    return { matchesPlayed, wins, draws, losses };
};

function reduceToH2HDetails(H2HDetails, match) {
    let { numberOfMatches, totalGoals, homeTeam, awayTeam } = H2HDetails;
    const [homeTeamKey, awayTeamKey] = getKeysToUpdate(match.score.fullTime);
    numberOfMatches += 1;
    totalGoals += (match.score.fullTime.home + match.score.fullTime.away);
    homeTeam = { ...homeTeam, [homeTeamKey]: homeTeam[homeTeamKey] + 1 };
    awayTeam = { ...awayTeam, [awayTeamKey]: awayTeam[awayTeamKey] + 1 };
    return { numberOfMatches, totalGoals, homeTeam, awayTeam };
};

const reduceToObjectWithIdAsKeys = (objectWithIds, object) => ({ ...objectWithIds, [object._id]: object });

module.exports = {
    reduceToObjectWithIdAsKey,
    reduceToArrayOfMatchIds,
    reduceToH2HDetails,
    reduceToMatchDetails,
    reduceToObjectWithIdAsKeys,
    reduceToMatchCompetitionsIds
}