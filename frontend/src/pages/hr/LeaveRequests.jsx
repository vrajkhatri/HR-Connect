import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getLeaveRequests,
  updateLeaveStatus,
  getLeaveTypes,
  getDepartments,
  searchEmployees,
  exportLeaveRequestsPDF,
  exportLeaveRequestsExcel,
  reverseLeave,
} from "../../api/api";
import { toast } from "react-toastify";
import StatusBadge from "../../components/StatusBadge";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConfirmModal from "../../components/ConfirmModal";
import { format } from "date-fns";

const LeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // View Reason Modal
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [viewReasonData, setViewReasonData] = useState({
    title: "",
    reason: "",
    type: ""
  });

  // Confirm Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // ✅ Reverse Modal
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  const [reversing, setReversing] = useState(false);

  // Search and filter state
  const [filters, setFilters] = useState({
    search: "",
    leaveTypeId: "",
    status: "",
    departmentId: "",
    fromDate: "",
    toDate: "",
    sortBy: "appliedAt",
    sortOrder: "desc",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    total: 0,
  });

  // Quick filters
  const quickFilters = [
    { label: "All", value: "all" },
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
  ];

  const [activeQuickFilter, setActiveQuickFilter] = useState("all");

  // Load leave requests
  const loadLeaveRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== "")
        ),
      };

      const response = await getLeaveRequests(params);
      
      if (response && response.data && response.data.success !== false) {
        const data = response.data.data || [];
        setLeaveRequests(data);
        setPagination((prev) => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0,
        }));
        setSummary(response.data.summary || {
          pending: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0,
          total: 0,
        });
      } else {
        toast.error(response.data?.message || "Failed to load leave requests");
      }
    } catch (error) {
      console.error("Error loading leave requests:", error);
      let errorMessage = "Failed to load leave requests";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  // Load leave types and departments
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [typesRes, deptRes] = await Promise.all([
          getLeaveTypes(),
          getDepartments(),
        ]);
        setLeaveTypes(typesRes.data?.data || typesRes.data || []);
        setDepartments(deptRes.data?.data || deptRes.data || []);
      } catch (error) {
        console.error("Error loading master data:", error);
      }
    };
    loadMasterData();
  }, []);

  // Load leave requests on filter/page change
  useEffect(() => {
    loadLeaveRequests();
  }, [loadLeaveRequests]);

  // Handle search with debounce
  const handleSearchChange = async (value) => {
    setFilters((prev) => ({ ...prev, search: value }));

    if (value.length >= 2) {
      try {
        const response = await searchEmployees(value);
        setSearchResults(response.data?.data || []);
        setShowSearchDropdown(true);
      } catch (error) {
        console.error("Error searching employees:", error);
      }
    } else {
      setShowSearchDropdown(false);
      setSearchResults([]);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleQuickFilter = (filter) => {
    setActiveQuickFilter(filter);
    setFilters((prev) => ({
      ...prev,
      fromDate: "",
      toDate: "",
      status: "",
    }));

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    switch (filter) {
      case "PENDING":
        setFilters((prev) => ({ ...prev, status: "PENDING" }));
        break;
      case "APPROVED":
        setFilters((prev) => ({ ...prev, status: "APPROVED" }));
        break;
      case "REJECTED":
        setFilters((prev) => ({ ...prev, status: "REJECTED" }));
        break;
      case "today":
        setFilters((prev) => ({
          ...prev,
          fromDate: format(today, "yyyy-MM-dd"),
          toDate: format(today, "yyyy-MM-dd"),
        }));
        break;
      case "week":
        setFilters((prev) => ({
          ...prev,
          fromDate: format(startOfWeek, "yyyy-MM-dd"),
          toDate: format(today, "yyyy-MM-dd"),
        }));
        break;
      case "month":
        setFilters((prev) => ({
          ...prev,
          fromDate: format(startOfMonth, "yyyy-MM-dd"),
          toDate: format(today, "yyyy-MM-dd"),
        }));
        break;
      default:
        setFilters((prev) => ({
          ...prev,
          fromDate: "",
          toDate: "",
          status: "",
        }));
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      leaveTypeId: "",
      status: "",
      departmentId: "",
      fromDate: "",
      toDate: "",
      sortBy: "appliedAt",
      sortOrder: "desc",
    });
    setActiveQuickFilter("all");
    setPagination((prev) => ({ ...prev, page: 1 }));
    setShowSearchDropdown(false);
    setSearchResults([]);
  };

  const handleStatusUpdate = async (id, status, reason = "") => {
    try {
      const payload = {
        action: status === "APPROVED" ? "APPROVE" : "REJECT",
      };
      
      if (status === "REJECTED" && reason) {
        payload.rejectedReason = reason;
      }

      await updateLeaveStatus(id, payload);
      toast.success(`Leave request ${status.toLowerCase()} successfully`);
      loadLeaveRequests();
      setShowRejectModal(false);
      setRejectReason("");
      setShowConfirmModal(false);
    } catch (error) {
      console.error("Error updating leave status:", error);
      toast.error(error.response?.data?.message || "Failed to update leave status");
    }
  };

  // ✅ Handle Reverse Leave
  const handleReverseLeave = async () => {
    if (!selectedRequest) return;
    
    setReversing(true);
    try {
      const response = await reverseLeave(selectedRequest.id, { 
        reversalReason: reverseReason 
      });
      toast.success(response.data.message || 'Leave reversed successfully');
      setShowReverseModal(false);
      setReverseReason("");
      setSelectedRequest(null);
      loadLeaveRequests(); // Refresh the list
    } catch (error) {
      console.error("Error reversing leave:", error);
      toast.error(error.response?.data?.message || "Failed to reverse leave");
    } finally {
      setReversing(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleViewReason = (request, type = 'reason') => {
    let title = '';
    let reason = '';
    
    if (type === 'reason') {
      title = `Leave Reason - ${request.employee?.user?.name || 'Employee'}`;
      reason = request.reason || 'No reason provided';
    } else if (type === 'reject') {
      title = `Rejection Reason - ${request.employee?.user?.name || 'Employee'}`;
      reason = request.rejectedReason || 'No rejection reason provided';
    }
    
    setViewReasonData({ title, reason, type });
    setShowReasonModal(true);
  };

  const handleConfirmAction = (request, action) => {
    setSelectedRequest(request);
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================
  
  const handleExportPDF = async () => {
    setExporting(true);
    setShowExportDropdown(false);
    try {
      toast.info("Generating PDF...");
      const params = {
        ...filters,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== "")
        ),
      };
      await exportLeaveRequestsPDF(params);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF Export error:", error);
      toast.error("Failed to generate PDF. Please check console for details.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    setShowExportDropdown(false);
    try {
      toast.info("Generating Excel file...");
      const params = {
        ...filters,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== "")
        ),
      };
      await exportLeaveRequestsExcel(params);
      toast.success("Excel file downloaded successfully!");
    } catch (error) {
      console.error("Excel Export error:", error);
      toast.error("Failed to generate Excel file. Please check console for details.");
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.leaveTypeId) count++;
    if (filters.status) count++;
    if (filters.departmentId) count++;
    if (filters.fromDate) count++;
    if (filters.toDate) count++;
    return count;
  }, [filters]);

  const truncateText = (text, maxLength = 30) => {
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (loading && leaveRequests.length === 0) {
    return <LoadingSpinner text="Loading leave requests..." />;
  }

  return (
    <div className="leave-requests-page">
      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h5 className="mb-1 fw-bold">Leave Requests</h5>
          <p className="text-muted mb-0">Manage and review all leave applications</p>
        </div>
        <div className="d-flex gap-2">
          {/* Export Dropdown */}
          <div className="export-dropdown" style={{ position: "relative" }}>
            <button 
              className="btn btn-success btn-sm dropdown-toggle"
              type="button"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={exporting || leaveRequests.length === 0}
            >
              {exporting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Exporting...
                </>
              ) : (
                <>
                  <i className="bi bi-download me-1"></i> Export
                </>
              )}
            </button>
            {showExportDropdown && (
              <div className="dropdown-menu show" style={{ 
                position: "absolute", 
                right: 0, 
                top: "100%", 
                zIndex: 1000, 
                minWidth: "180px",
                display: "block",
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                padding: "8px"
              }}>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setShowExportDropdown(false);
                    handleExportPDF();
                  }}
                  disabled={exporting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    gap: "10px"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                  <i className="bi bi-filetype-pdf text-danger" style={{ fontSize: "1.2rem" }}></i>
                  <span>Export as PDF</span>
                </button>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setShowExportDropdown(false);
                    handleExportExcel();
                  }}
                  disabled={exporting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    gap: "10px"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                  <i className="bi bi-file-earmark-excel text-success" style={{ fontSize: "1.2rem" }}></i>
                  <span>Export as Excel</span>
                </button>
              </div>
            )}
          </div>

          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className="bi bi-funnel me-1"></i>
            Filters
            {activeFilterCount > 0 && (
              <span className="badge bg-primary ms-1">{activeFilterCount}</span>
            )}
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>
            <i className="bi bi-arrow-counterclockwise"></i>
          </button>
          <button 
            className="btn btn-outline-primary btn-sm" 
            onClick={loadLeaveRequests}
            disabled={loading}
          >
            <i className={`bi ${loading ? "bi-arrow-repeat spin" : "bi-arrow-clockwise"}`}></i>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { title: "Total", value: summary.total, icon: "bi-file-text", color: "primary" },
          { title: "Pending", value: summary.pending, icon: "bi-clock", color: "warning" },
          { title: "Approved", value: summary.approved, icon: "bi-check-circle", color: "success" },
          { title: "Rejected", value: summary.rejected, icon: "bi-x-circle", color: "danger" },
        ].map((stat, idx) => (
          <div className="col-md-3 col-sm-6" key={idx}>
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">{stat.title}</h6>
                    <h3 className="mb-0">{stat.value || 0}</h3>
                  </div>
                  <div className={`bg-${stat.color} bg-opacity-10 p-3 rounded`}>
                    <i className={`bi ${stat.icon} text-${stat.color}`}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Filters */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {quickFilters.map((filter) => (
          <button
            key={filter.value}
            className={`btn btn-sm ${
              activeQuickFilter === filter.value ? "btn-primary" : "btn-outline-secondary"
            }`}
            onClick={() => handleQuickFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="filter-section">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Search</label>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Name, Email, ID..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {showSearchDropdown && searchResults.length > 0 && (
                  <div
                    className="dropdown-menu show w-100"
                    style={{ maxHeight: "200px", overflowY: "auto" }}
                  >
                    {searchResults.map((employee) => (
                      <button
                        key={employee.id}
                        className="dropdown-item"
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            search: employee.user?.name || "",
                          }));
                          setShowSearchDropdown(false);
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            <i className="bi bi-person-circle"></i>
                          </div>
                          <div>
                            <div className="fw-semibold">
                              {employee.user?.name || "Unknown"}
                            </div>
                            <small className="text-muted">
                              {employee.employeeCode || "N/A"} • {employee.department?.name || "No Dept"}
                            </small>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label">Leave Type</label>
              <select
                className="form-select"
                value={filters.leaveTypeId}
                onChange={(e) => handleFilterChange("leaveTypeId", e.target.value)}
              >
                <option value="">All Types</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Department</label>
              <select
                className="form-select"
                value={filters.departmentId}
                onChange={(e) => handleFilterChange("departmentId", e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Date Range</label>
              <div className="d-flex gap-2">
                <input
                  type="date"
                  className="form-control"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                />
                <input
                  type="date"
                  className="form-control"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange("toDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Active Filter Badges */}
          {activeFilterCount > 0 && (
            <div className="mt-3 d-flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => {
                if (!value) return null;
                let label = value;
                if (key === "leaveTypeId") {
                  label = leaveTypes.find(t => t.id === parseInt(value))?.name || value;
                }
                if (key === "departmentId") {
                  label = departments.find(d => d.id === parseInt(value))?.name || value;
                }
                if (key === "fromDate" || key === "toDate") {
                  label = key === "fromDate" ? `From: ${value}` : `To: ${value}`;
                }
                return (
                  <span key={key} className="badge bg-secondary d-flex align-items-center gap-1">
                    {key === "search" ? `Search: ${value}` : `${key}: ${label}`}
                    <button
                      className="btn btn-link btn-sm p-0 text-white"
                      onClick={() => handleFilterChange(key, "")}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>#</th>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th style={{ minWidth: "180px" }}>Reason</th>
                  <th style={{ width: "150px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <i className="bi bi-inbox fs-3 d-block text-muted mb-2"></i>
                      <p className="text-muted mb-0">No leave requests found</p>
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((request, index) => {
                    const hasReason = request.reason && request.reason.trim().length > 0;
                    const hasRejectReason = request.rejectedReason && request.rejectedReason.trim().length > 0;
                    const reasonText = request.reason || "";
                    const rejectReasonText = request.rejectedReason || "";
                    const isApproved = request.status === "APPROVED";
                    const isPending = request.status === "PENDING";
                    
                    return (
                      <tr key={request.id}>
                        <td>{index + 1 + (pagination.page - 1) * pagination.limit}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <img
                              src={`https://ui-avatars.com/api/?name=${request.employee?.user?.name || "User"}`}
                              alt={request.employee?.user?.name || "User"}
                              className="rounded-circle me-2"
                              style={{ width: "32px", height: "32px" }}
                            />
                            <div>
                              <div className="fw-semibold">
                                {request.employee?.user?.name || "Unknown"}
                              </div>
                              <small className="text-muted">
                                {request.employee?.employeeCode || "N/A"}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: request.leaveType?.color || "#6c757d",
                              color: "#fff",
                            }}
                          >
                            {request.leaveType?.name || "Unknown"}
                          </span>
                        </td>
                        <td>
                          {request.dayType === "FIRST_HALF" ? (
                            <span className="badge bg-info">First Half</span>
                          ) : request.dayType === "SECOND_HALF" ? (
                            <span className="badge bg-info">Second Half</span>
                          ) : (
                            `${request.daysCount || 1} day${request.daysCount > 1 ? "s" : ""}`
                          )}
                        </td>
                        <td>
                          <div className="small">
                            <div>{format(new Date(request.startDate), "MMM dd")}</div>
                            <div className="text-muted">
                              → {format(new Date(request.endDate), "MMM dd, yyyy")}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <StatusBadge status={request.status} />
                          </div>
                          {request.status === "REJECTED" && hasRejectReason && (
                            <div className="text-muted small mt-1">
                              <i className="bi bi-info-circle"></i> {truncateText(rejectReasonText, 20)}
                              {rejectReasonText.length > 20 && (
                                <button
                                  className="btn btn-link btn-sm p-0 ms-1 text-primary"
                                  onClick={() => handleViewReason(request, "reject")}
                                  style={{ fontSize: "0.75rem", textDecoration: "none" }}
                                >
                                  View
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <span className="text-truncate-custom">
                              {hasReason ? truncateText(reasonText, 25) : "-"}
                            </span>
                            {hasReason && reasonText.length > 25 && (
                              <button
                                className="btn btn-link btn-sm p-0 text-primary"
                                onClick={() => handleViewReason(request, "reason")}
                                style={{ fontSize: "0.75rem", textDecoration: "none" }}
                              >
                                View
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          {isPending && (
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-success"
                                title="Approve"
                                onClick={() => handleConfirmAction(request, "APPROVED")}
                              >
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                title="Reject"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectModal(true);
                                }}
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </div>
                          )}
                          {isApproved && !request.isManual && (
                            <button
                              className="btn btn-sm btn-outline-warning"
                              title="Reverse Leave"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowReverseModal(true);
                              }}
                            >
                              <i className="bi bi-arrow-counterclockwise"></i> Reverse
                            </button>
                          )}
                          {request.status !== "PENDING" && request.status !== "APPROVED" && (
                            <span className="text-muted small">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <div className="text-muted small">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
              </div>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${pagination.page === 1 ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => handlePageChange(pagination.page - 1)}>
                      Previous
                    </button>
                  </li>
                  {[...Array(pagination.totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === pagination.totalPages ||
                      (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                    ) {
                      return (
                        <li key={pageNum} className={`page-item ${pagination.page === pageNum ? "active" : ""}`}>
                          <button className="page-link" onClick={() => handlePageChange(pageNum)}>
                            {pageNum}
                          </button>
                        </li>
                      );
                    } else if (pageNum === pagination.page - 2 || pageNum === pagination.page + 2) {
                      return (
                        <li key={pageNum} className="page-item disabled">
                          <span className="page-link">…</span>
                        </li>
                      );
                    }
                    return null;
                  })}
                  <li className={`page-item ${pagination.page === pagination.totalPages ? "disabled" : ""}`}>
                    <button className="page-link" onClick={() => handlePageChange(pagination.page + 1)}>
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            tabIndex="-1"
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="bi bi-x-circle text-danger me-2"></i>
                    Reject Leave Request
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason("");
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-3">
                    Are you sure you want to reject the leave request from{" "}
                    <strong>{selectedRequest?.employee?.user?.name || "Unknown"}</strong>?
                  </p>
                  
                  {selectedRequest?.reason && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Leave Reason:</label>
                      <div className="p-2 bg-light rounded small" style={{ maxHeight: "80px", overflowY: "auto" }}>
                        {selectedRequest.reason}
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Reason for Rejection <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Please provide a reason for rejecting this leave request..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      style={{ resize: "vertical", minHeight: "80px", maxHeight: "150px" }}
                    ></textarea>
                    <small className="text-muted">
                      {rejectReason.length}/500 characters
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleStatusUpdate(selectedRequest?.id, "REJECTED", rejectReason)}
                    disabled={!rejectReason.trim() || loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-x-lg me-1"></i>
                        Reject Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ✅ Reverse Modal */}
      {showReverseModal && selectedRequest && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            tabIndex="-1"
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="bi bi-arrow-counterclockwise text-warning me-2"></i>
                    Reverse Leave Request
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowReverseModal(false);
                      setReverseReason("");
                      setSelectedRequest(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-3">
                    Are you sure you want to <strong className="text-warning">reverse</strong> this approved leave request?
                  </p>
                  
                  <div className="bg-light p-3 rounded mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Employee:</span>
                      <span className="fw-semibold">{selectedRequest.employee?.user?.name || 'Unknown'}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Type:</span>
                      <span className="fw-semibold">{selectedRequest.leaveType?.name || 'N/A'}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Duration:</span>
                      <span className="fw-semibold">{selectedRequest.daysCount} day{selectedRequest.daysCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Dates:</span>
                      <span className="fw-semibold">
                        {format(new Date(selectedRequest.startDate), "MMM dd")} - {format(new Date(selectedRequest.endDate), "MMM dd, yyyy")}
                      </span>
                    </div>
                    {selectedRequest.reason && (
                      <div className="mt-2">
                        <span className="text-muted">Reason:</span>
                        <div className="small">{selectedRequest.reason}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Reason for Reversal <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Please provide a reason for reversing this leave..."
                      value={reverseReason}
                      onChange={(e) => setReverseReason(e.target.value)}
                      style={{ resize: "vertical", minHeight: "80px", maxHeight: "150px" }}
                    ></textarea>
                    <small className="text-muted">
                      {reverseReason.length}/500 characters
                    </small>
                  </div>
                  
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>Note:</strong> Reversing this leave will:
                    <ul className="mb-0 mt-1">
                      <li>Update the employee's leave balance</li>
                      <li>Notify the employee</li>
                      <li>Create an audit trail entry</li>
                    </ul>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowReverseModal(false);
                      setReverseReason("");
                      setSelectedRequest(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-warning"
                    onClick={handleReverseLeave}
                    disabled={!reverseReason.trim() || reversing}
                  >
                    {reversing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-counterclockwise me-1"></i>
                        Confirm Reversal
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Reason Modal */}
      {showReasonModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div
            className="modal fade show"
            style={{ display: "block" }}
            tabIndex="-1"
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className={`bi ${viewReasonData.type === "reject" ? "bi-x-circle text-danger" : "bi-info-circle text-primary"} me-2`}></i>
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
                  <div className="p-3 bg-light rounded" style={{ maxHeight: "300px", overflowY: "auto" }}>
                    <p className="mb-0" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {viewReasonData.reason}
                    </p>
                  </div>
                  <div className="mt-2">
                    <span className={`badge ${viewReasonData.type === "reject" ? "bg-danger" : "bg-primary"}`}>
                      {viewReasonData.type === "reject" ? "Rejection Reason" : "Leave Reason"}
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
        </>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        show={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          if (selectedRequest && confirmAction) {
            handleStatusUpdate(selectedRequest.id, confirmAction);
          }
        }}
        title="Confirm Action"
        message={`Are you sure you want to ${confirmAction?.toLowerCase()} the leave request from ${selectedRequest?.employee?.user?.name}?`}
        confirmText={confirmAction || "Confirm"}
        confirmVariant={confirmAction === "APPROVED" ? "success" : "danger"}
        loading={loading}
      />
    </div>
  );
};

export default LeaveRequests;