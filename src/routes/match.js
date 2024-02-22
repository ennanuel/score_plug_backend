const router = require('express').Router();
const { getAllMatches, getMatchPicks, getMatchDetails } = require('../controllers/match');

router.get('/:matchId', getMatchDetails);
router.get('/', getAllMatches);
router.get('/prediction/outcomes', getMatchPicks);

module.exports = router