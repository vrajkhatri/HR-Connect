import prisma from '../config/prisma.js';
import {
    calculateLeaveDays,
    recalculateBalance
} from '../utils/leaveCalculator.js';

// ============================================
// APPLY LEAVE
// ============================================
export async function applyLeave(req, res) {
    const profile = req.user.employeeProfile;

    if (!profile) {
        return res.status(400).json({
            message: 'Employee profile missing'
        });
    }

    const {
        leaveTypeId,
        startDate,
        endDate,
        dayType,
        reason
    } = req.body;

    if (!leaveTypeId) {
        return res.status(400).json({
            message: 'Leave type is required'
        });
    }

    if (!startDate) {
        return res.status(400).json({
            message: 'Start date is required'
        });
    }

    if (!endDate) {
        return res.status(400).json({
            message: 'End date is required'
        });
    }

    if (!reason || reason.trim() === '') {
        return res.status(400).json({
            message: 'Leave reason is required.'
        });
    }

    if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({
            message: 'End date cannot be before start date'
        });
    }

    if (
        (dayType === 'FIRST_HALF' || dayType === 'SECOND_HALF') &&
        startDate !== endDate
    ) {
        return res.status(400).json({
            message: 'Half day leave must have same start and end date'
        });
    }

    // Calculate days using the updated function (excludes weekends)
    const daysCount = calculateLeaveDays(
        startDate,
        endDate,
        dayType
    );

    // Validate days count
    if (daysCount <= 0) {
        return res.status(400).json({
            message: 'Invalid leave duration. Please select valid dates.'
        });
    }

    const balance = await recalculateBalance(
        profile.id,
        Number(leaveTypeId)
    );

    const availableDays = balance.totalDays - balance.usedDays;

    if (daysCount > availableDays) {
        return res.status(400).json({
            message: `Insufficient leave balance. Required: ${daysCount} day${daysCount > 1 ? 's' : ''}, Available: ${availableDays} day${availableDays > 1 ? 's' : ''}`
        });
    }

    const request = await prisma.leaveRequest.create({
        data: {
            employeeId: profile.id,
            leaveTypeId: Number(leaveTypeId),
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            dayType: dayType || 'FULL_DAY',
            reason: reason.trim(),
            daysCount,
            isManual: false // Regular leave request
        },
        include: {
            leaveType: true,
            employee: {
                include: {
                    user: true
                }
            }
        }
    });

    const hrUsers = await prisma.user.findMany({
        where: {
            role: 'HR'
        }
    });

    if (hrUsers.length > 0) {
        await prisma.notification.createMany({
            data: hrUsers.map(hr => ({
                userId: hr.id,
                title: 'New Leave Request',
                message: `${request.employee.user.name} applied for ${request.leaveType.name} (${daysCount} day${daysCount > 1 ? 's' : ''}).`
            }))
        });
    }

    res.status(201).json({
        ...request,
        daysCount,
        message: `Leave applied successfully for ${daysCount} day${daysCount > 1 ? 's' : ''}`
    });
}

// ============================================
// MY LEAVES
// ============================================
export async function myLeaves(req, res) {
    const profile = req.user.employeeProfile;

    if (!profile) {
        return res.status(400).json({
            message: 'Employee profile not found'
        });
    }

    const leaves = await prisma.leaveRequest.findMany({
        where: {
            employeeId: profile.id
        },
        include: {
            leaveType: {
                select: {
                    id: true,
                    name: true,
                    color: true
                }
            }
        },
        orderBy: {
            appliedAt: 'desc'
        }
    });

    // Log for debugging
    console.log(`📋 My Leaves for ${req.user.name}:`, leaves.map(l => ({
        id: l.id,
        reason: l.reason,
        rejectedReason: l.rejectedReason,
        status: l.status,
        isManual: l.isManual
    })));

    res.json(leaves);
}

