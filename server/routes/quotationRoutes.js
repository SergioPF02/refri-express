const router = require('express').Router();
const quotationController = require('../controllers/quotationController');
const { authenticateToken } = require('../middleware/auth');
const express = require('express');

// Increase limit for PDF upload
router.use(express.json({ limit: '10mb' }));

router.post('/send', authenticateToken, quotationController.sendQuotation);

module.exports = router;
