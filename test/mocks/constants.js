const MATCH_SCORE = {
    duration: "REGULAR",
    winner: null,
    firstHalf: {
        homeTeam: 1,
        awayTeam: 3
    },
    secondHalf: {
        homeTeam: null,
        awayTeam: null,
    },
    fullTime: {
        homeTeam: 1,
        awayTeam: 3
    }
}

const MATCH_OUTCOME = {
    halfTime: {
        outcome: {
            homeWin: 33.33,
            draw: 33.33,
            awayWin: 33.33
        },
        goals: {
            "1.5": {
                over: 50.00,
                under: 50.00
            },
            "2.5": {
                over: 50.00,
                under: 50.00
            },
            "3.5": {
                over: 50.00,
                under: 50.00
            },
        }
    },
    fullTime: {
        outcome: {
            homeWin: 33.33,
            draw: 33.33,
            awayWin: 33.33
        },
        goals: {
            "1.5": {
                over: 50.00,
                under: 50.00
            },
            "2.5": {
                over: 50.00,
                under: 50.00
            },
            "3.5": {
                over: 50.00,
                under: 50.00
            },
        }
    }
}

const MOCK_MATCHES = [
    { _id: 123, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "FINISHED", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: "01/21/2023" },
    { _id: 126, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "FINISHED", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: "02/21/2023" },
    { _id: 129, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "FINISHED", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: "01/23/2023" },
    { _id: 132, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "IN_PLAY", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: "01/23/2023" },
    { _id: 135, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "IN_PLAY", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: "01/23/2023" },
    { _id: 138, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "IN_PLAY", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: "01/23/2023" },
    { _id: 141, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "PAUSED", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: "01/23/2023" },
    { _id: 144, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "UPCOMING", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: "01/23/2023" },
    { _id: 147, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "UPCOMING", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: "01/24/2023" },
    { _id: 150, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "CANCELLED", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: "01/25/2023" },
    { _id: 153, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "UPCOMING", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: (new Date()).toLocaleDateString() },
    { _id: 156, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "ONGOING", score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: (new Date()).toLocaleDateString() }
];

const TABLE = [
    { team: 236, position: 1, playedGames: 10, won: 6, draw: 2, lost: 2, points: 20, goalsFor: 30, goalsAgainst: 5 },
    { team: 236, position: 2, playedGames: 10, won: 6, draw: 1, lost: 3, points: 19, goalsFor: 22, goalsAgainst: 7 },
    { team: 236, position: 3, playedGames: 10, won: 6, draw: 0, lost: 4, points: 18, goalsFor: 26, goalsAgainst: 5 },
    { team: 236, position: 4, playedGames: 10, won: 5, draw: 3, lost: 2, points: 18, goalsFor: 21, goalsAgainst: 5 },
    { team: 236, position: 5, playedGames: 10, won: 5, draw: 2, lost: 3, points: 17, goalsFor: 15, goalsAgainst: 2 },
    { team: 236, position: 6, playedGames: 10, won: 5, draw: 0, lost: 5, points: 15, goalsFor: 20, goalsAgainst: 10 },
    { team: 236, position: 7, playedGames: 10, won: 5, draw: 0, lost: 5, points: 15, goalsFor: 18, goalsAgainst: 9 },
    { team: 236, position: 8, playedGames: 10, won: 4, draw: 2, lost: 4, points: 14, goalsFor: 16, goalsAgainst: 8 },
    { team: 236, position: 9, playedGames: 10, won: 2, draw: 2, lost: 6, points: 8, goalsFor: 14, goalsAgainst: 10 },
    { team: 236, position: 10, playedGames: 10, won: 0, draw: 0, lost: 10, points: 0, goalsFor: 2, goalsAgainst: 25 },
];

const STANDINGS = [
    { stage: "KNOCKOUT", type: "CUP", group: "F", table: TABLE },
    { stage: "KNOCKOUT", type: "CUP", group: "G", table: TABLE },
    { stage: "KNOCKOUT", type: "CUP", group: "Q", table: TABLE },
    { stage: "KNOCKOUT", type: "CUP", group: "N", table: TABLE },
];

const MOCK_PLAYERS = [
    { _id: 1000, name: "Jim" },
    { _id: 1001, name: "Pam" },
    { _id: 1002, name: "Michael Scott" },
    { _id: 1003, name: "Dwyte Schrutte" },
    { _id: 1004, name: "Phyllis" },
    { _id: 1005, name: "Daryll" },
    { _id: 1006, name: "Eric Forman" },
    { _id: 1007, name: "Fez" },
    { _id: 1008, name: "Dona Pinciotti" },
    { _id: 1009, name: "Hyde" }
];

const playerIds = MOCK_PLAYERS.map(player => player._id);

