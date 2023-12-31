const axios = require('axios');

const Match = require('../../models/Match');
const H2H = require('../../models/H2H');

const { headers } = require('../../data');
const deleteRedundantMatches = require('./deleteRedundantMatches');
const { APICallsHandler, prepareForBulkWrite } = require('../../utils/match');

const THREE_DAYS_IN_MS = 259200000;
const apiHandler = APICallsHandler();

const getDateFrom = () => (new Date((new Date()).getTime() - THREE_DAYS_IN_MS)).toLocaleDateString();
const getDateTo = () => (new Date((new Date()).getTime() + THREE_DAYS_IN_MS)).toLocaleDateString();

function getDateFilters() {
    const [fromMonth, fromDay, fromYear] = getDateFrom().split('/');
    const [toMonth, toDay, toYear] = getDateTo().split('/');
    const dateFrom = `${fromYear}-${fromMonth}-${fromDay}`;
    const dateTo = `${toYear}-${toMonth}-${toDay}`;
    return { dateFrom, dateTo };
};

const checkIfIsMainMatch = (matchDate) => (new Date(matchDate)).getTime() >= (new Date(getDateFrom())).getTime();

const matchesHandler = () => new Promise(
    async function (resolve, reject) {
        try {
            const matchesToSave = await getMatchesToSave();
            await saveMainMatches(matchesToSave);
            await handleMatchesWithoutHead2Head();
            console.log('Deleting irrelevant matches...')
            await deleteRedundantMatches();
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const getMatchesToSave = () => new Promise(
    async function (resolve, reject) {
        try {
            const { dateFrom, dateTo } = getDateFilters();
            const URL = `${process.env.FOOTBALL_API_URL}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
            const matchesResult = await axios.get(URL, { headers });
            const fetchedMatches = matchesResult.data.matches;
            const savedMatches = await Match.find({ isMain: true }, '_id').lean();
            const savedMatchesIds = savedMatches.map(match => match._id);
            const filteredMatches = fetchedMatches.filter((match) => !savedMatchesIds.includes(match.id));
            console.log('matches fetched');
            resolve(filteredMatches);
        } catch (error) {
            reject(error);
        }
    }
);

function saveMainMatches(matches) {
    const mainMatches = matches.map(match => ({
        ...match,
        _id: match.id,
        competition: match.competition.id,
        homeTeam: match.homeTeam.id,
        awayTeam: match.awayTeam.id
    }));
    return Match.insertMany(mainMatches);
};

const handleMatchesWithoutHead2Head = () => new Promise(
    async function (resolve, reject) {
        try {
            const matchesWithoutH2H = await Match.find({ h2h: { $lt: 0 } });
            const preparedH2hs = matchesWithoutH2H.map(prepareMatchHeadToHead)
            const h2hToUpdate = await Promise.all(preparedH2hs);
            await H2H.bulkWrite(h2hToUpdate);
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const prepareMatchHeadToHead = (match, i) => new Promise(
    async function (resolve, reject) {
        try {
            console.log('prepareing to update: %s', match._doc._id);
            const { id, resultSet, aggregates, matches } = await getMatchHeadtoHead(match._doc._id);
            const savedH2HMatches = await saveH2HMatches(matches);
            savedH2HMatches.unshift(match._doc._id);
            const head2head = prepareForBulkWrite({ _id: id, resultSet, aggregates, matches: savedH2HMatches });
            match.isMain = checkIfIsMainMatch(match._doc.utcDate);
            match.h2h = id;
            await match.save();
            console.log('match updated: %s', match._doc._id);
            resolve(head2head);
        } catch (error) {
            reject(error);
        }
    }
);

async function getMatchHeadtoHead(matchId) {
    await apiHandler.start();
    const matchH2HResult = await axios(`${process.env.FOOTBALL_API_URL}/matches/${matchId}/head2head?limit=10`, { headers });
    apiHandler.restart();
    return matchH2HResult.data
}

const saveH2HMatches = (matches) => new Promise(
    async function (resolve, reject) {
        try {
            const matchesToSave = matches.map(match => ({
                ...match,
                _id: match.id,
                competition: match.competition.id,
                homeTeam: match.homeTeam.id,
                awayTeam: match.awayTeam.id,
            }));
            const preparedMatches = matchesToSave.map(prepareForBulkWrite);
            await Match.bulkWrite(preparedMatches);
            const savedMatchesIds = preparedMatches.map(match => match._id);
            resolve(savedMatchesIds)
        } catch (error) {
            reject(error);
        }
    }
);

module.exports = matchesHandler;