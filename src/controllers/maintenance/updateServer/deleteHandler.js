const Match = require('../../../models/Match');
const H2H = require('../../../models/H2H');
const Team = require('../../../models/Team');
const { reduceToObjectWithIdAsKey } = require('../../../helpers/reduce');
const { getDateFrom } = require("../../../helpers/getDate");
        

const deleteHandler = () => new Promise(
    async function (resolve, reject) { 
        try {
            console.warn('Deleting irrelevant matches and Head-to-Head...');

            await handleIrrelevantMatches();
            await handleOutdatedHead2Head();
            await deleteRedundantMatches();

            console.log("Deleting done!");
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

async function handleIrrelevantMatches() {
    console.warn("Checking expired Head-to-Head matches...");
    await handleExpiredH2HMatches();

    console.warn("Checking expired previous matches");
    await handleExpiredPreviousMatches();
};

async function handleExpiredPreviousMatches() {
    const teams = await Team.find({}, "_id").lean();
    const arrayOfPreviousMatchIds = await Promise.all(teams.map(getTeamPreviousMatchIds));

    const matchesWithTheirPositionForEachTeam = arrayOfPreviousMatchIds.reduce(reduceToObjectWithIdAsKey, {});

    for (let [matchId, matchPositions] of Object.entries(matchesWithTheirPositionForEachTeam)) {
        if (matchPositions.some(position => position < 4)) continue;
        await Match.findByIdAndUpdate(matchId, { isPrevMatch: false });
    }
};

async function getTeamPreviousMatchIds (team) {
    const teamPrevMatches = await Match.find(
        {
            isPrevMatch: true,
            $or: [
                { awayTeam: team._id },
                { homeTeam: team._id }
            ]
        }
    ).sort({ utcDate: -1 }).lean();

    const prevMatchesIds = teamPrevMatches.map(match => match._id);
    return prevMatchesIds;
};

async function handleExpiredH2HMatches() {
    const h2hs = await H2H
        .find({}, 'matches')
        .lean();

    for(let h2h of h2hs) {
        const matches = await Match
            .find({ 
                _id: { 
                    $in: h2h.matches 
                },
                status: {
                    $ne: "TIMED"
                }
            })
            .sort({ utcDate: -1 })
            .lean();

        const matchIds = matches.map((match) => match._id);
        
        await Match.updateMany({ _id: { $in: matchIds.slice(5, ) } }, { $set: { isHead2Head: false } });
        await Match.updateMany({ _id: { $in: matchIds.slice(0, 5) } }, { $set: { isHead2Head: true } });
    }
};


async function handleOutdatedHead2Head() {
    const outdatedMatches = await checkAndUpdateMainMatches();
    const head2HeadsToDelete = [];

    for(let match of outdatedMatches) {
        const otherMatchesWithSameHead2Head = await Match.countDocuments({ 
            head2head: match.head2head,
            status: "TIMED"
        });

        if(Boolean(otherMatchesWithSameHead2Head)) continue;
        const head2headToDelete = await H2H.findById(match.head2head).lean();

        if(!head2headToDelete) continue;
        
        await Match.updateMany({ 
            _id: { 
                $in: head2headToDelete.matches 
            } 
        }, { isHead2Head: false, head2head: null });

        head2HeadsToDelete.push(head2headToDelete._id);
    };
    
    await H2H.deleteMany({ _id: { $in: head2HeadsToDelete }});
    console.warn('%d Head-to-Heads deleted', head2HeadsToDelete.length);
};

async function checkAndUpdateMainMatches() {
    const expiredMatches = await getExpiredMatches();
    console.warn('%d expired matches found', expiredMatches.length);

    const expiredMatchIds = expiredMatches.map((match) => match._id);
    await updateExpiredMatches(expiredMatchIds);
    return expiredMatches;
};

const getExpiredMatches = () => Match.find({ 
    isMain: true,
    utcDate: { 
        $lt: (new Date(getDateFrom())).toISOString()
    }
}, "_id head2head").lean();

const updateExpiredMatches = (matchIds) => {
    return Match.updateMany({ _id: { $in: matchIds } }, { isMain: false });
};


async function deleteRedundantMatches () {
    const deletedMatches = await Match.deleteMany({ 
        $or: [
            {
                isPrevMatch: false, 
                isHead2Head: false, 
                isMain: false 
            },
            { homeTeam: null },
            { awayTeam: null }
        ]
    });
    console.log('%d matches deleted', deletedMatches.deletedCount);
}

module.exports = deleteHandler;