const dotenv = require('dotenv');

const Match = require('../../models/Match');
const H2H = require('../../models/H2H');
const Team = require('../../models/Team');

dotenv.config();

const THREE_DAYS_IN_MS = 259200000;

const getDateFrom = () => new Date((new Date()).getTime() - THREE_DAYS_IN_MS);

const deleteRedundantMatches = () => new Promise(
    async function (resolve, reject) { 
        try {
            const expiredMatches = await getExpiredMatches();
            const { teamMatchIds, h2hMatchIds } = await getAllH2HAndPreviousMatchIds(expiredMatches);
            const irrelevantMatches = await checkIrrelevantMatches({ teamMatchIds, h2hMatchIds, matches: expiredMatches });
            await Promise.all(irrelevantMatches.map(deleteH2HAndMatches));
            await deleteMatches();
            resolve();
        } catch (error) {
            reject(error);
        }
    }
);

const getExpiredMatches = () => Match.find({ isMain: true, utcDate: { $lt: getDateFrom().toDateString() } }).lean();

async function getAllH2HAndPreviousMatchIds(matches) {
    const matchesH2H = matches.map(({ h2h }) => h2h);
    const homeTeamIds = matches.map(({ homeTeam }) => homeTeam);
    const awayTeamIds = matches.map(({ awayTeam }) => awayTeam);
    const h2hs = await H2H.find({ _id: { $not: { $in: matchesH2H } } }).lean();
    const teams = await Team.find({ $or: [{ _id: { $not: { $in: homeTeamIds } } }, { _id: { $not: { $in: awayTeamIds } } }] }).lean();
    const teamMatchIds = teams.reduce(reduceMatchId, []);
    const h2hMatchIds = h2hs.reduce(reduceMatchId, []);
    return { teamMatchIds, h2hMatchIds };
};

async function checkIrrelevantMatches({ teamMatchIds, h2hMatchIds, matches }) {
    let irrelevantMatches = [];
    for (let match of matches) {
        const matchId = convertObjectIdToString(match._id);
        const isATeamMatch = teamMatchIds.map(convertObjectIdToString).includes(matchId);
        const isAH2HMatch = h2hMatchIds.map(convertObjectIdToString).includes(matchId);
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
    const teamMatches = teams.reduce(reduceMatchId, []);
    const h2hMatches = h2hs.reduce(reduceMatchId, []);
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

function reduceToMatchDetails(matchDetails, match) {
    let { matchesPlayed, wins, draws, losses } = matchDetails;
    const lostMatch = match.score.fullTime[match.teams.main] < match.score.fullTime[match.teams.other];
    const wonMatch = match.score.fullTime[match.teams.main] > match.score.fullTime[match.teams.other];
    const drewMatch = match.score.fullTime[match.teams.main] == match.score.fullTime[match.teams.other];
    matchesPlayed += 1;
    if (wonMatch) wins += 1;
    else if (drewMatch) draws += 1;
    else if (lostMatch) draws += 1;
    return { matchesPlayed, wins, draws, losses };
};

function reduceToH2HDetails(H2HDetails, match) {
    let { numberOfMatches, totalGoals, homeTeam, awayTeam } = H2HDetails;
    const [homeTeamKey, awayTeamKey] = getKeysToUpdate(match.score.fullTime);
    numberOfMatches += 1;
    totalGoals += (match.score.fullTime.home + match.score.fullTime.away);
    homeTeam = { ...homeTeam, [homeTeamKey]: homeTeam[homeTeamKey] + 1 };
    awayTeam = { ...awayTeam, [awayTeamKey]: awayTeam[awayTeamKey] + 1 };
    return { numberOfMatches, totalGoals, homeTeam, awayTeam };
}
        
const convertObjectIdToString = (objectId) => objectId;
const reduceMatchId = (matchIds, { matches }) => [...matchIds, ...matches];
const getTeams = (homeTeamId, teamId) => homeTeamId === teamId ? { main: 'home', other: 'away' } : { main: 'away', other: 'home' };
const getKeysToUpdate = ({ home, away }) => home > away ? ['wins', 'losses'] : home < away ? ['wins', 'losses'] : ['draws', 'draws'];

module.exports = deleteRedundantMatches;