import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default leave types WITH MONTHLY CREDIT
  const leaveTypes = await prisma.leaveType.createMany({
    data: [
      { 
        name: 'Annual Leave', 
        description: 'Standard annual leave', 
        color: '#0d6efd', 
        maxDays: 20,
        monthlyCredit: 1,        // ✅ 1 day per month
        isCompensatory: false,
        carryForward: true
      },
      { 
        name: 'Sick Leave', 
        description: 'Medical leave', 
        color: '#dc3545', 
        maxDays: 10,
        monthlyCredit: 0,        // ✅ No monthly credit
        isCompensatory: false,
        carryForward: true
      },
      { 
        name: 'Casual Leave', 
        description: 'Casual time off', 
        color: '#198754', 
        maxDays: 5,
        monthlyCredit: 0,        // ✅ No monthly credit
        isCompensatory: false,
        carryForward: true
      },
      { 
        name: 'Compensatory Off', 
        description: 'Compensatory leave', 
        color: '#fd7e14', 
        maxDays: null,
        monthlyCredit: 0,        // ✅ No monthly credit
        isCompensatory: true,
        carryForward: true
      },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Created ${leaveTypes.count} leave types with monthly credits`);

  // Create default departments
  const departments = await prisma.department.createMany({
    data: [
      { name: 'Engineering', description: 'Software development team' },
      { name: 'Human Resources', description: 'HR management team' },
      { name: 'Finance', description: 'Financial management team' },
      { name: 'Marketing', description: 'Marketing and sales team' },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Created ${departments.count} departments`);

  // Get created records
  const depts = await prisma.department.findMany();
  const types = await prisma.leaveType.findMany();

  // Create admin user
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // Check if admin exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@hrconnect.com' }
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@hrconnect.com',
        password: hashedPassword,
        role: 'ADMIN',
        employeeProfile: {
          create: {
            employeeCode: 'ADMIN001',
            departmentId: depts[1]?.id || null,
            designation: 'System Administrator',
          }
        }
      }
    });
    console.log(`✅ Created admin user: admin@hrconnect.com`);
  } else {
    console.log(`ℹ️ Admin user already exists`);
  }

  // Check if HR user exists
  const existingHR = await prisma.user.findUnique({
    where: { email: 'hr@hrconnect.com' }
  });

  if (!existingHR) {
    await prisma.user.create({
      data: {
        name: 'HR Manager',
        email: 'hr@hrconnect.com',
        password: hashedPassword,
        role: 'HR',
        employeeProfile: {
          create: {
            employeeCode: 'HR001',
            departmentId: depts[1]?.id || null,
            designation: 'HR Manager',
          }
        }
      }
    });
    console.log(`✅ Created HR user: hr@hrconnect.com`);
  } else {
    console.log(`ℹ️ HR user already exists`);
  }

  // Create sample employees - WITH PROPER CHECKS
  const employeeData = [
    {
      name: 'John Doe',
      email: 'john@hrconnect.com',
      employeeCode: 'EMP001',
      department: depts[0],
      designation: 'Senior Developer',
      joiningDate: new Date('2023-01-15'),
      phone: '+1-555-0101',
      address: '123 Main St, City'
    },
    {
      name: 'Jane Smith',
      email: 'jane@hrconnect.com',
      employeeCode: 'EMP002',
      department: depts[2],
      designation: 'Accountant',
      joiningDate: new Date('2023-03-01'),
      phone: '+1-555-0102',
      address: '456 Oak Ave, City'
    },
    {
      name: 'Michael Brown',
      email: 'michael@hrconnect.com',
      employeeCode: 'EMP003',
      department: depts[3],
      designation: 'Marketing Lead',
      joiningDate: new Date('2023-06-10'),
      phone: '+1-555-0103',
      address: '789 Pine Rd, City'
    }
  ];

  for (const emp of employeeData) {
    // ✅ Check if user exists by email
    const existingUser = await prisma.user.findUnique({
      where: { email: emp.email },
      include: { employeeProfile: true }
    });

    if (existingUser) {
      console.log(`ℹ️ Employee ${emp.name} already exists (${emp.email})`);
      continue;
    }

    // ✅ Check if employee code exists
    const existingEmployeeCode = await prisma.employeeProfile.findUnique({
      where: { employeeCode: emp.employeeCode }
    });

    if (existingEmployeeCode) {
      console.log(`ℹ️ Employee code ${emp.employeeCode} already exists`);
      continue;
    }

    // Create user with employee profile
    await prisma.user.create({
      data: {
        name: emp.name,
        email: emp.email,
        password: hashedPassword,
        role: 'EMPLOYEE',
        employeeProfile: {
          create: {
            employeeCode: emp.employeeCode,
            departmentId: emp.department?.id || null,
            designation: emp.designation,
            joiningDate: emp.joiningDate,
            phone: emp.phone,
            address: emp.address
          }
        }
      }
    });
    console.log(`✅ Created employee: ${emp.name} (${emp.employeeCode})`);
  }

  // Get all employees for leave balances
  const allEmployees = await prisma.employeeProfile.findMany();
  const allTypes = await prisma.leaveType.findMany();

  console.log(`📋 Found ${allEmployees.length} employees and ${allTypes.length} leave types`);

  // Create leave balances for each employee
  for (const emp of allEmployees) {
    for (const type of allTypes) {
      const existingBalance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: type.id,
            year: new Date().getFullYear()
          }
        }
      });

      if (!existingBalance) {
        // ✅ For Compensatory Off, totalDays should be 0 initially
        const totalDays = type.isCompensatory ? 0 : (type.maxDays || 0);
        
        await prisma.leaveBalance.create({
          data: {
            employeeId: emp.id,
            leaveTypeId: type.id,
            year: new Date().getFullYear(),
            totalDays: totalDays,
            usedDays: 0
          }
        });
        console.log(`✅ Created balance for ${emp.employeeCode} - ${type.name}: ${totalDays} days`);
      }
    }
  }
  console.log(`✅ Created leave balances for ${allEmployees.length} employees`);

  // Create sample leave requests
  const employees = await prisma.employeeProfile.findMany({
    include: { user: true }
  });

  if (employees.length > 0 && types.length > 0) {
    const annualType = types.find(t => t.name === 'Annual Leave') || types[0];
    const sickType = types.find(t => t.name === 'Sick Leave') || types[1] || types[0];
    
    const pendingRequests = [
      {
        employee: employees[0],
        type: annualType,
        startDate: new Date(new Date().setDate(new Date().getDate() + 5)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        reason: 'Family vacation',
        status: 'PENDING'
      },
      {
        employee: employees.length > 1 ? employees[1] : employees[0],
        type: sickType,
        startDate: new Date(new Date().setDate(new Date().getDate() + 2)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 2)),
        dayType: 'FIRST_HALF',
        reason: 'Doctor appointment',
        status: 'PENDING'
      }
    ];

    for (const req of pendingRequests) {
      const daysCount = req.dayType === 'FIRST_HALF' || req.dayType === 'SECOND_HALF' ? 0.5 : 2;
      
      // Check if request already exists
      const existingRequest = await prisma.leaveRequest.findFirst({
        where: {
          employeeId: req.employee.id,
          startDate: req.startDate,
          reason: req.reason
        }
      });

      if (!existingRequest) {
        await prisma.leaveRequest.create({
          data: {
            employeeId: req.employee.id,
            leaveTypeId: req.type.id,
            startDate: req.startDate,
            endDate: req.endDate,
            dayType: req.dayType || 'FULL_DAY',
            daysCount: daysCount,
            reason: req.reason,
            status: req.status
          }
        });
        console.log(`✅ Created leave request for ${req.employee.user.name}`);
      }
    }
  }

  console.log('🌱 Seeding completed!');
  console.log('📋 Login Credentials:');
  console.log('  Admin: admin@hrconnect.com / password123');
  console.log('  HR: hr@hrconnect.com / password123');
  console.log('  Employee: john@hrconnect.com / password123');
  console.log('📊 Monthly Credits:');
  console.log('  Annual Leave: 1 day/month');
  console.log('  Sick Leave: 0 days/month');
  console.log('  Casual Leave: 0 days/month');
  console.log('  Compensatory Off: 0 days/month');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });