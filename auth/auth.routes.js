import express from 'express';
import controller from './auth.controller.js';
import auth from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/admin/login', controller.adminLogin);
router.post('/google', auth, controller.googleLogin); // Add this
router.post('/update-phone', auth, controller.updatePhone);

export default router;
