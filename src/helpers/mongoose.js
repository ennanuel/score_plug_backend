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
    aggregates: aggregates ? {
        numberOfMatches: aggregates.numberOfMatches,
        homeTeam: aggregates.homeTeam.id,
        awayTeam: aggregates.awayTeam.id,
        halfTime: null,
        fullTime: null
    } : null
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
    { 
        $set: {
            ...match,
            referees: match.referees.map(({ id, ...referee}) => ({ ...referee, _id: id }))
        } 
    },
    { new: true, upsert: true }
);

const preparePlayerForBulkWrite = (player) => prepareForBulkWrite({
    ...player, 
    position: {
        area: (player.position === 'goalkeeper' ? 
            'goalkeeper' :
            player.position === 'defence' || player.position === 'centre-back' || player.position === 'left-back' || player.position === 'right-back' ?
            'defence' :
            player.position === 'midfield' || player.position === 'attacking midfield' || player.position === 'defensive midfield' || player.position === 'central midfield' || player.position === 'left midfield' || player.position === 'right midfield' ?
            'midfield' :
            player.position === 'offence' || player.position === 'centre-forward' || player.position === 'left winger' || player.position === 'right winger' ?
            'offence' :
            'any'),
        specialty: player.position
    }
});


module.exports = {
    preparePlayerForBulkWrite,
    prepareForBulkWrite,
    refineMatchValues,
    refineH2HValues,
    prepareMatchForUpload
};