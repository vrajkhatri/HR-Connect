import prisma from '../src/config/prisma.js';

async function checkAndUpdate() {
    console.log('🔍 Checking leave types...');

    // Show current values
    const leaveTypes = await prisma.leaveType.findMany();
    console.log('📋 Current Leave Types:');
    console.table(leaveTypes.map(l => ({ id: l.id, name: l.name, monthlyCredit: l.monthlyCredit })));

    // Update Annual Leave
    console.log('\n🔄 Updating Annual Leave...');
    try {
        const updated = await prisma.leaveType.update({
            where: { name: 'Annual Leave' },
            data: { monthlyCredit: 1 }
        });
        console.log(`✅ ${updated.name}: monthlyCredit = ${updated.monthlyCredit}`);
    } catch (error) {
        console.log('❌ Could not find "Annual Leave". Trying ID 1...');
        try {
            const updated = await prisma.leaveType.update({
                where: { id: 1 },
                data: { monthlyCredit: 1 }
            });
            console.log(`✅ ${updated.name} (ID: ${updated.id}): monthlyCredit = ${updated.monthlyCredit}`);
        } catch (idError) {
            console.error('❌ Error:', idError);
        }
    }

    // Verify after update
    const afterUpdate = await prisma.leaveType.findMany();
    console.log('\n📋 After Update:');
    console.table(afterUpdate.map(l => ({ id: l.id, name: l.name, monthlyCredit: l.monthlyCredit })));

    await prisma.$disconnect();
    console.log('\n🎉 Done! Now try generating monthly credits from the UI.');
}

checkAndUpdate();