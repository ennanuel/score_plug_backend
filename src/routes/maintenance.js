const router = (require('express')).Router();
const updateServer = require('../controllers/maintenance/updateServer/');
const updateMatches = require('../controllers/maintenance/updateMatches');
const { verifyAuthToken } = require('../utils/verify');
const liveUpdate = require('../controllers/liveUpdate');

router.put('/update/server', verifyAuthToken, updateServer);

router.put("/update/match", verifyAuthToken, updateMatches, liveUpdate);

module.exports = router;