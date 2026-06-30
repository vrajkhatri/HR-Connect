import React, { useState, useEffect } from 'react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../api/api';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/ConfirmModal';
import LoadingSpinner from '../../components/LoadingSpinner';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await getDepartments();
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    setLoading(true);
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, formData);
        toast.success('Department updated successfully');
      } else {
        await createDepartment(formData);
        toast.success('Department created successfully');
      }
      setShowModal(false);
      setEditingDept(null);
      setFormData({ name: '', description: '' });
      loadDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDepartment(deleteTarget.id);
      toast.success('Department deleted successfully');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      loadDepartments();
    } catch (error) {
      toast.error('Failed to delete department');
    }
  };

  if (loading && departments.length === 0) {
    return <LoadingSpinner text="Loading departments..." />;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold">Departments</h5>
          <p className="text-muted mb-0">Manage organizational departments</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-1"></i> Add Department
        </button>
      </div>

      <div className="row g-3">
        {departments.map((dept) => (
          <div className="col-md-4" key={dept.id}>
            <div className="card shadow-sm hover-lift">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="fw-bold mb-1">{dept.name}</h6>
                    <p className="text-muted small mb-0">{dept.description || 'No description'}</p>
                    <small className="text-muted">
                      <i className="bi bi-people me-1"></i>
                      {dept._count?.employees || 0} employees
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        setEditingDept(dept);
                        setFormData({ name: dept.name, description: dept.description || '' });
                        setShowModal(true);
                      }}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => {
                        setDeleteTarget(dept);
                        setShowDeleteModal(true);
                      }}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {departments.length === 0 && (
          <div className="col-12">
            <div className="text-center py-5 text-muted">
              <i className="bi bi-building fs-1 d-block mb-3"></i>
              <p>No departments found. Create your first department!</p>
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
                  {editingDept ? 'Edit Department' : 'Add New Department'}
                </h5>
                <button type="button" className="btn-close" onClick={() => {
                  setShowModal(false);
                  setEditingDept(null);
                  setFormData({ name: '', description: '' });
                }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Department Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Engineering"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Brief description of the department"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    ></textarea>
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
                      <>{editingDept ? 'Update' : 'Create'} Department</>
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
        title="Delete Department"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also affect employees in this department.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={loading}
      />
    </div>
  );
};

export default Departments;