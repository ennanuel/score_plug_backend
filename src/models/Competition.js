const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TableSchema = Schema(
    {
        position: Number,
        team: Number,
        playedGames: Number,
        form: String,
        won: Number,
        draw: Number,
        lost: Number,
        points: Number,
        goalsFor: Number,
        goalsAgainst: Number,
        goalDifference: Number
    }
);

const StandingsSchema = Schema(
    {
        stage: String,
        type: String,
        group: String,
        table: [TableSchema]
    }
);

const CompetitionSchema = Schema(
    {
        _id: Number,
        area: {
            name: String,
            code: String,
            flag: String
        },
        name: String, 
        code: String, 
        type: String,
        emblem: String,
        currentSeason: {
            startDate: Date,
            endDate: Date,
            currentMatchday: Number,
            winner: Number
        },
        startDate: Date,
        endDate: Date,
        lastUpdated: Date,
        teams: [
            {
                type: Number,
                required: true
            }
        ],
        standings: [StandingsSchema]
    },
    { timestamps: true }
)

module.exports = mongoose.model('Competition', CompetitionSchema)