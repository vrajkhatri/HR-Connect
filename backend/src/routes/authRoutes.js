import express from 'express';
import { 
  register, 
  login, 
  sendOTP,
  verifyOTP,
  resetPassword,
  verifyOTPAndResetPassword,
  getCurrentUser 
} from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

console.log('🔐 Setting up auth routes...');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/verify-otp-and-reset', verifyOTPAndResetPassword); // Combined route

// Protected routes
router.get('/me', auth, getCurrentUser);

console.log('✅ Auth routes registered:');
console.log('  POST /auth/register');
console.log('  POST /auth/login');
console.log('  POST /auth/send-otp');
console.log('  POST /auth/verify-otp');
console.log('  POST /auth/reset-password');
console.log('  POST /auth/verify-otp-and-reset');
console.log('  GET  /auth/me');

export default router;