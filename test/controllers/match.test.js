const request = require('supertest');
const app = require('../../app');
const Match = require('../../src/models/Match');
const Team = require("../../src/models/Team");
const H2H = require("../../src/models/H2H");
const Competition = require("../../src/models/Competition");
const { MOCK_MATCHES, MATCH_SCORE, MATCH_OUTCOME, MOCK_TEAMS, MOCK_HEAD_TO_HEAD } = require('../mocks/constants');
const { getMatchPrediction } = require('../../src/utils/match');

jest.mock('../../src/models/Match');
jest.mock("../../src/models/Team");
jest.mock("../../src/models/H2H");
jest.mock("../../src/models/Competition");

describe("Testing Match Route that fetches a single match from the Database", () => {
    it('should return details of a match', async () => {
        Match.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue([
                { _id: 123, homeTeam: 200, awayTeam: 201, head2head: "124125", competition: 2345, score: MATCH_SCORE, outcome: MATCH_OUTCOME },
                { _id: 234, homeTeam: 200, awayTeam: 201, head2head: "234567", competition: 2345, score: MATCH_SCORE, outcome: MATCH_OUTCOME },
            ])
        }));
        Team.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue([
                { _id: 200, name: "FC Barcelona" },
                { _Id: 201, name: "Chelsea FC" }
            ])
        }));
        Match.findById.mockImplementation((id) => ({
            lean: jest.fn().mockResolvedValue({ _id: 123, homeTeam: 200, awayTeam: 201, head2head: "124125", competition: 2345, score: MATCH_SCORE, outcome: MATCH_OUTCOME })
        }));
        H2H.findById.mockImplementation((id) => ({
            lean: jest.fn().mockResolvedValue({ _id: "124125", aggregates: { homeTeam: { id: 124 }, awayTeam: { id: 125 } }, matches: [12345, 12346] })
        }));
        Competition.findById.mockImplementation((id) => ({
            lean: jest.fn().mockResolvedValue({ _id: 2345, name: "The Mid League", area: { name: "Nigeria" } })
        }));
        
        const response = await request(app).get('/api/v2/match/123');
        
        expect(response.status).toBe(200);
        expect(response.body._id).toBe(123);
        expect(response.body.homeTeam.name).toBe("FC Barcelona");
        expect(response.body.competition.name).toBe("The Mid League");
        expect(response.body.head2head._id).toBe("124125");
        expect(response.body.head2head.matches.length).toBe(2);
        expect(response.body.homeTeam.previousMatches.length).toBe(2);
        expect(response.body.awayTeam.previousMatches.length).toBe(2);
    });

    it('should handle errors and return a 500 status code when no match is found', async () => {
        Match.findById.mockImplementation((id) => ({ lean: jest.fn().mockResolvedValue(null) }));

        const response = await request(app).get('/api/v2/match/123');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'No matches found' });
    });

    it('should handle errors and return a 500 status code', async () => {
        Match.findById.mockImplementation((id) => ({ lean: jest.fn().mockRejectedValue((new Error('Database error'))) }));

        const response = await request(app).get('/api/v2/match/123');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Database error' });
    });
});


describe("Testing Match Route that fetches a matches from the Database, with the 'from', 'to' and 'status' query filters", () => {
    const matchFilterFunction = (filter) => ({
        limit: (limit) => ({
            skip: (skip) => ({
                lean: jest.fn().mockResolvedValue(MOCK_MATCHES.filter(
                    (data) => (
                        filter.$and[0].status.$regex.test(data.status) &&
                        (new Date(filter.$and[1].utcDate.$gte)).getTime() <= (new Date(data.utcDate)).getTime() &&
                        (new Date(filter.$and[2].utcDate.$lte)).getTime() >= (new Date(data.utcDate)).getTime()
                    )
                ))
            })
        }),
        lean: jest.fn().mockResolvedValue(MOCK_MATCHES.filter(
            (data) => (
                filter.$and[0].status.$regex.test(data.status) &&
                (new Date(filter.$and[1].utcDate.$gte)).getTime() <= (new Date(data.utcDate)).getTime() &&
                (new Date(filter.$and[2].utcDate.$lte)).getTime() >= (new Date(data.utcDate)).getTime()
            )
        )),
        count: jest.fn().mockResolvedValue(10)
    });
    const teamFindMock = (filter) => ({
        lean: () => jest.fn().mockResolvedValue([
            { _id: 200, name: "FC Barcelona" },
            { _id: 201, name: "Chelsea FC" }
        ])
    });
    const competitionFindByIdMock = (filter) => ({
        lean: () => jest.fn().mockResolvedValue({ _id: 2345, name: "The Mid League", area: { name: "Nigeria" } })
    });

    Team.find.mockImplementation(teamFindMock);
    Competition.findById.mockImplementation(competitionFindByIdMock);

    it("should return matches whose dates match today's date", async () => {
        Match.find.mockImplementation(matchFilterFunction);

        const response = await request(app).get("/api/v2/match");


        expect(response.status).toBe(200);
        expect(response.body.totalPages).toBe(2);
        expect(typeof (response.body.matches[0].homeTeam.name)).toBe("string");
    });

    it("should return matches whose dates match the 'from' and 'to' date queries in 'MM/DD/YYYY' format", async () => {
        Match.find.mockImplementation(matchFilterFunction);

        const response = await request(app).get("/api/v2/match?from=01/23/2023&to=01/23/2023");

        expect(response.status).toBe(200);
        expect(response.body.matches.length).toBe(6);
    });

    it("should return matches whose dates match the status of 'FINISHED' and 'from' and 'to' date queries", async () => {
        Match.find.mockImplementation(matchFilterFunction);

        const response = await request(app).get("/api/v2/match?from=01/23/2023&to=01/23/2023&status=finished");

        expect(response.status).toBe(200);
        expect(response.body.matches.length).toBe(1);
        expect(response.body.matches.every(data => /finished/i.test(data.status))).toBe(true);
    });

    it("should return matches whose dates match the status of 'IN_PLAY' and 'from' and 'to' date queries", async () => {
        Match.find.mockImplementation(matchFilterFunction);

        const response = await request(app).get("/api/v2/match?from=01/23/2023&to=01/23/2023&status=in_play");

        expect(response.status).toBe(200);
        expect(response.body.matches.length).toBe(4);
        expect(response.body.matches.every(data => /in_play|pause/i.test(data.status))).toBe(true);
    });

    it("should return matches whose dates match the 'from' and 'to' date queries", async () => {
        Match.find.mockImplementation(matchFilterFunction);

        const todaysDate = (new Date()).toLocaleDateString();
        const response = await request(app).get(`/api/v2/match?from=01/20/2023&to=${todaysDate}`);

        expect(response.status).toBe(200);
        expect(response.body.matches.length).toBe(12);
    });
});

