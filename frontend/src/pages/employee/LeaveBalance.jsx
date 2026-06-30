import React, { useState, useEffect } from 'react';
import { getMyLeaveBalances } from '../../api/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const LeaveBalance = () => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    loadBalances();
  }, []);

  const loadBalances = async () => {
    setLoading(true);
    try {
      const response = await getMyLeaveBalances();
      setBalances(response.data || []);
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  if (loading) return <LoadingSpinner text="Loading leave balances..." />;

  // Chart data
  const chartData = {
    labels: balances.map(b => b.leaveType?.name || 'Unknown'),
    datasets: [
      {
        data: balances.map(b => b.remainingDays || 0),
        backgroundColor: balances.map(b => b.leaveType?.color || '#6c757d'),
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.raw} days`;
          }
        }
      }
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold">Leave Balance</h5>
          <p className="text-muted mb-0">View your leave balances with detailed breakdown</p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={loadBalances}>
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      <div className="row">
        {/* Balance Cards */}
        <div className="col-lg-8">
          <div className="row g-3">
            {balances.length === 0 ? (
              <div className="col-12">
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-wallet2 fs-1 d-block mb-3"></i>
                  <p>No leave balances found</p>
                </div>
              </div>
            ) : (
              balances.map((balance) => {
                const isExpanded = expandedCard === balance.id;
                const isCompensatory = balance.isCompensatory || false;
                const remaining = isCompensatory ? balance.totalDays : balance.remainingDays;
                const usedPercentage = balance.totalDays > 0 
                  ? ((balance.usedDays || 0) / (balance.totalDays || 1)) * 100 
                  : 0;

                return (
                  <div className="col-md-6" key={balance.id}>
                    <div className="card shadow-sm h-100">
                      <div className="card-body">
                        {/* Header */}
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <span 
                              className="badge" 
                              style={{ 
                                backgroundColor: balance.leaveType?.color || '#6c757d', 
                                color: '#fff' 
                              }}
                            >
                              {balance.leaveType?.name || 'Unknown'}
                            </span>
                            {isCompensatory && (
                              <span className="badge bg-info text-white ms-1">
                                <i className="bi bi-clock-history me-1"></i>
                                Comp Off
                              </span>
                            )}
                            {balance.monthlyCredit > 0 && (
                              <span className="badge bg-success text-white ms-1">
                                <i className="bi bi-arrow-up me-1"></i>
                                +{balance.monthlyCredit}/month
                              </span>
                            )}
                          </div>
                          <button 
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => toggleExpand(balance.id)}
                          >
                            <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                          </button>
                        </div>

                        {/* Main Balance */}
                        <div className="mt-3">
                          <div className="d-flex justify-content-between align-items-end">
                            <div>
                              <h2 className="mb-0 text-success">{remaining || 0}</h2>
                              <small className="text-muted">days remaining</small>
                            </div>
                            <div className="text-end">
                              <div>
                                <small className="text-muted">Total</small>
                                <div className="fw-bold">{balance.totalDays || 0}</div>
                              </div>
                              <div className="mt-1">
                                <small className="text-muted">Used</small>
                                <div className="fw-bold">{balance.usedDays || 0}</div>
                              </div>
                            </div>
                          </div>
                          <div className="progress mt-2" style={{ height: '6px' }}>
                            <div 
                              className="progress-bar" 
                              style={{ 
                                width: `${Math.min(usedPercentage, 100)}%`,
                                backgroundColor: usedPercentage > 80 ? '#dc3545' : (balance.leaveType?.color || '#6c757d')
                              }}
                            ></div>
                          </div>
                          <small className="text-muted">
                            {usedPercentage.toFixed(0)}% used
                          </small>
                        </div>

                        {/* ✅ Expanded Breakdown */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-top fade-in">
                            <h6 className="fw-bold mb-2">
                              <i className="bi bi-calculator me-2"></i>
                              Balance Breakdown
                            </h6>
                            
                            <div className="bg-light p-3 rounded">
                              {/* Opening Balance */}
                              <div className="d-flex justify-content-between py-1 border-bottom">
                                <span className="text-muted">
                                  <i className="bi bi-calendar3 me-1"></i>
                                  Opening Balance
                                </span>
                                <span className="fw-bold">
                                  {balance.openingBalance?.toFixed(1) || balance.totalDays?.toFixed(1) || 0} days
                                </span>
                              </div>

                              {/* Monthly Credits */}
                              <div className="d-flex justify-content-between py-1 border-bottom">
                                <span className="text-muted">
                                  <i className="bi bi-arrow-up-circle me-1 text-success"></i>
                                  Monthly Credits
                                  {balance.currentMonthCredit > 0 && (
                                    <span className="badge bg-success ms-1">+{balance.currentMonthCredit}</span>
                                  )}
                                </span>
                                <span className="fw-bold text-success">
                                  +{balance.monthlyCredit || 0} days
                                </span>
                              </div>

                              {/* Leaves Taken */}
                              <div className="d-flex justify-content-between py-1 border-bottom">
                                <span className="text-muted">
                                  <i className="bi bi-arrow-down-circle me-1 text-danger"></i>
                                  Leaves Taken
                                  {balance.leavesTakenThisMonth > 0 && (
                                    <span className="badge bg-danger ms-1">-{balance.leavesTakenThisMonth}</span>
                                  )}
                                </span>
                                <span className="fw-bold text-danger">
                                  -{balance.usedDays || 0} days
                                </span>
                              </div>

                              {/* Manual Adjustments */}
                              {(balance.manualAdjustment || balance.manualAdjustment !== 0) && (
                                <div className="d-flex justify-content-between py-1 border-bottom">
                                  <span className="text-muted">
                                    <i className="bi bi-pencil-square me-1 text-warning"></i>
                                    Manual Adjustments
                                  </span>
                                  <span className="fw-bold text-warning">
                                    {balance.manualAdjustment > 0 ? '+' : ''}{balance.manualAdjustment || 0} days
                                  </span>
                                </div>
                              )}

                              {/* Closing Balance */}
                              <div className="d-flex justify-content-between py-2 mt-1 bg-primary bg-opacity-10 rounded px-2">
                                <span className="fw-bold">
                                  <i className="bi bi-check-circle me-1"></i>
                                  Closing Balance
                                </span>
                                <span className="fw-bold text-primary">
                                  {remaining || 0} days
                                </span>
                              </div>

                              {/* Formula */}
                              <div className="mt-2 text-muted small">
                                <i className="bi bi-info-circle me-1"></i>
                                {balance.openingBalance?.toFixed(1) || 0} + {balance.monthlyCredit || 0} - {balance.usedDays || 0} = {remaining || 0} days
                              </div>
                            </div>

                            {/* Monthly History */}
                            {balance.history && balance.history.length > 0 && (
                              <div className="mt-3">
                                <small className="text-muted d-block mb-2">
                                  <i className="bi bi-clock-history me-1"></i>
                                  Monthly History
                                </small>
                                <div className="d-flex gap-2">
                                  {balance.history.map((h, idx) => (
                                    <div key={idx} className="flex-grow-1">
                                      <div className="bg-light p-2 rounded text-center">
                                        <div className="fw-bold">{h.closingBalance}</div>
                                        <small className="text-muted">
                                          {new Date(h.year, h.month - 1).toLocaleString('default', { month: 'short' })}
                                        </small>
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
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="col-lg-4">
          <div className="card shadow-sm sticky-top" style={{ top: '20px' }}>
            <div className="card-header">
              <i className="bi bi-pie-chart me-2"></i>
              Distribution
            </div>
            <div className="card-body">
              {balances.length > 0 ? (
                <Pie data={chartData} options={options} />
              ) : (
                <p className="text-muted text-center py-3">No data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveBalance;