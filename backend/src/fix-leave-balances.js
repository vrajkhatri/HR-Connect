import prisma from '../src/config/prisma.js';

async function fixLeaveBalances() {
    console.log('🔄 Fixing leave balances...');

    const leaveTypes = await prisma.leaveType.findMany();
    const employees = await prisma.employeeProfile.findMany();
    const year = new Date().getFullYear();

    console.log(`📋 Found ${leaveTypes.length} leave types and ${employees.length} employees`);

    for (const employee of employees) {
        for (const leaveType of leaveTypes) {
            // Get or create balance
            let balance = await prisma.leaveBalance.findUnique({
                where: {
                    employeeId_leaveTypeId_year: {
                        employeeId: employee.id,
                        leaveTypeId: leaveType.id,
                        year: year
                    }
                }
            });

            // Calculate used days
            const approvedLeaves = await prisma.leaveRequest.findMany({
                where: {
                    employeeId: employee.id,
                    leaveTypeId: leaveType.id,
                    status: 'APPROVED',
                    startDate: {
                        gte: new Date(`${year}-01-01`),
                        lte: new Date(`${year}-12-31`)
                    }
                }
            });

            const usedDays = approvedLeaves.reduce((sum, leave) => sum + leave.daysCount, 0);

            if (balance) {
                await prisma.leaveBalance.update({
                    where: { id: balance.id },
                    data: {
                        totalDays: leaveType.maxDays || 0,
                        usedDays: usedDays
                    }
                });
            } else {
                await prisma.leaveBalance.create({
                    data: {
                        employeeId: employee.id,
                        leaveTypeId: leaveType.id,
                        year: year,
                        totalDays: leaveType.maxDays || 0,
                        usedDays: usedDays
                    }
                });
            }
        }
    }

    console.log('✅ All leave balances fixed!');
    await prisma.$disconnect();
}

fixLeaveBalances()
    .catch((error) => {
        console.error('❌ Error fixing leave balances:', error);
        process.exit(1);
    });