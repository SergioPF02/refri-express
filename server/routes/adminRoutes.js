const router = require('express').Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, verifyAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(verifyAdmin);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.get('/bookings', adminController.getBookings);

module.exports = router;
