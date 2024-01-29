const router = require('express').Router();
const { getAllTeams, getTeamDetails, getTeamMatches, getTeamPlayers } = require('../controllers/team')

router.get('/', getAllTeams);
router.get('/:teamId', getTeamDetails);
router.get("/:teamId/matches", getTeamMatches);
router.get("/:teamId/squad", getTeamPlayers);

module.exports = router