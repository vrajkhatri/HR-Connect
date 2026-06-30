import prisma from '../config/prisma.js';

export const getHRDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const year = today.getFullYear();

    // Get monthly leave trends using Prisma aggregation instead of raw SQL
    const monthlyTrends = [];
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          startDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      monthlyTrends.push({
        month: month,
        total: leaves.length,
        approved: leaves.filter(l => l.status === 'APPROVED').length,
        rejected: leaves.filter(l => l.status === 'REJECTED').length,
        pending: leaves.filter(l => l.status === 'PENDING').length
      });
    }

    // Get department-wise leave distribution
    const departments = await prisma.department.findMany({
      include: {
        employees: {
          include: {
            leaveRequests: {
              where: {
                startDate: {
                  gte: new Date(year, 0, 1),
                  lte: new Date(year, 11, 31)
                }
              }
            }
          }
        }
      }
    });

    const departmentDistribution = departments.map(dept => ({
      department: dept.name,
      total: dept.employees.reduce((sum, emp) => sum + emp.leaveRequests.length, 0),
      approved: dept.employees.reduce((sum, emp) => 
        sum + emp.leaveRequests.filter(l => l.status === 'APPROVED').length, 0),
      rejected: dept.employees.reduce((sum, emp) => 
        sum + emp.leaveRequests.filter(l => l.status === 'REJECTED').length, 0),
      pending: dept.employees.reduce((sum, emp) => 
        sum + emp.leaveRequests.filter(l => l.status === 'PENDING').length, 0)
    }));

    // Get leave type distribution
    const leaveTypes = await prisma.leaveType.findMany({
      include: {
        leaveRequests: {
          where: {
            status: 'APPROVED',
            startDate: {
              gte: new Date(year, 0, 1),
              lte: new Date(year, 11, 31)
            }
          }
        }
      }
    });

    const leaveTypeDistribution = leaveTypes.map(type => ({
      name: type.name,
      color: type.color,
      count: type.leaveRequests.length
    }));

    // Get recent activities
    const recentActivities = await prisma.auditLog.findMany({
      include: {
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        leaveRequest: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            },
            leaveType: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get employee growth
    const employeeGrowth = [];
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const count = await prisma.employeeProfile.count({
        where: {
          createdAt: {
            lte: endDate
          }
        }
      });
      
      employeeGrowth.push({
        month: month,
        count: count
      });
    }

    const [
      totalEmployees,
      totalDepartments,
      totalLeaveTypes,
      pendingLeaves,
      approvedToday,
      onLeaveToday,
      recentLeaves
    ] = await Promise.all([
      prisma.employeeProfile.count(),
      prisma.department.count(),
      prisma.leaveType.count(),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.leaveRequest.count({
        where: {
          status: 'APPROVED',
          approvedAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      prisma.leaveRequest.count({
        where: {
          status: 'APPROVED',
          startDate: { lte: today },
          endDate: { gte: today }
        }
      }),
      prisma.leaveRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          employee: {
            include: {
              user: true
            }
          },
          leaveType: true
        },
        orderBy: { appliedAt: 'desc' },
        take: 10
      })
    ]);

    res.json({
      totalEmployees,
      totalDepartments,
      totalLeaveTypes,
      pendingLeaves,
      approvedToday,
      onLeaveToday,
      recentLeaves,
      activeEmployees: totalEmployees,
      monthlyTrends,
      departmentDistribution,
      leaveTypeDistribution,
      recentActivities,
      employeeGrowth
    });
  } catch (error) {
    console.error('HR Dashboard error:', error);
    res.status(500).json({ message: 'Failed to load dashboard', error: error.message });
  }
};

export const getEmployeeDashboard = async (req, res) => {
  try {
    const profile = req.user.employeeProfile;
    
    if (!profile) {
      return res.status(400).json({ message: 'Employee profile not found' });
    }

    const year = new Date().getFullYear();
    const today = new Date();

    // Get monthly leave trends for the employee
    const monthlyTrends = [];
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          employeeId: profile.id,
          startDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      monthlyTrends.push({
        month: month,
        total: leaves.length,
        approved: leaves.filter(l => l.status === 'APPROVED').length,
        rejected: leaves.filter(l => l.status === 'REJECTED').length,
        pending: leaves.filter(l => l.status === 'PENDING').length
      });
    }

    // Get leave type breakdown
    const leaveTypes = await prisma.leaveType.findMany({
      include: {
        leaveRequests: {
          where: {
            employeeId: profile.id,
            status: 'APPROVED',
            startDate: {
              gte: new Date(year, 0, 1),
              lte: new Date(year, 11, 31)
            }
          }
        }
      }
    });

    const leaveTypeBreakdown = leaveTypes.map(type => ({
      name: type.name,
      color: type.color,
      count: type.leaveRequests.length,
      totalDays: type.leaveRequests.reduce((sum, l) => sum + l.daysCount, 0)
    }));

    // Get balance history for chart
    const balanceHistory = await prisma.leaveBalanceHistory.findMany({
      where: {
        employeeId: profile.id,
        year: year
      },
      include: {
        leaveType: {
          select: {
            name: true,
            color: true
          }
        }
      },
      orderBy: { month: 'asc' },
      take: 6
    });

    // Get upcoming leaves (next 30 days)
    const upcomingLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: profile.id,
        status: 'APPROVED',
        startDate: {
          gte: today,
          lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        leaveType: {
          select: {
            name: true,
            color: true
          }
        }
      },
      orderBy: { startDate: 'asc' },
      take: 5
    });

    const [totalLeaves, pendingLeaves, approvedLeaves, recentLeaves, balance] = await Promise.all([
      prisma.leaveRequest.count({ where: { employeeId: profile.id } }),
      prisma.leaveRequest.count({ where: { employeeId: profile.id, status: 'PENDING' } }),
      prisma.leaveRequest.count({ where: { employeeId: profile.id, status: 'APPROVED' } }),
      prisma.leaveRequest.findMany({
        where: { employeeId: profile.id },
        include: { leaveType: true },
        orderBy: { appliedAt: 'desc' },
        take: 10
      }),
      prisma.leaveBalance.aggregate({
        where: { employeeId: profile.id },
        _sum: { totalDays: true, usedDays: true }
      })
    ]);

    const approvalRate = totalLeaves > 0 
      ? Math.round((approvedLeaves / totalLeaves) * 100) 
      : 0;

    res.json({
      totalLeaves,
      pendingLeaves,
      approvedLeaves,
      recentLeaves,
      balance: (balance._sum.totalDays || 0) - (balance._sum.usedDays || 0),
      approvalRate,
      monthlyTrends,
      leaveTypeBreakdown,
      balanceHistory,
      upcomingLeaves
    });
  } catch (error) {
    console.error('Employee Dashboard error:', error);
    res.status(500).json({ message: 'Failed to load dashboard', error: error.message });
  }
};