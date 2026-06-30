import React, { useState, useEffect, useMemo } from 'react';
import { getLeaveRequests, getDepartments, getLeaveTypes } from '../../api/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { toast } from 'react-toastify';

const LeaveCalendar = () => {
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week
  const [selectedDate, setSelectedDate] = useState(null);
  const [filters, setFilters] = useState({
    departmentId: '',
    leaveTypeId: '',
    status: 'APPROVED'
  });
  const [showWeekends, setShowWeekends] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load data
  useEffect(() => {
    loadCalendarData();
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const [deptRes, typeRes] = await Promise.all([
        getDepartments(),
        getLeaveTypes()
      ]);
      setDepartments(deptRes.data?.data || deptRes.data || []);
      setLeaveTypes(typeRes.data?.data || typeRes.data || []);
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  };

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const params = {
        status: filters.status || 'APPROVED'
      };
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.leaveTypeId) params.leaveTypeId = filters.leaveTypeId;

      const response = await getLeaveRequests(params);
      setLeaves(response.data?.data || []);
    } catch (error) {
      console.error('Error loading calendar:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    loadCalendarData();
  }, [filters]);

  // Get days for current month
  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days from previous month
    const firstDayOfWeek = getDay(start);
    const paddingDays = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(start);
      date.setDate(date.getDate() - (i + 1));
      paddingDays.push(date);
    }
    
    // Add padding days from next month
    const lastDayOfWeek = getDay(end);
    const nextPaddingDays = [];
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
      const date = new Date(end);
      date.setDate(date.getDate() + i);
      nextPaddingDays.push(date);
    }
    
    return [...paddingDays, ...days, ...nextPaddingDays];
  };

  // Get leaves for a specific date
  const getLeavesForDate = (date) => {
    return leaves.filter(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      return date >= start && date <= end;
    });
  };

  // Get leave count for a date
  const getLeaveCountForDate = (date) => {
    return getLeavesForDate(date).length;
  };

  // Get employees on leave for a date
  const getEmployeesOnLeave = (date) => {
    return getLeavesForDate(date).map(leave => leave.employee?.user?.name || 'Unknown');
  };

  // Navigation
  const navigateMonth = (direction) => {
    setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle date click
  const handleDateClick = (date) => {
    const leavesOnDate = getLeavesForDate(date);
    if (leavesOnDate.length > 0) {
      setSelectedDate(date);
      setShowStats(true);
    }
  };

  // Handle leave click
  const handleLeaveClick = (leave) => {
    setSelectedLeaveDetail(leave);
    setShowDetailModal(true);
  };

  // Export calendar
  const exportCalendar = () => {
    const data = {
      month: format(currentDate, 'MMMM yyyy'),
      leaves: leaves.map(leave => ({
        employee: leave.employee?.user?.name,
        type: leave.leaveType?.name,
        start: leave.startDate,
        end: leave.endDate,
        status: leave.status
      }))
    };
    // Create downloadable JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-${format(currentDate, 'yyyy-MM')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Calendar exported successfully');
  };

  // Get summary statistics
  const getSummaryStats = useMemo(() => {
    const totalLeaves = leaves.length;
    const approvedLeaves = leaves.filter(l => l.status === 'APPROVED').length;
    const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;
    const rejectedLeaves = leaves.filter(l => l.status === 'REJECTED').length;
    
    // Department breakdown
    const deptBreakdown = {};
    leaves.forEach(leave => {
      const dept = leave.employee?.department?.name || 'Unknown';
      if (!deptBreakdown[dept]) deptBreakdown[dept] = 0;
      deptBreakdown[dept]++;
    });

    return {
      totalLeaves,
      approvedLeaves,
      pendingLeaves,
      rejectedLeaves,
      deptBreakdown,
      uniqueEmployees: new Set(leaves.map(l => l.employeeId)).size
    };
  }, [leaves]);

  // Get month stats
  const getMonthStats = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthLeaves = leaves.filter(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      return (start >= monthStart && start <= monthEnd) || 
             (end >= monthStart && end <= monthEnd) ||
             (start <= monthStart && end >= monthEnd);
    });
    return {
      count: monthLeaves.length,
      days: new Set(monthLeaves.map(l => format(new Date(l.startDate), 'yyyy-MM-dd'))).size
    };
  }, [leaves, currentDate]);

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) return <LoadingSpinner text="Loading calendar..." />;

  return (
    <div className="leave-calendar-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0 fw-bold">Leave Calendar</h5>
          <p className="text-muted mb-0">View all approved leaves across the organization</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={exportCalendar}
          >
            <i className="bi bi-download me-1"></i> Export
          </button>
          <button 
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setShowStats(!showStats)}
          >
            <i className="bi bi-bar-chart me-1"></i> {showStats ? 'Hide' : 'Show'} Stats
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-section mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label">Department</label>
            <select
              className="form-select form-select-sm"
              value={filters.departmentId}
              onChange={(e) => setFilters(prev => ({ ...prev, departmentId: e.target.value }))}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Leave Type</label>
            <select
              className="form-select form-select-sm"
              value={filters.leaveTypeId}
              onChange={(e) => setFilters(prev => ({ ...prev, leaveTypeId: e.target.value }))}
            >
              <option value="">All Types</option>
              {leaveTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">Status</label>
            <select
              className="form-select form-select-sm"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
              <option value="">All</option>
            </select>
          </div>
          <div className="col-md-2">
            <div className="form-check mt-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="showWeekends"
                checked={showWeekends}
                onChange={(e) => setShowWeekends(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="showWeekends">
                Show Weekends
              </label>
            </div>
          </div>
          <div className="col-md-2">
            <button className="btn btn-outline-primary btn-sm w-100" onClick={loadCalendarData}>
              <i className="bi bi-arrow-clockwise me-1"></i> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {showStats && (
        <div className="row g-2 mb-3">
          <div className="col-md-3 col-6">
            <div className="card shadow-sm">
              <div className="card-body py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted">Total Leaves</small>
                    <h6 className="mb-0">{getSummaryStats.totalLeaves}</h6>
                  </div>
                  <div className="bg-primary bg-opacity-10 p-2 rounded">
                    <i className="bi bi-calendar2 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card shadow-sm">
              <div className="card-body py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted">This Month</small>
                    <h6 className="mb-0">{getMonthStats.count}</h6>
                  </div>
                  <div className="bg-success bg-opacity-10 p-2 rounded">
                    <i className="bi bi-calendar-check text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card shadow-sm">
              <div className="card-body py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted">Employees</small>
                    <h6 className="mb-0">{getSummaryStats.uniqueEmployees}</h6>
                  </div>
                  <div className="bg-info bg-opacity-10 p-2 rounded">
                    <i className="bi bi-people text-info"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card shadow-sm">
              <div className="card-body py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted">Leave Days</small>
                    <h6 className="mb-0">{getMonthStats.days}</h6>
                  </div>
                  <div className="bg-warning bg-opacity-10 p-2 rounded">
                    <i className="bi bi-calendar3 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Navigation */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigateMonth('prev')}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <span className="fw-bold align-self-center" style={{ minWidth: '150px', textAlign: 'center' }}>
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigateMonth('next')}>
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
        <div>
          <button className="btn btn-outline-primary btn-sm" onClick={goToToday}>
            <i className="bi bi-calendar3 me-1"></i> Today
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card shadow-sm">
        <div className="card-body p-2">
          <div className="row g-1">
            {/* Week day headers */}
            {weekDays.map((day, index) => (
              <div key={index} className="col text-center fw-semibold text-muted small py-2 border-bottom">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((date, index) => {
              const isWeekendDay = isWeekend(date);
              const isTodayDate = isToday(date);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const leaveCount = getLeaveCountForDate(date);
              const employeesOnLeave = getEmployeesOnLeave(date);

              // Skip weekends if filter is off
              if (!showWeekends && isWeekendDay) {
                return <div key={index} className="col p-0" style={{ display: 'none' }}></div>;
              }

              return (
                <div 
                  key={index} 
                  className={`col p-1 ${!isCurrentMonth ? 'opacity-50' : ''}`}
                  style={{ minHeight: '100px' }}
                >
                  <div 
                    className={`p-2 rounded h-100 ${
                      isTodayDate ? 'bg-primary bg-opacity-10 border border-primary' : 
                      isWeekendDay ? 'bg-light' : ''
                    } ${leaveCount > 0 ? 'cursor-pointer' : ''}`}
                    onClick={() => handleDateClick(date)}
                    style={{ transition: 'all 0.2s ease' }}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <span className={`small fw-semibold ${isTodayDate ? 'text-primary' : ''}`}>
                        {format(date, 'd')}
                      </span>
                      {leaveCount > 0 && (
                        <span className="badge bg-primary rounded-circle">
                          {leaveCount}
                        </span>
                      )}
                    </div>
                    
                    {/* Leave indicators */}
                    <div className="mt-1">
                      {leaveCount > 0 && (
                        <div className="small text-truncate text-muted">
                          <i className="bi bi-person me-1"></i>
                          {employeesOnLeave.slice(0, 2).join(', ')}
                          {employeesOnLeave.length > 2 && ` +${employeesOnLeave.length - 2}`}
                        </div>
                      )}
                      
                      {/* Color indicators for leave types */}
                      {getLeavesForDate(date).slice(0, 3).map((leave, idx) => (
                        <div
                          key={idx}
                          className="calendar-event"
                          style={{
                            backgroundColor: leave.leaveType?.color || '#6c757d',
                            color: '#fff',
                            fontSize: '0.6rem',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            marginBottom: '1px',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveClick(leave);
                          }}
                          title={`${leave.employee?.user?.name} - ${leave.leaveType?.name}`}
                        >
                          {leave.employee?.user?.name?.split(' ')[0] || 'Unknown'} - {leave.leaveType?.name || 'Leave'}
                        </div>
                      ))}
                      {getLeavesForDate(date).length > 3 && (
                        <div className="small text-muted">
                          +{getLeavesForDate(date).length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 d-flex flex-wrap gap-3 align-items-center">
        <span className="small text-muted">Legend:</span>
        <span className="badge bg-primary bg-opacity-10 text-primary">Today</span>
        <span className="badge bg-light text-dark">Weekend</span>
        {leaveTypes.slice(0, 5).map(type => (
          <span 
            key={type.id} 
            className="badge" 
            style={{ backgroundColor: type.color || '#6c757d', color: '#fff' }}
          >
            {type.name}
          </span>
        ))}
      </div>

      {/* Leave Detail Modal */}
      {showDetailModal && selectedLeaveDetail && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="bi bi-info-circle text-primary me-2"></i>
                    Leave Details
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedLeaveDetail(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="fw-semibold text-muted small">Employee</label>
                    <p className="mb-0">{selectedLeaveDetail.employee?.user?.name || 'Unknown'}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-semibold text-muted small">Leave Type</label>
                    <p className="mb-0">
                      <span 
                        className="badge" 
                        style={{ 
                          backgroundColor: selectedLeaveDetail.leaveType?.color || '#6c757d',
                          color: '#fff'
                        }}
                      >
                        {selectedLeaveDetail.leaveType?.name || 'Unknown'}
                      </span>
                    </p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-semibold text-muted small">Duration</label>
                    <p className="mb-0">
                      {format(new Date(selectedLeaveDetail.startDate), 'MMM dd, yyyy')} → 
                      {format(new Date(selectedLeaveDetail.endDate), 'MMM dd, yyyy')}
                    </p>
                    <small className="text-muted">
                      {selectedLeaveDetail.daysCount || 0} day{selectedLeaveDetail.daysCount > 1 ? 's' : ''}
                      {selectedLeaveDetail.dayType === 'FIRST_HALF' ? ' (First Half)' : ''}
                      {selectedLeaveDetail.dayType === 'SECOND_HALF' ? ' (Second Half)' : ''}
                    </small>
                  </div>
                  <div className="mb-3">
                    <label className="fw-semibold text-muted small">Status</label>
                    <p className="mb-0"><StatusBadge status={selectedLeaveDetail.status} /></p>
                  </div>
                  {selectedLeaveDetail.reason && (
                    <div className="mb-3">
                      <label className="fw-semibold text-muted small">Reason</label>
                      <p className="mb-0 small bg-light p-2 rounded">
                        {selectedLeaveDetail.reason}
                      </p>
                    </div>
                  )}
                  {selectedLeaveDetail.rejectedReason && (
                    <div className="mb-3">
                      <label className="fw-semibold text-muted small">Rejection Reason</label>
                      <p className="mb-0 small bg-light p-2 rounded text-danger">
                        {selectedLeaveDetail.rejectedReason}
                      </p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedLeaveDetail(null);
                    }}
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

export default LeaveCalendar;