// ============================================
// ALL LEAVE REQUESTS (HR)
// ============================================
export async function allLeaveRequests(req, res) {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = '',
            leaveTypeId = '',
            departmentId = '',
            fromDate = '',
            toDate = '',
            sortBy = 'appliedAt',
            sortOrder = 'desc',
            q = ''
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const where = {};

        const searchTerm = search || q;
        if (searchTerm && searchTerm.trim() !== '') {
            where.OR = [
                { employee: { user: { name: { contains: searchTerm.trim(), mode: 'insensitive' } } } },
                { employee: { user: { email: { contains: searchTerm.trim(), mode: 'insensitive' } } } },
                { employee: { employeeCode: { contains: searchTerm.trim(), mode: 'insensitive' } } },
                { reason: { contains: searchTerm.trim(), mode: 'insensitive' } }
            ];
        }

        if (status && status.trim() !== '') {
            where.status = status;
        }

        if (leaveTypeId && leaveTypeId.trim() !== '') {
            where.leaveTypeId = parseInt(leaveTypeId);
        }

        if (departmentId && departmentId.trim() !== '') {
            where.employee = {
                ...where.employee,
                departmentId: parseInt(departmentId)
            };
        }

        if (fromDate && fromDate.trim() !== '' || toDate && toDate.trim() !== '') {
            const dateFilters = [];
            if (fromDate && fromDate.trim() !== '') {
                dateFilters.push({ startDate: { gte: new Date(fromDate) } });
            }
            if (toDate && toDate.trim() !== '') {
                dateFilters.push({ endDate: { lte: new Date(toDate) } });
            }
            if (dateFilters.length > 0) {
                where.AND = dateFilters;
            }
        }

        const totalCount = await prisma.leaveRequest.count({ where });

        const requests = await prisma.leaveRequest.findMany({
            where,
            include: {
                leaveType: {
                    select: {
                        id: true,
                        name: true,
                        color: true
                    }
                },
                employee: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        department: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                approvedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                adjustedByUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                [sortBy]: sortOrder
            },
            skip,
            take
        });

        const [pending, approved, rejected] = await Promise.all([
            prisma.leaveRequest.count({ where: { ...where, status: 'PENDING' } }),
            prisma.leaveRequest.count({ where: { ...where, status: 'APPROVED' } }),
            prisma.leaveRequest.count({ where: { ...where, status: 'REJECTED' } }),
        ]);

        res.json({
            success: true,
            data: requests,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                totalPages: Math.ceil(totalCount / parseInt(limit))
            },
            summary: {
                pending: pending || 0,
                approved: approved || 0,
                rejected: rejected || 0,
                cancelled: 0,
                total: totalCount || 0
            }
        });
    } catch (error) {
        console.error('Error in allLeaveRequests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave requests',
            error: error.message
        });
    }
}

// ============================================
// UPDATE LEAVE STATUS
// ============================================
export async function updateLeaveStatus(req, res) {
    try {
        const id = Number(req.params.id);
        const { action, rejectedReason, adminNote } = req.body;

        const leave = await prisma.leaveRequest.findUnique({
            where: { id },
            include: {
                employee: {
                    include: {
                        user: true
                    }
                },
                leaveType: true
            }
        });

        if (!leave) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (leave.status !== 'PENDING') {
            return res.status(400).json({ message: 'Request already processed' });
        }

        if (req.user.role === 'HR' && leave.employee.userId === req.user.id) {
            return res.status(403).json({ message: 'You cannot approve your own leave request' });
        }

        if (action === 'APPROVE') {
            const balance = await recalculateBalance(leave.employeeId, leave.leaveTypeId);

            if (leave.daysCount > balance.totalDays - balance.usedDays) {
                return res.status(400).json({ 
                    message: `Insufficient balance. Required: ${leave.daysCount}, Available: ${balance.totalDays - balance.usedDays}` 
                });
            }

            const updated = await prisma.leaveRequest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    adminNote: adminNote || 'Approved by HR',
                    approvedAt: new Date(),
                    approvedById: req.user.id
                },
                include: {
                    leaveType: true,
                    employee: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            await prisma.notification.create({
                data: {
                    userId: leave.employee.userId,
                    title: 'Leave Approved ✅',
                    message: `Your ${leave.leaveType.name} request for ${leave.daysCount} day${leave.daysCount > 1 ? 's' : ''} has been approved.`
                }
            });

            await prisma.auditLog.create({
                data: {
                    leaveRequestId: leave.id,
                    approvedById: req.user.id,
                    action: 'APPROVED',
                    remarks: adminNote || 'Leave approved by HR'
                }
            });

            // Recalculate balance after approval
            await recalculateBalance(leave.employeeId, leave.leaveTypeId);

            return res.json({
                success: true,
                data: updated,
                message: `Leave request approved successfully (${leave.daysCount} day${leave.daysCount > 1 ? 's' : ''})`
            });
        }

        if (action === 'REJECT') {
            const reasonText = rejectedReason && rejectedReason.trim()
                ? rejectedReason.trim()
                : 'Rejected by HR';

            const updated = await prisma.leaveRequest.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    adminNote: adminNote || reasonText,
                    rejectedReason: reasonText,
                    approvedAt: new Date(),
                    approvedById: req.user.id
                },
                include: {
                    leaveType: true,
                    employee: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            await prisma.notification.create({
                data: {
                    userId: leave.employee.userId,
                    title: 'Leave Rejected ❌',
                    message: `Your ${leave.leaveType.name} request for ${leave.daysCount} day${leave.daysCount > 1 ? 's' : ''} has been rejected. Reason: ${reasonText}`
                }
            });

            await prisma.auditLog.create({
                data: {
                    leaveRequestId: leave.id,
                    approvedById: req.user.id,
                    action: 'REJECTED',
                    remarks: reasonText
                }
            });

            return res.json({
                success: true,
                data: updated,
                message: `Leave request rejected successfully`
            });
        }

        return res.status(400).json({ message: 'Invalid action. Use "APPROVE" or "REJECT"' });
    } catch (error) {
        console.error('Error updating leave status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update leave status',
            error: error.message
        });
    }
}

