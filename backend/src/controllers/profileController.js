import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';

// ============================================
// GET PROFILE
// ============================================
export async function getProfile(req, res) {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user.id
            },
            include: {
                employeeProfile: {
                    include: {
                        department: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { password, ...userWithoutPassword } = user;

        res.json({
            success: true,
            data: userWithoutPassword
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to fetch profile'
        });
    }
}

// ============================================
// UPDATE PROFILE (Full - Name, Email, Phone, Address)
// ============================================
export async function updateProfile(req, res) {
    try {
        const { name, email, phone, address } = req.body;

        console.log('📝 Updating profile for user:', req.user.id);
        console.log('📝 Data:', { name, email, phone, address });

        // Check if email is being changed
        if (email && email !== req.user.email) {
            // Check if new email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use by another account'
                });
            }

            // Update user with new email
            await prisma.user.update({
                where: {
                    id: req.user.id
                },
                data: {
                    name: name || req.user.name,
                    email: email
                }
            });

            console.log('✅ Email updated from', req.user.email, 'to', email);
        } else {
            // Update only name if email not changed
            await prisma.user.update({
                where: {
                    id: req.user.id
                },
                data: {
                    name: name || req.user.name
                }
            });
        }

        // Update employee profile (phone, address)
        const profile = await prisma.employeeProfile.update({
            where: {
                userId: req.user.id
            },
            data: {
                phone: phone || undefined,
                address: address || undefined
            },
            include: {
                department: true
            }
        });

        // Get updated user
        const updatedUser = await prisma.user.findUnique({
            where: {
                id: req.user.id
            },
            include: {
                employeeProfile: {
                    include: {
                        department: true
                    }
                }
            }
        });

        console.log('✅ Profile updated for user:', req.user.id);

        const { password, ...userWithoutPassword } = updatedUser;

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: userWithoutPassword
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to update profile',
            error: error.message
        });
    }
}

// ============================================
// CHANGE PASSWORD
// ============================================
export async function changePassword(req, res) {
    try {
        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All password fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirm password do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: req.user.id
            }
        });

        const isMatch = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: {
                id: req.user.id
            },
            data: {
                password: hashedPassword
            }
        });

        console.log('✅ Password changed for user:', req.user.id);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to change password'
        });
    }
}

// ============================================
// UPDATE ONLY EMAIL
// ============================================
export async function updateEmail(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser && existingUser.id !== req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Email already in use by another account'
            });
        }

        const user = await prisma.user.update({
            where: {
                id: req.user.id
            },
            data: { email }
        });

        console.log('✅ Email updated to:', email);

        res.json({
            success: true,
            message: 'Email updated successfully',
            data: { email: user.email }
        });

    } catch (error) {
        console.error('Update email error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to update email'
        });
    }
}

// ============================================
// UPDATE ONLY PHONE
// ============================================
export async function updatePhone(req, res) {
    try {
        const { phone } = req.body;

        const profile = await prisma.employeeProfile.update({
            where: {
                userId: req.user.id
            },
            data: { phone }
        });

        res.json({
            success: true,
            message: 'Phone updated successfully',
            data: { phone: profile.phone }
        });

    } catch (error) {
        console.error('Update phone error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to update phone'
        });
    }
}

// ============================================
// UPDATE ONLY ADDRESS
// ============================================
export async function updateAddress(req, res) {
    try {
        const { address } = req.body;

        const profile = await prisma.employeeProfile.update({
            where: {
                userId: req.user.id
            },
            data: { address }
        });

        res.json({
            success: true,
            message: 'Address updated successfully',
            data: { address: profile.address }
        });

    } catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to update address'
        });
    }
}