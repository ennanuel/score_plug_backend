const competitionHandler = require('./competitionHandler');
const teamHandler = require('./teamHandler');
const matchesHandler = require('./matchesHandler');

async function updateServer(req, res) {
    try {
        await competitionHandler();
        console.warn('starting Matches...');
        await matchesHandler();
        console.warn('starting Teams...');
        await teamHandler();
        console.log('success!')
        return res.status(200).json({ message: 'Server Updated!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message })
    }
};

module.exports = updateServer