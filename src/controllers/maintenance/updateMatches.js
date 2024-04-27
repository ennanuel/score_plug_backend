const { default: axios } = require("axios");
const { fetchHandler } = require("../../helpers/fetchHandler");
const { reduceToObjectWithIdAsKeys } = require("../../helpers/reduce");

const Match = require("../../models/Match");

const { changeMatchScoreFormat } = require("../../utils/match");
const { getTimeForNextUpdateCall, updateMatchSchedule, checkIfServerIsUpdating } = require("../../utils/scheduler");

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

        const updatedMatches = await Promise.all(matchesToSave);
        console.log("%s Matches Updated!", updatedMatches.length);

        axios.get('/live-update');
        
        status = 'SUCCESS';
    } catch (error) {
        console.error(error.message);
        status = 'FAILED';
    } finally {
        updateMatchSchedule(status);
    }
}

function updateMatches(req, res, next) {
    try {
        executeMatchUpdate();

        const nextUpdateCallTime = getTimeForNextUpdateCall();
        req.nextCall = nextUpdateCallTime;
        
        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = updateMatches;