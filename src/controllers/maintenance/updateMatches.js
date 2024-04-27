const { default: axios } = require("axios");
const { fetchHandler } = require("../../helpers/fetchHandler");
const { reduceToObjectWithIdAsKeys } = require("../../helpers/reduce");

const Match = require("../../models/Match");

const { changeMatchScoreFormat } = require("../../utils/match");
const { getTimeForNextUpdateCall, updateMatchSchedule, checkIfServerIsUpdating } = require("../../utils/scheduler");
const { getFromToDates } = require("../../helpers/getDate");

const { io } = require("../../../app");

async function executeMatchUpdate() {
    try {
        const serverIsUpdating = checkIfServerIsUpdating();
        if (serverIsUpdating) throw new Error("Daily Server Update is running");

        var status;
        const { matches } = await fetchHandler(`${process.env.FOOTBALL_API_URL}/matches`);
        const matchIds = matches.map(match => match.id);
        const matchesObjectWithIdAsKey = matches.reduce(reduceToObjectWithIdAsKeys, {});
        const matchesInDB = await Match.find({ _id: { $in: matchIds } });
        const matchesToSave = [];

        for (const match of matchesInDB) {
            const matchWithUpdatedValue = matchesObjectWithIdAsKey[match._id];

            if (matchWithUpdatedValue.lastUpdated === match._doc.lastUpdated) continue;
            match.status = matchWithUpdatedValue.status;
            match.score = changeMatchScoreFormat(matchWithUpdatedValue.score);
            match.lastUpdated = matchWithUpdatedValue.lastUpdated;
            matchesToSave.push(match.save());
        };

        updatedMatches = await Promise.all(matchesToSave);
        console.log("%s Matches Updated!", updatedMatches.length);

        axios.get('/live-update');
        
        status = 'SUCCESS';
    } catch (error) {
        console.error(error.message);
        status = 'FAILED';
    } finally {
        updateMatchSchedule(status);

        const { dateFrom, dateTo } = getFromToDates();
        const matches = await Match
            .find({ 
                $and: [
                    { utcDate: { lte: dateTo } },
                    { utcDate: { gt: dateFrom } }
                ]
             })
            .lean();
        
        io.emit('match-update', matches);
    }
}

function updateMatches(req, res) {
    try {
        executeMatchUpdate();

        const nextUpdateCallTime = getTimeForNextUpdateCall();

        return res.status(200).json({ message: `Match update started`, nextCall: nextUpdateCallTime });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = updateMatches;