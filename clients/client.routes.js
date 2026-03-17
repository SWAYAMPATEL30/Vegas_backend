import express from 'express';
import auth from '../middlewares/auth.middleware.js';
import controller from './client.controller.js';

const router = express.Router();

router.get('/services', controller.getServices);
router.get('/booking-status', controller.getBookingStatus);
router.get('/block-slots', controller.getBlockedSlots);

router.post('/cart/add', auth, controller.addToCart);
router.get('/cart', auth, controller.getCart);
router.delete('/cart/remove/:serviceId', auth, controller.removeFromCart);

router.get('/appointments/booked', auth, controller.getBookedAppointments);
router.post('/appointments/book', auth, controller.bookAppointment);
router.post('/appointments/cancel/:id', auth, controller.cancelAppointment);
router.get('/appointments/my', auth, controller.myAppointments);

router.get('/theme', controller.getTheme);

export default router;
