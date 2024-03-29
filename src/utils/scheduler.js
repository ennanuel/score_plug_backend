const fs = require("fs");
const { getTodayDate, getTommorowDate, checkMatchScheduleDate } = require("../helpers/getDate");
const { reduceMatchToUpdateSchedule } = require("../helpers/reduce");
const Match = require("../models/Match");
const path = require("path");
const { ONE_MINUTE_IN_MS } = require("../constants");

const schedulePath = path.join(__dirname, "../controllers/maintenance/schedule.json");

async function createUpdateSchedule() { 
    try {
        const currentSchedule = getScheduleJSON();
        const isToday = checkMatchScheduleDate(currentSchedule.lastUpdated);

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
        const { failed, message } = setMatchScheduleJSON(matchesSchedule, null);
        if (failed) throw new Error(message);

        return { failed: false, message: "Schedule Created" };
    } catch (error) {
        return { failed: true, message: error.message };
    }
}; 

function updateMatchSchedule(status) {
    try {
        const schedule = getScheduleJSON();
        const updateSchedule = schedule.matches.updateSchedule;
        
        if (updateSchedule.length > 0) {
            const currentSchedule = updateSchedule.pop();
            const timeInMilliseconds = Date.now();
            const scheduleTimeInMilliseconds = (new Date(currentSchedule.end)).getTime();

            if (scheduleTimeInMilliseconds >= timeInMilliseconds) updateSchedule.push(currentSchedule);
        }

        const { failed, message } = setMatchScheduleJSON(updateSchedule, status);
        if (failed) throw new Error(message);

        return { failed: false, message: "Schedule Updated" };
    } catch (error) {
        console.error(error);
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
        const schedule = getScheduleJSON();
        const updateSchedule = schedule.matches.updateSchedule;
        
        if (updateSchedule.length < 1) throw new Error("Schedule is empty");

        const currentSchedule = updateSchedule.pop();

        const nextMinuteInMilliseconds = Date.now() + ONE_MINUTE_IN_MS;
        const startOfCurrentSchedule = (new Date(currentSchedule.start)).getTime();
        const endOfCurrentSchedule = (new Date(currentSchedule.end)).getTime() + ONE_MINUTE_IN_MS;
        const startOfNextSchedule = (new Date(updateSchedule.pop()?.start));
        const timeForNextCall = nextMinuteInMilliseconds <= endOfCurrentSchedule && nextMinuteInMilliseconds >= startOfCurrentSchedule
            ? nextMinuteInMilliseconds :
            nextMinuteInMilliseconds < startOfCurrentSchedule ?
            startOfCurrentSchedule :
            startOfNextSchedule;
        const UTCDateForNextCall = (new Date(timeForNextCall)).toUTCString();
        return UTCDateForNextCall;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function setMatchScheduleJSON(schedule, status) { 
    try {
        const scheduleRawData = fs.readFileSync(schedulePath);
        const scheduleJSONData = JSON.parse(scheduleRawData);

        if (schedule) scheduleJSONData.matches.updateSchedule = schedule;

        scheduleJSONData.matches.status = status;
        scheduleJSONData.matches.lastUpdated = (new Date()).toUTCString();

        const updatedData = JSON.stringify(scheduleJSONData, null, 2);
        
        fs.writeFileSync(schedulePath, updatedData);
        return { failed: false, message: "Natch Schedule Updated" };
    } catch (error) {
        return { failed: true, message: error.message };
    }
}

function serverUpdateScheduleJSON(status) { 
    try {
        const scheduleRawData = fs.readFileSync(schedulePath);
        const scheduleJSONData = JSON.parse(scheduleRawData);

        scheduleJSONData.server.status = status;
        scheduleJSONData.server.lastUpdated = (new Date()).toUTCString();

        const updatedData = JSON.stringify(scheduleJSONData, null, 2);
        
        fs.writeFileSync(schedulePath, updatedData);
        return { failed: false, message: "Server Schedule Updated" };
    } catch (error) {
        return { failed: true, message: error.message };
    }
}

function resetScheduleJSON() { 
    try {
        const resetDataObject = {
            matches: {
                lastUpdated: null,
                status: null,
                updateSchedule: []
            },
            server: {
                lastUpdated: null,
                status: null
            }
        };
        const resetData = JSON.stringify(resetDataObject, null, 2);

        fs.writeFileSync(schedulePath, resetData);

        return { failed: false, message: "Schedule Reset" };
    } catch (error) {
        return { failed: true, message: error.message };
    }
};

function checkIfServerIsUpdating() {
    try {
        const schedule = getScheduleJSON();
        const serverUpdateStatus = schedule.server.status;
        return serverUpdateStatus === 'PENDING';
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createUpdateSchedule,
    updateMatchSchedule,
    getScheduleJSON,
    setMatchScheduleJSON,
    resetScheduleJSON,
    serverUpdateScheduleJSON,
    getTimeForNextUpdateCall,
    checkIfServerIsUpdating
}