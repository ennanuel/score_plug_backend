const router = require('express').Router();
const { getAllTeams, getTeamDetails } = require('../controllers/team')

router.get('/', getAllTeams);

router.get('/:teamId', getTeamDetails)

module.exports = router