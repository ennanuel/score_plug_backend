const request = require("supertest");

const app = require('../../app');

const Team = require("../../src/models/Team");
const Match = require("../../src/models/Match");
const Competition = require("../../src/models/Competition");
const Player = require("../../src/models/Player");

const { MOCK_TEAMS, COMPETITION_MATCHES, MOCK_COMPETITIONS, MOCK_PLAYERS } = require("../mocks/constants");

jest.mock("../../src/models/Team");
jest.mock("../../src/models/Match");
jest.mock("../../src/models/Competition");
jest.mock("../../src/models/Player");

describe("Get teams stored in the database", () => { 
    const teamFindMock = (filter) => ({
        sort: (sortBy) => ({
            limit: (limit) => ({
                skip: (skip) => ({
                    lean: jest.fn().mockResolvedValue(MOCK_TEAMS.slice(skip, skip + limit))
                })
            }),
            count: jest.fn().mockResolvedValue(MOCK_TEAMS.length)
        })
    });

    it("Should return an array of teams with pagination", async () => {
        Team.find.mockImplementation(teamFindMock);

        const response = await request(app).get("/api/v2/team");

        expect(response.body.totalPages).toBe(6);
        expect(response.body.teams.length).toBe(6);
        expect(response.body.currentPage).toBe(0);
    });

    it("Should return an array of teams with pagination based on the specified query", async () => {
        Team.find.mockImplementation(teamFindMock);

        const response = await request(app).get("/api/v2/team?page=1&limit=2");
        
        expect(response.body.totalPages).toBe(6);
        expect(response.body.teams.length).toBe(2);
        expect(response.body.currentPage).toBe(1);
    });

    it("Should return an empty array if wrong page and limit values are passed", async () => {
        Team.find.mockImplementation(teamFindMock);

        const response = await request(app).get("/api/v2/team?page=WRONG_NUMBER&limit=WRONG_NUMBER");
        
        expect(response.body.totalPages).toBe(6);
        expect(response.body.teams.length).toBe(0);
        expect(response.body.currentPage).toBe(0);
    });
});

describe("Get details of a single team", () => { 
    const teamFindByIdMock = (teamId) => ({
        lean: jest.fn().mockResolvedValue(MOCK_TEAMS.find(team => team._id == teamId))
    });

    it("Should return an object containing details of a single team", async () => {
        Team.findById.mockImplementation(teamFindByIdMock);

        const response = await request(app).get("/api/v2/team/236");

        expect(response.status).toBe(200);
        expect(response.body.name).toBe("FC Laziness");
    });

    it("Should throw an error since the id does not exist", async () => {
        Team.findById.mockImplementation(teamFindByIdMock);

        const response = await request(app).get("/api/v2/team/WRONG_TEAM_ID");

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: "No teams found" });
    })
});

describe("Get matches team is participating in", () => { 
    it("Should return an array of matches team would play", async () => {
        Team.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue(MOCK_TEAMS.slice(0, 2))
        }));
        Match.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue(COMPETITION_MATCHES)
        }));
        Competition.findById.mockImplementation((competitionId) => ({
            lean: jest.fn().mockResolvedValue(MOCK_COMPETITIONS.find(
                (competition) => competition._id == competitionId
            ))
        }));

        const response = await request(app).get("/api/v2/team/236/matches");

        expect(response.body.length).toBe(5);
        expect(response.body[0].competition.name).toBe("Mid Competitions");
        expect(response.body[0].homeTeam.name).toBe("FC Tobacco");
        expect(response.body[0].awayTeam.name).toBe("FC Laziness");
    })
});

describe("Get players in a team", () => {
    it("Should return an array of players in the specified team", async () => {
        Team.findById.mockImplementation((teamId) => ({
            lean: jest.fn().mockResolvedValue(MOCK_TEAMS.find(
                team => team._id == teamId
            ))
        }));
        Player.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue(MOCK_PLAYERS)
        }));

        const response = await request(app).get("/api/v2/team/236/squad");

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(10);
        expect(response.body[0].name).toBe("Jim");
        expect(response.body[1].name).toBe("Pam");
        expect(response.body[2].name).toBe("Michael Scott");
    });
    
    it("Should return an object contain error message", async () => {
        Team.findById.mockImplementation((teamId) => ({
            lean: jest.fn().mockResolvedValue(MOCK_TEAMS.find(
                team => team._id == teamId
            ))
        }));
        Player.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue(MOCK_PLAYERS)
        }));

        const response = await request(app).get("/api/v2/team/INVALID_TEAM_ID/squad");

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: "No teams found" });
    });
});