// ============================================
// ✅ CANCEL LEAVE (Employee) - FIXED
// ============================================
export async function cancelLeave(req, res) {
    try {
        const id = Number(req.params.id);
        const { cancellationReason } = req.body;

        console.log(`📝 Cancelling leave request ${id} with reason:`, cancellationReason);

        const leave = await prisma.leaveRequest.findUnique({
            where: { id },
            include: {
                employee: {
                    include: {
                        user: true
                    }
                },
                leaveType: true
            }
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found'
            });
        }

        // Check if user owns this leave
        const profile = req.user.employeeProfile;
        if (!profile || leave.employeeId !== profile.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only cancel your own leave requests'
            });
        }

        // Only allow cancellation of PENDING leaves
        if (leave.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Only pending leave requests can be cancelled'
            });
        }

        // Update leave status to CANCELLED
        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                adminNote: cancellationReason || 'Cancelled by employee',
                rejectedReason: cancellationReason || 'Cancelled by employee'
            },
            include: {
                leaveType: true,
                employee: {
                    include: {
                        user: true
                    }
                }
            }
        });

        console.log(`✅ Leave request ${id} cancelled successfully`);

        // Notify HR about cancellation
        const hrUsers = await prisma.user.findMany({
            where: { role: 'HR' }
        });

        if (hrUsers.length > 0) {
            await prisma.notification.createMany({
                data: hrUsers.map(hr => ({
                    userId: hr.id,
                    title: 'Leave Cancelled',
                    message: `${leave.employee.user.name} cancelled their ${leave.leaveType.name} request.`
                }))
            });
        }

        // Notify employee
        await prisma.notification.create({
            data: {
                userId: leave.employee.userId,
                title: 'Leave Cancelled',
                message: `Your ${leave.leaveType.name} request has been cancelled.`
            }
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                leaveRequestId: leave.id,
                approvedById: req.user.id,
                action: 'CANCELLED',
                remarks: cancellationReason || 'Cancelled by employee'
            }
        });

        res.json({
            success: true,
            data: updated,
            message: 'Leave request cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel leave error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel leave',
            error: error.message
        });
    }
}

