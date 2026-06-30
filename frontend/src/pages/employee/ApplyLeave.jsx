import React, { useState, useEffect } from 'react';
import { applyLeave, getLeaveTypes, getMyLeaveBalances } from '../../api/api';
import { toast } from 'react-toastify';
import { format, isWeekend, addDays } from 'date-fns';

const ApplyLeave = () => {
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState({});
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    dayType: 'FULL_DAY',
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [typesRes, balancesRes] = await Promise.all([
        getLeaveTypes(),
        getMyLeaveBalances()
      ]);
      setLeaveTypes(typesRes.data.data || typesRes.data || []);
      
      const balancesData = balancesRes.data || [];
      const balanceMap = {};
      balancesData.forEach(b => {
        balanceMap[b.leaveTypeId] = b.remainingDays || 0;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load leave data');
    }
  };

  // Get the next weekday (Monday-Friday)
  const getNextWeekday = (date) => {
    let newDate = new Date(date);
    while (isWeekend(newDate)) {
      newDate = addDays(newDate, 1);
    }
    return newDate;
  };

  // Check if a date is a weekend
  const isDateWeekend = (dateString) => {
    if (!dateString) return false;
    return isWeekend(new Date(dateString));
  };

  // Get min date (today or next weekday if today is weekend)
  const getMinDate = () => {
    const today = new Date();
    if (isWeekend(today)) {
      return format(getNextWeekday(today), 'yyyy-MM-dd');
    }
    return format(today, 'yyyy-MM-dd');
  };

  // Get all weekdays between start and end dates (for validation)
  const getWeekdaysInRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const weekdays = [];
    let current = new Date(start);
    
    while (current <= end) {
      if (!isWeekend(current)) {
        weekdays.push(new Date(current));
      }
      current = addDays(current, 1);
    }
    return weekdays;
  };

  // Get the actual working days (excluding weekends)
  const getWorkingDaysCount = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const weekdays = getWeekdaysInRange(formData.startDate, formData.endDate);
    return weekdays.length;
  };

  const workingDays = getWorkingDaysCount();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Auto-adjust end date if start date changes
    if (name === 'startDate' && formData.endDate) {
      const start = new Date(value);
      const end = new Date(formData.endDate);
      if (end < start) {
        // Find next weekday for end date
        let newEnd = new Date(start);
        while (isWeekend(newEnd) || newEnd <= start) {
          newEnd = addDays(newEnd, 1);
        }
        setFormData(prev => ({
          ...prev,
          endDate: format(newEnd, 'yyyy-MM-dd')
        }));
      }
    }
  };

  // Custom date validation for weekends
  const handleDateValidation = (e) => {
    const { name, value } = e.target;
    if (value && isDateWeekend(value)) {
      toast.warning('Weekends (Saturday and Sunday) are not working days. Auto-corrected to next weekday.');
      // Auto-correct to next weekday
      const nextWeekday = getNextWeekday(new Date(value));
      const formattedDate = format(nextWeekday, 'yyyy-MM-dd');
      setFormData(prev => ({ ...prev, [name]: formattedDate }));
      e.target.value = formattedDate;
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.leaveTypeId) {
      toast.error('Please select a leave type');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    // Check if start date is weekend
    if (isDateWeekend(formData.startDate)) {
      toast.error('Start date cannot be a weekend (Saturday or Sunday)');
      return;
    }

    // Check if end date is weekend
    if (isDateWeekend(formData.endDate)) {
      toast.error('End date cannot be a weekend (Saturday or Sunday)');
      return;
    }

    // Check if any date in range is weekend
    const weekdays = getWeekdaysInRange(formData.startDate, formData.endDate);
    const totalDays = weekdays.length;
    
    if (totalDays === 0) {
      toast.error('No working days selected. Please select weekdays only.');
      return;
    }

    if (!formData.reason || formData.reason.trim() === '') {
      toast.error('Please provide a reason for leave');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date cannot be before start date');
      return;
    }

    if (
      (formData.dayType === 'FIRST_HALF' || formData.dayType === 'SECOND_HALF') &&
      formData.startDate !== formData.endDate
    ) {
      toast.error('Half day leave must have the same start and end date');
      return;
    }

    setLoading(true);
    try {
      const response = await applyLeave(formData);
      const days = response.daysCount || totalDays;
      toast.success(`✅ Leave applied successfully for ${days} day${days > 1 ? 's' : ''}!`);
      
      // Reset form
      setFormData({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        dayType: 'FULL_DAY',
        reason: ''
      });
      
      // Refresh balances
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold">Apply for Leave</h5>
          <p className="text-muted mb-0">Submit a leave request for approval</p>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Leave Type <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    name="leaveTypeId"
                    value={formData.leaveTypeId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} (Balance: {balances[type.id] || 0} days)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Start Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      name="startDate"
                      value={formData.startDate}
                      onChange={(e) => {
                        handleChange(e);
                        handleDateValidation(e);
                      }}
                      min={getMinDate()}
                      required
                    />
                    <small className="text-muted">
                      <i className="bi bi-calendar-check me-1"></i>
                      Weekends (Sat/Sun) are automatically blocked
                    </small>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">End Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      name="endDate"
                      value={formData.endDate}
                      onChange={(e) => {
                        handleChange(e);
                        handleDateValidation(e);
                      }}
                      min={formData.startDate || getMinDate()}
                      required
                    />
                    <small className="text-muted">
                      <i className="bi bi-calendar-check me-1"></i>
                      Weekends (Sat/Sun) are automatically blocked
                    </small>
                  </div>
                </div>

                {/* Working Days Display */}
                {formData.startDate && formData.endDate && (
                  <div className={`alert ${workingDays > 0 ? 'alert-info' : 'alert-warning'} py-2`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <i className={`bi ${workingDays > 0 ? 'bi-info-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                        <strong>Working Days:</strong> {workingDays} day{workingDays > 1 ? 's' : ''}
                      </div>
                      {workingDays > 0 && (
                        <span className="badge bg-success">
                          {workingDays} day{workingDays > 1 ? 's' : ''} of leave
                        </span>
                      )}
                      {workingDays === 0 && (
                        <span className="badge bg-danger">
                          No working days selected!
                        </span>
                      )}
                    </div>
                    {workingDays > 0 && (
                      <div className="mt-1 small text-muted">
                        <i className="bi bi-calendar-range me-1"></i>
                        {format(new Date(formData.startDate), 'MMM dd')} → {format(new Date(formData.endDate), 'MMM dd, yyyy')}
                        {` (${workingDays} working day${workingDays > 1 ? 's' : ''})`}
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fw-semibold">Day Type</label>
                  <select
                    className="form-select"
                    name="dayType"
                    value={formData.dayType}
                    onChange={handleChange}
                  >
                    <option value="FULL_DAY">Full Day</option>
                    <option value="FIRST_HALF">First Half</option>
                    <option value="SECOND_HALF">Second Half</option>
                  </select>
                  <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    Half day leave must have the same start and end date
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Reason <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    name="reason"
                    rows="4"
                    value={formData.reason}
                    onChange={handleChange}
                    placeholder="Please provide a detailed reason for your leave..."
                    required
                  ></textarea>
                  <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    {formData.reason ? `${formData.reason.length} characters` : 'Provide a clear reason for faster approval'}
                  </small>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold"
                  disabled={loading || workingDays === 0}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Apply for Leave {workingDays > 0 && `(${workingDays} day${workingDays > 1 ? 's' : ''})`}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          {/* Leave Balance Card */}
          <div className="card shadow-sm">
            <div className="card-header">
              <i className="bi bi-wallet2 me-2"></i>
              Leave Balance
            </div>
            <div className="card-body">
              {leaveTypes.length > 0 ? (
                leaveTypes.map((type) => (
                  <div key={type.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                    <div>
                      <span className="badge" style={{ backgroundColor: type.color || '#6c757d', color: '#fff' }}>
                        {type.name}
                      </span>
                    </div>
                    <div>
                      <span className="fw-bold">{balances[type.id] || 0}</span>
                      <span className="text-muted"> days</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted text-center">No leave types configured</p>
              )}
            </div>
          </div>

          {/* Quick Tips Card */}
          <div className="card shadow-sm mt-3">
            <div className="card-header">
              <i className="bi bi-lightbulb me-2"></i>
              Quick Tips
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Weekends (Sat/Sun) are automatically blocked
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Apply at least 3 days in advance
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Check your leave balance before applying
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Provide clear reason for faster approval
                </li>
                <li>
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Half day leaves count as 0.5 day
                </li>
              </ul>
            </div>
          </div>

          {/* Summary Card */}
          {formData.startDate && formData.endDate && workingDays > 0 && (
            <div className="card shadow-sm mt-3 border-success">
              <div className="card-header bg-success text-white">
                <i className="bi bi-check-circle me-2"></i>
                Leave Summary
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Leave Type:</span>
                  <span className="fw-semibold">
                    {leaveTypes.find(t => t.id === parseInt(formData.leaveTypeId))?.name || 'Not selected'}
                  </span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Duration:</span>
                  <span className="fw-semibold">{workingDays} day{workingDays > 1 ? 's' : ''}</span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Day Type:</span>
                  <span className="fw-semibold">{formData.dayType.replace('_', ' ')}</span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Balance After:</span>
                  <span className="fw-semibold text-success">
                    {balances[parseInt(formData.leaveTypeId)] !== undefined 
                      ? (balances[parseInt(formData.leaveTypeId)] - workingDays) 
                      : 'N/A'} days
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;