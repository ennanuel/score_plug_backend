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
};
            

function getShortCompetitionTopTeams(competition) {
    const stats = ["Best attack", "Best defense", "Best xG"];
    const teamStandings = competition.standings.reduce((tables, standing) => [...tables, ...standing.table], []);

    const topTeamsStats = stats.map((title) => {
        let data = [];

        switch(title) {
            case "Best attack":
                data = [...teamStandings]
                    .sort((item1, item2) => item2.goalsFor - item1.goalsFor)
                    .slice(0, 3)
                    .map(({ team, goalsFor, position }) => ({ position, stat: goalsFor, teamId: team }));
                break;
            case "Best defense":
                data = [...teamStandings]
                    .sort((item1, item2) => item1.goalsAgainst - item2.goalsAgainst)
                    .slice(0, 3)
                    .map(({ team, goalsAgainst, position }) => ({ position, stat: goalsAgainst, teamId: team }));
                break;
            case "Best xG":
                data = [...teamStandings]
                    .sort((item1, item2) => (item2.goalsFor / item2.playedGames) - (item1.goalsFor / item1.playedGames))
                    .slice(0, 3)
                    .map(({ team, goalsFor, playedGames, position }) => ({ position, stat: (goalsFor / playedGames).toFixed(2), teamId: team }));
                break;
        }

        return { title, teams: data };
    });

    const topTeamIds = topTeamsStats.reduce((teamIds, { teams }) => [...teamIds, ...teams.map((team) => team.teamId)], []);

    const result = Team
        .find({ _id: { $in: topTeamIds } }, '_id name shortName tla crest')
        .lean()
        .then((teams) => {
            const teamsObj = teams.reduce((teams, team) => ({ ...teams, [team._id]: { ...team } }), {});

            const topTeams = topTeamsStats.map((teamStat) => ({
                title: teamStat.title,
                teams: teamStat.teams.map(({ teamId, stat, position }) => ({ ...teamsObj[teamId], stat, position }))
            }));

            return topTeams;
        });

    return result;
};

