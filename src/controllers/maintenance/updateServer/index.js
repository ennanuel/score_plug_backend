const competitionHandler = require('./competitionHandler');
const teamHandler = require('./teamHandler');
const matchesHandler = require('./matchesHandler');
const { createUpdateSchedule } = require('../../../utils/scheduler');

async function updateServer(req, res) {
    try {
        console.log("starting Competitions...");
        await competitionHandler();
        console.warn('starting Teams...');
        await teamHandler();
        console.warn('starting Matches...');
        await matchesHandler();
        console.log('success!');
        await createUpdateSchedule();
        return res.status(200).json({ message: 'Server Updated!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message })
    }
};

module.exports = updateServer