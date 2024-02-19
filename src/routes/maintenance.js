const router = (require('express')).Router();
const updateServer = require('../controllers/maintenance/updateServer/');
const updateMatches = require('../controllers/maintenance/updateMatches');

router.put('/update/server', updateServer);

router.put("/update/match", updateMatches);

module.exports = router;