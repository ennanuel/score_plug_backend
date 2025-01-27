const competitionHandler = require('./competitionHandler');
const teamHandler = require('./teamHandler');
const matchesHandler = require('./matchesHandler');
const calculationHandler = require('./calculationHandler');
const deleteHandler = require('./deleteHandler');

const { createUpdateSchedule, updateServerScheduleJSON, setServerUpdateHistory, checkServerScheduleDateAndStatus } = require('../../../utils/scheduler');
const H2H = require('../../../models/H2H');
const Match = require('../../../models/Match');

async function runFunctionsToUpdateServer() {
    try { 
        updateServerScheduleJSON("PENDING");
        const initialMatchCount = await Match.countDocuments();
        const initialH2HCount = await H2H.countDocuments();

        console.log("Starting server update...");

        await competitionHandler();
        await teamHandler();
        await matchesHandler();

        const intermittentMatchCount = await Match.countDocuments()
        const intermittentH2HCount = await H2H.countDocuments()

        await deleteHandler();
        await calculationHandler();

        const finalMatchCount = await Match.countDocuments()
        const finalH2HCount = await H2H.countDocuments();

        const matchesAdded = intermittentMatchCount - initialMatchCount;
        const matchesDeleted = intermittentMatchCount - finalMatchCount;
        const headToHeadsAdded = intermittentH2HCount - initialH2HCount;
        const headToHeadsDeleted = intermittentH2HCount - finalH2HCount;

        setServerUpdateHistory({ 
            matchesAdded, 
            matchesDeleted, 
            headToHeadsAdded, 
            headToHeadsDeleted, 
            totalMatches: finalMatchCount, 
            totalHeadToHeads: finalH2HCount 
        });

        console.log('Server updated!');

        await createUpdateSchedule();

        updateServerScheduleJSON("SUCCESS");
    } catch (error) {
        console.error(error);
        updateServerScheduleJSON("FAILED");
    }
}

async function updateServer(req, res) {
    try {
        const serverIsUpToDate = checkServerScheduleDateAndStatus();
        
        if (serverIsUpToDate) return res.status(409).json({ message: 'Server up to date' });

        runFunctionsToUpdateServer();
        return res.status(200).json({ message: 'Update Started!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message })
    }
};

module.exports = updateServer