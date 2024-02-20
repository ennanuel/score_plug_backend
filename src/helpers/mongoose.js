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

const prepareForBulkWrite = (doc) => ({
    ...doc,
    updateOne: {
        filter: { _id: doc._id },
        update: doc,
        upsert: true
    }
});

const prepareMatchForUpload = (match) => Match.findOneAndUpdate({ _id: match._id }, { $set: match }, { new: true, upsert: true });


module.exports = {
    prepareForBulkWrite,
    refineMatchValues,
    prepareMatchForUpload
};