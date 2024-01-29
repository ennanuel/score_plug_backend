const { getActiveCompetitions, getCompetitionDetails, getCompetitionMatches, getCompetitionTeams, getCompetitionStandings, getCompetitions } = require('../controllers/competition')

const router = require('express').Router()

router.get('/', getCompetitions);
router.get('/active', getActiveCompetitions);
router.get("/:competitionId/detail", getCompetitionDetails);
router.get("/:competitionId/matches", getCompetitionMatches);
router.get("/:competitionId/teams", getCompetitionTeams);
router.get("/:competitionId/standings", getCompetitionStandings);

module.exports = router