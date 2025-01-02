const { GraphQLID, GraphQLString, GraphQLObjectType, GraphQLList, GraphQLFloat, GraphQLBoolean, graphql } = require("graphql");

const { getTimeRemainingForGameToStart, getMatchMinutesPassed, createMatchFilterRegExp } = require('../../utils/match');

const { getFromToDates } = require("../../helpers/getDate");

const Team = require("../../models/Team");
const Match = require("../../models/Match");
const Competition = require("../../models/Competition");
const H2H = require("../../models/H2H");
const Player = require("../../models/Player");
const { getShortCompetitionTopTeams, getCompetitionTeamStats } = require("../../utils/competition");


const RefereeType = new GraphQLObjectType({
    name: 'Referee',
    fields: () => ({
        _id: { type: GraphQLID },
        name: { type: GraphQLString },
        type: { type: GraphQLString },
        nationality: { type: GraphQLString }
    })
});

const ScoreType = new GraphQLObjectType({
    name: "Score",
    fields: () => ({
        winner: { type: GraphQLString },
        duration: { type: GraphQLString },
        fullTime: { type: MatchScoreType },
        secondHalf: { type: MatchScoreType },
        firstHalf: { type: MatchScoreType }
    })
});

const GoalsPredictionType = new GraphQLObjectType({
    name: "GoalsPrediction",
    fields: () => ({
        over: { type: GraphQLFloat },
        under: { type: GraphQLFloat }
    })
});

const HalfPredictionType = new GraphQLObjectType({
    name: "HalfPrediction",
    fields: () => ({
        outcome: {
            type: new GraphQLObjectType({
                name: "Outcome",
                fields: () => ({
                    homeWin: { type: GraphQLFloat },
                    draw: { type: GraphQLFloat },
                    awayWin: { type: GraphQLFloat }
                })
            })
        },
        goals: ({
            type: new GraphQLObjectType({
                name: "GoalsOutcome",
                fields: () => ({
                    _1: { type: GoalsPredictionType },
                    _2: { type: GoalsPredictionType },
                    _3: { type: GoalsPredictionType },
                    _4: { type: GoalsPredictionType }
                })
            })
        })
    })
});

const PredictionType = new GraphQLObjectType({
    name: "Prediction",
    fields: () => ({
        halfTime: { type: HalfPredictionType },
        fullTime: { type: HalfPredictionType }
    })
});

const TimeRemainingType = new GraphQLObjectType({
    name: "TimeRemaining",
    fields: () => ({
        days: { type: GraphQLFloat },
        hours: { type: GraphQLFloat },
        minutes: { type: GraphQLFloat }
    })
});

const MatchScoreType = new GraphQLObjectType({
    name: "MatchScore",
    fields: () => ({
        home: { type: GraphQLFloat },
        away: { type: GraphQLFloat }
    })
});

const HeadToHeadTeam = new GraphQLObjectType({
    name: "H2HTeam",
    fields: () => ({
        id: { type: GraphQLFloat },
        wins: { type: GraphQLFloat },
        draws: { type: GraphQLFloat },
        losses: { type: GraphQLFloat },
        totalGoals: { type: GraphQLFloat }
    })
});

const HeadToHeadAggregatesType = new GraphQLObjectType({
    name: "H2HAggregate",
    fields: () => ({
        homeTeam: { type: HeadToHeadTeam },
        awayTeam: { type: HeadToHeadTeam }
    })
});

const HeadToHeadType = new GraphQLObjectType({
    name: "H2H",
    fields: () => ({
        _id: { type: GraphQLID },
        aggregates: {
            type: new GraphQLObjectType({
                name: "Aggregates",
                fields: () => ({
                    homeTeam: { type: GraphQLFloat },
                    awayTeam: { type: GraphQLFloat },
                    numberOfMatches: { type: GraphQLFloat },
                    totalGoals: { type: GraphQLFloat },
                    halfTime: { type: HeadToHeadAggregatesType },
                    fullTime: { type: HeadToHeadAggregatesType }
                })
            })
        },
        matches: {
            type: new GraphQLList(MatchType),
            args: { 
                limit: { type: GraphQLFloat }
            },
            resolve(parent, args) {

                return Match
                    .find({ _id: { $in: parent.matches }, status: "FINISHED" })
                    .sort({ utcDate: -1 })
                    .lean()
            }
        }
    
    })
});

