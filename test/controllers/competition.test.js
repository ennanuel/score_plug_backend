const request = require("supertest");

const app = require('../../app');

const Team = require("../../src/models/Team");
const Match = require("../../src/models/Match");
const Competition = require("../../src/models/Competition");

const { MOCK_COMPETITIONS, COMPETITION_MATCHES, MOCK_TEAMS } = require("../mocks/constants");

jest.mock("../../src/models/Team");
jest.mock("../../src/models/Match");
jest.mock("../../src/models/Competition");

describe("Getting all competitions route", () => {
    it("Should return an array of competitions in the database", async () => {
        Competition.find.mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(MOCK_COMPETITIONS)
        }));
        Team.find.mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(MOCK_TEAMS.slice(0, 2))
        }));

        const response = await request(app).get("/api/v2/competition");

        expect(response.body.length).toBe(7);
        expect(response.body[0].name).toBe("Mid Competitions");
        expect(response.body[1].teams.length).toBe(6);
        expect(response.body[2].standings.length).toBe(4);
        expect(response.body[0].standings[0].table.length).toBe(10);
    })
});

describe("Getting all competitions route", () => {
    it("Should return all competition that have matches today", async () => {
        Match.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue(COMPETITION_MATCHES)
        }));
        Competition.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue(MOCK_COMPETITIONS.filter((
                (competition) => filter._id.$in.includes(competition._id)
            )))
        }));
        Team.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue(MOCK_TEAMS.slice(0, 2))
        }));
        
        const response = await request(app).get("/api/v2/competition/active");

        expect(response.body.length).toBe(5);
        expect(response.body[0].matches[0].homeTeam.name).toBe("FC Tobacco");
    })
});

describe("Get competition details", () => {
    it("Should return a single competition data", async () => {
        Competition.findById.mockImplementation((competitionId) => ({
            lean: jest.fn().mockResolvedValue(MOCK_COMPETITIONS.find(
                (competition) => competition._id == competitionId
            ))
        }));

        const response = await request(app).get("/api/v2/competition/500/detail");

        expect(response.body.name).toBe("Mid Competitions");
        expect(response.body.matches.length).toBe(5);
        expect(response.body.standings.length).toBe(4);
    });
});

describe("Get Competition Team Standings", () => {
    it("Should return the table of the specified competition", async () => {
        Competition.findById.mockImplementation((competitionId) => ({
            lean: jest.fn().mockResolvedValue(MOCK_COMPETITIONS.find(
                (competition) => competition._id == competitionId
            ))
        }));
        Team.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue(MOCK_TEAMS.slice(0, 2))
        }));
        
        const response = await request(app).get("/api/v2/competition/500/standings");

        expect(response.body.length).toBe(4);
        expect(response.body[0].stage).toBe("KNOCKOUT");
        expect(response.body[0].table[0].team.name).toBe("FC Laziness");
    })
});

describe("Get matches for a single competition", () => {
    it("Should return an array of matches that are in competition", async () => {
        Team.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue(MOCK_TEAMS.slice(0, 2))
        }));
        Match.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue(COMPETITION_MATCHES)
        }));

        const response = await request(app).get("/api/v2/competition/500/matches");

        expect(response.body.length).toBe(5);
        expect(response.body[0].homeTeam.name).toBe("FC Tobacco");
        expect(response.body[0].awayTeam.name).toBe("FC Laziness");
    })
});

describe("Get teams that are in a competition", () => { 
    it("Should return an array teams that are participating in the specified competition", async () => {
        Competition.findById.mockImplementation((competitionId) => ({
            lean: jest.fn().mockResolvedValue(MOCK_COMPETITIONS.find(
                (competition) => competition._id == competitionId
            ))
        }));
        Team.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue(MOCK_TEAMS)
        }));

        const response = await request(app).get("/api/v2/competition/500/teams");

        expect(response.body.length).toBe(6);
        expect(response.body[0].name).toBe("FC Tobacco");
    })
});

afterAll(async () => {});