import express from 'express';
import auth from '../middlewares/auth.middleware.js';
import admin from '../middlewares/admin.middleware.js';
import controller from './admin.controller.js';

const router = express.Router();

router.use(auth, admin);

router.get('/appointments', controller.getAppointments);
router.post('/services', controller.addService);
router.put('/services/:id', controller.updateService);
router.delete('/services/:id', controller.deleteService);
router.post('/services/upload', controller.uploadImage);

router.post('/block-slot', controller.blockSlot);
router.delete('/block-slot/:id', controller.deleteBlockedSlot);
router.get('/block-slots', controller.getBlockedSlots);

router.patch('/booking-toggle', controller.toggleBooking);
router.patch('/appointments/:id/status', controller.updateAppointmentStatus);

// theme management
router.get('/theme', controller.getTheme);
router.put('/theme', controller.updateTheme);

export default router;