// ============================================
// ✅ REVERSE LEAVE (HR)
// ============================================
export async function reverseLeave(req, res) {
    try {
        const id = Number(req.params.id);
        const { reversalReason } = req.body;

        const leave = await prisma.leaveRequest.findUnique({
            where: { id },
            include: {
                employee: {
                    include: {
                        user: true
                    }
                },
                leaveType: true
            }
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found'
            });
        }

        // Only allow reversal of APPROVED leaves
        if (leave.status !== 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: 'Only approved leave requests can be reversed'
            });
        }

        // Check if HR is trying to reverse their own leave
        if (req.user.role === 'HR' && leave.employee.userId === req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You cannot reverse your own leave request'
            });
        }

        // Recalculate balance before reversal to ensure correct used days
        const balance = await recalculateBalance(leave.employeeId, leave.leaveTypeId);
        
        // Calculate new used days (subtract the days from this leave)
        const newUsedDays = Math.max(0, balance.usedDays - leave.daysCount);

        // Update balance
        await prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
                usedDays: newUsedDays
            }
        });

        // Update leave status to REVERSED
        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                adminNote: reversalReason || 'Reversed by HR',
                rejectedReason: reversalReason || 'Reversed by HR',
                approvedAt: new Date(),
                approvedById: req.user.id
            },
            include: {
                leaveType: true,
                employee: {
                    include: {
                        user: true
                    }
                }
            }
        });

        // Notify employee
        await prisma.notification.create({
            data: {
                userId: leave.employee.userId,
                title: 'Leave Reversed ❌',
                message: `Your ${leave.leaveType.name} request has been reversed by HR. Reason: ${reversalReason || 'Reversed by HR'}`
            }
        });

        // Notify other HR users
        const hrUsers = await prisma.user.findMany({
            where: {
                role: 'HR',
                id: { not: req.user.id }
            }
        });

        if (hrUsers.length > 0) {
            await prisma.notification.createMany({
                data: hrUsers.map(hr => ({
                    userId: hr.id,
                    title: 'Leave Reversed',
                    message: `${req.user.name} reversed ${leave.employee.user.name}'s ${leave.leaveType.name} request.`
                }))
            });
        }

        // Create audit log
        await prisma.auditLog.create({
            data: {
                leaveRequestId: leave.id,
                approvedById: req.user.id,
                action: 'REVERSED',
                remarks: reversalReason || 'Reversed by HR'
            }
        });

        res.json({
            success: true,
            data: updated,
            message: 'Leave request reversed successfully'
        });
    } catch (error) {
        console.error('Reverse leave error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reverse leave',
            error: error.message
        });
    }
}

// ============================================
// MY BALANCES - UPDATED WITH isCompensatory SUPPORT
// ============================================
export async function myBalances(req, res) {
    try {
        const profile = req.user.employeeProfile;

        if (!profile) {
            console.log('❌ No employee profile found for user:', req.user.id);
            return res.status(400).json({
                success: false,
                message: 'Employee profile not found. Please contact HR.'
            });
        }

        // Get all leave types
        const leaveTypes = await prisma.leaveType.findMany();

        if (leaveTypes.length === 0) {
            return res.json([]);
        }

        // Recalculate balances for each leave type
        for (const type of leaveTypes) {
            try {
                await recalculateBalance(profile.id, type.id);
            } catch (balanceError) {
                console.error('Error recalculating balance for type:', type.id, balanceError);
            }
        }

        // Get updated balances
        const balances = await prisma.leaveBalance.findMany({
            where: {
                employeeId: profile.id
            },
            include: {
                leaveType: true
            }
        });

        // Get monthly credit info
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;

        const enhancedBalances = await Promise.all(balances.map(async (b) => {
            // Get monthly credit for this leave type
            const monthlyCredit = b.leaveType?.monthlyCredit || 0;
            // ✅ Check if this is Compensatory Off
            const isCompensatory = b.leaveType?.isCompensatory || false;

            // Get current month history
            const history = await prisma.leaveBalanceHistory.findUnique({
                where: {
                    employeeId_leaveTypeId_year_month: {
                        employeeId: profile.id,
                        leaveTypeId: b.leaveTypeId,
                        year: year,
                        month: month
                    }
                }
            });

            // ✅ For Compensatory Off, remaining days is just totalDays (usedDays is always 0)
            const remaining = isCompensatory ? b.totalDays : (b.totalDays - b.usedDays);

            return {
                ...b,
                remainingDays: remaining,
                monthlyCredit: monthlyCredit,
                currentMonthCredit: history?.monthlyCredit || 0,
                openingBalance: history?.openingBalance || (isCompensatory ? b.totalDays : (b.totalDays - b.usedDays)),
                leavesTakenThisMonth: history?.leavesTaken || 0,
                isCompensatory: isCompensatory
            };
        }));

        res.json(enhancedBalances);
    } catch (error) {
        console.error('❌ My balances error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave balances',
            error: error.message
        });
    }
}

