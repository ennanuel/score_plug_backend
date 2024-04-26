const router = (require('express')).Router();

const { getFromToDates } = require('../helpers/getDate');
const Match = require('../models/Match');


router.get('/', async function (req, res) { 
    const { startDate, endDate } = getFromToDates();
    const matches = Match
        .find({
            status: { $regex: /(^timed)/i },
            $and: [
                { utcDate: { $lte: endDate } },
                { utcDate: { $gt: startDate } }
            ]
        })
        .lean();

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    res.write(`data: ${JSON.stringify(matches)}`);
});

module.exports = router;