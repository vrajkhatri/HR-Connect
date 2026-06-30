import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        employeeProfile: {
          include: {
            department: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // If user doesn't have employee profile, create one automatically
    if (!user.employeeProfile) {
      console.log(`⚠️ User ${user.email} has no employee profile. Creating one...`);
      
      const empCode = `EMP${user.id.toString().padStart(4, '0')}`;
      
      const profile = await prisma.employeeProfile.create({
        data: {
          userId: user.id,
          employeeCode: empCode,
          designation: 'Employee',
          joiningDate: new Date(),
        }
      });

      console.log(`✅ Created employee profile for ${user.email} with code: ${empCode}`);

      // Create leave balances
      const leaveTypes = await prisma.leaveType.findMany();
      const year = new Date().getFullYear();

      if (leaveTypes.length > 0) {
        await prisma.leaveBalance.createMany({
          data: leaveTypes.map(type => ({
            employeeId: profile.id,
            leaveTypeId: type.id,
            year,
            totalDays: type.maxDays || 0,
            usedDays: 0
          }))
        });
        console.log(`✅ Created ${leaveTypes.length} leave balances for ${user.email}`);
      }

      // Refresh user with new profile
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          employeeProfile: {
            include: {
              department: true
            }
          }
        }
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireHR = (req, res, next) => {
  if (req.user.role !== 'HR' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'HR access required' });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};