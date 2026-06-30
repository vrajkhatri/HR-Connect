import express from 'express';
import {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee
} from '../controllers/employeeController.js';
import { auth, requireHR } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requireHR, getEmployees);
router.get('/:id', auth, requireHR, getEmployee);
router.post('/', auth, requireHR, createEmployee);
router.put('/:id', auth, requireHR, updateEmployee);
router.delete('/:id', auth, requireHR, deleteEmployee);

export default router;