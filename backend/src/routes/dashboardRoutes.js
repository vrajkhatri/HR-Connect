import express from 'express';
import { getHRDashboard, getEmployeeDashboard } from '../controllers/dashboardController.js';
import { auth, requireHR } from '../middleware/auth.js';

const router = express.Router();

router.get('/hr', auth, requireHR, getHRDashboard);
router.get('/employee', auth, getEmployeeDashboard);

export default router;