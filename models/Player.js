const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PlayerSchema = Schema({
    _id: Number,
    firstName: String,
    lastName: String,
    name: String,
    position: String,
    dateOfBirth: Date,
    nationality: String,
    shirtNumber: Number,
    marketValue: Number
}, { timestamps: true });

module.exports = mongoose.model('Player', PlayerSchema);