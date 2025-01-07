const { GraphQLObjectType, GraphQLSchema } = require('graphql');

const { competitionQueries, matchQueries, teamQueries, searchQueries } = require("../controllers/graphql/queries");


const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: { 
        ...competitionQueries,
        ...matchQueries,
        ...teamQueries,
        ...searchQueries
     }
});

module.exports = new GraphQLSchema({
    query: RootQuery,
});