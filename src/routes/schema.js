const { GraphQLObjectType, GraphQLSchema } = require('graphql');

const { competitionQueries, matchQueries, teamQueries } = require("../controllers/graphql/queries");


const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: { 
        ...competitionQueries,
        ...matchQueries,
        ...teamQueries
     }
});

module.exports = new GraphQLSchema({
    query: RootQuery,
});