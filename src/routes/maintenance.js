const router = (require('express')).Router();
const updateServer = require('../controllers/maintenance/updateServer/');
const updateMatches = require('../controllers/maintenance/updateMatches');

router.put('/update', updateServer);

router.put("/matches", updateMatches);

module.exports = router;