const MatchType = new GraphQLObjectType({
    name: "Match",
    fields: () => ({
        _id: { type: GraphQLID },
        utcDate: { type: GraphQLString },
        status: { type: GraphQLString },
        matchday: { type: GraphQLFloat },
        group: { type: GraphQLString },
        lastUpdated: { type: GraphQLString },
        venue: { type: GraphQLString },
        isMain: { type: GraphQLBoolean },
        isHead2Head: { type: GraphQLBoolean },
        isPrevMatch: { type: GraphQLBoolean },
        minute: {
            type: GraphQLString,
            resolve(parent, args) {
                return getMatchMinutesPassed(parent);
            }
        },
        timeRemaining: {
            type: TimeRemainingType,
            resolve(parent, args) {
                return getTimeRemainingForGameToStart(parent.utcDate);
            }
        },
        competition: {
            type: CompetitionType,
            resolve(parent, args) {
                return Competition.findById(parent.competition);
            }
        },
        homeTeam: {
            type: TeamType,
            resolve(parent, args) {
                return Team.findById(parent.homeTeam);
            }
        },
        awayTeam: {
            type: TeamType,
            resolve(parent, args) {
                return Team.findById(parent.awayTeam)
            }
        },
        head2head: {
            type: HeadToHeadType,
            resolve(parent, args) {
                return H2H.findById(parent.head2head);
            }
        },
        standings: {
            type: new GraphQLList(CompetitionType),
            resolve(parent, args) {
                return Competition.findById(parent.competition, 'standings');
            }
        },
        predictionAvailable: { 
            type: GraphQLBoolean,
            resolve(parent, args) {
                return parent.predictions?.halfTime?.outcome?.homeWin > 0 && parent.predictions?.halfTime?.outcome?.awayWin > 0;
            }
        },
        score: { type: ScoreType },
        predictions: { type: PredictionType },
        referees: { type: new GraphQLList(RefereeType) }
    })
});

const AreaType = new GraphQLObjectType({
    name: "Area",
    fields: () => ({
        name: { type: GraphQLString },
        flag: { type: GraphQLString }
    })
});

const CurrentSeasonType = new GraphQLObjectType({
    name: "CurrentSeason",
    fields: () => ({
        startDate: { type: GraphQLString },
        endDate: { type: GraphQLString },
        currentMatchday: { type: GraphQLFloat },
        winner: { type: GraphQLFloat }
    })
});

const TableType = new GraphQLObjectType({
    name: "StandingTable",
    fields: () => ({
        team: {
            type: TeamType,
            resolve(parent) {
                return Team.findById(parent.team);
            }
        },
        position: { type: GraphQLFloat },
        playedGames: { type: GraphQLFloat },
        form: { type: GraphQLString },
        won: { type: GraphQLFloat },
        draw: { type: GraphQLFloat },
        lost: { type: GraphQLFloat },
        points: { type: GraphQLFloat },
        goalsFor: { type: GraphQLFloat },
        goalsAgainst: { type: GraphQLFloat },
        goalDifference: { type: GraphQLFloat }
    })
})

const StandingType = new GraphQLObjectType({
    name: "Standings",
    fields: () => ({
        stage: { type: GraphQLString },
        type: { type: GraphQLString },
        group: { type: GraphQLString },
        table: { type: new GraphQLList(TableType) }
    })
});

const TopTeamType =  new GraphQLObjectType({
    name: "TableTeam",
    fields: () => ({
        _id: { type: GraphQLFloat },
        name: { type: GraphQLString },
        shortName: { type: GraphQLString },
        tla: { type: GraphQLString },
        crest: { type: GraphQLString },
        position: { type: GraphQLFloat },
        stat: { type: GraphQLFloat }
    })
})

const CompetitionTableTeam = new GraphQLObjectType({
    name: "CompetitionTableTeam",
    fields: () => ({
        title: { type: GraphQLString },
        teams: { 
            type: new GraphQLList(TopTeamType)
        }
    })
});

const CompetitionFullTeamStats = new GraphQLObjectType({
    name: "CompetitionFullTeamStats",
    fields: () => ({
        headTitle: { type: GraphQLString },
        stats: {
            type: new GraphQLList(CompetitionTableTeam)
        }
    })
});

const StartingSquadType = new GraphQLObjectType({
    name: 'TeamOfTheWeek',
    fields: () => ({
        goalkeeper: { type: new GraphQLList(PlayerType) },
        defence: { type: new GraphQLList(PlayerType) },
        midfield: { type: new GraphQLList(PlayerType) },
        offence: { type: new GraphQLList(PlayerType) }
    })
});

