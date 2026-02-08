import express, { Router } from 'express';
import * as quotationController from '../controllers/quotationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Increase limit for PDF upload
router.use(express.json({ limit: '10mb' }));

router.post('/send', authenticateToken, quotationController.sendQuotation);

export default router;
