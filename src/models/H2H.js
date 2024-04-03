const mongoose = require('mongoose');
const Schema = mongoose.Schema

const H2HOutcomeSchema = Schema({
    homeTeam: { 
        id: Number,
        wins: Number,
        draws: Number,
        losses: Number,
        totalGoals: Number
    },
    awayTeam: {
        id: Number,
        wins: Number,
        draws: Number,
        losses: Number,
        totalGoals: Number
    }
})

const H2HSchema = Schema(
    {
        _id: String,
        resultSet: {
            count: Number,
            first: Date,
            last: Date
        },
        aggregates: {
            numberOfMatches: Number,
            homeTeam: Number,
            awayTeam: Number,
            halfTime: H2HOutcomeSchema,
            fullTime: H2HOutcomeSchema
        },
        matches: [
            {
                type: Number,
                required: true
            }
        ]
    },
    {timestamps: true}
)

module.exports = mongoose.model('H2H', H2HSchema)