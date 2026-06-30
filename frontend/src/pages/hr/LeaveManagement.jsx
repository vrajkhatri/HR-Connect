import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';
import api from '../../api/api';

const LeaveManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [balanceData, setBalanceData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        leaveTypeId: '',
        days: '',
        reason: '',
        adjustmentReason: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [leaveHistory, setLeaveHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [generatingCredits, setGeneratingCredits] = useState(false);
    const [showAdjustmentHistory, setShowAdjustmentHistory] = useState(false);
    const [adjustmentHistory, setAdjustmentHistory] = useState([]);
    const [adjustmentFilter, setAdjustmentFilter] = useState('');

    // Load employees
    const loadEmployees = async () => {
        setLoading(true);
        try {
            const response = await api.get('/leave-management/employees', {
                params: { search: searchTerm }
            });
            setEmployees(response.data.data || []);
        } catch (error) {
            console.error('Error loading employees:', error);
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmployees();
    }, [searchTerm]);

    // Load employee balance
    const loadEmployeeBalance = async (employeeId) => {
        setLoading(true);
        try {
            const response = await api.get(`/leave-management/balance/${employeeId}`);
            setBalanceData(response.data.data);
            setSelectedEmployee(response.data.data.employee);
        } catch (error) {
            console.error('Error loading balance:', error);
            toast.error('Failed to load balance');
        } finally {
            setLoading(false);
        }
    };

    // Load employee history
    const loadEmployeeHistory = async (employeeId) => {
        try {
            const response = await api.get(`/leave-management/history/${employeeId}`);
            setLeaveHistory(response.data.data || []);
            setShowHistory(true);
        } catch (error) {
            console.error('Error loading history:', error);
            toast.error('Failed to load history');
        }
    };

    // Load adjustment history (all manual adjustments)
    const loadAdjustmentHistory = async () => {
        try {
            const params = {};
            if (adjustmentFilter) {
                params.employeeId = parseInt(adjustmentFilter);
            }
            const response = await api.get('/leave-management/adjustment-history', { params });
            setAdjustmentHistory(response.data.data || []);
            setShowAdjustmentHistory(true);
        } catch (error) {
            console.error('Error loading adjustment history:', error);
            toast.error('Failed to load adjustment history');
        }
    };

    // ✅ Handle Generate Monthly Credits - FIXED
    const handleGenerateCredits = async () => {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;

        if (!window.confirm(`Generate monthly credits for ${month}/${year}? This will add credits to all employees.`)) {
            return;
        }

        setGeneratingCredits(true);
        try {
            const response = await api.post('/leave-management/generate-credits', {
                year: year,
                month: month
            });

            console.log('✅ Credits response:', response.data);

            if (response.data.success) {
                toast.success(response.data.message || `Monthly credits generated for ${response.data.data?.totalCreditsAdded || 0} entries`);
                
                // Reload employee balance if selected
                if (selectedEmployee) {
                    loadEmployeeBalance(selectedEmployee.id);
                }
                
                // Reload employees list
                loadEmployees();
            } else {
                toast.error(response.data.message || 'Failed to generate monthly credits');
            }
        } catch (error) {
            console.error('❌ Error generating credits:', error);
            console.error('Error response:', error.response?.data);
            toast.error(error.response?.data?.message || 'Failed to generate monthly credits');
        } finally {
            setGeneratingCredits(false);
        }
    };

    // Handle manual add
    const handleManualAdd = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) {
            toast.error('Please select an employee');
            return;
        }

        setLoading(true);
        try {
            const selectedLeaveType = leaveTypes.find(lt => lt.id === parseInt(formData.leaveTypeId));
            const isCompensatoryOff = selectedLeaveType?.name?.toLowerCase().includes('compensatory') || 
                                      selectedLeaveType?.name?.toLowerCase().includes('comp off');

            const daysValue = parseFloat(formData.days);
            const finalDays = isCompensatoryOff ? Math.abs(daysValue) : daysValue;

            const response = await api.post('/leave-management/manual-add', {
                employeeId: selectedEmployee.id,
                leaveTypeId: parseInt(formData.leaveTypeId),
                days: finalDays,
                reason: formData.reason,
                adjustmentReason: formData.adjustmentReason,
                date: formData.date
            });

            toast.success(response.data.message);
            setShowAddModal(false);
            setFormData({
                leaveTypeId: '',
                days: '',
                reason: '',
                adjustmentReason: '',
                date: new Date().toISOString().split('T')[0]
            });
            loadEmployeeBalance(selectedEmployee.id);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add leave');
        } finally {
            setLoading(false);
        }
    };

    const leaveTypes = balanceData?.balances?.map(b => b.leaveType) || [];

    const isCompensatoryOff = () => {
        const selected = leaveTypes.find(lt => lt.id === parseInt(formData.leaveTypeId));
        return selected?.name?.toLowerCase().includes('compensatory') || 
               selected?.name?.toLowerCase().includes('comp off');
    };

    return (
        <div className="leave-management-page">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="mb-0 fw-bold">Leave Management</h5>
                    <p className="text-muted mb-0">Manage employee leave balances manually</p>
                </div>
                <div className="d-flex gap-2">
                    {/* ✅ Generate Monthly Credits Button */}
                    <button 
                        className="btn btn-success btn-sm"
                        onClick={handleGenerateCredits}
                        disabled={generatingCredits}
                    >
                        {generatingCredits ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                Generating...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-calendar-plus me-1"></i>
                                Generate Monthly Credits
                            </>
                        )}
                    </button>
                    {/* ✅ Adjustment History Button */}
                    <button 
                        className="btn btn-outline-info btn-sm"
                        onClick={loadAdjustmentHistory}
                    >
                        <i className="bi bi-clock-history me-1"></i>
                        Adjustment History
                    </button>
                    <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                            if (!selectedEmployee) {
                                toast.warning('Please select an employee first');
                                return;
                            }
                            setShowAddModal(true);
                        }}
                    >
                        <i className="bi bi-plus-lg me-1"></i> Add/Deduct Leave
                    </button>
                </div>
            </div>

            <div className="row">
                {/* Employee List */}
                <div className="col-md-4">
                    <div className="card shadow-sm">
                        <div className="card-header">
                            <i className="bi bi-people me-2"></i>
                            Employees
                        </div>
                        <div className="card-body p-0">
                            <div className="p-2 border-bottom">
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Search employees..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                {loading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border spinner-border-sm" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                ) : employees.length === 0 ? (
                                    <div className="text-center py-4 text-muted">
                                        <i className="bi bi-people fs-2 d-block mb-2"></i>
                                        No employees found
                                    </div>
                                ) : (
                                    employees.map(emp => (
                                        <div 
                                            key={emp.id}
                                            className={`p-3 border-bottom hover-lift cursor-pointer ${selectedEmployee?.id === emp.id ? 'bg-primary bg-opacity-10' : ''}`}
                                            onClick={() => loadEmployeeBalance(emp.id)}
                                        >
                                            <div className="d-flex align-items-center">
                                                <img
                                                    src={`https://ui-avatars.com/api/?name=${emp.user?.name}&size=32`}
                                                    alt={emp.user?.name}
                                                    className="rounded-circle me-2"
                                                    style={{ width: '32px', height: '32px' }}
                                                />
                                                <div>
                                                    <div className="fw-semibold">{emp.user?.name}</div>
                                                    <small className="text-muted">{emp.employeeCode}</small>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Balance Details */}
                <div className="col-md-8">
                    {selectedEmployee ? (
                        <div>
                            {/* Employee Info */}
                            <div className="card shadow-sm mb-3">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center">
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${selectedEmployee.user?.name}&size=64`}
                                                alt={selectedEmployee.user?.name}
                                                className="rounded-circle me-3"
                                                style={{ width: '64px', height: '64px' }}
                                            />
                                            <div>
                                                <h6 className="mb-0 fw-bold">{selectedEmployee.user?.name}</h6>
                                                <small className="text-muted">
                                                    {selectedEmployee.employeeCode} • {selectedEmployee.department?.name || 'No Department'}
                                                </small>
                                                <br />
                                                <small className="text-muted">{selectedEmployee.user?.email}</small>
                                            </div>
                                        </div>
                                        <button 
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => loadEmployeeHistory(selectedEmployee.id)}
                                        >
                                            <i className="bi bi-clock-history me-1"></i>
                                            History
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Balance Cards */}
                            {balanceData?.balances?.map((b) => (
                                <div className="card shadow-sm mb-3" key={b.leaveType.id}>
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <span 
                                                    className="badge mb-2"
                                                    style={{ 
                                                        backgroundColor: b.leaveType.color || '#6c757d',
                                                        color: '#fff'
                                                    }}
                                                >
                                                    {b.leaveType.name}
                                                    {b.leaveType.isCompensatory && (
                                                        <span className="ms-1">(Comp Off)</span>
                                                    )}
                                                </span>
                                                <div className="row mt-2">
                                                    <div className="col-4">
                                                        <small className="text-muted">Available</small>
                                                        <h4 className="mb-0 text-success">{b.remainingDays || 0}</h4>
                                                    </div>
                                                    <div className="col-4">
                                                        <small className="text-muted">Total</small>
                                                        <h5 className="mb-0">{b.currentBalance.totalDays || 0}</h5>
                                                    </div>
                                                    <div className="col-4">
                                                        <small className="text-muted">Used</small>
                                                        <h5 className="mb-0">{b.currentBalance.usedDays || 0}</h5>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-end">
                                                <small className="text-muted d-block">Monthly Credit</small>
                                                <span className="badge bg-info">{b.leaveType.monthlyCredit || 0} days</span>
                                                {b.manualAdjustments > 0 && (
                                                    <div className="mt-1">
                                                        <small className="text-warning">Manual: +{b.manualAdjustments}</small>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* History Chart */}
                                        {b.history?.length > 0 && (
                                            <div className="mt-3">
                                                <small className="text-muted d-block mb-1">Last 3 months</small>
                                                <div className="d-flex gap-2">
                                                    {b.history.map(h => (
                                                        <div key={h.id} className="flex-grow-1">
                                                            <div className="bg-light p-2 rounded text-center">
                                                                <div className="fw-bold">{h.closingBalance}</div>
                                                                <small className="text-muted">{format(new Date(h.year, h.month - 1), 'MMM')}</small>
                                                                {h.monthlyCredit > 0 && (
                                                                    <div className="text-success small">+{h.monthlyCredit}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card shadow-sm">
                            <div className="card-body text-center py-5">
                                <i className="bi bi-person fs-1 text-muted d-block mb-3"></i>
                                <p className="text-muted">Select an employee to view their leave balance</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Leave Modal */}
            {showAddModal && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        <i className="bi bi-calendar-plus me-2"></i>
                                        Add/Deduct Leave
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="btn-close" 
                                        onClick={() => setShowAddModal(false)}
                                    ></button>
                                </div>
                                <form onSubmit={handleManualAdd}>
                                    <div className="modal-body">
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Employee</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={selectedEmployee?.user?.name || ''}
                                                disabled
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Leave Type *</label>
                                            <select
                                                className="form-select"
                                                value={formData.leaveTypeId}
                                                onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                                                required
                                            >
                                                <option value="">Select leave type</option>
                                                {leaveTypes.map(type => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name} {type.isCompensatory ? '(Comp Off)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {formData.leaveTypeId && isCompensatoryOff() && (
                                                <small className="text-success d-block mt-1">
                                                    <i className="bi bi-check-circle me-1"></i>
                                                    Compensatory Off will be added to total balance
                                                </small>
                                            )}
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Days *</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                placeholder="Enter days (positive to add, negative to deduct)"
                                                value={formData.days}
                                                onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                                                required
                                                step="0.5"
                                            />
                                            <small className="text-muted">
                                                {isCompensatoryOff() ? (
                                                    <span className="text-success">
                                                        <i className="bi bi-info-circle me-1"></i>
                                                        Compensatory Off: Positive value will add to balance. Negative values will be converted to positive.
                                                    </span>
                                                ) : (
                                                    <>
                                                        Positive value = Add leave • Negative value = Deduct leave
                                                    </>
                                                )}
                                            </small>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Date</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Reason *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g., Compensatory leave for Saturday work"
                                                value={formData.reason}
                                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Adjustment Reason (Optional)</label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                placeholder="Additional notes for this adjustment..."
                                                value={formData.adjustmentReason}
                                                onChange={(e) => setFormData({ ...formData, adjustmentReason: e.target.value })}
                                            ></textarea>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary" 
                                            onClick={() => setShowAddModal(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="btn btn-primary"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    Processing...
                                                </>
                                            ) : (
                                                'Apply Adjustment'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Employee History Modal */}
            {showHistory && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        <i className="bi bi-clock-history me-2"></i>
                                        Leave History - {selectedEmployee?.user?.name}
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="btn-close" 
                                        onClick={() => setShowHistory(false)}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Type</th>
                                                    <th>Days</th>
                                                    <th>Status</th>
                                                    <th>Reason</th>
                                                    <th>Manual</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {leaveHistory.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="text-center text-muted">
                                                            No leave history found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    leaveHistory.map(leave => (
                                                        <tr key={leave.id}>
                                                            <td>
                                                                {format(new Date(leave.startDate), 'MMM dd, yyyy')}
                                                            </td>
                                                            <td>
                                                                <span 
                                                                    className="badge"
                                                                    style={{ 
                                                                        backgroundColor: leave.leaveType?.color || '#6c757d',
                                                                        color: '#fff'
                                                                    }}
                                                                >
                                                                    {leave.leaveType?.name}
                                                                </span>
                                                            </td>
                                                            <td>{leave.daysCount} day{leave.daysCount > 1 ? 's' : ''}</td>
                                                            <td>
                                                                <StatusBadge status={leave.status} />
                                                                {leave.isManual && (
                                                                    <span className="badge bg-warning text-dark ms-1">Manual</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <div className="text-truncate" style={{ maxWidth: '150px' }}>
                                                                    {leave.reason || '-'}
                                                                </div>
                                                                {leave.adjustmentReason && (
                                                                    <small className="text-muted d-block">
                                                                        <i className="bi bi-info-circle"></i> {leave.adjustmentReason}
                                                                    </small>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {leave.isManual ? (
                                                                    <span className="badge bg-warning text-dark">Yes</span>
                                                                ) : (
                                                                    <span className="badge bg-secondary">No</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => setShowHistory(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ✅ Adjustment History Modal */}
            {showAdjustmentHistory && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-xl">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        <i className="bi bi-clock-history me-2"></i>
                                        Adjustment History (All HR Adjustments)
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="btn-close" 
                                        onClick={() => setShowAdjustmentHistory(false)}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Employee</th>
                                                    <th>Type</th>
                                                    <th>Days</th>
                                                    <th>Action</th>
                                                    <th>Adjusted By</th>
                                                    <th>Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {adjustmentHistory.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="7" className="text-center text-muted">
                                                            No adjustment history found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    adjustmentHistory.map(adj => (
                                                        <tr key={adj.id}>
                                                            <td>
                                                                {format(new Date(adj.createdAt), 'MMM dd, yyyy')}
                                                            </td>
                                                            <td>
                                                                <div className="fw-semibold">{adj.employee?.user?.name || 'N/A'}</div>
                                                                <small className="text-muted">{adj.employee?.employeeCode || ''}</small>
                                                            </td>
                                                            <td>
                                                                <span 
                                                                    className="badge"
                                                                    style={{ 
                                                                        backgroundColor: adj.leaveType?.color || '#6c757d',
                                                                        color: '#fff'
                                                                    }}
                                                                >
                                                                    {adj.leaveType?.name || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="fw-bold">
                                                                {adj.daysCount} day{adj.daysCount > 1 ? 's' : ''}
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${adj.adjustmentReason?.includes('deduct') ? 'bg-danger' : 'bg-success'}`}>
                                                                    {adj.adjustmentReason?.includes('deduct') ? 'Deduction' : 'Addition'}
                                                                </span>
                                                            </td>
                                                            <td>{adj.adjustedByUser?.name || 'System'}</td>
                                                            <td>
                                                                <div className="text-truncate" style={{ maxWidth: '200px' }}>
                                                                    {adj.reason || '-'}
                                                                </div>
                                                                {adj.adjustmentReason && (
                                                                    <small className="text-muted d-block">
                                                                        <i className="bi bi-info-circle"></i> {adj.adjustmentReason}
                                                                    </small>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => setShowAdjustmentHistory(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default LeaveManagement;