const competitionHandler = require('./competitionHandler');
const teamHandler = require('./teamHandler');
const matchesHandler = require('./matchesHandler');

async function updateServer(req, res) {
    try {
        console.warn('starting Competitions...');
        await competitionHandler();
        console.warn('starting Teams...');
        await teamHandler();
        console.warn('starting Matches...');
        await matchesHandler();
        console.log('success!')
        return res.status(200).json({ message: 'Server Updated!' });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: error.message })
    }
};

module.exports = updateServer