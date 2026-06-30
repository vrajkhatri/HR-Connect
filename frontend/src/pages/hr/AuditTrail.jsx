import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../../api/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { format } from 'date-fns';

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await getAuditLogs();
      setLogs(response.data.data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = filter
    ? logs.filter(log => 
        log.action?.toLowerCase().includes(filter.toLowerCase()) ||
        log.remarks?.toLowerCase().includes(filter.toLowerCase()) ||
        log.approvedBy?.name?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  if (loading) return <LoadingSpinner text="Loading audit logs..." />;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold">Audit Trail</h5>
          <p className="text-muted mb-0">Track all leave approval activities</p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={loadAuditLogs}>
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      <div className="mb-3">
        <div className="input-group" style={{ maxWidth: '300px' }}>
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input
            type="text"
            className="form-control"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Action</th>
                  <th>Approved By</th>
                  <th>Remarks</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">
                      <i className="bi bi-clipboard-data fs-3 d-block mb-2"></i>
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr key={log.id}>
                      <td>{index + 1}</td>
                      <td>
                        <span className={`badge ${log.action === 'APPROVED' ? 'bg-success' : 'bg-danger'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>{log.approvedBy?.name || 'System'}</td>
                      <td>
                        <span className="text-truncate-custom">{log.remarks || '-'}</span>
                      </td>
                      <td>{format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;