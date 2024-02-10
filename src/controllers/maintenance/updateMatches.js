const { fetchHandler } = require("../../helpers/fetchHandler");
const { reduceToObjectWithIdAsKeys } = require("../../helpers/reduce");
const Match = require("../../models/Match");

async function updateMatches(req, res) {
    try {
        const { matches } = await fetchHandler(`${process.env.FOOTBALL_API_URL}/matches`);
        const matchIds = matches.map(match => match.id);
        const matchesObjectWithIdAsKey = matches.reduce(reduceToObjectWithIdAsKeys);
        const matchesInDB = await Match.find({ _id: { $in: matchIds } });
        const matchesToSave = []
        for (const match of matchesInDB) {
            const matchWithUpdatedValue = matchesObjectWithIdAsKey[match._id];
            if (matchWithUpdatedValue.lastUpdated === match.lastUpdated) continue;
            match.status = matchWithUpdatedValue.status;
            match.score = matchWithUpdatedValue.score;
            match.lastUpdated = matchWithUpdatedValue.lastUpdated;
            matchesToSave.push(match.save());
        }
        const updatedMatches = await Promise.all(matchesToSave);
        return res.status(200).json({ message: `${updatedMatches.length} matches updated!` });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = updateMatches;