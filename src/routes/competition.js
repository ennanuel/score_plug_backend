const { getAllCompetitions, getActiveCompetitions, getCompetitionDetails } = require('../controllers/competition')

const router = require('express').Router()

router.get('/', getAllCompetitions);
router.get('/active', getActiveCompetitions);
router.get('/single/:competition', getCompetitionDetails);

module.exports = router