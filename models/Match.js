const mongoose = require('mongoose');
const Schema = mongoose.Schema

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
        h2h: {
            type: Schema.Types.ObjectId,
            ref: 'H2H'
        },
        competition: {
            type: Schema.Types.ObjectId,
            ref: 'Competition'
        },
        homeTeam: {
            type: Schema.Types.ObjectId,
            ref: 'Team'
        },
        awayTeam: {
            type: Schema.Types.ObjectId,
            ref: 'Team'
        },
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
        referees: [
            {
                name: String,
                type: String,
                nationality: String
            }
        ],
        head2head: { 
            type: Schema.Types.ObjectId,
            ref: 'H2H',
            default: null
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('Match', matchSchema)