import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
})

const upload = multer({ storage: storage });

router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, upload.single('photo'), userController.updateProfile);
router.put('/device-token', authenticateToken, userController.updateDeviceToken);

export default router;
