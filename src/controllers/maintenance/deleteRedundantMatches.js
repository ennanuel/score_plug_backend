const Match = require('../../models/Match');
const H2H = require('../../models/H2H');
const Team = require('../../models/Team');
const { reduceToObjectWithIdAsKey, reduceToArrayOfMatchIds, reduceToH2HDetails, reduceToMatchDetails } = require('../../helpers/reduce');
const { getDateFrom } = require("../../helpers/getDate");
        
const getTeams = (homeTeamId, teamId) => homeTeamId === teamId ? { main: 'home', other: 'away' } : { main: 'away', other: 'home' };
const getKeysToUpdate = ({ home, away }) => home > away ? ['wins', 'losses'] : home < away ? ['wins', 'losses'] : ['draws', 'draws'];

const deleteRedundantMatches = () => new Promise(
    async function (resolve, reject) { 
        try {
            const expiredMatches = await getExpiredMatches();
            const { teamMatchIds, h2hMatchIds } = await getAllH2HAndPreviousMatchIds(expiredMatches);
            const irrelevantMatches = await checkIrrelevantMatches({ teamMatchIds, h2hMatchIds, matches: expiredMatches });
            await Promise.all(irrelevantMatches.map(deleteH2HAndMatches));
            await deleteMatches();
            await deleteIrrelevantPreviousMatches();
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const getExpiredMatches = () => Match.find({ isMain: true, utcDate: { $lt: getDateFrom() } }).lean();

async function getAllH2HAndPreviousMatchIds(matches) {
    const matchesH2H = matches.map(({ h2h }) => h2h);
    const homeTeamIds = matches.map(({ homeTeam }) => homeTeam);
    const awayTeamIds = matches.map(({ awayTeam }) => awayTeam);
    const h2hs = await H2H.find({ _id: { $not: { $in: matchesH2H } } }).lean();
    const teams = await Team.find({ $or: [{ _id: { $not: { $in: homeTeamIds } } }, { _id: { $not: { $in: awayTeamIds } } }] }).lean();
    const teamMatchIds = teams.reduce(reduceToArrayOfMatchIds, []);
    const h2hMatchIds = h2hs.reduce(reduceToArrayOfMatchIds, []);
    return { teamMatchIds, h2hMatchIds };
};

async function checkIrrelevantMatches({ teamMatchIds, h2hMatchIds, matches }) {
    let irrelevantMatches = [];
    for (let match of matches) {
        const matchId = match._id;
        const isATeamMatch = teamMatchIds.includes(matchId);
        const isAH2HMatch = h2hMatchIds.includes(matchId);
        if (isATeamMatch) await updateTeamPreviousMatches(matchId);
        else if (isAH2HMatch) await updateHeadToHeadMatches(matchId);
        else irrelevantMatches.push(match);
    }
    return irrelevantMatches;
};

async function deleteH2HAndMatches(irrelevantMatch) {
    const h2h = await Match.findOne({ _id: { "$ne": irrelevantMatch._id }, h2h: irrelevantMatch.h2h, isMain: true });
    if (!h2h) return;
    await H2H.deleteMany({ _id: irrelevantMatch.h2h });
};

async function deleteMatches() {
    const teams = await Team.find().lean();
    const h2hs = await H2H.find().lean();
    const teamMatches = teams.reduce(reduceToArrayOfMatchIds, []);
    const h2hMatches = h2hs.reduce(reduceToArrayOfMatchIds, []);
    const allRelevantMatches = [...teamMatches, ...h2hMatches];
    return Match.deleteMany({ _id: { $not: { $in: allRelevantMatches } } });
};

async function updateTeamPreviousMatches(matchId) {
    const teams = await Team.find({ matches: { $in: matchId } });
    for (let team of teams) {
        const matches = await Match.find({ _id: { $in: teams._doc.matches }, status: 'FINISHED' }).lean();
        const teamMatches = matches.map(match => ({ ...match, teams: getTeams(match.homeTeam, team._doc._id) }));
        const { matchesPlayed, wins, draws, losses } = teamMatches.reduce(reduceToMatchDetails, { matchesPlayed: 0, wins: 0, draws: 0, losses: 0 });
        team.matchesPlayed = matchesPlayed;
        team.wins = wins;
        team.draws = draws;
        team.losses = losses;
        await team.save();
    }
};

async function updateHeadToHeadMatches(matchId) {
    const h2h = await H2H.findOne({ matches: { $in: matchId } });
    const matches = await Match.find({ _id: { $in: h2h._doc.matches }, status: 'FINISHED' });
    const initialValues = { numberOfMatches: 0, totalGoals: 0, homeTeam: 0, awayTeam: 0 };
    const { numberOfMatches, totalGoals, homeTeam, awayTeam } = matches.reduce(reduceToH2HDetails, initialValues);
    h2h.numberOfMatches = numberOfMatches;
    h2h.totalGoals = totalGoals;
    h2h.homeTeam = homeTeam;
    h2h.awayTeam = awayTeam;
    await h2h.save();
};

async function deleteIrrelevantPreviousMatches() {
    const teams = await Team.find({}, { _id: 1 }).lean();
    const matchIdsInArray = await Promise.all(teams.map(getTeamMatches));
    const matchesWithTheirPositionForEachTeam = matchIdsInArray.reduce(reduceToObjectWithIdAsKey, {});
    console.log(matchesWithTheirPositionForEachTeam);
    for (let [matchId, matchPositions] of Object.entries(matchesWithTheirPositionForEachTeam)) {
        if (matchPositions.some(position => position < 4)) continue;
        await Match.deleteOne({ _id: matchId });
    }
}

async function getTeamMatches (team) {
    const teamPrevMatches = await Match.find(
        {
            isPrevMatch: true,
            isHead2Head: { $ne: true },
            $or: [
                { awayTeam: team._id },
                { homeTeam: team._id }
            ]
        }
    ).sort({ utcDate: -1 }).lean();
    const prevMatchesIds = teamPrevMatches.map(match => match._id);
    return prevMatchesIds;
}

module.exports = deleteRedundantMatches;