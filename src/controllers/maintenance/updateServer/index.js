const competitionHandler = require('./competitionHandler');
const teamHandler = require('./teamHandler');
const matchesHandler = require('./matchesHandler');
const { createUpdateSchedule, serverUpdateScheduleJSON, resetScheduleJSON, getScheduleJSON } = require('../../../utils/scheduler');
const { checkServerScheduleDateAndStatus } = require('../../../helpers/getDate');

async function runFunctionsToUpdateServer() {
    try { 
        resetScheduleJSON();

        console.log("starting Competitions...");
        await competitionHandler();

        console.warn('starting Teams...');
        await teamHandler();

        console.warn('starting Matches...');
        await matchesHandler();

        console.log('success!');
        await createUpdateSchedule();
        
        serverUpdateScheduleJSON("SUCCESS");
    } catch (error) {
        console.error(error);
        serverUpdateScheduleJSON("FAILED");
    }
}

async function updateServer(req, res) {
    try {
        const schedule = getScheduleJSON();
        const serverIsUpToDate = checkServerScheduleDateAndStatus(schedule.server.lastUpdated, schedule.server.status);
        
        if (serverIsUpToDate) throw new Error('Server up to date');

        runFunctionsToUpdateServer();
        return res.status(200).json({ message: 'Update Started!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message })
    }
};

module.exports = updateServer