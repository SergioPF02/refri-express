import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import validate from '../middleware/validate';
import { updateUserProfileSchema, updateDeviceTokenSchema } from '../utils/schemas';

const router = Router();

// File upload setup
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, uploadsDir)
    },
    filename: function (req: any, file: any, cb: any) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get('/profile', authenticateToken, userController.getProfile);
// Validate AFTER upload.single because body is parsed by multer
router.put('/profile', authenticateToken, upload.single('photo'), validate(updateUserProfileSchema), userController.updateProfile);
router.put('/device-token', authenticateToken, validate(updateDeviceTokenSchema), userController.updateDeviceToken);

export default router;
