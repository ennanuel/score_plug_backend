const { getScheduleJSON } = require("../utils/scheduler");
const route = require('express').Router();


function getSchedule(req, res) {
    try {
        const schedule = getScheduleJSON();
        res.status(200).json(schedule)
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

router.get('/', getSchedule);

module.exports = route