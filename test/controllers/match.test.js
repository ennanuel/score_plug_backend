const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../..');
const Match = require('../../src/models/Match');
const Team = require("../../src/models/Team");
const H2H = require("../../src/models/H2H");

jest.mock('../../src/models/Match');
jest.mock("../../src/models/Team");
jest.mock("../../src/models/H2H");

describe("Testing Match Route that fetches a single match from the Database", () => {
    it('should return details of a match', async () => {
        Match.findById.mockImplementation((id) => ({
            lean: jest.fn().mockResolvedValue({ _id: 123, homeTeam: 124, awayTeam: 125, head2head: 124125 })
        }));
        Match.find.mockImplementation((filter) => ({
            lean: jest.fn().mockResolvedValue([
                { _id: 123, homeTeam: 124, awayTeam: 125, head2head: "124125" },
                { _id: 234, homeTeam: 234, awayTeam: 567, head2head: 234567 },
            ])
        }));
        Team.find.mockImplementation((id) => ({
            lean: jest.fn().mockResolvedValue([
                { _id: 124, name: "FC Barcelona" },
                { _Id: 125, name: "Chelsea FC" }
            ])
        }));
        H2H.findById.mockImplementation((id) => ({
            lean: jest.fn().mockResolvedValue({ _id: "124125", aggregates: { homeTeam: 124, awayTeam: 125 }, matches: [12345, 12346] })
        }));
        
        const response = await request(app).get('/api/v2/match/123');

        expect(response.status).toBe(200);
        expect(response.body._id).toBe(123);
        expect(response.body.homeTeam.name).toBe("FC Barcelona");
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

afterAll(async () => {
  await mongoose.connection.close();
});
