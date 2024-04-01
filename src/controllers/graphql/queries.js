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
            }).limit(limit).skip(limit * page);

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
        args: {
            id: { type: GraphQLID }
        },
        reslove(parent, args) {
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
            id: { type: GraphQLString }
        },
        resolve(parent, args) {
            return Team.findById(args.id);
        }
    }
};

module.exports = {
    competitionQueries,
    teamQueries,
    matchQueries
}