import prisma from '../src/config/prisma.js';

async function fixMissingProfiles() {
    console.log('🔧 Fixing missing employee profiles...');

    // Get all users without employee profiles
    const usersWithoutProfile = await prisma.user.findMany({
        where: {
            employeeProfile: null
        },
        include: {
            employeeProfile: true
        }
    });

    console.log(`📋 Found ${usersWithoutProfile.length} users without employee profiles`);

    for (const user of usersWithoutProfile) {
        console.log(`🔄 Creating profile for: ${user.email} (ID: ${user.id})`);

        // Generate employee code
        const empCode = `EMP${user.id.toString().padStart(4, '0')}`;

        // Create employee profile
        const profile = await prisma.employeeProfile.create({
            data: {
                userId: user.id,
                employeeCode: empCode,
            }
        });

        console.log(`✅ Created profile for ${user.email} with code: ${empCode}`);

        // Create leave balances for the new employee
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
    }

    console.log('🎉 All missing profiles fixed!');
    await prisma.$disconnect();
}

fixMissingProfiles()
    .catch((error) => {
        console.error('❌ Error fixing profiles:', error);
        process.exit(1);
    });