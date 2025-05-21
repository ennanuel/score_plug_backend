const { ONE_DAY_IN_MS, THREE_DAYS_IN_MS } = require('../constants');

const getYesterdayDate = () => new Date((new Date()).getTime() - ONE_DAY_IN_MS);
const getTodayDate = () => (new Date(Date.now()));
const getTomorrowDate = (date = (new Date())) => new Date(date.getTime() + ONE_DAY_IN_MS);

const getDateFrom = () => (new Date((new Date()).getTime() - THREE_DAYS_IN_MS));
const getDateTo = () => (new Date((new Date()).getTime() + THREE_DAYS_IN_MS));

function getDateFilters() {
    const fromDate = getDateFrom();
    const toDate = getDateTo();
    const dateFrom = `${fromDate.getFullYear()}-${convertToTimeNumber(fromDate.getMonth() + 1)}-${convertToTimeNumber(fromDate.getDate())}`;
    const dateTo = `${toDate.getFullYear()}-${convertToTimeNumber(toDate.getMonth() + 1)}-${convertToTimeNumber(toDate.getDate())}`;
    return { dateFrom, dateTo };
};

function getFromToDates(from, to) {
    let fromDate, toDate;
    if (from) fromDate = new Date(from);
    else fromDate = new Date();
    if (to) toDate = new Date(to);
    else toDate = getTomorrowDate(fromDate);
    return { startDate: fromDate.toDateString(), endDate: toDate.toDateString() };
};

const convertToTimeNumber = (time) => `0${time}`.substring(String(time).length - 1, String(time).length + 1);

const checkMatchScheduleDate = (scheduleDate) => (new Date(scheduleDate)).toDateString() === (new Date()).toDateString();

module.exports = {
    getYesterdayDate,
    getTodayDate,
    getTomorrowDate,
    getFromToDates,
    getDateFrom,
    getDateTo,
    getDateFilters,
    convertToTimeNumber,
    checkMatchScheduleDate
}