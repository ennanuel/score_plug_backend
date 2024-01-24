const router = require('express').Router();
const { updateMatches, getAllMatches, getMatchPicks, getMatchDetails } = require('../controllers/match');

router.get('/:matchId', getMatchDetails);
router.get('/', getAllMatches);
router.get('/prediction/outcomes', getMatchPicks);
router.put('/update', updateMatches);

module.exports = router