const teamMatchOutcomes1 = { 
    wins: 1, draws: 1, losses: 1, goalsScored: 1, goalsConceded: 3
}

const teamMatchOutcomes2 = { 
    wins: 2, draws: 0, losses: 1, goalsScored: 5, goalsConceded: 2
}

const MOCK_TEAMS = [
    { _id: 235, name: "FC Tobacco", squad: playerIds, matchesPlayed: 3, halfTime: teamMatchOutcomes2, fullTime: teamMatchOutcomes1 },
    { _id: 236, name: "FC Laziness", squad: playerIds, matchesPlayed: 3, halfTime: teamMatchOutcomes1, fullTime: teamMatchOutcomes1 },
    { _id: 235, name: "FC Tobacco", squad: playerIds, matchesPlayed: 3, halfTime: teamMatchOutcomes2, fullTime: teamMatchOutcomes1 },
    { _id: 236, name: "FC Laziness", squad: playerIds, matchesPlayed: 3, halfTime: teamMatchOutcomes1, fullTime: teamMatchOutcomes1 },
    { _id: 235, name: "FC Tobacco", squad: playerIds, matchesPlayed: 3, halfTime: teamMatchOutcomes2, fullTime: teamMatchOutcomes1 },
    { _id: 236, name: "FC Laziness", squad: playerIds, matchesPlayed: 3, halfTime: teamMatchOutcomes1, fullTime: teamMatchOutcomes1 }
];

const COMPETITION_MATCHES = [
    { _id: 234, homeTeam: 235, awayTeam: 236, competition: 500, score: MATCH_SCORE, outcome: MATCH_OUTCOME },
    { _id: 334, homeTeam: 235, awayTeam: 236, competition: 501, score: MATCH_SCORE, outcome: MATCH_OUTCOME },
    { _id: 444, homeTeam: 235, awayTeam: 236, competition: 502, score: MATCH_SCORE, outcome: MATCH_OUTCOME },
    { _id: 554, homeTeam: 235, awayTeam: 236, competition: 503, score: MATCH_SCORE, outcome: MATCH_OUTCOME },
    { _id: 664, homeTeam: 235, awayTeam: 236, competition: 504, score: MATCH_SCORE, outcome: MATCH_OUTCOME }
];

const MATCH_IDS = COMPETITION_MATCHES.map(({ _id }) => _id);

const MOCK_COMPETITIONS = [
    { _id: 500, name: "Mid Competitions", type: "LEAGUE", area: { name: "Ojuelegba" }, teams: MOCK_TEAMS, standings: STANDINGS, matches: MATCH_IDS },
    { _id: 501, name: "I Dunno League", type: "CUP", area: { name: "Ojuelegba" }, teams: MOCK_TEAMS, standings: STANDINGS, matches: MATCH_IDS },
    { _id: 502, name: "Roughers League", type: "LEAGUE", area: { name: "Ojuelegba" }, teams: MOCK_TEAMS, standings: STANDINGS, matches: MATCH_IDS },
    { _id: 503, name: "Super League", type: "CUP", area: { name: "Ojuelegba" }, teams: MOCK_TEAMS, standings: STANDINGS, matches: MATCH_IDS },
    { _id: 504, name: "Wasted Clubs Leauge", type: "CUP", area: { name: "Ojuelegba" }, teams: MOCK_TEAMS, standings: STANDINGS, matches: MATCH_IDS },
    { _id: 505, name: "Unemployed League", type: "CUP", area: { name: "Ikeja" }, teams: MOCK_TEAMS, standings: STANDINGS, matches: MATCH_IDS },
    { _id: 506, name: "Players Cup", type: "CUP", area: { name: "Ojuelegba" }, teams: MOCK_TEAMS, standings: STANDINGS, matches: MATCH_IDS },
];

const MOCK_HEAD_TO_HEAD = {
    _id: "123456",
    aggregates: {
        numberOfMatches: 5,
        halfTime: {
            homeTeam: {
                id: 235,
                wins: 1,
                draws: 2,
                losses: 2,
                totalGoals: 10
            },
            awayTeam: {
                id: 236,
                wins: 2,
                draws: 2,
                losses: 1,
                totalGoals: 10
            }
        },
        fullTime: {
            homeTeam: {
                id: 235,
                wins: 1,
                draws: 2,
                losses: 2,
                totalGoals: 10
            },
            awayTeam: {
                id: 236,
                wins: 2,
                draws: 2,
                losses: 1,
                totalGoals: 10
            }
        }
    },
    matches: MOCK_MATCHES
}

module.exports = {
    MATCH_SCORE,
    MATCH_OUTCOME,
    MOCK_MATCHES,
    MOCK_COMPETITIONS,
    MOCK_TEAMS,
    MOCK_PLAYERS,
    COMPETITION_MATCHES,
    MOCK_HEAD_TO_HEAD
}