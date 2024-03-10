const { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLSchema, GraphQLFloat, GraphQLList } = require('graphql');

const Match = require('../models/Match');
const Team = require("../models/Team");
const Player = require("../models/Player");
const H2H = require("../models/H2H");
const Competition = require("../models/Competition");

const { getTimeRemainingForGameToStart, getMatchMinutesPassed, createMatchFilterRegExp } = require('../utils/match');
const { getFromToDates } = require('../helpers/getDate');

const RefereeType = new GraphQLObjectType({
    name: 'Referee',
    fields: () => ({
        name: { type: GraphQLString },
        type: { type: GraphQLString },
        nationality: { type: GraphQLString }
    })
});

const MatchScoreType = new GraphQLObjectType({
    name: "MatchScore",
    fields: () => ({
        home: { type: GraphQLFloat },
        away: { type: GraphQLFloat }
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

const OutcomeType = new GraphQLObjectType({
    name: "Outcome",
    fields: () => ({
        homeWin: { type: GraphQLFloat },
        draw: { type: GraphQLFloat },
        awayWin: { type: GraphQLFloat }
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

const PlayerType = new GraphQLObjectType({
    name: "Player",
    fields: () => ({
        _id: { type: GraphQLID },
        firstName: { type: GraphQLString },
        lastName: { type: GraphQLString },
        name: { type: GraphQLString },
        position: { type: GraphQLString },
        dateOfBirth: { type: GraphQLString },
        nationality: { type: GraphQLString },
        shirtNumber: { type: GraphQLString }
    })
})

const TeamType = new GraphQLObjectType({
    name: "Team",
    fields: () => ({
        _id: { type: GraphQLID },
        area: {
            type: new GraphQLObjectType({
                name: "TeamArea",
                fields: () => ({
                    name: { type: GraphQLString },
                    flag: { type: GraphQLString }
                })
            })
        },
        name: { type: GraphQLString },
        shortName: { type: GraphQLString },
        tla: { type: GraphQLString },
        crest: { type: GraphQLString },
        address: { type: GraphQLString },
        website: { type: GraphQLString },
        founded: { type: GraphQLString },
        clubColors: { type: GraphQLString },
        venue: { type: GraphQLString },
        matchesPlayed: { type: GraphQLFloat },
        wins: { type: GraphQLFloat },
        draws: { type: GraphQLFloat },
        losses: { type: GraphQLFloat },
        coach: {
            type: new GraphQLObjectType({
                name: "Coach",
                fields: () => ({
                    id: { type: GraphQLString },
                    name: { type: GraphQLString },
                    nationality: { type: GraphQLString },
                })
            })
        },
        squad: {
            type: new GraphQLList(PlayerType),
            resolve(parent, args) {
                return Player.find({ _id: { $in: parent.squad } });
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
                    $or: [
                        { homeTeam: parent._id },
                        { awayTeam: parent._id }
                    ],
                    $and: [
                        { isMain: true },
                        { status: { $regex: statusRegExp } },
                        { utcDate: { $gte: startDate } },
                        { utcDate: { $lte: endDate } }
                    ]
                });
            }
        },
        competitions : {
            type: new GraphQLList(CompetitionType),
            resolve(parent, args) {
                return Competition.find({ teams: { $in: parent._id } }, 'standings name emblem _id');
            }
        }
    })
});

const TableType = new GraphQLObjectType({
    name: "StandingTable",
    fields: () => ({
        position: { type: GraphQLFloat },
        team: {
            type: TeamType,
            resolve(parent, args) {
                return Team.findById(parent.team);
            }
        },
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

const CompetitionType = new GraphQLObjectType({
    name: "Competition",
    fields: () => ({
        _id: { type: GraphQLID },
        area: {
            type: new GraphQLObjectType({
                name: "CompetitionArea",
                fields: () => ({
                    name: { type: GraphQLString },
                    flag: { type: GraphQLString }
                })
            })
        },
        name: { type: GraphQLString },
        code: { type: GraphQLString },
        type: { type: GraphQLString },
        emblem: { type: GraphQLString },
        currentSeason: {
            type: new GraphQLObjectType({
                name: "CurrentSeason",
                fields: () => ({
                    startDate: { type: GraphQLString },
                    endDate: { type: GraphQLString },
                    currentMatchday: { type: GraphQLFloat },
                    winner: { type: GraphQLFloat }
                })
            })
        },
        startDate: { type: GraphQLString },
        endDate: { type: GraphQLString },
        lastUpdated: { type: GraphQLString },
        teams: {
            type: new GraphQLList(TeamType),
            resolve(parent, args) {
                return Team.find({ _id: { $in: parent.teams } });
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
        standings: {
            type: new GraphQLList(StandingType)
        }
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
                    numberOfMatches: { type: GraphQLFloat },
                    totalGoals: { type: GraphQLFloat },
                    homeTeam: {
                        type: TeamType,
                        resolve(parent, args) {
                            return Team.findById(parent.aggregates.homeTeam.id)
                        }
                    },
                    awayTeam: {
                        type: TeamType,
                        resolve(parent, args) {
                            return Team.findById(parent.aggregates.awayTeam.id);
                        }
                    }
                })
            })
        },
        matches: {
            type: MatchType,
            args: { 
                status: { type: GraphQLString },
                from: { type: GraphQLString },
                to: { type: GraphQLString }
            },
            resolve(parent, args) {
                const { status, from, to } = args;
                const { startDate, endDate } = getFromToDates(from, to);
                return Match.find({
                    _id: { $in: parent.matches }
                });
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
        score: { type: ScoreType },
        outcome: { type: OutcomeType },
        referees: { type: new GraphQLList(RefereeType) },
        standings: {
            type: new GraphQLList(CompetitionType),
            resolve(parent, args) {
                return Competition.findById(parent.competition, 'standings');
            }
        }
    })
});

const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: {
        matches: {
            type: new GraphQLObjectType({
                name: "Matches",
                fields: () => ({
                    matches: { type: new GraphQLList(MatchType) },
                    totalMatches: { type: GraphQLFloat },
                    limit: { type: GraphQLFloat },
                    page: { type: GraphQLFloat }
                })
            }),
            args: {
                limit: { type: GraphQLFloat },
                page: { type: GraphQLFloat },
                from: { type: GraphQLString },
                to: { type: GraphQLString },
                status: { type: GraphQLString }
            },
            resolve(parent, args) {
                const { limit = 10, page = 0, from, to, status } = args;
                const { startDate, endDate } = getFromToDates(from);
                const statusRegExp = createMatchFilterRegExp(status);
                const matches = Match.find({
                    $and: [
                        { isMain: true },
                        { status: { $regex: statusRegExp } },
                        { utcDate: { $gte: startDate } },
                        { utcDate: { $lte: endDate }}
                    ]
                }).limit(limit).skip(limit * page);

                const totalMatches = Match.find({
                    isMain: true,
                    status: { $regex: statusRegExp },
                    $and: [
                        { isMain: true },
                        { utcDate: { $gte: startDate } },
                        { utcDate: { $lte: endDate } }
                    ]
                }).count();
                return { matches, page: page + 1, totalMatches, limit };
            }
        },
        match: {
            type: MatchType,
            args: { id: { type: GraphQLID } },
            resolve(parent, args) {
                return Match.findById(args.id);
            }
        },
        competitions: {
            type: new GraphQLObjectType({
                name: "Competitions",
                fields: () => ({
                    competitions: { type: new GraphQLList(CompetitionType) },
                    totalCompetitions: { type: GraphQLFloat },
                    page: { type: GraphQLFloat },
                    limit: { type: GraphQLFloat }
                })
            }),
            args: { 
                limit: { type: GraphQLFloat },
                page: { type: GraphQLFloat },
            },
            resolve(parent, args) {
                const { page = 0, limit = 10 } = args;
                const competitions = Competition.find().limit(limit).skip(limit * page);
                const totalCompetitions = Competition.find().sort({ name: -1 }).count();
                return { competitions, totalCompetitions, page: page + 1, limit };
            }
        },
        competition: {
            type: CompetitionType,
            args: { id: { type: GraphQLString } },
            reslove(parent, args) {
                return Competition.findById(args.id);
            }
        },
        teams: {
            type: new GraphQLObjectType({
                name: "Teams",
                fields: () => ({
                    teams: { type: new GraphQLList(TeamType) },
                    totalTeams: { type: GraphQLFloat },
                    page: { type: GraphQLFloat },
                    limit: { type: GraphQLFloat }
                })
            }),
            args: {
                limit: { type: GraphQLFloat },
                page: { type: GraphQLFloat }
            },
            resolve(parent, args) {
                const { limit = 10, page = 0 } = args;
                const teams = Team.find().limit(limit).skip(limit * page);
                const totalTeams = Team.find().count();
                return { teams, totalTeams, page: page + 1, limit };
            }
        },
        team: {
            type: TeamType,
            args: { id: { type: GraphQLString } },
            resolve(parent, args) {
                return Team.findById(args.id);
            }
        }
    }
});

module.exports = new GraphQLSchema({
    query: RootQuery,
})