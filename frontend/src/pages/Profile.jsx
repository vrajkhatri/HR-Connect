import React, { useState, useEffect } from 'react';
import { getProfile, updateProfile, changePassword } from '../api/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await getProfile();
      const data = response.data.data || response.data;
      setProfile(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.employeeProfile?.phone || '',
        address: data.employeeProfile?.address || ''
      });
      console.log('✅ Profile loaded:', data);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await updateProfile(formData);
      toast.success(response.data.message || 'Profile updated successfully');
      setEditing(false);
      await loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
      console.error('Update error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const response = await changePassword(passwordData);
      toast.success(response.data.message || 'Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading profile..." />;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold">My Profile</h5>
          <p className="text-muted mb-0">View and manage your profile information</p>
        </div>
        <div className="d-flex gap-2">
          {!editing ? (
            <>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => setEditing(true)}
              >
                <i className="bi bi-pencil me-1"></i> Edit Profile
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowPasswordModal(true)}
              >
                <i className="bi bi-key me-1"></i> Change Password
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditing(false);
                  // Reset form data
                  setFormData({
                    name: profile?.name || '',
                    email: profile?.email || '',
                    phone: profile?.employeeProfile?.phone || '',
                    address: profile?.employeeProfile?.address || ''
                  });
                }}
              >
                <i className="bi bi-x-lg me-1"></i> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-lg-4">
          <div className="card shadow-sm text-center">
            <div className="card-body py-4">
              <div className="position-relative d-inline-block">
                <img
                  src={`https://ui-avatars.com/api/?name=${profile?.name || 'User'}&size=128&background=0d6efd&color=fff`}
                  alt={profile?.name}
                  className="rounded-circle mb-3"
                  style={{ width: '128px', height: '128px', border: '4px solid #e9ecef' }}
                />
                <div 
                  className="position-absolute bottom-0 end-0 bg-success rounded-circle p-1"
                  style={{ width: '24px', height: '24px', border: '2px solid #fff' }}
                >
                  <i className="bi bi-check text-white small"></i>
                </div>
              </div>
              <h5 className="fw-bold mb-0">{profile?.name}</h5>
              <p className="text-muted mb-1">{profile?.email}</p>
              <span className="badge bg-primary">{profile?.role}</span>
              {profile?.employeeProfile && (
                <div className="mt-2">
                  <small className="text-muted d-block">
                    <i className="bi bi-person-badge me-1"></i>
                    {profile.employeeProfile.employeeCode}
                  </small>
                  <small className="text-muted d-block">
                    <i className="bi bi-building me-1"></i>
                    {profile.employeeProfile.department?.name || 'No Department'}
                  </small>
                  <small className="text-muted d-block">
                    <i className="bi bi-briefcase me-1"></i>
                    {profile.employeeProfile.designation || 'No Designation'}
                  </small>
                </div>
              )}
              <hr />
              <div className="text-start">
                <small className="text-muted d-block">
                  <i className="bi bi-calendar3 me-1"></i>
                  Joined: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header">
              <i className="bi bi-person me-2"></i>
              Personal Information
              {editing && (
                <span className="badge bg-warning text-dark ms-2">
                  Editing Mode
                </span>
              )}
            </div>
            <div className="card-body">
              {editing ? (
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                      <small className="text-muted">
                        <i className="bi bi-info-circle me-1"></i>
                        Changing email will update it across all your leave requests
                      </small>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Employee Code</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profile?.employeeProfile?.employeeCode || 'N/A'}
                        disabled
                      />
                      <small className="text-muted">Employee code cannot be changed</small>
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label fw-semibold">Address</label>
                      <textarea
                        className="form-control"
                        name="address"
                        rows="3"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter your address"
                      ></textarea>
                    </div>
                  </div>

                  <div className="d-flex gap-2 mt-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-1"></i>
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditing(false);
                        setFormData({
                          name: profile?.name || '',
                          email: profile?.email || '',
                          phone: profile?.employeeProfile?.phone || '',
                          address: profile?.employeeProfile?.address || ''
                        });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="row mb-3">
                    <div className="col-md-3 fw-semibold text-muted">Name</div>
                    <div className="col-md-9">{profile?.name}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-3 fw-semibold text-muted">Email</div>
                    <div className="col-md-9">{profile?.email}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-3 fw-semibold text-muted">Phone</div>
                    <div className="col-md-9">{profile?.employeeProfile?.phone || 'Not provided'}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-3 fw-semibold text-muted">Address</div>
                    <div className="col-md-9">{profile?.employeeProfile?.address || 'Not provided'}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-3 fw-semibold text-muted">Role</div>
                    <div className="col-md-9">
                      <span className="badge bg-primary">{profile?.role}</span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-3 fw-semibold text-muted">Member Since</div>
                    <div className="col-md-9">
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="bi bi-key text-warning me-2"></i>
                    Change Password
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                    }}
                  ></button>
                </div>
                <form onSubmit={handlePasswordSubmit}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Current Password</label>
                      <input
                        type="password"
                        className="form-control"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">New Password</label>
                      <input
                        type="password"
                        className="form-control"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                      <small className="text-muted">Minimum 6 characters</small>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Confirm New Password</label>
                      <input
                        type="password"
                        className="form-control"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                      {passwordData.newPassword && passwordData.confirmPassword && 
                        passwordData.newPassword !== passwordData.confirmPassword && (
                        <small className="text-danger">
                          <i className="bi bi-exclamation-circle me-1"></i>
                          Passwords do not match
                        </small>
                      )}
                      {passwordData.newPassword && passwordData.confirmPassword && 
                        passwordData.newPassword === passwordData.confirmPassword && (
                        <small className="text-success">
                          <i className="bi bi-check-circle me-1"></i>
                          Passwords match
                        </small>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowPasswordModal(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving || 
                        !passwordData.currentPassword || 
                        !passwordData.newPassword || 
                        !passwordData.confirmPassword ||
                        passwordData.newPassword !== passwordData.confirmPassword ||
                        passwordData.newPassword.length < 6
                      }
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Changing...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;