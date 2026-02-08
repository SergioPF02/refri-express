const router = require('express').Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/auth');

// Public or Client
router.post('/', bookingController.createBooking);
router.get('/availability', bookingController.getAvailability);
router.get('/stats', bookingController.getMonthlyStats);
router.get('/', authenticateToken, bookingController.getBookings); // Protected & Filtered in Controller

// Protected (Client/Worker)
router.put('/:id/accept', authenticateToken, bookingController.acceptBooking);
router.put('/:id/release', authenticateToken, bookingController.releaseBooking);
router.put('/:id/status', authenticateToken, bookingController.updateBookingStatus);
router.put('/:id/details', authenticateToken, bookingController.updateBookingDetails);
router.put('/:id/review', authenticateToken, bookingController.submitReview);

module.exports = router;
