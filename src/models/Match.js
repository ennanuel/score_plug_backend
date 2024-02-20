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
        isMain: {
            type: Boolean,
            default: false
        },
        isHead2Head: {
            type: Boolean,
            default: false
        },
        isPrevMatch: {
            type: Boolean,
            default: false
        },
        minute: String,
        competition: Number,
        homeTeam: Number,
        awayTeam: Number,
        head2head: String,
        score: {
            winner: String,
            duration: String,
            fullTime: {
                home: Number,
                away: Number
            },
            secondHalf: {
                home: Number,
                away: Number
            },
            firstHalf: {
                home: Number,
                away: Number
            }
        },
        outcome: {
            homeWin: Number,
            draw: Number,
            awayWin: Number
        },
        referees: [RefereeSchema]
    },
    { timestamps: true }
)

module.exports = mongoose.model('Match', matchSchema)