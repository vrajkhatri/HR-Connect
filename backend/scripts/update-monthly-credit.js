import prisma from '../src/config/prisma.js';

async function updateMonthlyCredit() {
    console.log('🔄 Updating monthly credit for Annual Leave...');

    try {
        // Update Annual Leave
        const updated = await prisma.leaveType.update({
            where: { name: 'Annual Leave' },
            data: { monthlyCredit: 1 }
        });
        console.log(`✅ ${updated.name}: monthlyCredit = ${updated.monthlyCredit}`);

        // Show all after update
        const all = await prisma.leaveType.findMany({
            select: { id: true, name: true, monthlyCredit: true }
        });
        console.log('\n📋 Updated Leave Types:');
        console.table(all);

        await prisma.$disconnect();
        console.log('\n🎉 Done! Now restart backend and generate monthly credits.');
    } catch (error) {
        console.error('❌ Error:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

updateMonthlyCredit();