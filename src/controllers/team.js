const Team = require("../models/Team");

async function getAllTeams(req, res) { 
    try {
        return res.status(200).json({ data: "nothing yet" });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message })
    }
};

async function getTeamDetails(req, res) { 
    try {
        return res.status(200).json({ data: "nothing yet" });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllTeams,
    getTeamDetails
}