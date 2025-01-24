const Match = require('../../../models/Match');
const H2H = require('../../../models/H2H');
const Team = require('../../../models/Team');
const { reduceToObjectWithIdAsKey, reduceToH2HDetails, reduceToMatchDetails } = require('../../../helpers/reduce');
const { getDateFrom } = require("../../../helpers/getDate");
const { getMatchPrediction, rearrangeMatchScore, getMatchTeams, getMatchHead2Head } = require('../../../utils/match');
const { prepareForBulkWrite } = require('../../../helpers/mongoose');
        
const assignMainAndOtherTeam = (homeTeamId, teamId) => homeTeamId === teamId ? { main: 'home', other: 'away' } : { main: 'away', other: 'home' };

const deleteHandler = () => new Promise(
    async function (resolve, reject) { 
        try {
            await handleIrrelevantMatches();
            await handleOutdatedHead2Head();
            
            const deletedMatches = await deleteRedundantMatches();
            console.warn('match delete data:', deletedMatches);

            console.warn("Updating Head to Heads");
            await updateHeadToHeadMatches();

            console.warn("Updating Team previous matches");
            await updateTeamPreviousMatches();

            console.warn("Calculating match outcomes...");
            await updateMatchesOutcomes();
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

async function handleIrrelevantMatches() {
    await handleExpiredH2HMatches();
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

async function handleExpiredH2HMatches() {
    const h2hs = await H2H.find({}, 'matches');

    for(let h2h of h2hs) {
        const matches = await Match
            .find({ _id: { $in: h2h.matches } })
            .sort({ utcDate: -1 });
        
        await Match.updateMany({ _id: { $in: matches.slice(5, ) } }, { $set: { isHead2Head: false } });
        await Match.updateMany({ _id: { $in: matches.slice(0, 5) } }, { $set: { isHead2Head: true } });
    }
};


async function handleOutdatedHead2Head() {
    const outdatedMatches = await checkAndUpdateMainMatches();
    let deletedH2Hs = 0;

    for(let match of outdatedMatches) {
        const otherMatchesWithSameHead2Head = await Match.countDocuments({ 
            head2head: match.head2head,
            status: "TIMED"
        });

        if(Boolean(otherMatchesWithSameHead2Head)) continue;
        const head2headToDelete = await H2H.findById(match.head2head);
        
        await Match.updateMany({ 
            _id: { 
                $in: head2headToDelete.matches 
            } 
        }, { isHead2Head: false, head2head: null });

        await head2headToDelete.remove();
        deletedH2Hs++
    };
    
    console.warn('%d Head-to-Heads deleted', deletedH2Hs);
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
}).lean();

const updateExpiredMatches = (matchIds) => {
    return Match.updateMany({ _id: { $in: matchIds } }, { isMain: false });
};


function deleteRedundantMatches () {
    return Match.deleteMany({ isPrevMatch: false, isHead2Head: false, isMain: false });
}


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

async function updateTeamPreviousMatches() {
    const teams = await Team.find().lean();
    const matchesToUpdate = [];

    for (const team of teams) {
        const matches = await Match.find({
            $or: [{ homeTeam: team._id }, { awayTeam: team._id }],
            status: 'FINISHED'
        }).lean();

        const teamMatches = matches.map(match => ({ ...match, teams: assignMainAndOtherTeam(match.homeTeam, team._id) }));
        const initialValues = {
            matchesPlayed: 0,
            firstHalf: { wins: 0, draws: 0, losses: 0, goalsScored: 0, goalsConceded: 0 },
            fullTime: { wins: 0, draws: 0, losses: 0, goalsScored: 0, goalsConceded: 0 }
        };

        const { matchesPlayed, firstHalf, fullTime } = teamMatches.reduce(reduceToMatchDetails, initialValues);
        const updatedTeam = { ...team, matchesPlayed, halfTime: firstHalf, fullTime };

        const matchIds = matches.map(match => match._id);
        matchesToUpdate.push(...matchIds);

        await Team.findByIdAndUpdate(team._id, { $set: updatedTeam });
    };

    return Match.updateMany({ _id: { $in: matchesToUpdate } }, { $set: { isPrevMatch: true } });
};

async function updateHeadToHeadMatches() {
    const matchesToUpdate = [];
    const headToHeads = await H2H.find().lean();

    for (const headToHead of headToHeads) {
        if (headToHead.aggregates) {
            const matches = await Match.find({
                $or: [
                    { homeTeam: headToHead.aggregates.homeTeam, awayTeam: headToHead.aggregates.awayTeam },
                    { awayTeam: headToHead.aggregates.homeTeam, homeTeam: headToHead.aggregates.awayTeam }
                ],
                status: 'FINISHED'
            }).lean();

            const initialValues = {
                numberOfMatches: 0,
                firstHalf: {
                    homeTeam: { id: headToHead.aggregates.homeTeam, wins: 0, draws: 0, losses: 0, totalGoals: 0 },
                    awayTeam: { id: headToHead.aggregates.awayTeam, wins: 0, draws: 0, losses: 0, totalGoals: 0 }
                },
                fullTime: {
                    homeTeam: { id: headToHead.aggregates.homeTeam, wins: 0, draws: 0, losses: 0, totalGoals: 0 },
                    awayTeam: { id: headToHead.aggregates.awayTeam, wins: 0, draws: 0, losses: 0, totalGoals: 0 }
                }
            };
            const { numberOfMatches, firstHalf, fullTime } = matches
                .map(match => rearrangeMatchScore(match, headToHead.aggregates))
                .reduce(reduceToH2HDetails, initialValues);

            headToHead.aggregates.numberOfMatches = numberOfMatches;
            headToHead.aggregates.halfTime = firstHalf;
            headToHead.aggregates.fullTime = fullTime;

            const matchIds = matches.map(match => match._id);
            matchesToUpdate.push(...matchIds);

            headToHead.matches = matchIds;
            await H2H.findByIdAndUpdate(headToHead._id, { $set: headToHead });
        } else {
            await H2H.findByIdAndDelete(headToHead._id);
            await Match.updateMany({ head2head: headToHead._id }, { $set: { head2head: null } });
        }
    }

    return Match.updateMany({ _id: { $in: matchesToUpdate } }, { $set: { isHead2Head: true }});
};


const updateMatchesOutcomes = () => new Promise(
    async function (resolve, reject) {
        try {
            const matches = await Match.find({
                isMain: true,
                head2head: { $ne: null },
                homeTeam: { $ne: null },
                awayTeam: { $ne: null },
                $or: [
                    { predictions: null },
                    { predictions: undefined }
                ]
            }).lean();

            console.log('%d matches found', matches.length);

            const matchesToExpand = matches.map(getMatchTeams);
            const expandedMatches = await Promise.all(matchesToExpand);

            const matchesToGetHead2Head = expandedMatches.map(getMatchHead2Head);
            const matchesWithHead2Head = await Promise.all(matchesToGetHead2Head);

            const matchesWithOutcome = matchesWithHead2Head.map(getMatchPrediction);
            const preparedMatches = matchesWithOutcome.map(prepareForBulkWrite);
            await Match.bulkWrite(preparedMatches);
            resolve();
        } catch (error) {
            reject(error);
        }
    }
)

module.exports = deleteHandler;