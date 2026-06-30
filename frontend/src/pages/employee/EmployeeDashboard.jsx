import React, { useState, useEffect } from 'react';
import { getEmployeeDashboard } from '../../api/api';
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

const EmployeeDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await getEmployeeDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  if (!data) return <div className="alert alert-info">No data available</div>;

  const stats = [
    { title: 'Total Leaves', value: data.totalLeaves || 0, icon: 'bi-calendar-check', color: 'primary' },
    { title: 'Pending', value: data.pendingLeaves || 0, icon: 'bi-clock', color: 'warning' },
    { title: 'Approved', value: data.approvedLeaves || 0, icon: 'bi-check-circle', color: 'success' },
    { title: 'Balance', value: data.balance || 0, icon: 'bi-wallet2', color: 'info' },
  ];

  // 📊 Monthly Trends Chart Data
  const monthlyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Approved',
        data: Array(12).fill(0),
        backgroundColor: 'rgba(25, 135, 84, 0.6)',
        borderColor: '#198754',
        borderWidth: 2
      },
      {
        label: 'Pending',
        data: Array(12).fill(0),
        backgroundColor: 'rgba(255, 193, 7, 0.6)',
        borderColor: '#ffc107',
        borderWidth: 2
      },
      {
        label: 'Rejected',
        data: Array(12).fill(0),
        backgroundColor: 'rgba(220, 53, 69, 0.6)',
        borderColor: '#dc3545',
        borderWidth: 2
      }
    ]
  };

  // Populate monthly data
  if (data.monthlyTrends) {
    data.monthlyTrends.forEach(item => {
      const monthIndex = parseInt(item.month) - 1;
      monthlyData.datasets[0].data[monthIndex] = parseInt(item.approved) || 0;
      monthlyData.datasets[1].data[monthIndex] = parseInt(item.pending) || 0;
      monthlyData.datasets[2].data[monthIndex] = parseInt(item.rejected) || 0;
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

  // 📊 Leave Type Breakdown (Pie Chart)
  const pieData = {
    labels: data.leaveTypeBreakdown?.map(item => item.name) || [],
    datasets: [
      {
        data: data.leaveTypeBreakdown?.map(item => item.count) || [],
        backgroundColor: data.leaveTypeBreakdown?.map(item => item.color || '#6c757d') || [],
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

  // 📊 Balance History Chart
  const balanceChartData = {
    labels: data.balanceHistory?.map(item => 
      `${format(new Date(item.year, item.month - 1), 'MMM')}`
    ) || [],
    datasets: [
      {
        label: 'Balance',
        data: data.balanceHistory?.map(item => item.closingBalance) || [],
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

  const balanceOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Balance History (Last 6 Months)'
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

  // 📊 Approval Rate Chart (Doughnut)
  const approvalRateData = {
    labels: ['Approved', 'Rejected', 'Pending'],
    datasets: [
      {
        data: [
          data.approvedLeaves || 0,
          (data.totalLeaves || 0) - (data.approvedLeaves || 0) - (data.pendingLeaves || 0),
          data.pendingLeaves || 0
        ],
        backgroundColor: ['#198754', '#dc3545', '#ffc107'],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const approvalRateOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: `Approval Rate: ${data.approvalRate || 0}%`
      }
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold">My Dashboard</h5>
          <p className="text-muted mb-0">View your leave statistics and trends</p>
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
              <Doughnut data={approvalRateData} options={approvalRateOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <Line data={balanceChartData} options={balanceOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Leaves */}
      {data.upcomingLeaves?.length > 0 && (
        <div className="card shadow-sm mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-calendar-event me-2"></i>
              Upcoming Leaves
            </span>
            <span className="badge bg-primary">{data.upcomingLeaves.length} upcoming</span>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Duration</th>
                    <th>Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcomingLeaves.map((leave) => {
                    const daysLeft = Math.ceil((new Date(leave.startDate) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={leave.id}>
                        <td>
                          <span className="badge" style={{ backgroundColor: leave.leaveType?.color || '#6c757d', color: '#fff' }}>
                            {leave.leaveType?.name || 'N/A'}
                          </span>
                        </td>
                        <td>{format(new Date(leave.startDate), 'MMM dd, yyyy')}</td>
                        <td>{format(new Date(leave.endDate), 'MMM dd, yyyy')}</td>
                        <td>{leave.daysCount} day{leave.daysCount > 1 ? 's' : ''}</td>
                        <td>
                          <span className={`badge ${daysLeft <= 3 ? 'bg-danger' : daysLeft <= 7 ? 'bg-warning' : 'bg-success'}`}>
                            {daysLeft} days
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recent Leaves */}
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-clock-history me-2"></i>
            Recent Leave Requests
          </span>
          <span className="badge bg-primary">{data.recentLeaves?.length || 0} records</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLeaves?.length > 0 ? (
                  data.recentLeaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <span className="badge" style={{ backgroundColor: leave.leaveType?.color || '#6c757d', color: '#fff' }}>
                          {leave.leaveType?.name || 'N/A'}
                        </span>
                      </td>
                      <td>
                        {format(new Date(leave.startDate), 'MMM dd')} - {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                      </td>
                      <td>{leave.daysCount} day{leave.daysCount > 1 ? 's' : ''}</td>
                      <td><StatusBadge status={leave.status} /></td>
                      <td>
                        <span className="text-truncate-custom">{leave.reason || '-'}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-3 text-muted">
                      No leave requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;