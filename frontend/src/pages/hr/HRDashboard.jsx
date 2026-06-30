import React, { useState, useEffect } from 'react';
import { getHRDashboard } from '../../api/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { format } from 'date-fns';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const HRDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await getHRDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading HR dashboard..." />;
  if (!data) return <div className="alert alert-info">No data available</div>;

  const stats = [
    { title: 'Total Employees', value: data.totalEmployees || 0, icon: 'bi-people-fill', color: 'primary' },
    { title: 'Departments', value: data.totalDepartments || 0, icon: 'bi-building', color: 'info' },
    { title: 'Pending Leaves', value: data.pendingLeaves || 0, icon: 'bi-clock', color: 'warning' },
    { title: 'Approved Today', value: data.approvedToday || 0, icon: 'bi-check-circle', color: 'success' },
  ];

  // 📊 Monthly Trends Chart Data
  const monthlyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Total Leaves',
        data: Array(12).fill(0),
        backgroundColor: 'rgba(13, 110, 253, 0.6)',
        borderColor: '#0d6efd',
        borderWidth: 2
      },
      {
        label: 'Approved',
        data: Array(12).fill(0),
        backgroundColor: 'rgba(25, 135, 84, 0.6)',
        borderColor: '#198754',
        borderWidth: 2
      },
      {
        label: 'Rejected',
        data: Array(12).fill(0),
        backgroundColor: 'rgba(220, 53, 69, 0.6)',
        borderColor: '#dc3545',
        borderWidth: 2
      },
      {
        label: 'Pending',
        data: Array(12).fill(0),
        backgroundColor: 'rgba(255, 193, 7, 0.6)',
        borderColor: '#ffc107',
        borderWidth: 2
      }
    ]
  };

  // Populate monthly data
  if (data.monthlyTrends) {
    data.monthlyTrends.forEach(item => {
      const monthIndex = parseInt(item.month) - 1;
      monthlyData.datasets[0].data[monthIndex] = parseInt(item.total) || 0;
      monthlyData.datasets[1].data[monthIndex] = parseInt(item.approved) || 0;
      monthlyData.datasets[2].data[monthIndex] = parseInt(item.rejected) || 0;
      monthlyData.datasets[3].data[monthIndex] = parseInt(item.pending) || 0;
    });
  }

  const monthlyOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Monthly Leave Trends'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  // 📊 Department Distribution (Bar Chart)
  const deptData = {
    labels: data.departmentDistribution?.map(item => item.department) || [],
    datasets: [
      {
        label: 'Total Leaves',
        data: data.departmentDistribution?.map(item => parseInt(item.total)) || [],
        backgroundColor: 'rgba(13, 110, 253, 0.6)',
        borderColor: '#0d6efd',
        borderWidth: 2
      },
      {
        label: 'Approved',
        data: data.departmentDistribution?.map(item => parseInt(item.approved)) || [],
        backgroundColor: 'rgba(25, 135, 84, 0.6)',
        borderColor: '#198754',
        borderWidth: 2
      }
    ]
  };

  const deptOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Department-wise Leave Distribution'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  // 📊 Leave Type Distribution (Pie Chart)
  const pieData = {
    labels: data.leaveTypeDistribution?.map(item => item.name) || [],
    datasets: [
      {
        data: data.leaveTypeDistribution?.map(item => parseInt(item.count)) || [],
        backgroundColor: data.leaveTypeDistribution?.map(item => item.color || '#6c757d') || [],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Leave Type Distribution'
      }
    }
  };

  // 📊 Employee Growth (Line Chart)
  const growthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Employee Growth',
        data: Array(12).fill(0),
        backgroundColor: 'rgba(13, 110, 253, 0.2)',
        borderColor: '#0d6efd',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#0d6efd',
        pointRadius: 4
      }
    ]
  };

  // Populate growth data
  if (data.employeeGrowth) {
    data.employeeGrowth.forEach(item => {
      const monthIndex = parseInt(item.month) - 1;
      growthData.datasets[0].data[monthIndex] = parseInt(item.count) || 0;
    });
  }

  const growthOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Employee Growth'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  // 📊 Overall Status (Doughnut Chart)
  const statusData = {
    labels: ['Approved', 'Rejected', 'Pending'],
    datasets: [
      {
        data: [
          data.leaveTypeDistribution?.reduce((sum, item) => sum + parseInt(item.count), 0) || 0,
          0,
          data.pendingLeaves || 0
        ],
        backgroundColor: ['#198754', '#dc3545', '#ffc107'],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const statusOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Overall Leave Status'
      }
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold">HR Dashboard</h5>
          <p className="text-muted mb-0">Overview of leave statistics and trends</p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={loadDashboard}>
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {stats.map((stat, index) => (
          <div className="col-md-3 col-sm-6" key={index}>
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <Bar data={monthlyData} options={monthlyOptions} />
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <Doughnut data={statusData} options={statusOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <Bar data={deptData} options={deptOptions} />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <Line data={growthData} options={growthOptions} />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-header">
              <i className="bi bi-activity me-2"></i>
              Recent Activities
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {data.recentActivities?.length > 0 ? (
                  data.recentActivities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="list-group-item px-3 py-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className={`badge ${activity.action === 'APPROVED' ? 'bg-success' : activity.action === 'REJECTED' ? 'bg-danger' : 'bg-warning'}`}>
                            {activity.action}
                          </span>
                          <span className="ms-2 small">
                            {activity.leaveRequest?.employee?.user?.name || 'Unknown'}
                          </span>
                          <span className="text-muted ms-1 small">
                            {activity.leaveRequest?.leaveType?.name || ''}
                          </span>
                        </div>
                        <small className="text-muted">
                          {format(new Date(activity.createdAt), 'MMM dd, hh:mm a')}
                        </small>
                      </div>
                      {activity.remarks && (
                        <div className="text-muted small mt-1">
                          <i className="bi bi-chat me-1"></i>
                          {activity.remarks}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-3 text-muted">
                    No recent activities
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leave Requests */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-clock-history me-2"></i>
                Recent Leave Requests
              </span>
              <span className="badge bg-primary">{data.recentLeaves?.length || 0} pending</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLeaves?.length > 0 ? (
                      data.recentLeaves.map((leave) => (
                        <tr key={leave.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <img 
                                src={`https://ui-avatars.com/api/?name=${leave.employee?.user?.name || 'User'}`}
                                alt={leave.employee?.user?.name}
                                className="rounded-circle me-2"
                                style={{ width: '32px', height: '32px' }}
                              />
                              <div>
                                <div className="fw-semibold">{leave.employee?.user?.name || 'Unknown'}</div>
                                <small className="text-muted">{leave.employee?.employeeCode || 'N/A'}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge" style={{ backgroundColor: leave.leaveType?.color || '#6c757d', color: '#fff' }}>
                              {leave.leaveType?.name || 'N/A'}
                            </span>
                          </td>
                          <td>
                            {format(new Date(leave.startDate), 'MMM dd')} - {format(new Date(leave.endDate), 'MMM dd')}
                          </td>
                          <td><StatusBadge status={leave.status} /></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-3 text-muted">
                          No pending leave requests
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;