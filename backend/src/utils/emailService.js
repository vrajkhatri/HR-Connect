import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log('📧 Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email error:', error);
    throw error;
  }
};

export const sendPasswordResetOTP = async (email, otp) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h2 { margin: 0; font-weight: 700; }
        .header p { margin: 5px 0 0; opacity: 0.8; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
        .otp-box { background: #fff; border: 2px dashed #0d6efd; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 48px; font-weight: 700; color: #0d6efd; letter-spacing: 10px; font-family: monospace; }
        .otp-label { font-size: 14px; color: #6c757d; margin-top: 10px; }
        .expiry { font-size: 14px; color: #dc3545; margin-top: 10px; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #6c757d; padding-top: 20px; border-top: 1px solid #e9ecef; }
        .btn { display: inline-block; padding: 12px 30px; background: #0d6efd; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .btn:hover { background: #0b5ed7; }
        .warning { color: #dc3545; font-size: 14px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔐 HRConnect</h2>
          <p>Password Reset Verification</p>
        </div>
        <div class="content">
          <h3>Hello,</h3>
          <p>We received a request to reset your password for your HRConnect account.</p>
          <p>Use the OTP below to verify your identity:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-label">Enter this code to reset your password</div>
          </div>
          
          <p style="text-align: center;">
            <strong>This OTP will expire in 10 minutes.</strong>
          </p>
          
          <div class="warning">
            <i class="bi bi-shield-lock"></i>
            <span>For security, never share this OTP with anyone.</span>
          </div>
          
          <hr>
          <p style="font-size: 14px; color: #6c757d;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} HRConnect. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, 'Password Reset OTP - HRConnect', html);
};

export const sendWelcomeEmail = async (email, name) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #6c757d; padding-top: 20px; border-top: 1px solid #e9ecef; }
        .btn { display: inline-block; padding: 12px 30px; background: #0d6efd; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .btn:hover { background: #0b5ed7; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🎉 Welcome to HRConnect!</h2>
        </div>
        <div class="content">
          <h3>Hello ${name},</h3>
          <p>Welcome to HRConnect - Professional HR Management System!</p>
          <p>Your account has been successfully created. You can now:</p>
          <ul>
            <li>Apply for leave</li>
            <li>Track your leave balance</li>
            <li>View your leave history</li>
          </ul>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="btn">Login Now</a>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} HRConnect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, 'Welcome to HRConnect!', html);
};