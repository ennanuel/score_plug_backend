const mongoose = require('mongoose');
const Schema = mongoose.Schema

const H2HSchema = Schema(
    {
        _id: Number,
        resultSet: {
            count: Number,
            first: Number,
            last: Number
        },
        aggregates: {
            numberOfMatches: Number,
            totalGoals: Number,
            homeTeam: {
                id: Number,
                name: String,
                wins: Number,
                draws: Number,
                losses: Number
            },
            awayTeam: {
                id: Number,
                name: String,
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