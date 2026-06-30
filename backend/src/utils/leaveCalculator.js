import prisma from '../config/prisma.js';

export function calculateLeaveDays(startDate, endDate, dayType = 'FULL_DAY') {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // For half day, only count 0.5 day
  if (dayType === 'FIRST_HALF' || dayType === 'SECOND_HALF') {
    return 0.5;
  }
  
  // Calculate business days (excluding weekends)
  let days = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endCopy = new Date(end);
  endCopy.setHours(23, 59, 59, 999);
  
  // If it's the same day, count as 1 day
  if (start.toDateString() === end.toDateString()) {
    return 1;
  }
  
  while (current <= endCopy) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

export async function recalculateBalance(employeeId, leaveTypeId) {
  const year = new Date().getFullYear();
  
  // Get leave type
  const leaveType = await prisma.leaveType.findUnique({
    where: { id: leaveTypeId }
  });
  
  if (!leaveType) {
    throw new Error('Leave type not found');
  }
  
  // Get or create balance
  let balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId,
        leaveTypeId,
        year
      }
    }
  });
  
  if (!balance) {
    balance = await prisma.leaveBalance.create({
      data: {
        employeeId,
        leaveTypeId,
        year,
        totalDays: 0,
        usedDays: 0
      }
    });
  }

  // ✅ Check if this is Compensatory Off
  const isCompensatoryOff = leaveType.isCompensatory === true;

  if (isCompensatoryOff) {
    // ✅ For Compensatory Off: Total = sum of all manual additions, Used = 0
    
    // Get all manual additions for Compensatory Off
    const manualAdditions = await prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        leaveTypeId,
        status: 'APPROVED',
        isManual: true,
        startDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        }
      },
      _sum: {
        daysCount: true
      }
    });

    const totalCompensatoryDays = manualAdditions._sum.daysCount || 0;
    
    console.log(`🔄 Recalculating Compensatory Off for employee ${employeeId}: Total = ${totalCompensatoryDays}, Used = 0`);
    
    // Update balance - ALWAYS set usedDays to 0 for Compensatory Off
    return await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        totalDays: totalCompensatoryDays,
        usedDays: 0
      }
    });
  } else {
    // ✅ Regular leave types: Calculate used days from approved leaves (excluding manual additions)
    
    // Get regular approved leaves (non-manual)
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId,
        leaveTypeId,
        status: 'APPROVED',
        isManual: false,
        startDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        }
      }
    });
    
    const usedDays = approvedLeaves.reduce((sum, leave) => sum + leave.daysCount, 0);
    
    // Also get manual deductions (negative adjustments)
    const manualDeductions = await prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        leaveTypeId,
        status: 'APPROVED',
        isManual: true,
        adjustmentReason: {
          contains: 'deduct',
          mode: 'insensitive'
        },
        startDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        }
      },
      _sum: {
        daysCount: true
      }
    });

    const totalUsed = usedDays + (manualDeductions._sum.daysCount || 0);
    
    // Get total days from leave type or manual additions
    // Check if there are any manual additions (non-deduction)
    const manualAdditions = await prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        leaveTypeId,
        status: 'APPROVED',
        isManual: true,
        NOT: {
          adjustmentReason: {
            contains: 'deduct',
            mode: 'insensitive'
          }
        },
        startDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        }
      },
      _sum: {
        daysCount: true
      }
    });

    const totalDays = (leaveType.maxDays || 0) + (manualAdditions._sum.daysCount || 0);

    console.log(`🔄 Recalculating regular leave for employee ${employeeId}: Total = ${totalDays}, Used = ${totalUsed}`);

    return await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        totalDays: totalDays,
        usedDays: totalUsed
      }
    });
  }
}