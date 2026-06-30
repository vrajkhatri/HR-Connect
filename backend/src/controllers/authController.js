import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendPasswordResetOTP, sendWelcomeEmail } from '../utils/emailService.js';

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ============================================
// REGISTER
// ============================================
export const register = async (req, res) => {
  try {
    console.log('📝 Register request received:', req.body.email);
    
    const { name, email, password, confirmPassword, employeeCode, role } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Passwords do not match' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate employee code
    const empCode = employeeCode || `EMP${Date.now().toString().slice(-6)}`;
    
    // Check if employee code exists
    const existingEmployee = await prisma.employeeProfile.findUnique({
      where: { employeeCode: empCode }
    });
    
    if (existingEmployee) {
      return res.status(400).json({ 
        success: false,
        message: 'Employee code already exists' 
      });
    }

    // Create user with employee profile - ALWAYS create one
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'EMPLOYEE',
        employeeProfile: {
          create: {
            employeeCode: empCode,
          }
        }
      },
      include: {
        employeeProfile: true
      }
    });

    console.log('✅ User created:', user.id, 'with employee code:', empCode);

    // Create leave balances for the new employee
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
      console.log('✅ Leave balances created for user:', user.id);
    }

    // Send welcome email
    try {
      await sendWelcomeEmail(email, name);
      console.log('✅ Welcome email sent to:', email);
    } catch (emailError) {
      console.error('❌ Welcome email error:', emailError);
    }

    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please login.',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Registration failed',
      error: error.message 
    });
  }
};

// ============================================
// LOGIN
// ============================================
export const login = async (req, res) => {
  try {
    console.log('🔑 Login request received:', req.body.email);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        employeeProfile: {
          include: {
            department: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch for:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default-secret-key-change-this',
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    console.log('✅ Login successful:', email);

    res.json({
      success: true,
      token,
      user: userWithoutPassword,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Login failed',
      error: error.message 
    });
  }
};

// ============================================
// SEND OTP (Forgot Password)
// ============================================
export const sendOTP = async (req, res) => {
  try {
    console.log('📧 Send OTP request:', req.body.email);
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // For security, don't reveal if email exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive an OTP.'
      });
    }

    // Delete any existing OTPs for this email
    await prisma.oTP.deleteMany({
      where: {
        email,
        purpose: 'PASSWORD_RESET'
      }
    });

    // Generate OTP
    const otp = generateOTP();
    console.log('🔑 Generated OTP for', email, ':', otp);
    
    const hashedOTP = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    // Save OTP to database
    await prisma.oTP.create({
      data: {
        email,
        otp: hashedOTP,
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 600000), // 10 minutes
      }
    });

    // Send OTP via email
    try {
      await sendPasswordResetOTP(email, otp);
      console.log('✅ OTP sent to:', email);
    } catch (emailError) {
      console.error('❌ Email error:', emailError);
      // Return OTP in response for testing if email fails
      return res.json({
        success: true,
        message: 'OTP generated. (Email sending failed - check email configuration)',
        otp: otp, // For testing only
        emailSent: false
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your email. Please check your inbox.'
    });

  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send OTP',
      error: error.message 
    });
  }
};

// ============================================
// VERIFY OTP AND RESET PASSWORD (Combined)
// ============================================
export const verifyOTPAndResetPassword = async (req, res) => {
  try {
    console.log('✅ Verify OTP and reset password request:', req.body.email);
    
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Passwords do not match' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters' 
      });
    }

    // Hash the OTP to compare with stored OTP
    const hashedOTP = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    // Find valid OTP entry (NOT used yet)
    const otpEntry = await prisma.oTP.findFirst({
      where: {
        email,
        otp: hashedOTP,
        purpose: 'PASSWORD_RESET',
        used: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!otpEntry) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.' 
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword 
      }
    });

    console.log('✅ Password updated for:', email);

    // Mark OTP as used ONLY AFTER password is updated
    await prisma.oTP.update({
      where: { id: otpEntry.id },
      data: { used: true }
    });

    console.log('✅ Password reset successful for:', email);

    res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.'
    });

  } catch (error) {
    console.error('❌ Verify OTP and reset password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to reset password',
      error: error.message 
    });
  }
};

// ============================================
// VERIFY OTP ONLY (Legacy - kept for compatibility)
// ============================================
export const verifyOTP = async (req, res) => {
  try {
    console.log('✅ Verify OTP request:', req.body.email);
    
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and OTP are required' 
      });
    }

    // Hash the OTP to compare with stored OTP
    const hashedOTP = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    // Find valid OTP entry
    const otpEntry = await prisma.oTP.findFirst({
      where: {
        email,
        otp: hashedOTP,
        purpose: 'PASSWORD_RESET',
        used: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!otpEntry) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.' 
      });
    }

    // Generate reset token for the separate flow
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Store reset token
    await prisma.passwordReset.create({
      data: {
        email,
        token: hashedResetToken,
        expiresAt: new Date(Date.now() + 600000), // 10 minutes
      }
    });

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpEntry.id },
      data: { used: true }
    });

    console.log('✅ OTP verified for:', email);

    res.json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      resetToken: resetToken,
      verified: true
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to verify OTP',
      error: error.message 
    });
  }
};

// ============================================
// RESET PASSWORD (After OTP verification - Legacy)
// ============================================
export const resetPassword = async (req, res) => {
  try {
    console.log('🔑 Reset password request received');
    
    const { email, newPassword, confirmPassword, resetToken } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Email, new password and confirm password are required' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Passwords do not match' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters' 
      });
    }

    // If resetToken is provided, verify it
    if (resetToken) {
      const hashedResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      const resetEntry = await prisma.passwordReset.findFirst({
        where: {
          email,
          token: hashedResetToken,
          used: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!resetEntry) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid or expired reset session. Please request a new OTP.' 
        });
      }

      // Mark reset token as used
      await prisma.passwordReset.update({
        where: { id: resetEntry.id },
        data: { used: true }
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    console.log('✅ Password reset successful for:', email);

    res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to reset password',
      error: error.message 
    });
  }
};

// ============================================
// GET CURRENT USER
// ============================================
export const getCurrentUser = async (req, res) => {
  try {
    console.log('👤 Get current user:', req.user?.id);
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authenticated' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch user',
      error: error.message 
    });
  }
};