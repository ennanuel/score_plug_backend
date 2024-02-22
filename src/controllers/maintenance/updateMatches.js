const { fetchHandler } = require("../../helpers/fetchHandler");
const { reduceToObjectWithIdAsKeys } = require("../../helpers/reduce");

const Match = require("../../models/Match");

const { changeMatchScoreFormat } = require("../../utils/match");
const { getTimeForNextUpdateCall, updateSchedules } = require("../../utils/scheduler");

async function executeMatchUpdate() {
    try {
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

        await Promise.all(matchesToSave);
        console.log("Matches Updated!");
    } catch (error) {
        console.error(error.message);
    }
}

function updateMatches(req, res) {
    try {
        executeMatchUpdate();

        const { failed, message } = updateSchedules();
        if (failed) throw new Error(message);

        const nextUpdateCallTime = getTimeForNextUpdateCall();
        return res.status(200).json({ message: `Match update started`, nextCall: nextUpdateCallTime });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = updateMatches;