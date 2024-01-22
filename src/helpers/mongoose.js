

const refineMatchValues = ({ id, competition, homeTeam, awayTeam, isMain = false, head2head = null, isPrevMatch = false, ...match }) => ({
    ...match,
    _id: id,
    competition: competition.id,
    homeTeam: homeTeam.id,
    awayTeam: awayTeam.id,
    head2head,
    isMain
});

const prepareForBulkWrite = (doc) => ({
    ...doc,
    updateOne: {
        filter: { _id: doc._id },
        update: doc,
        upsert: true
    }
});


module.exports = {
    prepareForBulkWrite,
    refineMatchValues
};