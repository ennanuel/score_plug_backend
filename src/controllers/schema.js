const { GraphQLObjectType, GraphQLSchema } = require('graphql');

const queries = require("./graphql/queries");


const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: queries
});

module.exports = new GraphQLSchema({
    query: RootQuery,
});