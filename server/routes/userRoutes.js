const router = require('express').Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// File upload setup
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
})

const upload = multer({ storage: storage });

router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, upload.single('photo'), userController.updateProfile);
router.put('/device-token', authenticateToken, userController.updateDeviceToken);

module.exports = router;
