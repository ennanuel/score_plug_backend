const Match = require('../../models/Match');
const H2H = require('../../models/H2H');

const deleteRedundantMatches = require('./deleteRedundantMatches');
const { fetchHandler, delay } = require('../../helpers/fetchHandler');
const { prepareForBulkWrite, prepareMatchForUpload } = require('../../helpers/mongoose');

const { getDateFilters } = require("../../helpers/getDate");
const { refineMatchValues } = require("../../helpers/mongoose");
const { checkIfIsMainMatch } = require("../../utils/match")

const matchesHandler = () => new Promise(
    async function (resolve, reject) {
        try {
            const matchesToSave = await getMatchesToSave();

            await saveMainMatches(matchesToSave);
            await handleMatchesWithoutHead2Head();

            console.log('Deleting irrelevant matches...');
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
            const URL = `${process.env.FOOTBALL_API_URL}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
            const matchesResult = await fetchHandler(URL);
            const fetchedMatches = matchesResult.matches;
            const savedMatches = await Match.find({ isMain: true }, '_id').lean();
            const savedMatchesIds = savedMatches.map(match => match._id);
            const filteredMatches = fetchedMatches.filter(match => !savedMatchesIds.includes(match.id));
            resolve(filteredMatches);
        } catch (error) {
            reject(error);
        }
    }
);

const saveMainMatches = (matches) => new Promise(
    async function (resolve, reject) {
        try {
            const mainMatches = matches.map((match) => refineMatchValues({ ...match, isMain: true, head2head: null }));
            const matchesToSave = mainMatches.map(prepareMatchForUpload);
            await Promise.all(matchesToSave);
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const handleMatchesWithoutHead2Head = () => new Promise(
    async function (resolve, reject) {
        try {
            const matchesWithoutH2H = await Match.find({ head2head: null, isMain: true });
            const h2hToUpdate = await prepareMatchHeadToHead(matchesWithoutH2H);
            await H2H.bulkWrite(h2hToUpdate);
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const prepareMatchHeadToHead = (matches) => new Promise(
    async function (resolve, reject) {
        try {
            const head2heads = [];
            for (let match of matches) {
                console.log('preparing to update: %s', match._doc._id);
                const H2HDataURL = `${process.env.FOOTBALL_API_URL}/matches/${match._doc._id}/head2head?limit=10`
                const { resultSet, aggregates, matches } = await fetchHandler(H2HDataURL);
                const savedH2HMatches = await saveH2HMatches(matches);
                savedH2HMatches.unshift(match._doc._id);
                const id = `${match._doc.homeTeam}${match._doc.awayTeam}`;
                const head2head = prepareForBulkWrite({ _id: id, resultSet, aggregates, matches: savedH2HMatches });
                match.isMain = checkIfIsMainMatch(match._doc.utcDate);
                match.head2head = id;
                await match.save();
                console.log('match updated: %s', match._doc._id);
                head2heads.push(head2head);
                await delay();
            }
            resolve(head2heads);
        } catch (error) {
            reject(error);
        }
    }
);

const saveH2HMatches = (matches) => new Promise(
    async function (resolve, reject) {
        try {
            const matchesToSave = matches.map(match => ({
                ...match,
                _id: match.id,
                isHead2Head: true,
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