import { Router } from 'express';
import * as authController from '../controllers/authController';
import rateLimit from 'express-rate-limit';

const router = Router();

// Specific stricter limit for Auth (Login/Register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Max 10 login attempts per 15 min
    message: "Demasiados intentos de inicio de sesión, por favor intente de nuevo en 15 minutos."
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

export default router;
