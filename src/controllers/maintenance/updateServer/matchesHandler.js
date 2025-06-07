const Match = require('../../../models/Match');
const H2H = require('../../../models/H2H');

const { fetchHandler, delay } = require('../../../helpers/fetchHandler');
const { prepareForBulkWrite, prepareMatchForUpload, refineH2HValues } = require('../../../helpers/mongoose');

const { getDateFilters } = require("../../../helpers/getDate");
const { refineMatchValues } = require("../../../helpers/mongoose");
const Team = require('../../../models/Team');

const matchesHandler = () => new Promise(
    async function (resolve, reject) {
        try {
            console.warn("Match update starting...");

            const matchesToSave = await getMatchesToSave();
            await saveMainMatches(matchesToSave);
            await handleMatchesWithoutHead2Head();

            console.log("Match update done!");
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
            const { matches } = await fetchHandler(URL);

            const savedMatches = await Match.find({ isMain: true }, '_id').lean();
            const savedMatchesIds = savedMatches.map(match => match._id);
            
            const filteredMatches = await filterMatches(matches, savedMatchesIds);
            resolve(filteredMatches);
        } catch (error) {
            reject(error);
        }
    }
);

const filterMatches = async (matches, savedMatchesIds) => {
    const teams = await Team.find({}, '_id').lean();
    const teamIds = teams.map(({ _id }) => _id);

    return matches.filter(match => (
        !savedMatchesIds.includes(match.id) && 
        teamIds.includes(match.homeTeam.id) && 
        teamIds.includes(match.awayTeam.id)
    ));
}

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
            const matchesWithoutH2H = await Match.find({
                head2head: null,
                isMain: true,
                homeTeam: { $ne: null },
                awayTeam: { $ne: null }
            }).lean();
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
            const matchesSize = matches.length;
            console.log('Preparing to updated %d matches', matchesSize);

            for (let i = 0; i < matchesSize; i++) {
                let head2head = null;
                let head2headId = null;

                const match = matches[i];
                const possibleH2HIds = [`${match.homeTeam} ${match.awayTeam}`, `${match.homeTeam} ${match.awayTeam}`];
                const similarHead2Head = await H2H.findOne({ _id: { $in: possibleH2HIds } });
                
                if(similarHead2Head) {
                    console.log(`Head-to-head already exists for match ${i + 1} - ${match._id}`);
                    head2head = prepareForBulkWrite({ ...similarHead2Head, matches: [match._id, ...similarHead2Head.matches] });
                    head2headId = similarHead2Head._id;
                } else {
                    console.log(`Preparing to update head-to-head matches for match ${i + 1} of ${matchesSize} - ${match._id}`);

                    const H2HDataURL = `${process.env.FOOTBALL_API_URL}/matches/${match._id}/head2head?limit=10`;
                    const { resultSet, aggregates, matches: h2hMatches } = await fetchHandler(H2HDataURL);

                    await delay();

                    const savedH2HMatches = await saveH2HMatches(h2hMatches);
                    const headToHeadMatchIds = [match._id, ...savedH2HMatches];

                    const id = `${match.homeTeam} ${match.awayTeam}`;
                    const h2hToSave = refineH2HValues({ id, resultSet, aggregates, matches: headToHeadMatchIds });
                    head2head = prepareForBulkWrite(h2hToSave);
                    head2headId = id;
                }

                await Match.findByIdAndUpdate(match._id, { $set: { head2head: head2headId, isHead2Head: true } });
                console.log(`Match ${i + 1} of ${matchesSize} updated - ${match._id}`);
                    
                head2heads.push(head2head);
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
            const matchesToSave = matches.map((match) => refineMatchValues({ ...match, isHead2Head: true }));
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