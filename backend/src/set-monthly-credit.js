import prisma from '../src/config/prisma.js';

async function setMonthlyCredit() {
    console.log('🔄 Setting monthly credit for Annual Leave...');

    try {
        // Update Annual Leave
        const result = await prisma.leaveType.update({
            where: { name: 'Annual Leave' },
            data: { monthlyCredit: 1 }
        });

        console.log(`✅ ${result.name}: monthlyCredit = ${result.monthlyCredit}`);

        // Show all leave types
        const allTypes = await prisma.leaveType.findMany({
            select: { id: true, name: true, monthlyCredit: true }
        });

        console.log('\n📋 Current Leave Types:');
        console.table(allTypes);

        await prisma.$disconnect();
        console.log('\n🎉 Monthly credit set successfully!');
        console.log('📊 Now you can generate monthly credits from the UI.');
    } catch (error) {
        console.error('❌ Error:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

setMonthlyCredit();