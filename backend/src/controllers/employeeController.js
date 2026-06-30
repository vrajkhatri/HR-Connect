import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';

export const getEmployees = async (req, res) => {
  try {
    const { search, departmentId } = req.query;

    const where = {};
    
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { employeeCode: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (departmentId) {
      where.departmentId = parseInt(departmentId);
    }

    const employees = await prisma.employeeProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        department: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ data: employees });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await prisma.employeeProfile.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        department: true
      }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ data: employee });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Failed to fetch employee' });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const { name, email, password, employeeCode, departmentId, designation, joiningDate, phone, address, role } = req.body;

    // Check if email exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check if employee code exists
    const existingEmployee = await prisma.employeeProfile.findUnique({
      where: { employeeCode }
    });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee code already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'EMPLOYEE',
        employeeProfile: {
          create: {
            employeeCode,
            departmentId: departmentId ? parseInt(departmentId) : null,
            designation,
            joiningDate: joiningDate ? new Date(joiningDate) : null,
            phone,
            address
          }
        }
      },
      include: {
        employeeProfile: {
          include: {
            department: true
          }
        }
      }
    });

    // Create leave balances for all leave types
    const leaveTypes = await prisma.leaveType.findMany();
    const year = new Date().getFullYear();
    
    if (leaveTypes.length > 0) {
      await prisma.leaveBalance.createMany({
        data: leaveTypes.map(type => ({
          employeeId: user.employeeProfile.id,
          leaveTypeId: type.id,
          year,
          totalDays: type.maxDays || 0,
          usedDays: 0
        }))
      });
    }

    res.status(201).json({ data: user });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Failed to create employee' });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, departmentId, designation, joiningDate, phone, address, role, password } = req.body;

    const employee = await prisma.employeeProfile.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update user
    const userData = { name };
    if (role) userData.role = role;
    if (password) {
      userData.password = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id: employee.userId },
      data: userData
    });

    // Update employee profile
    const updated = await prisma.employeeProfile.update({
      where: { id: parseInt(id) },
      data: {
        departmentId: departmentId ? parseInt(departmentId) : null,
        designation,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        phone,
        address
      },
      include: {
        user: true,
        department: true
      }
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Failed to update employee' });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employeeProfile.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Delete employee profile and user
    await prisma.$transaction([
      prisma.leaveBalance.deleteMany({ where: { employeeId: parseInt(id) } }),
      prisma.leaveRequest.deleteMany({ where: { employeeId: parseInt(id) } }),
      prisma.employeeProfile.delete({ where: { id: parseInt(id) } }),
      prisma.user.delete({ where: { id: employee.userId } })
    ]);

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Failed to delete employee' });
  }
};