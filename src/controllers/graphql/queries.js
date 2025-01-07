const { GraphQLString, GraphQLFloat, GraphQLObjectType, GraphQLList, GraphQLID, GraphQLBoolean } = require("graphql");

const Team = require("../../models/Team");
const Match = require("../../models/Match");
const Competition = require("../../models/Competition");

const { createMatchFilterRegExp } = require('../../utils/match');
const { getFromToDates } = require("../../helpers/getDate");

const { CompetitionType, MatchType, TeamType } = require("./types");

const matchQueries = {
    matches: {
        type: new GraphQLObjectType({
            name: "Matches",
            fields: () => ({
                matches: { type: new GraphQLList(MatchType) },
                limit: { type: GraphQLFloat },
                currentPage: { type: GraphQLFloat },
                totalPages: { type: GraphQLFloat }
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
            const { startDate, endDate } = getFromToDates(from, to);
            const statusRegExp = createMatchFilterRegExp(status);
            const matches = Match.find({
                $and: [
                    { isMain: true },
                    { status: { $regex: statusRegExp } },
                    { utcDate: { $gte: startDate } },
                    { utcDate: { $lte: endDate } }
                ]
            }).sort({ utcDate: -1 }).limit(limit).skip(limit * page);

            const totalPages = Match
                .find({
                    isMain: true,
                    status: { $regex: statusRegExp },
                    $and: [
                        { isMain: true },
                        { utcDate: { $gte: startDate } },
                        { utcDate: { $lte: endDate } }
                    ]
                })
                .count()
                .then(count => Math.ceil(count / limit));
            return { matches, currentPage: page + 1, totalPages, limit };
        }
    },
    matchPredictions: {
        type: new GraphQLObjectType({
            name: "MatchPredictions",
            fields: () => ({
                matches: { type: new GraphQLList(MatchType) },
                limit: { type: GraphQLFloat },
                currentPage: { type: GraphQLFloat },
                totalPages: { type: GraphQLFloat }
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
            const matches = Match
                .find({
                    $and: [
                        { isMain: true },
                        { status: { $regex: statusRegExp } },
                        { utcDate: { $gte: startDate } },
                        { utcDate: { $lte: endDate } },
                        { 'predictions.halfTime.outcome.homeWin': { $gt: 0 } }
                    ]
                })
                .limit(limit)
                .skip(limit * page);

            const totalPages = Match
                .find({
                    isMain: true,
                    status: { $regex: statusRegExp },
                    $and: [
                        { isMain: true },
                        { utcDate: { $gte: startDate } },
                        { utcDate: { $lte: endDate } },
                        { 'predictions.halfTime.outcome.homeWin': { $gt: 0 } }
                    ]
                })
                .count()
                .then(count => Math.ceil(count / limit));
            
            return { matches, currentPage: page + 1, totalPages, limit };
        }
    },
    similarMatches: {
        type: new GraphQLObjectType({
            name: "SimilarMatches", 
            fields: () => ({
                competition: { type: CompetitionType },
                matches: { type: new GraphQLList(MatchType) }
            })
        }),
        args: { 
            id: { type: GraphQLID },
            limit: { type: GraphQLFloat }
        }, 
        resolve(parent, args) {
            const { id, limit = 10 } = args;

            const result = Match
                .findById(id)
                .lean()
                .then((match) => {
                    return Competition
                        .findById(match.competition)
                        .lean()
                        .then((competition) => {
                            const similarMatches = Match
                                .find({ 
                                    competition: match.competition, 
                                    $or: [
                                        { utcDate: { $gte: (new Date(match.utcDate)).toDateString() } },
                                        { utcDate: { $gte: (new Date(Date.now())).toDateString() } }
                                    ]
                                })
                                .limit(limit);
                            
                            return { competition, matches: similarMatches };
                        })
                })
                
            return result
        }
    },
    match: {
        type: MatchType,
        args: { id: { type: GraphQLID } },
        resolve(parent, args) {
            return Match.findById(args.id);
        }
    }
};

const competitionQueries = {
    competitions: {
        type: new GraphQLObjectType({
            name: "Competitions",
            fields: () => ({
                competitions: { type: new GraphQLList(CompetitionType) },
                currentPage: { type: GraphQLFloat },
                limit: { type: GraphQLFloat },
                totalPages: { type: GraphQLFloat }
            })
        }),
        args: {
            limit: { type: GraphQLFloat },
            page: { type: GraphQLFloat },
        },
        resolve(parent, args) {
            const { page = 0, limit = 10 } = args;
            const competitions = Competition.find().sort({ name: -1 }).limit(limit).skip(limit * page);
            const totalPages = Competition
                .find()
                .count()
                .then(count => Math.ceil(count / limit));
            return { competitions, totalPages, currentPage: page + 1, limit };
        }
    },
    topCompetitions: {
        type: new GraphQLList(CompetitionType),
        resolve(parent, args) {
            return Competition
                .find()
                .sort({ ranking: 1 });
        }
    },
    activeCompetitions: {
        type: new GraphQLList(CompetitionType),
        args: {
            from: { type: GraphQLString },
            to: { type: GraphQLString },
            isLive: { type: GraphQLBoolean }
        },
        resolve(parent, args) {
            const { isLive, from, to } = args;
            const { startDate, endDate } = getFromToDates(from, to);
            const matchStatusRegex = createMatchFilterRegExp(isLive ? 'in_play' : '');
            const activeCompetitions = Match
                .find({
                    $and: [
                        { utcDate: { $lte: endDate } },
                        { utcDate: { $gte: startDate } },
                        { status: { $regex: matchStatusRegex } }
                    ]
                })
                .sort({ name: -1 })
                .lean()
                .then((matches) => Competition.find({ _id: matches.map(match => match.competition) }) );
            return activeCompetitions
        }
    },
    competition: {
        type: CompetitionType,
        args: { id: { type: GraphQLID } },
        resolve(parent, args) { 
            return Competition.findById(args.id);
        }
    }
};


const teamQueries = {
    teams: {
        type: new GraphQLObjectType({
            name: "Teams",
            fields: () => ({
                teams: { type: new GraphQLList(TeamType) },
                currentPage: { type: GraphQLFloat },
                limit: { type: GraphQLFloat },
                totalPages: { type: GraphQLFloat }
            })
        }),
        args: {
            limit: { type: GraphQLFloat },
            page: { type: GraphQLFloat }
        },
        resolve(parent, args) {
            const { limit = 10, page = 0 } = args;
            const teams = Team
                .find()
                .limit(limit)
                .skip(limit * page);
            
            const totalPages = Team
                .find()
                .count()
                .then(count => Math.ceil(count / limit));
            
            return { teams, totalPages, currentPage: page + 1, limit };
        }
    },
    team: {
        type: TeamType,
        args: {
            id: { type: GraphQLID }
        },
        resolve(parent, args) {
            return Team.findById(args.id);
        }
    },
    teamNextFixtures: {
        type: new GraphQLList(MatchType),
        args: { 
            teamId: { type: GraphQLID },
            limit: { type: GraphQLFloat }
        },
        resolve(parent, args) {
            const { limit, teamId } = args;
            const matches = Match
                .find({ 
                    status: "TIMED", 
                    $or: [
                        { homeTeam: teamId }, 
                        { awayTeam: teamId }
                    ] 
                })
                .limit(limit);
            return matches;
        }
    },
    topTeams: {
        type: new GraphQLObjectType({
            name: "TopTeams",
            fields: () => ({
                limit: { type: GraphQLFloat },
                teams: { type: new GraphQLList(TeamType) }
            })
        }),
        args: {
            limit: { type: GraphQLFloat }
        },
        resolve: (parent, args) => {
            const limit = args.limit || 10;
            const topTeams = Competition
                .find({ type: { $not: { $eq: 'CUP' }}}, 'standings')
                .lean()
                .then((competitions) => {
                    const topTeamIds = [];
                    const arrayOfCompetitionStandingLengths = competitions.map((competition) => competition.standings.length)
                    const maxCompetitionStandings = Math.max(...arrayOfCompetitionStandingLengths);

                    for(let standingIndex = 0; standingIndex < maxCompetitionStandings && topTeamIds.length <= limit; standingIndex++) {
                        for(let competitionIndex = 0; competitionIndex < competitions.length; competitionIndex++) {
                            const competition = competitions[competitionIndex];
                            const standing = competition.standings[standingIndex];
                            const topTeamId = standing?.table && standing.table[0]?.team;

                            if(!topTeamId) continue;
                            topTeamIds.push(topTeamId);
                        };
                    }
                    
                    return Team.find({ _id: { $in: topTeamIds }})
                });

            return { limit, teams: topTeams };
        }
    }
};

const searchQueries = {
    competitionsSearch: {
        type: new GraphQLObjectType({
            name: "CompetitionSearch",
            fields: () => ({
                count: { type: GraphQLFloat },
                result: { type: new GraphQLList(CompetitionType) }
            }),
        }),
        args: {
            q: { type: GraphQLString }
        },
        resolve(parent, args) {
            const { q = '' } = args;
            const regex = new RegExp(q, 'i');
            if(!q) return null;
            const count = Competition.countDocuments({ name: { $regex: regex } });
            const result = Competition.find({ name: { $regex: regex } });

            return { count, result }
        }
    },
    teamsSearch: {
        type: new GraphQLObjectType({
            name: "TeamSearch",
            fields: () => ({
                count: { type: GraphQLFloat },
                result: { type: new GraphQLList(TeamType) }
            })
        }),
        args: {
            q: { type: GraphQLString }
        },
        resolve(parent, args) {
            const { q = '' } = args;
            if(!q) return null;
            const regex = new RegExp(q, 'i');
            const count = Team.countDocuments({ $or: [
                { name: { $regex: regex } },
                { shortName: { $regex: regex } },
                { tla: { $regex: regex } },
            ]});
            const result = Team.find({ $or: [
                { name: { $regex: regex } },
                { shortName: { $regex: regex } },
                { tla: { $regex: regex } },
            ]});

            return { count, result }
        }
    },
    matchesSearch: {
        type: new GraphQLObjectType({
            name: "MatchSearch",
            fields: () => ({
                count: { type: GraphQLFloat },
                result: { type: new GraphQLList(MatchType) }
            })
        }),
        args: {
            q: { type: GraphQLString }
        },
        resolve(parent, args) {
            const { q = '' } = args;
            const regex = new RegExp(q, 'i');
            if(!q) return null
            const result = Team
                .find({ $or: [
                    { name: { $regex: regex } },
                    { shortName: { $regex: regex } },
                    { tla: { $regex: regex } },
                ]})
                .lean()
                .then((teams) => {
                    const teamIds = teams.map(({ _id }) => _id);
                    const count = Match.countDocuments({ $or: [
                        { homeTeam: { $in: teamIds } },
                        { awayTeam: { $in: teamIds } },
                    ]});
                    const matches = Match.find({ $or: [
                        { homeTeam: { $in: teamIds } },
                        { awayTeam: { $in: teamIds } },
                    ]});

                    return { count, result: matches }
                })

            return result;
        }
    }
}

module.exports = {
    competitionQueries,
    teamQueries,
    matchQueries,
    searchQueries
}