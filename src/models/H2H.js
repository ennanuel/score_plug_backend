const mongoose = require('mongoose');
const Schema = mongoose.Schema

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
            totalGoals: Number,
            homeTeam: {
                id: Number,
                wins: Number,
                draws: Number,
                losses: Number
            },
            awayTeam: {
                id: Number,
                wins: Number,
                draws: Number,
                losses: Number
            }
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