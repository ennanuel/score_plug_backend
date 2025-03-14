const fs = require("fs");
const { getTodayDate, getTomorrowDate, checkMatchScheduleDate } = require("../helpers/getDate");
const { reduceMatchToUpdateSchedule } = require("../helpers/reduce");
const Match = require("../models/Match");
const path = require("path");
const { ONE_MINUTE_IN_MS, THIRTY_ONE_DAYS_IN_MS, ONE_DAY_IN_MS } = require("../constants");

const schedulePath = path.join(__dirname, "../controllers/maintenance/schedule.json");

async function createUpdateSchedule() { 
    try {
        const currentSchedule = getScheduleJSON();
        const isToday = checkMatchScheduleDate(currentSchedule.lastUpdated);

        if (isToday) throw new Error("Schedule for today has already been created");

        const todaysDate = getTodayDate().toISOString();
        const tomorrowsDate = getTomorrowDate().toISOString();
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

        const updatedData = JSON.stringify(scheduleJSONData, null, 3);
        
        fs.writeFileSync(schedulePath, updatedData);
        return { failed: false, message: "Natch Schedule Updated" };
    } catch (error) {
        return { failed: true, message: error.message };
    }
}

function updateServerScheduleJSON(status) { 
    try {
        const scheduleRawData = fs.readFileSync(schedulePath);
        const scheduleJSONData = JSON.parse(scheduleRawData);

        scheduleJSONData.server.status = status;
        scheduleJSONData.server.lastUpdated = (new Date()).toUTCString();

        const updatedData = JSON.stringify(scheduleJSONData, null, 3);
        
        fs.writeFileSync(schedulePath, updatedData);
        return { failed: false, message: "Server Schedule Updated" };
    } catch (error) {
        return { failed: true, message: error.message };
    }
};

const getFilteredScheduleHistory = () => {
    const schedule = getScheduleJSON();
    const result = schedule.updateHistory.filter((history) => (
        (new Date((new Date(history.date)).toDateString())).getTime() >= (new Date((new Date(Date.now() - THIRTY_ONE_DAYS_IN_MS)).toDateString()))
    ));

    return result
}

function resetScheduleJSON() { 
    try {
        const filteredScheduleHistory = getFilteredScheduleHistory();
        const resetDataObject = {
            matches: {
                lastUpdated: null,
                status: null,
                updateSchedule: []
            },
            server: {
                lastUpdated: null,
                status: null
            },
            updateHistory: filteredScheduleHistory
        };
        const resetData = JSON.stringify(resetDataObject, null, 3);

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

const checkServerScheduleDateAndStatus = () => {
    const schedule = getScheduleJSON();
    (Date.now() - (new Date(schedule.server.lastUpdated)).getTime()) < ONE_DAY_IN_MS && schedule.server.status === 'SUCCESS'
};


function setServerUpdateHistory({ matchesAdded, matchesDeleted, totalMatches, headToHeadsAdded, headToHeadsDeleted, totalHeadToHeads }) {
    try {
        const schedule = getScheduleJSON();
        const status = schedule.server.status;
        const historyIndex = schedule
            .updateHistory
            .findIndex((history) => (new Date(history.date)).toLocaleDateString() === (new Date(schedule.server.lastUpdated)).toLocaleDateString());

        if(schedule.updateHistory[historyIndex]) {
            schedule.updateHistory[historyIndex] = {
                date: schedule.server.lastUpdated,
                matchesAdded,
                matchesDeleted,
                totalMatches,
                headToHeadsAdded,
                headToHeadsDeleted,
                totalHeadToHeads,
                status
            }
        } else {
            const newHistory = { 
                date: schedule.server.lastUpdated, 
                matchesAdded, 
                matchesDeleted,
                totalMatches,
                headToHeadsAdded,
                headToHeadsDeleted,
                totalHeadToHeads,
                status
            };
            schedule.updateHistory = [newHistory, ...schedule.updateHistory]
        }

        const stringifiedSchedule = JSON.stringify(schedule, null, 3);
        fs.writeFileSync(schedulePath, stringifiedSchedule);

        return { failed: false, message: "Schedule history updated"}
    } catch (error) {
        console.error(error);
        return { failed: true, message: error.message };
    }
};

module.exports = {
    checkServerScheduleDateAndStatus,
    createUpdateSchedule,
    updateMatchSchedule,
    getScheduleJSON,
    setMatchScheduleJSON,
    resetScheduleJSON,
    updateServerScheduleJSON,
    getTimeForNextUpdateCall,
    checkIfServerIsUpdating,
    setServerUpdateHistory
}