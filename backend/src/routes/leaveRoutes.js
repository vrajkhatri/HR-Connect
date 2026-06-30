import express from 'express';
import { auth, requireHR } from '../middleware/auth.js';
import {
    applyLeave,
    myLeaves,
    allLeaveRequests,
    updateLeaveStatus,
    myBalances,
    searchEmployees,
    getLeaveStatistics,
    exportLeaveRequestsPDF,
    exportLeaveRequestsExcel,
    cancelLeave,
    reverseLeave
} from '../controllers/leaveController.js';

const router = express.Router();

console.log('📋 Setting up leave routes...');

// ============================================
// EMPLOYEE ROUTES
// ============================================
router.post('/apply', auth, applyLeave);
router.get('/my', auth, myLeaves);
router.get('/balances/my', auth, myBalances);

// ============================================
// SEARCH ROUTES
// ============================================
router.get('/search/employees', auth, searchEmployees);

// ============================================
// HR ROUTES
// ============================================
router.get('/requests', auth, requireHR, allLeaveRequests);
router.get('/', auth, requireHR, allLeaveRequests);
router.get('/statistics', auth, requireHR, getLeaveStatistics);
router.put('/:id/status', auth, requireHR, updateLeaveStatus);

// ============================================
// ✅ LEAVE CANCELLATION ROUTES
// ============================================
// Employee cancels their pending leave
router.put('/:id/cancel', auth, cancelLeave);

// HR reverses an approved leave
router.put('/:id/reverse', auth, requireHR, reverseLeave);

// ============================================
// EXPORT ROUTES - HR ONLY
// ============================================
router.get('/export/pdf', auth, requireHR, exportLeaveRequestsPDF);
router.get('/export/excel', auth, requireHR, exportLeaveRequestsExcel);

console.log('✅ Leave routes registered:');
console.log('  POST /leaves/apply');
console.log('  GET  /leaves/my');
console.log('  GET  /leaves/balances/my');
console.log('  GET  /leaves/search/employees');
console.log('  GET  /leaves/requests');
console.log('  GET  /leaves/');
console.log('  GET  /leaves/statistics');
console.log('  GET  /leaves/export/pdf');
console.log('  GET  /leaves/export/excel');
console.log('  PUT  /leaves/:id/status');
console.log('  PUT  /leaves/:id/cancel    ✅ NEW - Employee cancels pending leave');
console.log('  PUT  /leaves/:id/reverse   ✅ NEW - HR reverses approved leave');

export default router;