const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RefereeSchema = Schema({
    name: String,
    type: String,
    nationality: String
});

const matchSchema = Schema(
    {
        _id: Number,
        utcDate: Date,
        status: String,
        matchday: Number,
        stage: String,
        group: String,
        lastUpdated: Date,
        venue: String,
        isMain: Boolean,
        minute: String,
        competition: Number,
        homeTeam: Number,
        awayTeam: Number,
        head2head: String,
        isHead2Head: Boolean,
        isPrevMatch: Boolean,
        score: {
            winner: String,
            fullTime: {
                home: Number,
                away: Number
            },
            halfTime: {
                home: Number,
                away: Number
            }
        },
        referees: [RefereeSchema]
    },
    { timestamps: true }
)

module.exports = mongoose.model('Match', matchSchema)