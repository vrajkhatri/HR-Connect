import React, { useState, useEffect } from 'react';
import { getLeaveStatistics } from '../../api/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadReports();
  }, [year]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await getLeaveStatistics({ year });
      setData(response.data.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading reports..." />;

  // Monthly chart data
  const monthlyChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Total Leaves',
        data: data?.monthly?.map(m => m.total) || [],
        backgroundColor: 'rgba(13, 110, 253, 0.6)',
        borderColor: '#0d6efd',
        borderWidth: 2
      },
      {
        label: 'Approved',
        data: data?.monthly?.map(m => m.approved) || [],
        backgroundColor: 'rgba(25, 135, 84, 0.6)',
        borderColor: '#198754',
        borderWidth: 2
      },
      {
        label: 'Rejected',
        data: data?.monthly?.map(m => m.rejected) || [],
        backgroundColor: 'rgba(220, 53, 69, 0.6)',
        borderColor: '#dc3545',
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Monthly Leave Trends - ${year}`
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // Pie chart data
  const pieChartData = {
    labels: data?.byType?.map(t => t.name) || [],
    datasets: [
      {
        data: data?.byType?.map(t => t.count) || [],
        backgroundColor: data?.byType?.map(t => t.color) || [],
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
        text: 'Leave Distribution by Type'
      }
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold">Reports</h5>
          <p className="text-muted mb-0">View leave analytics and insights</p>
        </div>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            style={{ width: '120px' }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="btn btn-outline-primary btn-sm" onClick={loadReports}>
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </div>

      <div className="row g-3">
        {/* Summary Cards */}
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="text-muted mb-1">Total Leaves</h6>
              <h3 className="mb-0">{data?.monthly?.reduce((sum, m) => sum + (m.total || 0), 0) || 0}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="text-muted mb-1">Approved</h6>
              <h3 className="mb-0 text-success">{data?.monthly?.reduce((sum, m) => sum + (m.approved || 0), 0) || 0}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="text-muted mb-1">Rejected</h6>
              <h3 className="mb-0 text-danger">{data?.monthly?.reduce((sum, m) => sum + (m.rejected || 0), 0) || 0}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="text-muted mb-1">Pending</h6>
              <h3 className="mb-0 text-warning">{data?.monthly?.reduce((sum, m) => sum + (m.pending || 0), 0) || 0}</h3>
            </div>
          </div>
        </div>

        {/* Monthly Chart */}
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <Bar data={monthlyChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              {data?.byType?.length > 0 ? (
                <Pie data={pieChartData} options={pieOptions} />
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-pie-chart fs-1 d-block mb-3"></i>
                  <p>No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;