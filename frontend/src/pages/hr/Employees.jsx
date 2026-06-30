import React, { useState, useEffect } from 'react';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getDepartments } from '../../api/api';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/ConfirmModal';
import LoadingSpinner from '../../components/LoadingSpinner';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    employeeCode: '',
    departmentId: '',
    designation: '',
    joiningDate: '',
    phone: '',
    address: '',
    role: 'EMPLOYEE'
  });

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await getEmployees();
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, formData);
        toast.success('Employee updated successfully');
      } else {
        await createEmployee(formData);
        toast.success('Employee created successfully');
      }
      setShowModal(false);
      setEditingEmployee(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        employeeCode: '',
        departmentId: '',
        designation: '',
        joiningDate: '',
        phone: '',
        address: '',
        role: 'EMPLOYEE'
      });
      loadEmployees();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEmployee(deleteTarget.id);
      toast.success('Employee deleted successfully');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      loadEmployees();
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.user?.name || '',
      email: employee.user?.email || '',
      password: '',
      employeeCode: employee.employeeCode || '',
      departmentId: employee.departmentId || '',
      designation: employee.designation || '',
      joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
      phone: employee.phone || '',
      address: employee.address || '',
      role: employee.user?.role || 'EMPLOYEE'
    });
    setShowModal(true);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && employees.length === 0) {
    return <LoadingSpinner text="Loading employees..." />;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold">Employees</h5>
          <p className="text-muted mb-0">Manage all employees in the organization</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-1"></i> Add Employee
        </button>
      </div>

      {/* Search */}
      <div className="mb-3">
        <div className="input-group" style={{ maxWidth: '300px' }}>
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input
            type="text"
            className="form-control"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Role</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      <i className="bi bi-people fs-3 d-block mb-2"></i>
                      No employees found
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img
                            src={`https://ui-avatars.com/api/?name=${emp.user?.name || 'User'}`}
                            alt={emp.user?.name}
                            className="rounded-circle me-2"
                            style={{ width: '32px', height: '32px' }}
                          />
                          <div>
                            <div className="fw-semibold">{emp.user?.name || 'Unknown'}</div>
                            <small className="text-muted">{emp.user?.email || 'N/A'}</small>
                          </div>
                        </div>
                      </td>
                      <td>{emp.employeeCode || 'N/A'}</td>
                      <td>{emp.department?.name || 'N/A'}</td>
                      <td>{emp.designation || 'N/A'}</td>
                      <td>
                        <span className={`badge ${emp.user?.role === 'HR' ? 'bg-primary' : 'bg-secondary'}`}>
                          {emp.user?.role || 'EMPLOYEE'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEdit(emp)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              setDeleteTarget(emp);
                              setShowDeleteModal(true);
                            }}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </h5>
                <button type="button" className="btn-close" onClick={() => {
                  setShowModal(false);
                  setEditingEmployee(null);
                  setFormData({
                    name: '',
                    email: '',
                    password: '',
                    employeeCode: '',
                    departmentId: '',
                    designation: '',
                    joiningDate: '',
                    phone: '',
                    address: '',
                    role: 'EMPLOYEE'
                  });
                }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        disabled={!!editingEmployee}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        {editingEmployee ? 'New Password (optional)' : 'Password *'}
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingEmployee}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Employee Code *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.employeeCode}
                        onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                        required
                        disabled={!!editingEmployee}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Department</label>
                      <select
                        className="form-select"
                        value={formData.departmentId}
                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Designation</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Joining Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.joiningDate}
                        onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Role</label>
                      <select
                        className="form-select"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      >
                        <option value="EMPLOYEE">Employee</option>
                        <option value="HR">HR</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Address</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      ></textarea>
                    </div>
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
                      <>{editingEmployee ? 'Update' : 'Create'} Employee</>
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
        title="Delete Employee"
        message={`Are you sure you want to delete "${deleteTarget?.user?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={loading}
      />
    </div>
  );
};

export default Employees;