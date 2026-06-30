import express from 'express';
import { leaveCalendar } from '../controllers/calendarController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/leaves', auth, leaveCalendar);

export default router;