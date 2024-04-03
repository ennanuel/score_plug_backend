const Match = require("../models/Match");
const { changeMatchScoreFormat } = require("../utils/match");

const refineMatchValues = ({ id, competition, homeTeam, awayTeam, score, ...match }) => ({
    ...match,
    _id: id,
    competition: competition.id,
    homeTeam: homeTeam.id,
    awayTeam: awayTeam.id,
    score: changeMatchScoreFormat(score)
});

const refineH2HValues = ({ id, aggregates, matches, resultSet }) => ({
    _id: id,
    matches,
    resultSet,
    aggregates: {
        numberOfMatches: aggregates.numberOfMatches,
        homeTeam: aggregates.homeTeam.id,
        awayTeam: aggregates.awayTeam.id,
        halfTime: null,
        fullTime: null
    }
})

const prepareForBulkWrite = (doc) => ({
    ...doc,
    updateOne: {
        filter: { _id: doc._id },
        update: doc,
        upsert: true
    }
});

const prepareMatchForUpload = (match) => Match.findOneAndUpdate(
    { _id: match._id },
    { $set: match },
    { new: true, upsert: true }
);


module.exports = {
    prepareForBulkWrite,
    refineMatchValues,
    refineH2HValues,
    prepareMatchForUpload
};