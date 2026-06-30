import prisma from '../config/prisma.js';

export const getDepartments = async (req, res) => {
    try {
        const departments = await prisma.department.findMany({
            include: {
                _count: {
                    select: { employees: true }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.json({ data: departments });
    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({ message: 'Failed to fetch departments' });
    }
};

export const createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;

        const existing = await prisma.department.findUnique({
            where: { name }
        });

        if (existing) {
            return res.status(400).json({ message: 'Department already exists' });
        }

        const department = await prisma.department.create({
            data: { name, description }
        });

        res.status(201).json({ data: department });
    } catch (error) {
        console.error('Create department error:', error);
        res.status(500).json({ message: 'Failed to create department' });
    }
};

export const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const department = await prisma.department.update({
            where: { id: parseInt(id) },
            data: { name, description }
        });

        res.json({ data: department });
    } catch (error) {
        console.error('Update department error:', error);
        res.status(500).json({ message: 'Failed to update department' });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if department has employees
        const employees = await prisma.employeeProfile.count({
            where: { departmentId: parseInt(id) }
        });

        if (employees > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete department with employees. Reassign employees first.' 
            });
        }

        await prisma.department.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Delete department error:', error);
        res.status(500).json({ message: 'Failed to delete department' });
    }
};