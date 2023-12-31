const router = require('express').Router();

const { getPlayerDetails, getTeamPlayers } = require('../controllers/player');

router.get('/:playerId', getPlayerDetails);

router.get('/teams/:teamId', getTeamPlayers);

module.exports = router