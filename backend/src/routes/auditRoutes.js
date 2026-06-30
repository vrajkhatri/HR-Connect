import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { auth, requireHR } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requireHR, getAuditLogs);

export default router;