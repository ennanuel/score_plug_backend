const Match = require('../../../models/Match');
const H2H = require('../../../models/H2H');
const Team = require('../../../models/Team');
const { reduceToH2HDetails, reduceToMatchDetails } = require('../../../helpers/reduce');
const { getMatchPrediction, rearrangeMatchScore, getMatchTeams, getMatchHead2Head } = require('../../../utils/match');
const { prepareForBulkWrite } = require('../../../helpers/mongoose');
        
const assignMainAndOtherTeam = (homeTeamId, teamId) => homeTeamId === teamId ? { main: 'home', other: 'away' } : { main: 'away', other: 'home' };

const calculationHandler = () => new Promise(
    async function (resolve, reject) { 
        try {
            console.warn("Starting calculations...");

            console.warn("Updating Head to Heads");
            await updateHeadToHeadMatches();

            console.warn("Updating Team previous matches");
            await updateTeamPreviousMatches();

            console.warn("Calculating match outcomes...");
            await updateMatchesOutcomes();

            console.log("Calculations done!");
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

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

            console.log(expandedMatches.map((match) => match.head2head.aggregates));
            console.log(matchesWithHead2Head.map((match) => ({ homeTeam: match.homeTeam, awayTeam: match.awayTeam })))

            const matchesWithOutcome = matchesWithHead2Head.map(getMatchPrediction);
            const preparedMatches = matchesWithOutcome.map(prepareForBulkWrite);
            await Match.bulkWrite(preparedMatches);
            resolve();
        } catch (error) {
            reject(error);
        }
    }
)

module.exports = calculationHandler;