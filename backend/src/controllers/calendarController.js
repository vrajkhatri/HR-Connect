import prisma from '../config/prisma.js';

export async function leaveCalendar(req, res) {
    try {
        const approvedLeaves = await prisma.leaveRequest.findMany({
            where: {
                status: 'APPROVED'
            },
            include: {
                employee: {
                    include: {
                        user: true,
                        department: true
                    }
                },
                leaveType: true
            },
            orderBy: {
                startDate: 'asc'
            }
        });

        const events = approvedLeaves.map(leave => ({
            id: leave.id,
            title: `${leave.employee.user.name} - ${leave.leaveType.name}`,
            start: leave.startDate,
            end: leave.endDate,
            backgroundColor: '#2563eb',
            borderColor: '#2563eb',
            extendedProps: {
                employeeName: leave.employee.user.name,
                employeeCode: leave.employee.employeeCode,
                department: leave.employee.department?.name || 'No Department',
                leaveType: leave.leaveType.name,
                dayType: leave.dayType,
                daysCount: leave.daysCount,
                reason: leave.reason,
                status: leave.status
            }
        }));

        res.json(events);

    } catch (error) {
        res.status(500).json({
            message: 'Unable to load leave calendar'
        });
    }
}