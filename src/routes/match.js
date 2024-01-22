const router = require('express').Router();
const { updateMatches, getAllMatches, getMatchPicks, getMatchDetails } = require('../controllers/match');

router.get('/:matchId', getMatchDetails);
router.get('/', getAllMatches);
router.get('/picks/:from/:to', getMatchPicks);
router.put('/update', updateMatches);

module.exports = router