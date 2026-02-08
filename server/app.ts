import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

// Use default or named imports depending on how they are exported.
// Since we are converting routes to TS, we will adjust them to export default router or named.
// Assuming we will convert them to: export default router;
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import bookingRoutes from './routes/bookingRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import quotationRoutes from './routes/quotationRoutes';

const app: Express = express();

// Required for Render (or any proxy) to correctly identify client IP
// Triggering new deployment
app.set('trust proxy', 1);

// Security Headers
app.use(helmet());

// Global Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'capacitor://localhost',
    process.env.FRONTEND_URL, // Allow configured frontend
    process.env.CLIENT_URL    // Alternative name
].filter(Boolean); // Remove undefined values

app.use(cors({
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            // Disallow untrusted origins
            // return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
            // For development, we might be lenient or just strict. Let's be strict for security.
            // If the user uses a new port, they must add it here.

            // However, to avoid breaking the user's dev flow immediately if they use a random port:
            // return callback(null, true); // TEMPORARY DEV

            // I will implement the Strict version as requested by "Security Audit".
            return callback(new Error('Bloqueado por CORS'), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

// Routes
// We need to cast these if the routes aren't fully typed yet, but assuming they return a Router.
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/quotations', quotationRoutes);

// file upload setup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

export default app;