const PLAYER_POSITIONS = {
    goalkeeper: {
        size: 1,
        layout: ['goalkeeper']
    },
    defence: {
        size: 4,
        layout: ['left-back|defence|centre-back', 'centre-back|defence', 'centre-back|defence', 'right-back|centre-back|defence']
    },
    midfield: {
        size: 3,
        layout: ['left midfield|central midfield|attacking midfield|midfield', 'defensive midfield|central midfield|midfield', 'right midfield|central midfield|attacking midfield|midfield']
    },
    offence: {
        size: 3,
        layout: ['left winger|centre-forward|offence', 'centre-forward|offence', 'right winger|centre-forward|offence']
    }
}

const CompetitionType = new GraphQLObjectType({
    name: "Competition",
    fields: () => ({
        _id: { type: GraphQLID },
        area: { type: AreaType },
        name: { type: GraphQLString },
        code: { type: GraphQLString },
        type: { type: GraphQLString },
        emblem: { type: GraphQLString },
        currentSeason: {  type: CurrentSeasonType},
        startDate: { type: GraphQLString },
        endDate: { type: GraphQLString },
        lastUpdated: { type: GraphQLString },
        topTeams: {
            type: new GraphQLList(CompetitionTableTeam),
            resolve: getShortCompetitionTopTeams
        },
        fullTeamStats: {
            type: new GraphQLList(CompetitionFullTeamStats),
            resolve: getCompetitionTeamStats
        },
        teams: {
            type: new GraphQLList(TeamType),
            resolve(parent, args) {
                return Team.find({ _id: { $in: parent.teams } });
            }
        },
        teamCount: {
            type: GraphQLFloat,
            resolve(parent) {
                return Team.countDocuments({ _id: { $in: parent.teams } });
            }
        },
        matches: {
            type: new GraphQLList(MatchType),
            args: {
                from: { type: GraphQLString },
                to: { type: GraphQLString },
                status: { type: GraphQLString }
            },
            resolve(parent, args) {
                const { from, to, status } = args;
                const { startDate, endDate } = getFromToDates(from, to);
                const statusRegExp = createMatchFilterRegExp(status);

                return Match.find({
                    competition: parent._id,
                    isMain: true,
                    status: { $regex: statusRegExp },
                    $and: [
                        { utcDate: { $gte: startDate } },
                        { utcDate: { $lte: endDate } }
                    ]
                });
            }
        },
        highlightMatches: {
            type: new GraphQLObjectType({
                name: "CompetitionHighlightMatches",
                fields: () => ({
                    totalPages: { type: GraphQLFloat },
                    matches: { type: new GraphQLList(MatchType) }
                })
            }),
            args: {
                limit: { type: GraphQLFloat },
                page: { type: GraphQLFloat }
            },
            resolve(parent, args) {
                const { page = 0, limit = 3 } = args;

                const matches = Match
                    .find({
                        competition: parent._id
                    })
                    .limit(limit)
                    .skip(page * limit)
                    .sort({ utcDate: -1 });
                const totalPages = Match.countDocuments({ });

                return { matches, totalPages }
            }
        },
        standings: { type: new GraphQLList(StandingType) },
        teamOfTheWeek: {
            type: StartingSquadType,
            resolve(parent) {

                const players = {
                    'goalkeeper': [],
                    'defence': [],
                    'midfield': [],
                    'offence': []
                };

                const teamIds = parent.standings.reduce((teamIds, standing) => [...teamIds, ...standing.table.slice(0, 4).map(team => team.team)], []);

                const result = Team
                    .find({ _id: { $in: teamIds } })
                    .lean()
                    .then((teamsArray) => {

                        const playerIds = teamsArray.reduce((playersIds, team) => [...playersIds, ...team.squad], []);
                        return Player
                            .find({ _id: { $in: playerIds } })
                            .lean()
                            .then((playersArray) => {
                                const playersObj = playersArray.reduce((players, player) => ({ ...players, [player._id]: { ...player } }), {});
                                const teamsObj = teamsArray.reduce((teams, team) => ({ ...teams, [team._id]: { ...team } }), {});

                                const standings = parent.standings;

                                for(let [entry, value] of Object.entries(PLAYER_POSITIONS)) {

                                    for(let positionIndex = 0; positionIndex < value.size; positionIndex++) {
                                        for(const standing of standings) {
                                            let hasPushed = false;

                                            const teamId = standing.table[positionIndex].team;
                                            const team = teamsObj[teamId];

                                            for(let playerIndex = 0; playerIndex < team.squad.length; playerIndex++) {
                                                const playerToPush = playersObj[team.squad[playerIndex]];

                                                const entryPlayerIds = players[entry].map(player => player._id);

                                                const isPushableToPlayers = playerToPush &&
                                                    !entryPlayerIds.includes(playerToPush._id) &&
                                                        PLAYER_POSITIONS[entry]
                                                            .layout[positionIndex]
                                                            .split("|")
                                                            .some((layout, index, arr) => (
                                                                (index === 0 && layout === playerToPush.position.specialty) ||
                                                                (
                                                                    !playersArray
                                                                        .filter(player => player._id !== playerToPush._id)
                                                                        .some(player => player.specialty === arr[0]) && 
                                                                    layout === playerToPush.position.specialty
                                                                )
                                                            ));
                                                
                                                if(!isPushableToPlayers) continue;
                                                hasPushed = true
                                                players[entry].push({ ...playerToPush, teamCrest: team.crest });
                                                break;
                                            };

                                            if(hasPushed) break;
                                        }
                                    }
                                }

                                return players
                            })
                    });

                return result;
            }
        },
        recentMatches: {
            type: new GraphQLObjectType({
                name: "CompetitionRecentMatches",
                fields: () => ({
                    matches: { type: GraphQLFloat },
                    hasLiveMatch: { type: GraphQLBoolean }
                })
            }),
            resolve(parent, args) {
                const { startDate, endDate } = getFromToDates();
                return Match
                    .find({
                    competition: parent._id,
                    isMain: true,
                    $and: [
                        { utcDate: { $gte: startDate } },
                        { utcDate: { $lte: endDate } }
                    ]
                    })
                    .lean()
                    .then(matches => ({
                        matches: matches.length,
                        hasLiveMatch: Boolean(matches.filter(match => /(in_play|paused)/i.test(match.status)).length)
                    }));
            }
        }
    })
});

