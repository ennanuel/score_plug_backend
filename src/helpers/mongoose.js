const Match = require("../models/Match")

const refineMatchValues = ({ id, competition, homeTeam, awayTeam, ...match }) => ({
    ...match,
    _id: id,
    competition: competition.id,
    homeTeam: homeTeam.id,
    awayTeam: awayTeam.id,
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