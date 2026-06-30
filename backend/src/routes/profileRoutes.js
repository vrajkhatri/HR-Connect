import express from 'express';
import { auth } from '../middleware/auth.js';
import {
    getProfile,
    updateProfile,
    changePassword,
    updateEmail,
    updatePhone,
    updateAddress
} from '../controllers/profileController.js';

const router = express.Router();

console.log('👤 Setting up profile routes...');

// GET profile
router.get('/', auth, getProfile);

// UPDATE full profile (name, email, phone, address)
router.put('/', auth, updateProfile);

// UPDATE password
router.put('/password', auth, changePassword);

// UPDATE only email
router.put('/email', auth, updateEmail);

// UPDATE only phone
router.put('/phone', auth, updatePhone);

// UPDATE only address
router.put('/address', auth, updateAddress);

console.log('✅ Profile routes registered:');
console.log('  GET  /profile');
console.log('  PUT  /profile');
console.log('  PUT  /profile/password');
console.log('  PUT  /profile/email');
console.log('  PUT  /profile/phone');
console.log('  PUT  /profile/address');

export default router;