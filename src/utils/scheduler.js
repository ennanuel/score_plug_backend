const { getTodayDate, getTommorowDate } = require("../helpers/getDate");
const { reduceMatchToUpdateSchedule } = require("../helpers/reduce");
const Match = require("../models/Match")

async function createUpdateSchedule() { 
    try {
        const todaysDate = getTodayDate().toLocaleDateString();
        const tomorrowsDate = getTommorowDate().toLocaleDateString();
        const matchesToBePlayedToday = await Match.find({
            isMain: true, $and: [
                { utcDate: { $gte: todaysDate } },
                { utcDate: { $lt: tomorrowsDate } }
            ]
        }).sort({ utcDate: -1 }).lean();
        const matchesSchedule = matchesToBePlayedToday.reduce(reduceMatchToUpdateSchedule, []);
        return matchesSchedule;
    } catch (error) {
        throw error;
    }
}; 

async function updateSchedules() {
    try {
        // GET Schedules;
        // GET Date.now();
        // unshift Schedule from Schedules
        // if Schedule.end is less than Date.now() save new Schedules else unshift Schedule to Schedules and then save Schedules;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    createUpdateSchedule
}