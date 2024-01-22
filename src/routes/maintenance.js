const router = (require('express')).Router();
const updateServer = require('../controllers/maintenance');

router.put('/update', updateServer);

module.exports = router;