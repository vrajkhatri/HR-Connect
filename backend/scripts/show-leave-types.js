import prisma from '../src/config/prisma.js';

async function showLeaveTypes() {
    console.log('📋 All Leave Types in Database:');
    
    try {
        const types = await prisma.leaveType.findMany({
            select: {
                id: true,
                name: true,
                monthlyCredit: true,
                isCompensatory: true
            }
        });

        console.table(types);

        // Check specifically for Annual Leave
        const annual = await prisma.leaveType.findFirst({
            where: {
                name: {
                    contains: 'Annual',
                    mode: 'insensitive'
                }
            }
        });

        if (annual) {
            console.log(`\n✅ Found Annual Leave: "${annual.name}" (ID: ${annual.id})`);
            console.log(`📊 Current monthlyCredit: ${annual.monthlyCredit}`);
        } else {
            console.log('\n❌ No leave type containing "Annual" found!');
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        await prisma.$disconnect();
    }
}

showLeaveTypes();