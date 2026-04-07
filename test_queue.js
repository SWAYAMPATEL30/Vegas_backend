import { sendBookingConfirmation } from './utils/email.js';
import 'dotenv/config';

console.log('Testing Background Queue...');

// Fake appointment
const appointment = {
  id: 'test-123',
  appointment_date: '2026-03-20',
  start_time: '12:00',
  end_time: '13:00'
};

sendBookingConfirmation({
  name: 'Test Sequential',
  email: process.env.GMAIL_USER, // send to self
  appointment
}).then(() => {
  console.log('sendBookingConfirmation promise resolved.');
});

console.log('Back in main script, waiting for queue to process...');
setTimeout(() => {
  console.log('Test finishing after 5 seconds');
}, 5000);