// ============================================
// SEARCH EMPLOYEES
// ============================================
export async function searchEmployees(req, res) {
    try {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.status(200).json({ success: true, data: [] });
        }

        const employees = await prisma.employeeProfile.findMany({
            where: {
                OR: [
                    { user: { name: { contains: query, mode: 'insensitive' } } },
                    { user: { email: { contains: query, mode: 'insensitive' } } },
                    { employeeCode: { contains: query, mode: 'insensitive' } }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                department: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            take: 10
        });

        res.status(200).json({ success: true, data: employees });
    } catch (error) {
        console.error('Error searching employees:', error);
        res.status(500).json({ success: false, message: 'Failed to search employees' });
    }
}

// ============================================
// GET LEAVE STATISTICS
// ============================================
export async function getLeaveStatistics(req, res) {
    try {
        const { departmentId, year = new Date().getFullYear() } = req.query;

        const startDate = new Date(`${year}-01-01`);
        const endDate = new Date(`${year}-12-31`);

        // Build where clause
        const whereClause = {
            startDate: {
                gte: startDate,
                lte: endDate
            }
        };

        if (departmentId && departmentId.trim() !== '') {
            whereClause.employee = {
                departmentId: parseInt(departmentId)
            };
        }

        // Get all approved leaves for the year
        const approvedLeaves = await prisma.leaveRequest.findMany({
            where: {
                ...whereClause,
                status: 'APPROVED'
            },
            include: {
                leaveType: true
            }
        });

        // Get all leaves for monthly stats
        const allLeaves = await prisma.leaveRequest.findMany({
            where: whereClause
        });

        // Monthly statistics
        const monthlyData = {};
        for (let i = 1; i <= 12; i++) {
            monthlyData[i] = { total: 0, approved: 0, rejected: 0, pending: 0 };
        }

        for (const leave of allLeaves) {
            const month = new Date(leave.startDate).getMonth() + 1;
            monthlyData[month].total++;
            if (leave.status === 'APPROVED') monthlyData[month].approved++;
            else if (leave.status === 'REJECTED') monthlyData[month].rejected++;
            else if (leave.status === 'PENDING') monthlyData[month].pending++;
        }

        const monthlyLeaves = Object.entries(monthlyData).map(([month, data]) => ({
            month: parseInt(month),
            total: data.total || 0,
            approved: data.approved || 0,
            rejected: data.rejected || 0,
            pending: data.pending || 0
        }));

        // Leave type distribution
        const typeDistribution = {};
        for (const leave of approvedLeaves) {
            const typeName = leave.leaveType?.name || 'Unknown';
            const typeColor = leave.leaveType?.color || '#6c757d';
            if (!typeDistribution[typeName]) {
                typeDistribution[typeName] = {
                    name: typeName,
                    color: typeColor,
                    count: 0,
                    totalDays: 0
                };
            }
            typeDistribution[typeName].count++;
            typeDistribution[typeName].totalDays += leave.daysCount || 0;
        }

        const leaveTypeDistribution = Object.values(typeDistribution);

        res.status(200).json({
            success: true,
            data: {
                monthly: monthlyLeaves,
                byType: leaveTypeDistribution
            }
        });
    } catch (error) {
        console.error('Error getting leave statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get leave statistics',
            error: error.message
        });
    }
}