function getCompetitionTeamStats(competition) {
    const fullStat = [
        {
            headTitle: "Top stats",
            stats: ["Points acquired", "Best attack", "Best defense", "Most wins", "Most draws"]
        },
        {
            headTitle: "Top average stats",
            stats: ["Points per match", "Draws per match", "Wins per match", "Goals per match", "Goals conceded per match"]
        },
        {
            headTitle: "Worst stats",
            stats: ["Points lost", "Least wins", "Most losses", "Worst attack", "Worst defense"]
        },
        {
            headTitle: "Worst average stats",
            stats: ["Points losses per match", "Losses per match", "Wins per match", "Goals per match", "Goals conceded per match"]
        },
    ];
    const teamStandings = competition.standings.reduce((tables, standing) => [...tables, ...standing.table], []);

    const fullCompetitionStats = fullStat.map(({ headTitle, stats }) => {
        const newStats = stats.map((title) => {
            let data = [];
            
            switch(title) {
                case "Points acquired":
                    data = [...teamStandings]
                        .sort((item1, item2) => item2.points - item1.points)
                        .slice(0, 3)
                        .map(({ team, points, position }) => ({ position, stat: points, teamId: team }));
                    break;
                case "Best attack":
                    data = [...teamStandings]
                        .sort((item1, item2) => item2.goalsFor - item1.goalsFor)
                        .slice(0, 3)
                        .map(({ team, goalsFor, position }) => ({ position, stat: goalsFor, teamId: team }));
                    break;
                case "Best defense":
                    data = [...teamStandings]
                        .sort((item1, item2) => item1.goalsAgainst - item2.goalsAgainst)
                        .slice(0, 3)
                        .map(({ team, goalsAgainst, position }) => ({ position, stat: goalsAgainst, teamId: team }));
                    break;
                case "Most wins":
                    data = [...teamStandings]
                        .sort((item1, item2) => item2.won - item1.won)
                        .slice(0, 3)
                        .map(({ team, won, position }) => ({ position, stat: won, teamId: team }));
                    break;
                case "Most draws":
                    data = [...teamStandings]
                        .sort((item1, item2) => item2.draw - item1.draw)
                        .slice(0, 3)
                        .map(({ team, draw, position }) => ({ position, stat: draw, teamId: team }));
                    break;
                case "Points per match":
                    data = [...teamStandings]
                        .sort((item1, item2) => (item2.points / item2.playedGames) - (item1.points / item1.playedGames))
                        .slice(0, 3)
                        .map(({ team, position, points, playedGames }) => ({ position, stat: (points/playedGames).toFixed(2), teamId: team }));
                    break;
                case "Draws per match":
                    data = [...teamStandings]
                        .sort((item1, item2) => (item2.draw / item2.playedGames) - (item1.draw / item1.playedGames))
                        .slice(0, 3)
                        .map(({ team, position, draw, playedGames }) => ({ position, stat: (draw/playedGames).toFixed(2), teamId: team }));
                    break;
                case "Wins per match":
                    data = [...teamStandings]
                        .sort((item1, item2) => (item2.won / item2.playedGames) - (item1.won / item1.playedGames))
                        .slice(0, 3)
                        .map(({ team, position, won, playedGames }) => ({ position, stat: (won/playedGames).toFixed(2), teamId: team }));
                    break;
                case "Goals per match":
                    data = [...teamStandings]
                        .sort((item1, item2) => (item2.goalsFor / item2.playedGames) - (item1.goalsFor / item1.playedGames))
                        .slice(0, 3)
                        .map(({ team, position, goalsFor, playedGames }) => ({ position, stat: (goalsFor/playedGames).toFixed(2), teamId: team }));
                    break;
                case "Goals conceded per match":
                    data = [...teamStandings]
                        .sort((item1, item2) => (
                            headTitle === "Top average stats" ?
                                (item2.goalsAgainst / item2.playedGames) - (item1.goalsAgainst / item1.playedGames) :
                                (item1.goalsAgainst / item1.playedGames) - (item2.goalsAgainst / item2.playedGames)
                        ))
                        .slice(0, 3)
                        .map(({ team, position, goalsAgainst, playedGames }) => ({ position, stat: (goalsAgainst/playedGames).toFixed(2), teamId: team }));
                    break;
                case "Points lost":
                    data = [...teamStandings]
                        .sort((item1, item2) => (
                            headTitle === "Top average stats" ?
                                ((item2.playedGames * 3) - item2.points) - ((item1.playedGames * 3) - item1.points) :
                                ((item1.playedGames * 3) - item1.points) - ((item2.playedGames * 3) - item2.points)
                        ))
                        .slice(0, 3)
                        .map(({ team, playedGames, points, position }) => ({ position, stat: ((playedGames * 3) - points), teamId: team }));
                    break;
                case "Least wins":
                    data = [...teamStandings]
                        .sort((item1, item2) => item1.won - item2.won)
                        .slice(0, 3)
                        .map(({ team, won, position }) => ({ position, stat: won, teamId: team }));
                    break;
                case "Most losses":
                    data = [...teamStandings]
                        .sort((item1, item2) => item2.lost - item1.lost)
                        .slice(0, 3)
                        .map(({ team, lost, position }) => ({ position, stat: lost, teamId: team }));
                    break;
                case "Worst attack":
                    data = [...teamStandings]
                        .sort((item1, item2) => item1.goalsFor - item2.goalsFor)
                        .slice(0, 3)
                        .map(({ team, goalsFor, position }) => ({ position, stat: goalsFor, teamId: team }));
                    break;
                case "Worst defense":
                    data = [...teamStandings]
                        .sort((item1, item2) => item2.goalsAgainst - item1.goalsAgainst)
                        .slice(0, 3)
                        .map(({ team, goalsAgainst, position }) => ({ position, stat: goalsAgainst, teamId: team }));
                    break;
                case "Points losses per match":
                    data = [...teamStandings]
                        .sort((item1, item2) => ((item2.playedGames * 3) - item2.points) - ((item2.playedGames * 3) - item1.goalsFor))
                        .slice(0, 3)
                        .map(({ team, playedGames, points, position }) => ({ position, stat: (((playedGames * 3) - points) / playedGames).toFixed(2), teamId: team }));
                    break;
                case "Losses per match":
                    data = [...teamStandings]
                        .sort((item1, item2) => (item2.lost / item2.playedGames) - (item1.lost / item1.playedGames))
                        .slice(0, 3)
                        .map(({ team, lost, playedGames, position }) => ({ position, stat: (lost / playedGames).toFixed(2), teamId: team }));
                    break;
                case "Wins per match":
                    data = [...teamStandings]
                        .sort((item1, item2) => (item1.won / item1.playedGames) - (item2.won / item2.playedGames))
                        .slice(0, 3)
                        .map(({ team, won, playedGames, position }) => ({ position, stat: (won / playedGames).toFixed(2), teamId: team }));
                    break;
            }

            return { title, teams: data };
        });

        return { headTitle, stats: newStats }
    });

    const teamIds = fullCompetitionStats.reduce((teamIds, { stats }) => ([
        ...teamIds, 
        ...stats.reduce((subTeamIds, { teams }) => [...subTeamIds, ...teams.map(({ teamId }) => teamId)], [])
    ]), []);

    const result = Team
        .find({ _id: { $in: teamIds } })
        .lean()
        .then((teams) => {
            const teamsObj = teams.reduce((teams, team) => ({ ...teams, [team._id]: { ...team } }), {});

            const expandedTeams = fullCompetitionStats.map((teamStat) => ({
                headTitle: teamStat.headTitle,
                stats: teamStat.stats.map((teamStat) => ({
                    title: teamStat.title,
                    teams: teamStat.teams.map(({ teamId, stat, position }) => ({ ...teamsObj[teamId], stat, position }))
                }))
            }));

            return expandedTeams;
        });

    return result;
}

module.exports = { 
    getShortCompetitionTopTeams,
    getCompetitionTeamStats,
    expandCompetitionsMatches,
    expandTableTeams
}