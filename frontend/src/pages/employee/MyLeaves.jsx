import React, { useState, useEffect } from 'react';
import { getMyLeaves, cancelLeave } from '../../api/api';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const MyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // View Reason Modal
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [viewReasonData, setViewReasonData] = useState({
    title: '',
    reason: '',
    type: '' // 'reason' or 'reject'
  });

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const response = await getMyLeaves();
      console.log('📋 My Leaves Response:', response.data);
      setLeaves(response.data || []);
      setCurrentPage(1); // Reset to first page on new data
    } catch (error) {
      console.error('Error loading leaves:', error);
      toast.error('Failed to load leave history');
    } finally {
      setLoading(false);
    }
  };

  // Handle view reason
  const handleViewReason = (leave, type = 'reason') => {
    let title = '';
    let reason = '';
    
    if (type === 'reason') {
      title = `Leave Reason`;
      reason = leave.reason || 'No reason provided';
    } else if (type === 'reject') {
      title = `Rejection Reason`;
      reason = leave.rejectedReason || 'No rejection reason provided';
    }
    
    console.log(`📝 Viewing ${type}:`, reason);
    
    setViewReasonData({
      title,
      reason,
      type
    });
    setShowReasonModal(true);
  };

  // Handle Cancel Leave
  const handleCancelLeave = async () => {
    if (!selectedLeave) return;
    
    setCancelling(true);
    try {
      const response = await cancelLeave(selectedLeave.id, { cancellationReason: cancelReason });
      toast.success(response.data.message || 'Leave cancelled successfully');
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedLeave(null);
      loadLeaves(); // Refresh the list
    } catch (error) {
      console.error('Error cancelling leave:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel leave');
    } finally {
      setCancelling(false);
    }
  };

  // Truncate text function
  const truncateText = (text, maxLength = 30) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // ✅ Get current page data
  const filteredLeaves = filter === 'ALL' 
    ? leaves 
    : leaves.filter(leave => leave.status === filter);

  // ✅ Pagination calculations
  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeaves = filteredLeaves.slice(startIndex, endIndex);

  // ✅ Page number generation
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 3) {
        endPage = 4;
      }
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
      }
      
      if (startPage > 2) {
        pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        if (i > 1 && i < totalPages) {
          pages.push(i);
        }
      }
      
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const statusCounts = {
    ALL: leaves.length,
    PENDING: leaves.filter(l => l.status === 'PENDING').length,
    APPROVED: leaves.filter(l => l.status === 'APPROVED').length,
    REJECTED: leaves.filter(l => l.status === 'REJECTED').length,
  };

  if (loading) return <LoadingSpinner text="Loading leave history..." />;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold">My Leave History</h5>
          <p className="text-muted mb-0">View all your leave requests and their status</p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={loadLeaves}>
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
          <button
            key={status}
            className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => {
              setFilter(status);
              setCurrentPage(1); // Reset to first page on filter change
            }}
          >
            {status} <span className="badge bg-light text-dark ms-1">{statusCounts[status] || 0}</span>
          </button>
        ))}
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Duration</th>
                  <th style={{ minWidth: '220px' }}>Status / Action</th>
                  <th style={{ minWidth: '200px' }}>Reason</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentLeaves.length > 0 ? (
                  currentLeaves.map((leave, index) => {
                    const hasReason = leave.reason && leave.reason.trim().length > 0;
                    const hasRejectReason = leave.rejectedReason && leave.rejectedReason.trim().length > 0;
                    const reasonText = leave.reason || '';
                    const rejectReasonText = leave.rejectedReason || '';
                    const isManual = leave.isManual || false;
                    const isCompensatory = leave.leaveType?.isCompensatory || false;
                    const isPending = leave.status === 'PENDING';
                    const isCancelled = leave.status === 'CANCELLED';
                    
                    // Determine adjustment type
                    const isDeduction = isManual && leave.adjustmentReason?.toLowerCase().includes('deduct');
                    const isAddition = isManual && !isDeduction;
                    
                    return (
                      <tr key={leave.id}>
                        <td>{startIndex + index + 1}</td>
                        <td>
                          <div className="d-flex flex-wrap align-items-center gap-1">
                            <span 
                              className="badge" 
                              style={{ 
                                backgroundColor: leave.leaveType?.color || '#6c757d', 
                                color: '#fff' 
                              }}
                            >
                              {leave.leaveType?.name || 'N/A'}
                            </span>
                            {isCompensatory && (
                              <span className="badge bg-info text-white" title="Compensatory Off">
                                <i className="bi bi-clock-history me-1"></i>
                                Comp Off
                              </span>
                            )}
                            {isCancelled && (
                              <span className="badge bg-secondary text-white">
                                <i className="bi bi-x-circle me-1"></i>
                                Cancelled
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="small">
                            <div>{format(new Date(leave.startDate), "EEE, MMM dd")}</div>
                            {leave.startDate !== leave.endDate && (
                              <div className="text-muted">
                                → {format(new Date(leave.endDate), "EEE, MMM dd, yyyy")}
                              </div>
                            )}
                            {leave.startDate === leave.endDate && (
                              <div className="text-muted">
                                {format(new Date(leave.endDate), "yyyy")}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          {leave.dayType === 'FIRST_HALF' || leave.dayType === 'SECOND_HALF' ? (
                            <span className="badge bg-info">Half Day</span>
                          ) : (
                            `${leave.daysCount || 0} day${leave.daysCount > 1 ? 's' : ''}`
                          )}
                        </td>
                        <td>
                          {/* MANUAL ENTRIES - Show Deducted/Added in Status column */}
                          {isManual && leave.status === 'APPROVED' ? (
                            <div>
                              <span className={`badge ${isDeduction ? 'bg-danger' : 'bg-success'}`}>
                                <i className={`bi ${isDeduction ? 'bi-arrow-down' : 'bi-arrow-up'} me-1`}></i>
                                {isDeduction ? 'Deducted' : 'Added'}
                              </span>
                              <div className="mt-1">
                                <small className="text-muted d-block">
                                  <i className="bi bi-calendar-event me-1"></i>
                                  Action: {format(new Date(leave.createdAt || leave.appliedAt), "MMM dd, yyyy hh:mm a")}
                                </small>
                                <small className="text-muted d-block">
                                  <i className="bi bi-person me-1"></i>
                                  By: {leave.adjustedByUser?.name || 'HR'}
                                </small>
                                {leave.adjustmentReason && (
                                  <small className="text-muted d-block">
                                    <i className="bi bi-info-circle me-1"></i>
                                    {truncateText(leave.adjustmentReason, 25)}
                                  </small>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* REGULAR LEAVES - Show Status Badge */
                            <div>
                              <StatusBadge status={leave.status} />
                              
                              {/* Rejection Reason */}
                              {leave.status === 'REJECTED' && hasRejectReason && (
                                <div className="text-muted small mt-1">
                                  <i className="bi bi-info-circle text-danger me-1"></i>
                                  <span className="text-truncate-custom" style={{ maxWidth: '120px' }}>
                                    {truncateText(rejectReasonText, 20)}
                                  </span>
                                  {rejectReasonText.length > 20 && (
                                    <button
                                      className="btn btn-link btn-sm p-0 ms-1 text-primary"
                                      onClick={() => handleViewReason(leave, 'reject')}
                                      style={{ fontSize: '0.7rem', textDecoration: 'none' }}
                                    >
                                      View
                                    </button>
                                  )}
                                </div>
                              )}
                              
                              {/* Applied On - For all regular leaves */}
                              <div className="mt-1">
                                <small className="text-muted d-block">
                                  <i className="bi bi-clock me-1"></i>
                                  Applied: {format(new Date(leave.appliedAt), "MMM dd, yyyy hh:mm a")}
                                </small>
                              </div>
                              
                              {/* Approved/Rejected By - For Approved/Rejected regular leaves */}
                              {(leave.status === 'APPROVED' || leave.status === 'REJECTED') && (
                                <>
                                  {leave.approvedBy && (
                                    <small className="text-muted d-block">
                                      <i className="bi bi-person me-1"></i>
                                      {leave.status === 'APPROVED' ? 'Approved' : 'Rejected'} By: {leave.approvedBy?.name || 'HR'}
                                    </small>
                                  )}
                                  {leave.approvedAt && (
                                    <small className="text-muted d-block">
                                      <i className="bi bi-calendar-check me-1"></i>
                                      {leave.status === 'APPROVED' ? 'Approved' : 'Rejected'}: {format(new Date(leave.approvedAt), "MMM dd, yyyy hh:mm a")}
                                    </small>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            {hasReason ? (
                              <>
                                <span className="text-truncate-custom" style={{ maxWidth: '120px' }}>
                                  {truncateText(reasonText, 25)}
                                </span>
                                {reasonText.length > 25 && (
                                  <button
                                    className="btn btn-link btn-sm p-0 text-primary"
                                    onClick={() => handleViewReason(leave, 'reason')}
                                    style={{ fontSize: '0.7rem', textDecoration: 'none' }}
                                  >
                                    View
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </div>
                          {isManual && leave.adjustmentReason && (
                            <div className="mt-1">
                              <small className="text-muted d-block">
                                <i className="bi bi-pencil-square me-1"></i>
                                {leave.adjustmentReason.length > 30 
                                  ? leave.adjustmentReason.substring(0, 30) + '...' 
                                  : leave.adjustmentReason}
                              </small>
                            </div>
                          )}
                        </td>
                        <td>
                          {isPending && !isManual && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                setSelectedLeave(leave);
                                setShowCancelModal(true);
                              }}
                              title="Cancel this leave request"
                            >
                              <i className="bi bi-x-circle"></i> Cancel
                            </button>
                          )}
                          {!isPending && (
                            <span className="text-muted small">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      <i className="bi bi-inbox fs-3 d-block mb-2"></i>
                      <p className="mb-0">No leave requests found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* ✅ Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <div className="text-muted small">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredLeaves.length)} of {filteredLeaves.length} entries
              </div>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </button>
                  </li>
                  
                  {getPageNumbers().map((page, index) => (
                    <li 
                      key={index} 
                      className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}
                    >
                      {page === '...' ? (
                        <span className="page-link">…</span>
                      ) : (
                        <button 
                          className="page-link" 
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      )}
                    </li>
                  ))}
                  
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* View Reason Modal */}
      {showReasonModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${viewReasonData.type === 'reject' ? 'bi-x-circle text-danger' : 'bi-info-circle text-primary'} me-2`}></i>
                  {viewReasonData.title}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowReasonModal(false);
                    setViewReasonData({ title: "", reason: "", type: "" });
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="p-3 bg-light rounded">
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {viewReasonData.reason}
                  </p>
                </div>
                <div className="mt-2">
                  <span className={`badge ${viewReasonData.type === 'reject' ? 'bg-danger' : 'bg-primary'}`}>
                    {viewReasonData.type === 'reject' ? 'Rejection Reason' : 'Leave Reason'}
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowReasonModal(false);
                    setViewReasonData({ title: "", reason: "", type: "" });
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Leave Modal */}
      {showCancelModal && selectedLeave && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-x-circle text-danger me-2"></i>
                  Cancel Leave Request
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setSelectedLeave(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Are you sure you want to cancel your leave request?
                </p>
                <div className="bg-light p-3 rounded mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Type:</span>
                    <span className="fw-semibold">{selectedLeave.leaveType?.name || 'N/A'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Dates:</span>
                    <span className="fw-semibold">
                      {format(new Date(selectedLeave.startDate), "MMM dd")} - {format(new Date(selectedLeave.endDate), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Duration:</span>
                    <span className="fw-semibold">{selectedLeave.daysCount} day{selectedLeave.daysCount > 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Reason for Cancellation <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Please provide a reason for cancelling this leave..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                  ></textarea>
                  <small className="text-muted">
                    {cancelReason.length}/500 characters
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setSelectedLeave(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleCancelLeave}
                  disabled={!cancelReason.trim() || cancelling}
                >
                  {cancelling ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-lg me-1"></i>
                      Confirm Cancellation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLeaves;