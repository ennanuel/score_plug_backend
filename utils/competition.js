

const reduceToActiveCompetitionsIds = (competitionIds, match) => {
    const competitionId = match.competition;
    if (competitionIds.includes(competitionId)) return competitionIds;
    return [...competitionIds, competitionId]
};

module.exports = { 
    reduceToActiveCompetitionsIds
}