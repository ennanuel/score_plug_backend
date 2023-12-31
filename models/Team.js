const mongoose = require('mongoose');

const Schema = mongoose.Schema;

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
        wins: Number,
        draws: Number,
        losses: Number,
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
        ],
        matches: [
            { 
                type: Number,
                ref: true
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model('Team', TeamSchema);