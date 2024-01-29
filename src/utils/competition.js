const { reduceToObjectWithIdAsKeys } = require("../helpers/reduce");
const Team = require("../models/Team");
const { getMatchWithTeamData } = require("./match");

async function expandCompetitionsMatches({ competitions, matches }) {
    const updatedMatches = matches.map(getMatchWithTeamData);
    const matchesWithTeamData = await Promise.all(updatedMatches);
    const competitionsWithExpandedMatches = competitions.map(competition => ({
        ...competition,
        matches: matchesWithTeamData.filter(match => match.competition === competition._id)
    }));
    return competitionsWithExpandedMatches;
};

async function expandTableTeams(standing) {
    const teamIds = standing.table.map(({ team }) => team);
    const teams = await Team.find({ _id: { $in: teamIds } }).lean();
    const teamsObjectWithIdAsKey = teams.reduce(reduceToObjectWithIdAsKeys, {});
    const expandedTable = standing.table.map(position => ({ ...position, team: teamsObjectWithIdAsKey[position.team] }));
    const newStanding = { ...standing, table: expandedTable };
    return newStanding;
}

module.exports = { 
    expandCompetitionsMatches,
    expandTableTeams
}