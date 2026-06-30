import express from 'express';
import { auth, requireHR } from '../middleware/auth.js';
import {
    getEmployeeLeaveBalance,
    manualAddLeave,
    generateMonthlyCredits,
    getEmployeeLeaveHistory,
    getEmployeesForManagement,
    getAdjustmentHistory
} from '../controllers/leaveManagementController.js';

const router = express.Router();

console.log('📊 Setting up leave management routes...');

// ============================================
// EMPLOYEE MANAGEMENT
// ============================================

// Get all employees for management
router.get('/employees', auth, requireHR, getEmployeesForManagement);

// Get employee leave balance with history
router.get('/balance/:employeeId', auth, requireHR, getEmployeeLeaveBalance);

// Get employee leave history
router.get('/history/:employeeId', auth, requireHR, getEmployeeLeaveHistory);

// ============================================
// MANUAL ADJUSTMENTS
// ============================================

// Manual add/deduct leave
router.post('/manual-add', auth, requireHR, manualAddLeave);

// ✅ NEW: Get all adjustment history (HR view)
router.get('/adjustment-history', auth, requireHR, getAdjustmentHistory);

// ============================================
// MONTHLY CREDITS
// ============================================

// Generate monthly credits (can be run via cron job)
router.post('/generate-credits', auth, requireHR, generateMonthlyCredits);

console.log('✅ Leave management routes registered:');
console.log('  GET  /leave-management/employees');
console.log('  GET  /leave-management/balance/:employeeId');
console.log('  GET  /leave-management/history/:employeeId');
console.log('  GET  /leave-management/adjustment-history  ✅ NEW');
console.log('  POST /leave-management/manual-add');
console.log('  POST /leave-management/generate-credits');

export default router;