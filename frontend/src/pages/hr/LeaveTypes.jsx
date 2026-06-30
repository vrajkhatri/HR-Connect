import React, { useState, useEffect } from 'react';
import { getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType } from '../../api/api';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/ConfirmModal';
import LoadingSpinner from '../../components/LoadingSpinner';

const LeaveTypes = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6c757d',
    maxDays: ''
  });

  const colors = [
    '#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545',
    '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0',
    '#6c757d', '#343a40'
  ];

  const loadLeaveTypes = async () => {
    setLoading(true);
    try {
      const response = await getLeaveTypes();
      setLeaveTypes(response.data.data || []);
    } catch (error) {
      console.error('Error loading leave types:', error);
      toast.error('Failed to load leave types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Leave type name is required');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        maxDays: formData.maxDays ? parseFloat(formData.maxDays) : null
      };

      if (editingType) {
        await updateLeaveType(editingType.id, data);
        toast.success('Leave type updated successfully');
      } else {
        await createLeaveType(data);
        toast.success('Leave type created successfully');
      }
      setShowModal(false);
      setEditingType(null);
      setFormData({ name: '', description: '', color: '#6c757d', maxDays: '' });
      loadLeaveTypes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLeaveType(deleteTarget.id);
      toast.success('Leave type deleted successfully');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      loadLeaveTypes();
    } catch (error) {
      toast.error('Failed to delete leave type');
    }
  };

  if (loading && leaveTypes.length === 0) {
    return <LoadingSpinner text="Loading leave types..." />;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold">Leave Types</h5>
          <p className="text-muted mb-0">Manage leave types and policies</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-1"></i> Add Leave Type
        </button>
      </div>

      <div className="row g-3">
        {leaveTypes.map((type) => (
          <div className="col-md-4" key={type.id}>
            <div className="card shadow-sm hover-lift">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="rounded-circle d-inline-block"
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: type.color || '#6c757d'
                      }}
                    ></span>
                    <div>
                      <h6 className="fw-bold mb-0">{type.name}</h6>
                      <small className="text-muted">{type.description || 'No description'}</small>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        setEditingType(type);
                        setFormData({
                          name: type.name,
                          description: type.description || '',
                          color: type.color || '#6c757d',
                          maxDays: type.maxDays || ''
                        });
                        setShowModal(true);
                      }}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => {
                        setDeleteTarget(type);
                        setShowDeleteModal(true);
                      }}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
                {type.maxDays && (
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-calendar-range me-1"></i>
                      Max: {type.maxDays} days/year
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {leaveTypes.length === 0 && (
          <div className="col-12">
            <div className="text-center py-5 text-muted">
              <i className="bi bi-tags fs-1 d-block mb-3"></i>
              <p>No leave types found. Create your first leave type!</p>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingType ? 'Edit Leave Type' : 'Add New Leave Type'}
                </h5>
                <button type="button" className="btn-close" onClick={() => {
                  setShowModal(false);
                  setEditingType(null);
                  setFormData({ name: '', description: '', color: '#6c757d', maxDays: '' });
                }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Annual Leave"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Brief description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Color</label>
                    <div className="d-flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`btn p-2 rounded-circle ${formData.color === color ? 'ring-2 ring-primary' : ''}`}
                          style={{
                            backgroundColor: color,
                            width: '32px',
                            height: '32px',
                            border: formData.color === color ? '2px solid #0d6efd' : '1px solid #dee2e6'
                          }}
                          onClick={() => setFormData({ ...formData, color })}
                        ></button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Max Days (per year)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g., 20"
                      value={formData.maxDays}
                      onChange={(e) => setFormData({ ...formData, maxDays: e.target.value })}
                      min="0"
                      step="0.5"
                    />
                    <small className="text-muted">Leave empty for unlimited</small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                    ) : (
                      <>{editingType ? 'Update' : 'Create'} Leave Type</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title="Delete Leave Type"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will affect existing leave requests.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={loading}
      />
    </div>
  );
};

export default LeaveTypes;