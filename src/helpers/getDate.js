const { ONE_DAY_IN_MS, THREE_DAYS_IN_MS } = require('../constants');

const getYesterdayDate = () => new Date((new Date()).getTime() - ONE_DAY_IN_MS);
const getTodayDate = () => (new Date(Date.now()));
const getTomorrowDate = (date = (new Date())) => new Date(date.getTime() + ONE_DAY_IN_MS);

const getDateFrom = () => (new Date((new Date()).getTime() - THREE_DAYS_IN_MS)).toLocaleDateString();
const getDateTo = () => (new Date((new Date()).getTime() + THREE_DAYS_IN_MS)).toLocaleDateString();

function getDateFilters() {
    const [fromMonth, fromDay, fromYear] = getDateFrom().split('/');
    const [toMonth, toDay, toYear] = getDateTo().split('/');
    const dateFrom = `${fromYear}-${convertToTimeNumber(fromMonth)}-${convertToTimeNumber(fromDay)}`;
    const dateTo = `${toYear}-${convertToTimeNumber(toMonth)}-${convertToTimeNumber(toDay)}`;
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

const convertToTimeNumber = (time) => Number(time) < 10 ? '0' + time : time;

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