// ============================================
// EXPORT LEAVE REQUESTS - PDF
// ============================================
export async function exportLeaveRequestsPDF(req, res) {
    try {
        const { search, status, leaveTypeId, departmentId, fromDate, toDate } = req.query;

        // Build where clause
        const where = {};
        
        if (search && search.trim() !== '') {
            where.OR = [
                { employee: { user: { name: { contains: search, mode: 'insensitive' } } } },
                { employee: { user: { email: { contains: search, mode: 'insensitive' } } } },
                { employee: { employeeCode: { contains: search, mode: 'insensitive' } } }
            ];
        }
        if (status && status.trim() !== '') {
            where.status = status;
        }
        if (leaveTypeId && leaveTypeId.trim() !== '') {
            where.leaveTypeId = parseInt(leaveTypeId);
        }
        if (departmentId && departmentId.trim() !== '') {
            where.employee = { departmentId: parseInt(departmentId) };
        }
        if (fromDate && fromDate.trim() !== '' || toDate && toDate.trim() !== '') {
            const dateFilters = [];
            if (fromDate && fromDate.trim() !== '') {
                dateFilters.push({ startDate: { gte: new Date(fromDate) } });
            }
            if (toDate && toDate.trim() !== '') {
                dateFilters.push({ endDate: { lte: new Date(toDate) } });
            }
            if (dateFilters.length > 0) {
                where.AND = dateFilters;
            }
        }

        const requests = await prisma.leaveRequest.findMany({
            where,
            include: {
                leaveType: true,
                employee: {
                    include: {
                        user: true,
                        department: true
                    }
                },
                approvedBy: true
            },
            orderBy: { appliedAt: 'desc' }
        });

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No leave requests found to export'
            });
        }

        // Import PDFKit dynamically
        const PDFDocument = (await import('pdfkit')).default;

        // Create PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = `leave-requests-${new Date().toISOString().split('T')[0]}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // ============================================
        // HEADER
        // ============================================
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#1a1a2e')
           .text('Leave Requests Report', { align: 'center' });
        
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#6c757d')
           .text('Generated: ' + new Date().toLocaleString(), { align: 'center' });
        
        doc.moveDown(1.5);

        // ============================================
        // SUMMARY
        // ============================================
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#0d6efd')
           .text('Summary', { underline: true });
        
        doc.moveDown(0.5);
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#212529');

        const pendingCount = requests.filter(r => r.status === 'PENDING').length;
        const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
        const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

        doc.text('Total Requests: ' + requests.length);
        doc.text('Pending: ' + pendingCount);
        doc.text('Approved: ' + approvedCount);
        doc.text('Rejected: ' + rejectedCount);
        
        doc.moveDown(1.5);

        // ============================================
        // TABLE HEADERS
        // ============================================
        const tableTop = doc.y;
        const colPositions = [45, 120, 200, 290, 360, 420, 490];
        const rowHeight = 25;

        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#ffffff');

        // Table header background
        doc.rect(40, tableTop - 5, 520, 22)
           .fillColor('#0d6efd')
           .fill();

        doc.fillColor('#ffffff');
        doc.text('#', colPositions[0], tableTop);
        doc.text('Employee', colPositions[1], tableTop);
        doc.text('Type', colPositions[2], tableTop);
        doc.text('Duration', colPositions[3], tableTop);
        doc.text('Status', colPositions[4], tableTop);
        doc.text('Reason', colPositions[5], tableTop);

        doc.fillColor('#212529');
        let yPos = tableTop + rowHeight;
        
        doc.font('Helvetica')
           .fontSize(8);

        requests.slice(0, 50).forEach((request, index) => {
            if (yPos > 750) {
                doc.addPage();
                yPos = 50;
                
                // Re-draw headers on new page
                doc.rect(40, yPos - 5, 520, 22)
                   .fillColor('#0d6efd')
                   .fill();
                doc.fillColor('#ffffff')
                   .font('Helvetica-Bold')
                   .fontSize(9);
                doc.text('#', colPositions[0], yPos);
                doc.text('Employee', colPositions[1], yPos);
                doc.text('Type', colPositions[2], yPos);
                doc.text('Duration', colPositions[3], yPos);
                doc.text('Status', colPositions[4], yPos);
                doc.text('Reason', colPositions[5], yPos);
                doc.fillColor('#212529')
                   .font('Helvetica')
                   .fontSize(8);
                yPos += rowHeight;
            }

            // Show First Half, Second Half, or days
            let duration = '';
            if (request.dayType === 'FIRST_HALF') {
                duration = 'First Half';
            } else if (request.dayType === 'SECOND_HALF') {
                duration = 'Second Half';
            } else {
                const days = request.daysCount || 1;
                duration = days + (days > 1 ? ' days' : ' day');
            }

            // Alternate row colors
            if (index % 2 === 0) {
                doc.rect(40, yPos - 5, 520, rowHeight)
                   .fillColor('#f8f9fa')
                   .fill();
                doc.fillColor('#212529');
            }

            const employeeName = (request.employee?.user?.name || 'N/A').substring(0, 20);
            const leaveTypeName = (request.leaveType?.name || 'N/A').substring(0, 15);
            const reasonText = (request.reason || '-').substring(0, 30);

            doc.text(String(index + 1), colPositions[0], yPos);
            doc.text(employeeName, colPositions[1], yPos);
            doc.text(leaveTypeName, colPositions[2], yPos);
            doc.text(duration, colPositions[3], yPos);
            doc.text(request.status, colPositions[4], yPos);
            doc.text(reasonText, colPositions[5], yPos);

            yPos += rowHeight;
        });

        // ============================================
        // FOOTER
        // ============================================
        doc.addPage();
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#1a1a2e')
           .text('Report Details', { align: 'center', underline: true });
        doc.moveDown();
        
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#212529');
        
        doc.text('Total Records: ' + requests.length);
        doc.text('Pending: ' + pendingCount);
        doc.text('Approved: ' + approvedCount);
        doc.text('Rejected: ' + rejectedCount);
        doc.text('Report Generated: ' + new Date().toLocaleString());
        
        if (fromDate) doc.text('From: ' + new Date(fromDate).toLocaleDateString());
        if (toDate) doc.text('To: ' + new Date(toDate).toLocaleDateString());
        if (status) doc.text('Status Filter: ' + status);
        if (search) doc.text('Search: ' + search);

        doc.moveDown(2);
        doc.fontSize(8)
           .fillColor('#6c757d')
           .text('HRConnect - Professional HR Management System', { align: 'center' });

        doc.end();

    } catch (error) {
        console.error('PDF Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export PDF',
            error: error.message
        });
    }
}

