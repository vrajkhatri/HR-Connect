import express from 'express';
import {
    getLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType
} from '../controllers/leaveTypeController.js';
import { auth, requireHR } from '../middleware/auth.js';

const router = express.Router();

// GET leave types - accessible by all authenticated users (employees need this for applying leave)
router.get('/', auth, getLeaveTypes);

// Create, Update, Delete - HR only
router.post('/', auth, requireHR, createLeaveType);
router.put('/:id', auth, requireHR, updateLeaveType);
router.delete('/:id', auth, requireHR, deleteLeaveType);

export default router;