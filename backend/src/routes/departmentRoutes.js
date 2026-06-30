import express from 'express';
import {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
} from '../controllers/departmentController.js';
import { auth, requireHR } from '../middleware/auth.js';

const router = express.Router();

// GET departments - accessible by all authenticated users
router.get('/', auth, getDepartments);

// Create, Update, Delete - HR only
router.post('/', auth, requireHR, createDepartment);
router.put('/:id', auth, requireHR, updateDepartment);
router.delete('/:id', auth, requireHR, deleteDepartment);

export default router;