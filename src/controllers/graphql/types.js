const { GraphQLID, GraphQLString, GraphQLObjectType, GraphQLList, GraphQLFloat, GraphQLBoolean, graphql } = require("graphql");

const { getTimeRemainingForGameToStart, getMatchMinutesPassed, createMatchFilterRegExp } = require('../../utils/match');

const { getFromToDates } = require("../../helpers/getDate");

const Team = require("../../models/Team");
const Match = require("../../models/Match");
const Competition = require("../../models/Competition");
const H2H = require("../../models/H2H");
const Player = require("../../models/Player");


const RefereeType = new GraphQLObjectType({
    name: 'Referee',
    fields: () => ({
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
                status: { type: GraphQLString },
                from: { type: GraphQLString },
                to: { type: GraphQLString }
            },
            resolve(parent, args) {
                const { status, from, to } = args;
                const { startDate, endDate } = getFromToDates(from, to);
                return Match
                    .find({ _id: { $in: parent.matches } })
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
        score: { type: ScoreType },
        predictions: { type: PredictionType },
        referees: { type: new GraphQLList(RefereeType) },
        standings: {
            type: new GraphQLList(CompetitionType),
            resolve(parent, args) {
                return Competition.findById(parent.competition, 'standings');
            }
        }
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
        position: { type: GraphQLFloat },
        teams: { type: GraphQLList(TeamType) },
        team: {
            type: TeamType,
            resolve(parent) {
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
        area: { type: AreaType },
        name: { type: GraphQLString },
        code: { type: GraphQLString },
        type: { type: GraphQLString },
        emblem: { type: GraphQLString },
        currentSeason: {  type: CurrentSeasonType},
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
        standings: { type: new GraphQLList(StandingType) },
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
        _id: { type: GraphQLID },
        firstName: { type: GraphQLString },
        lastName: { type: GraphQLString },
        name: { type: GraphQLString },
        position: { type: GraphQLString },
        dateOfBirth: { type: GraphQLString },
        nationality: { type: GraphQLString },
        shirtNumber: { type: GraphQLString },
        marketValue: { type: GraphQLFloat }
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
})

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


module.exports = {
    MatchType,
    CompetitionType,
    TeamType
}