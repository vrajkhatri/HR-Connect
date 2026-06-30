import prisma from '../config/prisma.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const logs = await prisma.auditLog.findMany({
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
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({ data: logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
};