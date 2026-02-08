import { Router } from 'express';
import * as bookingController from '../controllers/bookingController';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import validate from '../middleware/validate';
import {
    createBookingSchema,
    updateBookingStatusSchema,
    updateBookingDetailsSchema,
    submitReviewSchema,
    acceptBookingSchema
} from '../utils/schemas';

const router = Router();

// Public or Protected Routes
// Adding validation middleware
router.post('/', validate(createBookingSchema), bookingController.createBooking);

router.get('/', authenticateToken, bookingController.getBookings);
router.get('/availability', bookingController.getAvailability);
router.get('/stats', bookingController.getMonthlyStats);

// Update Status (Worker/Admin)
router.put('/:id/status', authenticateToken, authorizeRole(['worker', 'admin', 'client']), validate(updateBookingStatusSchema), bookingController.updateBookingStatus);

// Accept Job (Worker)
router.put('/:id/accept', authenticateToken, authorizeRole(['worker']), validate(acceptBookingSchema), bookingController.acceptBooking);

// Release Job (Worker)
router.put('/:id/release', authenticateToken, authorizeRole(['worker']), bookingController.releaseBooking);

// Update Details (Worker/Admin)
router.put('/:id/details', authenticateToken, authorizeRole(['worker', 'admin']), validate(updateBookingDetailsSchema), bookingController.updateBookingDetails);

// Submit Review (Client)
router.put('/:id/review', authenticateToken, authorizeRole(['client']), validate(submitReviewSchema), bookingController.submitReview);

export default router;
