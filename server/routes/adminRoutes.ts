import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticateToken, verifyAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(verifyAdmin);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.get('/bookings', adminController.getBookings);

export default router;