describe("Testing Match Route that fetches a matches from the Database, and returns the matches and their outcomes", () => {
    const matches = [
        { _id: 123, homeTeam: 200, awayTeam: 201, head2head: "200201", competition: 2345, score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: (new Date()).toLocaleDateString() },
        { _id: 124, homeTeam: 200, awayTeam: 201, head2head: "200201", competition: 2346, score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: (new Date()).toLocaleDateString() },
        { _id: 125, homeTeam: 200, awayTeam: 201, head2head: "200201", competition: 2347, score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: (new Date()).toLocaleDateString() },
        { _id: 126, homeTeam: 200, awayTeam: 201, head2head: "200201", competition: 2348, score: MATCH_SCORE, outcome: MATCH_OUTCOME, utcDate: (new Date()).toLocaleDateString() }
    ];
    const matchFilterFunction = (filter) => ({
        limit: (limit) => ({
            skip: (skip) => ({
                lean: jest.fn().mockResolvedValue(matches)
            })
        }),
        lean: jest.fn().mockResolvedValue(matches),
        count: jest.fn().mockResolvedValue(4)
    });
    const teamFindMock = (filter) => ({
        lean: jest.fn().mockResolvedValue([
            { _id: 200, name: "FC Barcelona", matchesPlayed: 3, wins: 1, draws: 0, losses: 2 },
            { _id: 201, name: "Chelsea FC", matchesPlayed: 4, wins: 2, draws: 1, losses: 1 }
        ])
    });
    const competitionFindByIdMock = (filter) => ({
        lean: jest.fn().mockResolvedValue({ _id: 2345, name: "The Mid League", area: { name: "Nigeria" } })
    });
    const head2headFindByIdMock = (id) => ({
        lean: jest.fn().mockResolvedValue({
            _id: "124125",
            aggregates: {
                numberOfMatches: 4,
                totalGoals: 25,
                homeTeam: { id: 200, wins: 2, draws: 1, losses: 1 },
                awayTeam: { id: 201, wins: 1, draws: 1, losses: 2 }
            },
            matches: [12345, 12346, 123457, 123458]
        })
    });

    it("should return matches and their predicted outcome", async () => {
        Match.find.mockImplementation(matchFilterFunction);
        Team.find.mockImplementation(teamFindMock);
        Competition.findById.mockImplementation(competitionFindByIdMock);
        H2H.findById.mockImplementation(head2headFindByIdMock);

        const response = await request(app).get("/api/v2/match/prediction/outcomes");

        const { halfTime, fullTime } = response.body.matches[0].outcome;
        const totalHalfTimeOutcomePercentage = Math.round(halfTime.outcome.homeWin + halfTime.outcome.draw + halfTime.outcome.awayWin);
        const totalFullTimeOutcomePercentage = Math.round(fullTime.outcome.homeWin + fullTime.outcome.draw + fullTime.outcome.awayWin);
        const totalHalfTimeGoalsPercentage15 = Math.round(halfTime.goals["1.5"].over + halfTime.goals["1.5"].under);
        const totalFullTimeGoalsPercentage15 = Math.round(fullTime.goals["1.5"].over + fullTime.goals["1.5"].under);

        expect(response.status).toBe(200);
        expect(totalHalfTimeOutcomePercentage).toBe(100);
        expect(totalFullTimeOutcomePercentage).toBe(100);
        expect(totalHalfTimeGoalsPercentage15).toBe(100);
        expect(totalFullTimeGoalsPercentage15).toBe(100);
    });
})


describe("Test for calculating match outcome", () => { 
    it("", () => {
        const homeTeam = MOCK_TEAMS[2];
        const awayTeam = MOCK_TEAMS[1];
        const matchDetails = { ...MOCK_MATCHES[0], homeTeam, awayTeam, head2head: MOCK_HEAD_TO_HEAD };
        const { predictions } = getMatchPrediction(matchDetails);

        expect(Math.round(predictions.halfTime.goals["_1.5"].over + predictions.halfTime.goals["_1.5"].under)).toBe(100);
        expect(Math.round(predictions.halfTime.outcome.homeWin + predictions.halfTime.outcome.draw + predictions.halfTime.outcome.awayWin)).toBe(100);
    })
});