const PlayerType = new GraphQLObjectType({
    name: "Player",
    fields: () => ({
        id: { type: GraphQLID },
        _id: { type: GraphQLID },
        name: { type: GraphQLString },
        position: { 
            type: new GraphQLObjectType({
                name: "PlayerPosition",
                fields: () => ({
                    area: { type: GraphQLString },
                    specialty: { type: GraphQLString }
                })
            })
        },
        dateOfBirth: { type: GraphQLString },
        nationality: { type: GraphQLString },
        teamCrest: { type: GraphQLString },
        age: { 
            type: GraphQLFloat,
            resolve(parent) {
                return (new Date(Date.now())).getFullYear() - (new Date(parent.dateOfBirth)).getFullYear()
            }
        },
    })
});

const TeamMatchOutcomeType = new GraphQLObjectType({
    name: "TeamOutcome",
    fields: () => ({
        wins: { type: GraphQLFloat },
        draws: { type: GraphQLFloat },
        losses: { type: GraphQLFloat },
        goalsScored: { type: GraphQLFloat },
        goalsConceded: { type: GraphQLFloat }
    })
});

const TeamSquadType = new GraphQLObjectType({
    name: "TeamSquadList",
    fields: () => ({
        startingEleven: {
            type: new GraphQLObjectType({
                name: "TeamStartingEleven",
                fields: () => ({
                    goalkeeper: { type: GraphQLList(PlayerType) },
                    defence: { type: GraphQLList(PlayerType) },
                    midfield: { type: GraphQLList(PlayerType) },
                    offence: { type: GraphQLList(PlayerType) }
                })
            }),
        },
        otherPlayers: { 
            type: new GraphQLList(PlayerType) 
        }
    })
});

