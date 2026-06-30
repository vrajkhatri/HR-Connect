import express from 'express';
import { auth, requireHR } from '../middleware/auth.js';
import { exportExcel, exportPdf } from '../controllers/reportController.js';
const router = express.Router();
router.get('/excel', auth, requireHR, exportExcel);
router.get('/pdf', auth, requireHR, exportPdf);
export default router;
