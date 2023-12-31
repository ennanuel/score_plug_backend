const router = (require('express')).Router();
const updateServer = require('../controllers/maintenance');

router.post('/update', updateServer);

module.exports = router;