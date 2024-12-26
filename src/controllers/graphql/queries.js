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
            const { startDate, endDate } = getFromToDates(from);
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
        type: new GraphQLList(MatchType),
        args: { 
            id: { type: GraphQLID },
            limit: { type: GraphQLFloat }
        }, 
        resolve(parent, args) {
            const { id, limit = 6 } = args;
            const similarMatches = Match
                .find({
                    _id: { $ne: id },
                    isMain: true
                })
                // TODO: Fix the sort logic
                .sort({ utcDate: -1 })
                .limit(limit);
            return similarMatches
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
            isLive: { type: GraphQLBoolean }
        },
        resolve(parent, args) {
            const { isLive } = args;
            const { startDate, endDate } = getFromToDates();
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
    topTeams: {
        type: new GraphQLList(TeamType),
        args: {
            limit: { type: GraphQLFloat }
        },
        resolve: (parent, args) => {
            Competition
                .find({}, 'standings')
                .lean()
                .then((competitions) => {
                    const limit = args.limit || 10;
                    const topTeamIds = [];
                    const maxCompetitionStandings = Math.max(competitions.map((competition) => competition.standings.length));

                    for(let standingIndex = 0; standingIndex < maxCompetitionStandings && topTeamIds.length <= limit; standingIndex++) {
                        for(let competitionIndex = 0; competitionIndex < competitions.length; competitionIndex++) {
                            const competition = competitions[competitionIndex];
                            const standing = competition.standings[standingIndex];
                            const topTeamId = standing?.table && standing.table[0]?.team;

                            if(!topTeamId) continue;
                            topTeamIds.push(topTeamId);
                        };
                    }
                    
                    return {
                        limit,
                        teams: Team.find({ _id: { $in: topTeamIds }})
                    }
                })
        }
    }
};

module.exports = {
    competitionQueries,
    teamQueries,
    matchQueries
}