const competitionHandler = require('./competitionHandler');
const teamHandler = require('./teamHandler');
const matchesHandler = require('./matchesHandler');
const { createUpdateSchedule } = require('../../../utils/scheduler');

async function runFunctionsToUpdateServer() {
    try { 
        console.log("starting Competitions...");
        await competitionHandler();
        console.warn('starting Teams...');
        await teamHandler();
        console.warn('starting Matches...');
        await matchesHandler();
        console.log('success!');
        await createUpdateSchedule();
    } catch (error) {
        console.error(error);
    }
}

async function updateServer(req, res) {
    try {
        runFunctionsToUpdateServer();
        return res.status(200).json({ message: 'Update Started!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message })
    }
};

module.exports = updateServer