import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename(req, file, cb) {
        cb(
            null,
            `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
        );
    },
});

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp|gif|svg|avif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Images only! Allowed types: jpg, jpeg, png, webp, gif, svg, avif'));
    }
}

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

router.post('/', protect, admin, (req, res) => {
    upload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, message: err?.message || err });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        res.send({
            success: true,
            message: 'Image uploaded',
            url: `/${req.file.path.replace(/\\/g, '/')}`,
            imageUrl: `/${req.file.path.replace(/\\/g, '/')}` // support both url and imageUrl keys
        });
    });
});

router.post('/profile-picture', protect, (req, res) => {
    upload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ success: false, message: err });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        res.send({
            success: true,
            message: 'Profile picture uploaded',
            url: `/${req.file.path.replace(/\\/g, '/')}`
        });
    });
});

export default router;