// ============================================
// EXPORT LEAVE REQUESTS - EXCEL
// ============================================
export async function exportLeaveRequestsExcel(req, res) {
    try {
        const { search, status, leaveTypeId, departmentId, fromDate, toDate } = req.query;

        // Build where clause
        const where = {};
        
        if (search && search.trim() !== '') {
            where.OR = [
                { employee: { user: { name: { contains: search, mode: 'insensitive' } } } },
                { employee: { user: { email: { contains: search, mode: 'insensitive' } } } },
                { employee: { employeeCode: { contains: search, mode: 'insensitive' } } }
            ];
        }
        if (status && status.trim() !== '') {
            where.status = status;
        }
        if (leaveTypeId && leaveTypeId.trim() !== '') {
            where.leaveTypeId = parseInt(leaveTypeId);
        }
        if (departmentId && departmentId.trim() !== '') {
            where.employee = { departmentId: parseInt(departmentId) };
        }
        if (fromDate && fromDate.trim() !== '' || toDate && toDate.trim() !== '') {
            const dateFilters = [];
            if (fromDate && fromDate.trim() !== '') {
                dateFilters.push({ startDate: { gte: new Date(fromDate) } });
            }
            if (toDate && toDate.trim() !== '') {
                dateFilters.push({ endDate: { lte: new Date(toDate) } });
            }
            if (dateFilters.length > 0) {
                where.AND = dateFilters;
            }
        }

        const requests = await prisma.leaveRequest.findMany({
            where,
            include: {
                leaveType: true,
                employee: {
                    include: {
                        user: true,
                        department: true
                    }
                },
                approvedBy: true
            },
            orderBy: { appliedAt: 'desc' }
        });

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No leave requests found to export'
            });
        }

        // Import xlsx dynamically
        const XLSX = (await import('xlsx')).default;

        // Prepare data for Excel
        const data = requests.map((request, index) => {
            let duration = '';
            if (request.dayType === 'FIRST_HALF') {
                duration = 'First Half';
            } else if (request.dayType === 'SECOND_HALF') {
                duration = 'Second Half';
            } else {
                const days = request.daysCount || 1;
                duration = days + (days > 1 ? ' days' : ' day');
            }

            return {
                '#': index + 1,
                'Employee': request.employee?.user?.name || 'N/A',
                'Employee Code': request.employee?.employeeCode || 'N/A',
                'Department': request.employee?.department?.name || 'N/A',
                'Leave Type': request.leaveType?.name || 'N/A',
                'Start Date': new Date(request.startDate).toLocaleDateString(),
                'End Date': new Date(request.endDate).toLocaleDateString(),
                'Duration': duration,
                'Status': request.status,
                'Reason': request.reason || '-',
                'Applied On': new Date(request.appliedAt).toLocaleDateString(),
                'Approved By': request.approvedBy?.name || '-',
            };
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 5 },   // #
            { wch: 22 },  // Employee
            { wch: 16 },  // Employee Code
            { wch: 16 },  // Department
            { wch: 16 },  // Leave Type
            { wch: 16 },  // Start Date
            { wch: 16 },  // End Date
            { wch: 14 },  // Duration
            { wch: 14 },  // Status
            { wch: 35 },  // Reason
            { wch: 16 },  // Applied On
            { wch: 20 },  // Approved By
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Leave Requests');

        // Generate Excel file
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = `leave-requests-${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);

    } catch (error) {
        console.error('Excel Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export Excel',
            error: error.message
        });
    }
}