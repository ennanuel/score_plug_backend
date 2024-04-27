const { getFromToDates } = require('../helpers/getDate');
const Match = require('../models/Match');


async function liveUpdate (req, res) { 
    const { startDate, endDate } = getFromToDates();
    const matches = await Match
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
};

module.exports = liveUpdate