const TeamType = new GraphQLObjectType({
    name: "Team",
    fields: () => ({
        _id: { type: GraphQLID },
        area: { type: AreaType },
        name: { type: GraphQLString },
        shortName: { type: GraphQLString },
        tla: { type: GraphQLString },
        crest: { type: GraphQLString },
        address: { type: GraphQLString },
        website: { type: GraphQLString },
        founded: { type: GraphQLString },
        clubColors: { type: GraphQLString },
        venue: { type: GraphQLString },
        coach: { type: PlayerType },
        halfTime: { type: TeamMatchOutcomeType },
        fullTime: { type: TeamMatchOutcomeType },
        matchesPlayed: { type: GraphQLFloat },
        hasOngoingMatch: { 
            type: GraphQLBoolean,
            resolve(parent, args) {
                return Match
                    .findOne({
                        $or: [
                            { homeTeam: parent._id },
                            { awayTeam: parent._id }
                        ],
                        status: { $regex: /in_play|paused/i }
                    })
                    .lean()
                    .then(match => Boolean(match));
            }
        },
        squad: {
            type: TeamSquadType,
            args: {
                excludeStartingEleven: { type: GraphQLBoolean }
            },
            resolve(parent, args) {
                const { excludeStartingEleven } = args;

                const result = Player
                    .find({ _id: { $in: parent.squad } })
                    .then((players) => {
                        const startingEleven = {
                            goalkeeper: [],
                            defence: [],
                            midfield: [],
                            offence: []
                        };

                        for(let [entry, value] of Object.entries(PLAYER_POSITIONS)) {
                            for(let i = 0; i < value.size; i++) {
                                for(let playerIndex = 0; playerIndex < players.length && startingEleven[entry].length < value.size; playerIndex++) {
                                    const player = players[playerIndex];

                                    if(startingEleven[entry].some((othPlayer) => othPlayer._id === player._id)) continue;

                                    const canPushToStartingEleven = PLAYER_POSITIONS[entry]
                                        .layout[startingEleven[entry].length]
                                        ?.split("|")
                                        ?.some((layout, index, arr) => (
                                            (index === 0 && layout === player.position.specialty) ||
                                            (
                                                !players.slice(playerIndex, ).some((othPlayer) => othPlayer.position.specialty === arr[0]) && 
                                                layout === player.position.specialty
                                            )
                                        ));

                                    if(!canPushToStartingEleven) continue;
                                    startingEleven[entry].push(player);
                                    break;
                                };
                            }
                        };

                        const startingElevenPlayerIds = Object
                            .values(startingEleven)
                            .reduce((playerIds, players) => [...playerIds, ...players.map(({ _id }) => _id)], []);

                        const otherPlayers = excludeStartingEleven ? 
                            players.filter(({ _id }) => !startingElevenPlayerIds.includes(_id)) : 
                            players;

                        return { startingEleven, otherPlayers };
                    });

                return result;
            }
        },
        matches: {
            type: new GraphQLList(MatchType),
            args: {
                from: { type: GraphQLString },
                to: { type: GraphQLString },
                limit: { type: GraphQLFloat },
                page: { type: GraphQLFloat },
                status: { type: GraphQLString },
                sort: { type: GraphQLFloat }
            },
            resolve(parent, args) {
                const { from, to, status, limit = 10, sort = 1, page = 0 } = args;
                const { startDate, endDate } = getFromToDates(from, to);
                const dateFilter = (from || to) ? ({
                    $and: [
                        { utcDate: { $gte: startDate } },
                        { utcDate: { $lte: endDate } }
                    ]
                }): {};
                const statusRegExp = createMatchFilterRegExp(status);

                return Match
                    .find({
                        status: { $regex: statusRegExp },
                        $or: [
                            { homeTeam: parent._id },
                            { awayTeam: parent._id }
                        ],
                        ...dateFilter
                    })
                    .limit(limit)
                    .skip(limit * page)
                    .sort({ utcDate: sort });
            }
        },
        competitions: {
            type: new GraphQLList(CompetitionType),
            resolve(parent, args) {
                return Competition.find({ teams: { $in: parent._id } }, 'standings name emblem _id');
            }
        },
        league: { 
            type: CompetitionType,
            resolve(parent, args) {
                return Competition
                    .findOne({ type: "LEAGUE", 'standings.table': { $elemMatch: { team: parent._id } } });
            }
        },
        tablePosition: {
            type: GraphQLFloat,
            resolve(parent) {
                return Competition
                    .findOne({ type: "LEAGUE", 'standings.table': { $elemMatch: { team: parent._id } } })
                    .lean()
                    .then((competition) => {
                        const position = competition
                            .standings
                            .reduce((initialPosition, standing) => (standing.table.findIndex((team) => team.team == parent._id) + 1), -1);
                        return position;
                    })
            }
        },
        averageSquadAge: {
            type: GraphQLFloat,
            resolve(parent) {
                return Player
                    .find({ _id: { $in: parent.squad } })
                    .then((players) => {
                        const getPlayerAge = (player) => ((new Date(Date.now())).getFullYear() - (new Date(player.dateOfBirth)).getFullYear());

                        const totalAge = players.reduce((sum, player) => sum + getPlayerAge(player), 0);
                        const averageAge = Number((totalAge / players.length).toFixed(1));

                        return averageAge;
                    })
            }
        }
    })
});


module.exports = {
    MatchType,
    CompetitionType,
    TeamType
}