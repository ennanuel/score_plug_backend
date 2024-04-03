const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const TeamMatchOutcomeSchema = Schema({
    wins: Number,
    draws: Number,
    losses: Number,
    goalsScored: Number,
    goalsConceded: Number
})

const TeamSchema = Schema(
    {
        _id: Number,
        area: {
            name: String,
            flag: String
        },
        name: String,
        shortName: String,
        tla: String,
        crest: String,
        address: String,
        website: String,
        founded: Number,
        clubColors: String,
        venue: String,
        matchesPlayed: Number,
        halfTime: TeamMatchOutcomeSchema,
        fullTime: TeamMatchOutcomeSchema,
        coach: {
            id: String,
            name: String,
            nationality: String,
        },
        squad: [
            {
                type: Number,
                required: true
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model('Team', TeamSchema);