import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [resendTimer, setResendTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  // Handle Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/send-otp', { email });
      
      // Check if OTP was returned in response (for testing)
      if (response.data.otp) {
        toast.info(`Your OTP is: ${response.data.otp} (For testing only)`);
        console.log('🔑 Test OTP:', response.data.otp);
      } else {
        toast.success(response.data.message || 'OTP sent to your email');
      }
      
      setOtpSent(true);
      setStep(2);
      startResendTimer();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password with OTP (Combined)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Use the combined route: verify OTP and reset password in one call
      const response = await api.post('/auth/verify-otp-and-reset', {
        email,
        otp,
        newPassword,
        confirmPassword
      });
      
      toast.success(response.data.message || 'Password reset successful! 🎉');
      toast.info('Please login with your new password');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    try {
      const response = await api.post('/auth/send-otp', { email });
      
      if (response.data.otp) {
        toast.info(`Your OTP is: ${response.data.otp} (For testing only)`);
        console.log('🔑 Test OTP:', response.data.otp);
      } else {
        toast.success(response.data.message || 'New OTP sent');
      }
      
      startResendTimer();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Start resend timer (60 seconds)
  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-lg" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
              <i className="bi bi-key fs-1 text-warning"></i>
            </div>
            <h4 className="fw-bold">Forgot Password</h4>
            <p className="text-muted">
              {step === 1 && 'Enter your email to receive OTP'}
              {step === 2 && `Enter OTP and create new password for ${email}`}
            </p>
          </div>

          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleSendOTP}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Email Address</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <small className="text-muted">
                  We'll send a 6-digit OTP to verify your identity
                </small>
              </div>

              <button
                type="submit"
                className="btn btn-warning w-100 py-2 fw-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="bi bi-envelope-paper me-2"></i>
                    Send OTP
                  </>
                )}
              </button>

              <div className="text-center mt-3">
                <Link to="/login" className="text-primary text-decoration-none small">
                  <i className="bi bi-arrow-left me-1"></i>
                  Back to Login
                </Link>
              </div>
            </form>
          )}

          {/* Step 2: OTP + New Password (Combined) */}
          {step === 2 && (
            <form onSubmit={handleResetPassword}>
              {/* OTP Section */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Enter OTP
                  {otpSent && (
                    <span className="text-success ms-2">
                      <i className="bi bi-check-circle"></i> Sent!
                    </span>
                  )}
                </label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-shield-lock"></i></span>
                  <input
                    type="text"
                    className="form-control text-center fs-4"
                    placeholder="000000"
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    style={{ letterSpacing: '8px', fontWeight: 'bold' }}
                  />
                </div>
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <small className="text-muted">
                    Enter the 6-digit OTP sent to your email
                  </small>
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-decoration-none p-0"
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {resendTimer > 0 ? (
                      `Resend in ${resendTimer}s`
                    ) : (
                      <><i className="bi bi-arrow-clockwise me-1"></i>Resend OTP</>
                    )}
                  </button>
                </div>
              </div>

              <hr className="my-3" />

              {/* New Password Section */}
              <div className="mb-3">
                <label className="form-label fw-semibold">New Password</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-lock"></i></span>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Confirm Password</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-shield-lock"></i></span>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <small className="text-danger">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    Passwords do not match
                  </small>
                )}
                {newPassword && confirmPassword && newPassword === confirmPassword && (
                  <small className="text-success">
                    <i className="bi bi-check-circle me-1"></i>
                    Passwords match
                  </small>
                )}
              </div>

              <div className="mb-3">
                <div className="alert alert-info small">
                  <i className="bi bi-info-circle me-2"></i>
                  Password must be at least 6 characters
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-success w-100 py-2 fw-semibold"
                disabled={loading || otp.length !== 6 || newPassword.length < 6 || newPassword !== confirmPassword}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Resetting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Reset Password
                  </>
                )}
              </button>

              <div className="text-center mt-3">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none text-danger small"
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Use different email
                </button>
                <span className="mx-2 text-muted">|</span>
                <Link to="/login" className="text-primary text-decoration-none small">
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;