const Match = require("../../src/models/Match");
const { createUpdateSchedule, getScheduleJSON, setScheduleJSON, resetScheduleJSON } = require("../../src/utils/scheduler");

jest.mock("../../src/models/Match");

describe("Test for scheduler function", () => { 
    it("Should update the data in the schedule json file", () => {
        const newSchedule = [
            {
                start: "Starting Date",
                end: "End Date"
            },
            {
                start: "Starting Date",
                end: "End Date"
            }
        ];
        setScheduleJSON(newSchedule);

        const udpatedScheduleJSON = getScheduleJSON();
        expect(udpatedScheduleJSON.matchUpdateSchedule.length).toBe(2);
        resetScheduleJSON()
    });

    it("Should return an array of the schedules of the matches should be updated", async () => { 
        Match.find.mockImplementation((filter) => ({
            sort: () => ({
                lean: () => [
                    { _id: 123, utcDate: "01/21/2024 01:00" },
                    { _id: 123, utcDate: "01/21/2024 02:00" },
                    { _id: 123, utcDate: "01/21/2024 03:00" },
                    { _id: 123, utcDate: "01/21/2024 04:00" },
                    { _id: 123, utcDate: "01/21/2024 05:00" },
                    { _id: 123, utcDate: "01/21/2024 08:00" },
                    { _id: 123, utcDate: "01/21/2024 11:00" },
                    { _id: 123, utcDate: "01/21/2024 11:30" },
                ]
            })
        }));

        await createUpdateSchedule();
        const schedule = getScheduleJSON();
        const startTime = (new Date(schedule.matchUpdateSchedule[0].start)).toLocaleTimeString();
        const endTime = (new Date(schedule.matchUpdateSchedule[1].end)).toLocaleTimeString();

        expect(schedule.matchUpdateSchedule.length).toBe(3);
        expect(startTime).toBe("11:00:00 AM");
        expect(endTime).toBe("10:18:00 AM");
        resetScheduleJSON();
    });
});