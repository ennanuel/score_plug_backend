const fs = require("fs");
const { getTodayDate, getTommorowDate } = require("../helpers/getDate");
const { reduceMatchToUpdateSchedule } = require("../helpers/reduce");
const Match = require("../models/Match");
const path = require("path");
const { ONE_MINUTE_IN_MS } = require("../constants");

const checkScheduleDate = (scheduleDate) => (new Date(scheduleDate)).toLocaleDateString() === (new Date()).toLocaleDateString();

const schedulePath = path.join(__dirname, "../controllers/maintenance/schedule.json");

async function createUpdateSchedule() { 
    try {
        const currentSchedule = getScheduleJSON();
        const isToday = checkScheduleDate(currentSchedule.lastUpdated);

        if (isToday) throw new Error("Schedule for today has already been created");

        const todaysDate = getTodayDate().toLocaleDateString();
        const tomorrowsDate = getTommorowDate().toLocaleDateString();
        const matchesToBePlayedToday = await Match.find({
            isMain: true,
            $and: [
                { utcDate: { $gte: todaysDate } },
                { utcDate: { $lt: tomorrowsDate } }
            ]
        }).sort({ utcDate: 1 }).lean();
        
        const matchesSchedule = matchesToBePlayedToday.reduce(reduceMatchToUpdateSchedule, []);
        const { failed, message } = setScheduleJSON(matchesSchedule);
        if (failed) throw new Error(message);

        return { failed: false, message: "Schedule Created" };
    } catch (error) {
        return { failed: true, message: error.message };
    }
}; 

async function updateSchedules() {
    try {
        const { matchUpdateSchedule } = getScheduleJSON();
        const currentSchedule = matchUpdateSchedule.pop();
        const timeInMilliseconds = Date.now();
        const scheduleTimeInMilliseconds = (new Date(currentSchedule.end)).getTime();

        if (scheduleTimeInMilliseconds >= timeInMilliseconds) matchUpdateSchedule.push(currentSchedule);

        const { failed, message } = setScheduleJSON(matchUpdateSchedule);
        if (failed) throw new Error(message);

        return { failed: false, message: "Schedule Updated" };
    } catch (error) {
        return { failed: true, message: error.message };
    }
};

function getScheduleJSON() { 
    try {
        const scheduleRawData = fs.readFileSync(schedulePath);
        const scheduleJSONData = JSON.parse(scheduleRawData);
        return scheduleJSONData;
    } catch (error) {
        throw error;
    }
};

function getTimeForNextUpdateCall() {
    try {
        const { matchUpdateSchedule } = getScheduleJSON();
        const currentSchedule = matchUpdateSchedule.pop();
        if (!currentSchedule) throw new Error("Schedule is empty");

        const nextMinuteInMilliseconds = Date.now() + ONE_MINUTE_IN_MS;
        const endOfCurrentSchedule = (new Date(currentSchedule.end)).getTime() + ONE_MINUTE_IN_MS;
        const startOfNextSchedule = (new Date((matchUpdateSchedule.pop().start)));
        const timeForNextCall = nextMinuteInMilliseconds <= endOfCurrentSchedule ? (nextMinuteInMilliseconds) : startOfNextSchedule;
        const UTCDateForNextCall = (new Date(timeForNextCall)).toUTCString();
        return UTCDateForNextCall;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function setScheduleJSON(schedule) { 
    try {
        const scheduleRawData = fs.readFileSync(schedulePath);
        const scheduleJSONData = JSON.parse(scheduleRawData);

        scheduleJSONData.lastUpdated = (new Date()).toUTCString();
        scheduleJSONData.matchUpdateSchedule = schedule;

        const updatedData = JSON.stringify(scheduleJSONData, null, 2);
        
        fs.writeFileSync(schedulePath, updatedData);
        return { failed: false, message: "Schedule Updated" };
    } catch (error) {
        return { failed: true, message: error.message };
    }
}

function resetScheduleJSON() { 
    try {
        const scheduleData = {
            lastUpdated: null,
            matchUpdateSchedule: []
        };
        const resetData = JSON.stringify(scheduleData, null, 2);
        fs.writeFileSync(schedulePath, resetData);
        return { failed: false, message: "Schedule Reset" };
    } catch (error) {
        return { failed: true, message: error.message };
    }
}

module.exports = {
    createUpdateSchedule,
    updateSchedules,
    getScheduleJSON,
    setScheduleJSON,
    resetScheduleJSON,
    getTimeForNextUpdateCall
}