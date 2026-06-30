import prisma from '../config/prisma.js';

export const getLeaveTypes = async (req, res) => {
    try {
        const leaveTypes = await prisma.leaveType.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        res.json({ data: leaveTypes });
    } catch (error) {
        console.error('Get leave types error:', error);
        res.status(500).json({ message: 'Failed to fetch leave types' });
    }
};

export const createLeaveType = async (req, res) => {
    try {
        const { name, description, color, maxDays } = req.body;

        const existing = await prisma.leaveType.findUnique({
            where: { name }
        });

        if (existing) {
            return res.status(400).json({ message: 'Leave type already exists' });
        }

        const leaveType = await prisma.leaveType.create({
            data: {
                name,
                description,
                color: color || '#6c757d',
                maxDays: maxDays ? parseFloat(maxDays) : null
            }
        });

        // Create leave balances for ALL employees for this new leave type
        const employees = await prisma.employeeProfile.findMany();
        const year = new Date().getFullYear();

        if (employees.length > 0) {
            await prisma.leaveBalance.createMany({
                data: employees.map(emp => ({
                    employeeId: emp.id,
                    leaveTypeId: leaveType.id,
                    year,
                    totalDays: leaveType.maxDays || 0,
                    usedDays: 0
                }))
            });
            console.log(`✅ Created leave balances for ${employees.length} employees for new leave type: ${name}`);
        }

        res.status(201).json({ data: leaveType });
    } catch (error) {
        console.error('Create leave type error:', error);
        res.status(500).json({ message: 'Failed to create leave type' });
    }
};

export const updateLeaveType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, color, maxDays } = req.body;

        // Get old leave type data to compare changes
        const oldLeaveType = await prisma.leaveType.findUnique({
            where: { id: parseInt(id) }
        });

        if (!oldLeaveType) {
            return res.status(404).json({ message: 'Leave type not found' });
        }

        // Update leave type
        const leaveType = await prisma.leaveType.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                color,
                maxDays: maxDays ? parseFloat(maxDays) : null
            }
        });

        // If maxDays changed, update all employee balances for this leave type
        if (oldLeaveType.maxDays !== leaveType.maxDays) {
            const year = new Date().getFullYear();
            
            // Get all balances for this leave type
            const balances = await prisma.leaveBalance.findMany({
                where: {
                    leaveTypeId: parseInt(id),
                    year: year
                }
            });

            // Update each balance's totalDays
            for (const balance of balances) {
                await prisma.leaveBalance.update({
                    where: { id: balance.id },
                    data: {
                        totalDays: leaveType.maxDays || 0
                    }
                });
            }
            
            console.log(`✅ Updated ${balances.length} leave balances for leave type: ${name}`);
        }

        res.json({ data: leaveType });
    } catch (error) {
        console.error('Update leave type error:', error);
        res.status(500).json({ message: 'Failed to update leave type' });
    }
};

export const deleteLeaveType = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if leave type is being used
        const used = await prisma.leaveRequest.count({
            where: { leaveTypeId: parseInt(id) }
        });

        if (used > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete leave type that is being used in leave requests' 
            });
        }

        // Delete all leave balances for this leave type
        await prisma.leaveBalance.deleteMany({
            where: { leaveTypeId: parseInt(id) }
        });

        // Delete the leave type
        await prisma.leaveType.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Leave type deleted successfully' });
    } catch (error) {
        console.error('Delete leave type error:', error);
        res.status(500).json({ message: 'Failed to delete leave type' });
    }
};