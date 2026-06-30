import prisma from '../config/prisma.js';

// ============================================
// GET EMPLOYEE LEAVE BALANCE WITH HISTORY
// ============================================
export async function getEmployeeLeaveBalance(req, res) {
    try {
        const { employeeId } = req.params;
        const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

        const employee = await prisma.employeeProfile.findUnique({
            where: { id: parseInt(employeeId) },
            include: { user: true }
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const leaveTypes = await prisma.leaveType.findMany();
        const balances = [];

        for (const type of leaveTypes) {
            const currentBalance = await prisma.leaveBalance.findUnique({
                where: {
                    employeeId_leaveTypeId_year: {
                        employeeId: parseInt(employeeId),
                        leaveTypeId: type.id,
                        year: parseInt(year)
                    }
                }
            });

            const history = await prisma.leaveBalanceHistory.findMany({
                where: {
                    employeeId: parseInt(employeeId),
                    leaveTypeId: type.id,
                    year: parseInt(year),
                    month: {
                        gte: parseInt(month) - 2,
                        lte: parseInt(month)
                    }
                },
                orderBy: { month: 'asc' }
            });

            // Get total manual adjustments for this employee and leave type
            const manualAdjustments = await prisma.leaveRequest.aggregate({
                where: {
                    employeeId: parseInt(employeeId),
                    leaveTypeId: type.id,
                    status: 'APPROVED',
                    isManual: true,
                    startDate: {
                        gte: new Date(`${parseInt(year)}-01-01`),
                        lte: new Date(`${parseInt(year)}-12-31`)
                    }
                },
                _sum: {
                    daysCount: true
                }
            });

            balances.push({
                leaveType: type,
                currentBalance: currentBalance || { totalDays: 0, usedDays: 0 },
                history: history,
                remainingDays: currentBalance ? (currentBalance.totalDays - currentBalance.usedDays) : 0,
                manualAdjustments: manualAdjustments._sum.daysCount || 0
            });
        }

        res.json({
            success: true,
            data: {
                employee: employee,
                balances: balances,
                currentMonth: parseInt(month),
                currentYear: parseInt(year)
            }
        });
    } catch (error) {
        console.error('Get employee leave balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get employee leave balance',
            error: error.message
        });
    }
}

// ============================================
// MANUALLY ADD LEAVE FOR EMPLOYEE - WITH NOTIFICATIONS
// ============================================
export async function manualAddLeave(req, res) {
    try {
        const { employeeId, leaveTypeId, days, reason, adjustmentReason, date } = req.body;

        console.log('📝 Manual Add Leave Request:', { employeeId, leaveTypeId, days, reason });

        if (!employeeId || !leaveTypeId || !days || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Employee, leave type, days, and reason are required'
            });
        }

        const employee = await prisma.employeeProfile.findUnique({
            where: { id: parseInt(employeeId) },
            include: { user: true }
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const leaveType = await prisma.leaveType.findUnique({
            where: { id: parseInt(leaveTypeId) }
        });

        if (!leaveType) {
            return res.status(404).json({
                success: false,
                message: 'Leave type not found'
            });
        }

        console.log('📋 Leave Type:', leaveType.name, 'ID:', leaveType.id);

        const isCompensatoryByName = 
            leaveType.name.toLowerCase().includes('compensatory') || 
            leaveType.name.toLowerCase().includes('comp off');

        const isCompensatoryOff = leaveType.isCompensatory === true || isCompensatoryByName;

        console.log('🔍 Is Compensatory Off?', isCompensatoryOff);

        const year = new Date().getFullYear();
        const today = new Date();
        const absDays = Math.abs(parseFloat(days));
        const daysValue = parseFloat(days);
        const isAdding = daysValue > 0;

        // Get or create balance
        let balance = await prisma.leaveBalance.findUnique({
            where: {
                employeeId_leaveTypeId_year: {
                    employeeId: parseInt(employeeId),
                    leaveTypeId: parseInt(leaveTypeId),
                    year: year
                }
            }
        });

        if (!balance) {
            balance = await prisma.leaveBalance.create({
                data: {
                    employeeId: parseInt(employeeId),
                    leaveTypeId: parseInt(leaveTypeId),
                    year: year,
                    totalDays: 0,
                    usedDays: 0
                }
            });
            console.log('✅ Created new balance');
        }

        console.log('💰 Current Balance - Total:', balance.totalDays, 'Used:', balance.usedDays);

        let updatedBalance;
        let actionType;
        let messageText;
        let adjustmentType;

        if (isCompensatoryOff) {
            // ✅ COMPENSATORY OFF: ALWAYS ADD to total balance
            console.log('✅✅✅ ADDING Compensatory Off:', absDays, 'days');
            updatedBalance = await prisma.leaveBalance.update({
                where: { id: balance.id },
                data: {
                    totalDays: balance.totalDays + absDays,
                    usedDays: 0
                }
            });
            actionType = 'COMPENSATORY_ADD';
            adjustmentType = 'Compensatory Off Added';
            messageText = `Added ${absDays} day${absDays > 1 ? 's' : ''} of Compensatory Off`;
            console.log('✅ New Balance - Total:', updatedBalance.totalDays, 'Used:', updatedBalance.usedDays);
        } else if (isAdding) {
            // Adding days - increase totalDays
            updatedBalance = await prisma.leaveBalance.update({
                where: { id: balance.id },
                data: {
                    totalDays: balance.totalDays + absDays
                }
            });
            actionType = 'MANUAL_ADD';
            adjustmentType = 'Leave Added';
            messageText = `Added ${absDays} day${absDays > 1 ? 's' : ''} of ${leaveType.name}`;
            console.log('✅ Added - Total:', updatedBalance.totalDays);
        } else {
            // Deducting days - increase usedDays
            const availableDays = balance.totalDays - balance.usedDays;
            console.log('📊 Available days:', availableDays, 'Requested deduction:', absDays);
            
            if (absDays > availableDays) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient balance. Available: ${availableDays} days`
                });
            }
            updatedBalance = await prisma.leaveBalance.update({
                where: { id: balance.id },
                data: {
                    usedDays: balance.usedDays + absDays
                }
            });
            actionType = 'MANUAL_DEDUCT';
            adjustmentType = 'Leave Deducted';
            messageText = `Deducted ${absDays} day${absDays > 1 ? 's' : ''} of ${leaveType.name}`;
            console.log('✅ Deducted - Total:', updatedBalance.totalDays, 'Used:', updatedBalance.usedDays);
        }

        // Create leave request record
        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                employeeId: parseInt(employeeId),
                leaveTypeId: parseInt(leaveTypeId),
                startDate: new Date(date || today),
                endDate: new Date(date || today),
                dayType: 'FULL_DAY',
                daysCount: absDays,
                reason: reason,
                status: 'APPROVED',
                isManual: true,
                adjustmentReason: adjustmentReason || (isCompensatoryOff ? 'Compensatory Off added' : (isAdding ? 'Manual addition' : 'Manual deduction')),
                adjustedBy: req.user.id,
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

        // Create audit log
        await prisma.auditLog.create({
            data: {
                leaveRequestId: leaveRequest.id,
                approvedById: req.user.id,
                action: actionType,
                remarks: `${adjustmentType} - ${absDays} day${absDays > 1 ? 's' : ''} - ${reason}`
            }
        });

        // ✅ NOTIFICATION FOR EMPLOYEE
        await prisma.notification.create({
            data: {
                userId: employee.userId,
                title: adjustmentType,
                message: `${adjustmentType}: ${absDays} day${absDays > 1 ? 's' : ''} of ${leaveType.name}. Reason: ${reason}${adjustmentReason ? ' | Note: ' + adjustmentReason : ''}`
            }
        });

        // ✅ NOTIFICATION FOR HR (all HR users)
        const hrUsers = await prisma.user.findMany({
            where: { role: 'HR' }
        });

        if (hrUsers.length > 0) {
            await prisma.notification.createMany({
                data: hrUsers.map(hr => ({
                    userId: hr.id,
                    title: `Manual Adjustment: ${employee.user.name}`,
                    message: `${adjustmentType} ${absDays} day${absDays > 1 ? 's' : ''} of ${leaveType.name} for ${employee.user.name}. Reason: ${reason}`
                }))
            });
            console.log(`✅ Notified ${hrUsers.length} HR users about the adjustment`);
        }

        // Get final balance
        const finalBalance = await prisma.leaveBalance.findUnique({
            where: { id: updatedBalance.id }
        });

        console.log('📊 FINAL Balance - Total:', finalBalance.totalDays, 'Used:', finalBalance.usedDays, 'Remaining:', finalBalance.totalDays - finalBalance.usedDays);

        res.json({
            success: true,
            message: `Successfully ${isCompensatoryOff ? 'added compensatory off' : (isAdding ? 'added' : 'deducted')} ${absDays} day${absDays > 1 ? 's' : ''} of ${leaveType.name}`,
            data: {
                balance: finalBalance,
                leaveRequest: leaveRequest,
                remainingDays: finalBalance.totalDays - finalBalance.usedDays,
                totalDays: finalBalance.totalDays,
                usedDays: finalBalance.usedDays,
                isCompensatoryOff: isCompensatoryOff,
                adjustmentType: adjustmentType,
                notified: true
            }
        });
    } catch (error) {
        console.error('❌ Manual add leave error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add leave',
            error: error.message
        });
    }
}

// ============================================
// GENERATE MONTHLY CREDITS - FIXED (with proper validation)
// ============================================
export async function generateMonthlyCredits(req, res) {
    try {
        // ✅ Get year and month from body with proper validation
        const year = req.body.year ? parseInt(req.body.year) : new Date().getFullYear();
        const month = req.body.month ? parseInt(req.body.month) : new Date().getMonth() + 1;

        console.log(`📊 Generating monthly credits for ${month}/${year}...`);

        // ✅ Validate month and year
        if (month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                message: 'Invalid month. Must be between 1 and 12.'
            });
        }

        if (year < 2000 || year > 2100) {
            return res.status(400).json({
                success: false,
                message: 'Invalid year.'
            });
        }

        const employees = await prisma.employeeProfile.findMany({
            include: { user: true }
        });

        if (employees.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No employees found in the system.'
            });
        }

        const leaveTypes = await prisma.leaveType.findMany({
            where: {
                monthlyCredit: {
                    gt: 0
                }
            }
        });

        // ✅ Check if any leave types have monthly credit
        if (leaveTypes.length === 0) {
            console.log('⚠️ No leave types with monthly credit > 0 found.');
            return res.status(400).json({
                success: false,
                message: 'No leave types with monthly credit configured. Please update leave types first.',
                data: {
                    leaveTypes: []
                }
            });
        }

        console.log(`📋 Found ${leaveTypes.length} leave types with monthly credit:`, 
            leaveTypes.map(t => `${t.name}: ${t.monthlyCredit}`).join(', ')
        );

        let totalCreditsAdded = 0;
        const creditDetails = [];
        const skippedEmployees = [];

        for (const employee of employees) {
            let employeeCredits = 0;
            
            for (const leaveType of leaveTypes) {
                // Check if credit already exists for this month
                const existingHistory = await prisma.leaveBalanceHistory.findUnique({
                    where: {
                        employeeId_leaveTypeId_year_month: {
                            employeeId: employee.id,
                            leaveTypeId: leaveType.id,
                            year: year,
                            month: month
                        }
                    }
                });

                if (existingHistory) {
                    console.log(`⏭️ Credit already exists for ${employee.user.name} - ${leaveType.name}`);
                    continue;
                }

                let balance = await prisma.leaveBalance.findUnique({
                    where: {
                        employeeId_leaveTypeId_year: {
                            employeeId: employee.id,
                            leaveTypeId: leaveType.id,
                            year: year
                        }
                    }
                });

                if (!balance) {
                    balance = await prisma.leaveBalance.create({
                        data: {
                            employeeId: employee.id,
                            leaveTypeId: leaveType.id,
                            year: year,
                            totalDays: 0,
                            usedDays: 0
                        }
                    });
                }

                const previousMonthHistory = await prisma.leaveBalanceHistory.findFirst({
                    where: {
                        employeeId: employee.id,
                        leaveTypeId: leaveType.id,
                        year: year,
                        month: month - 1
                    },
                    orderBy: { month: 'desc' }
                });

                const openingBalance = previousMonthHistory ? previousMonthHistory.closingBalance : balance.totalDays - balance.usedDays;

                const usedDaysThisMonth = await prisma.leaveRequest.aggregate({
                    where: {
                        employeeId: employee.id,
                        leaveTypeId: leaveType.id,
                        status: 'APPROVED',
                        startDate: {
                            gte: new Date(`${year}-${String(month).padStart(2, '0')}-01`),
                            lte: new Date(`${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`)
                        }
                    },
                    _sum: {
                        daysCount: true
                    }
                });

                const leavesTaken = usedDaysThisMonth._sum.daysCount || 0;
                const closingBalance = openingBalance + leaveType.monthlyCredit - leavesTaken;

                await prisma.leaveBalanceHistory.create({
                    data: {
                        employeeId: employee.id,
                        leaveTypeId: leaveType.id,
                        year: year,
                        month: month,
                        openingBalance: openingBalance,
                        monthlyCredit: leaveType.monthlyCredit,
                        leavesTaken: leavesTaken,
                        manualAdjustment: 0,
                        closingBalance: closingBalance
                    }
                });

                await prisma.leaveBalance.update({
                    where: { id: balance.id },
                    data: {
                        totalDays: balance.totalDays + leaveType.monthlyCredit
                    }
                });

                totalCreditsAdded++;
                employeeCredits++;
                creditDetails.push({
                    employeeName: employee.user.name,
                    leaveTypeName: leaveType.name,
                    credit: leaveType.monthlyCredit
                });
            }

            if (employeeCredits === 0) {
                skippedEmployees.push(employee.user.name);
            }
        }

        // ✅ Log summary
        console.log(`✅ Total credits added: ${totalCreditsAdded}`);
        if (skippedEmployees.length > 0) {
            console.log(`⏭️ Skipped employees (already had credits): ${skippedEmployees.join(', ')}`);
        }

        // ✅ Notify employees about credits
        for (const employee of employees) {
            const employeeCredits = creditDetails.filter(c => c.employeeName === employee.user.name);
            if (employeeCredits.length > 0) {
                const creditMessage = employeeCredits.map(c => `${c.leaveTypeName}: +${c.credit} days`).join(', ');
                await prisma.notification.create({
                    data: {
                        userId: employee.userId,
                        title: 'Monthly Credits Added',
                        message: `Monthly credits added for ${month}/${year}: ${creditMessage}`
                    }
                });
            }
        }

        // ✅ Notify HR
        const hrUsers = await prisma.user.findMany({
            where: { role: 'HR' }
        });

        if (hrUsers.length > 0) {
            await prisma.notification.createMany({
                data: hrUsers.map(hr => ({
                    userId: hr.id,
                    title: 'Monthly Credits Generated',
                    message: `Generated monthly credits for ${employees.length} employees. Total credits added: ${totalCreditsAdded} entries.`
                }))
            });
            console.log(`✅ Notified ${hrUsers.length} HR users about credits`);
        }

        res.json({
            success: true,
            message: totalCreditsAdded > 0 
                ? `Monthly credits generated for ${totalCreditsAdded} entries` 
                : 'No new credits added. All employees already have credits for this month.',
            data: {
                employeesProcessed: employees.length,
                leaveTypesProcessed: leaveTypes.length,
                totalCreditsAdded: totalCreditsAdded,
                creditDetails: creditDetails,
                skippedEmployees: skippedEmployees
            }
        });
    } catch (error) {
        console.error('Generate monthly credits error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate monthly credits',
            error: error.message
        });
    }
}

// ============================================
// GET EMPLOYEE LEAVE HISTORY - WITH MANUAL FLAG
// ============================================
export async function getEmployeeLeaveHistory(req, res) {
    try {
        const { employeeId } = req.params;
        const { limit = 50 } = req.query;

        const history = await prisma.leaveRequest.findMany({
            where: {
                employeeId: parseInt(employeeId)
            },
            include: {
                leaveType: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        isCompensatory: true
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
                createdAt: 'desc'
            },
            take: parseInt(limit)
        });

        // Add manual flag for frontend
        const enrichedHistory = history.map(item => ({
            ...item,
            isManual: item.isManual || false,
            adjustmentMadeBy: item.adjustedByUser?.name || null,
            adjustmentType: item.isManual ? (item.adjustmentReason?.includes('deduct') ? 'Deduction' : 'Addition') : 'Regular'
        }));

        res.json({
            success: true,
            data: enrichedHistory,
            count: enrichedHistory.length
        });
    } catch (error) {
        console.error('Get employee leave history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get employee leave history',
            error: error.message
        });
    }
}

// ============================================
// GET ALL EMPLOYEES FOR LEAVE MANAGEMENT
// ============================================
export async function getEmployeesForManagement(req, res) {
    try {
        const { search } = req.query;

        const where = {};

        if (search) {
            where.OR = [
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { employeeCode: { contains: search, mode: 'insensitive' } }
            ];
        }

        const employees = await prisma.employeeProfile.findMany({
            where,
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
            orderBy: {
                user: {
                    name: 'asc'
                }
            },
            take: 100
        });

        res.json({
            success: true,
            data: employees,
            count: employees.length
        });
    } catch (error) {
        console.error('Get employees for management error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get employees',
            error: error.message
        });
    }
}

// ============================================
// GET ADJUSTMENT HISTORY (HR View)
// ============================================
export async function getAdjustmentHistory(req, res) {
    try {
        const { employeeId, limit = 50 } = req.query;

        const where = {
            isManual: true,
            status: 'APPROVED'
        };

        if (employeeId) {
            where.employeeId = parseInt(employeeId);
        }

        const adjustments = await prisma.leaveRequest.findMany({
            where,
            include: {
                employee: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                },
                leaveType: {
                    select: {
                        id: true,
                        name: true,
                        color: true
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
                createdAt: 'desc'
            },
            take: parseInt(limit)
        });

        res.json({
            success: true,
            data: adjustments,
            count: adjustments.length
        });
    } catch (error) {
        console.error('Get adjustment history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get adjustment history',
            error: error.message
        });
    }
}