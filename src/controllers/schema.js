const { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLSchema, GraphQLFloat, GraphQLList } = require('graphql');
const Match = require('../models/Match');

const RefereeType = new GraphQLObjectType({
    name: 'Referee',
    fields: () => ({
        name: GraphQLString,
        type: GraphQLString,
        nationality: GraphQLString
    })
});

const MatchScoreType = new GraphQLObjectType({
    name: "MatchScore",
    fields: () => ({
        home: GraphQLFloat,
        away: GraphQLFloat
    })
});

const ScoreType = new GraphQLObjectType({
    name: "Score",
    fields: () => ({
        winner: GraphQLString,
        duration: GraphQLString,
        fullTime: { type: MatchScoreType },
        secondHalf: { type: MatchScoreType },
        firstHalf: { type: MatchScoreType }
    })
});

const OutcomeType = new GraphQLObjectType({
    name: "Outcome", 
    fields: () => ({
        homeWin: GraphQLFloat,
        draw: GraphQLFloat,
        awayWin: GraphQLFloat
    })
})

const MatchType = new GraphQLObjectType({
    name: "Match", 
    fields: () => ({
        _id: GraphQLID,
        utcDate: GraphQLString,
        status: GraphQLString,
        matchday: GraphQLFloat,
        stage: GraphQLString,
        group: GraphQLString,
        lastUpdated: GraphQLString,
        venue: GraphQLString,
        isMain: GraphQLBoolean,
        isHead2Head: GraphQLBoolean,
        isPrevMatch: GraphQLBoolean,
        minute: GraphQLString,
        competition: GraphQLFloat,
        homeTeam: GraphQLFloat,
        awayTeam: GraphQLFloat,
        head2head: GraphQLString,
        score: { type: ScoreType },
        outcome: { type: OutcomeType },
        referees: { type: new GraphQLList(RefereeType) }
    })
});

const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: {
        matches: {
            type: new GraphQLList(MatchType),
            resolve(parent, args) {
                return Match.find().limit(20);
            }
        },
        match: {
            type: MatchType,
            args: { id: { type: GraphQLID } },
            resolve(parent, args) {
                return Match.findById(args.id);
            }
        }
    }
});

module.exports = new GraphQLSchema({
    query: RootQuery,
})