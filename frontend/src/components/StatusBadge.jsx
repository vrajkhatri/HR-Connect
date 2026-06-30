import React from 'react';

const StatusBadge = ({ status }) => {
  const statusMap = {
    PENDING: { class: 'badge-pending', label: 'Pending', icon: 'bi-clock' },
    APPROVED: { class: 'badge-approved', label: 'Approved', icon: 'bi-check-circle' },
    REJECTED: { class: 'badge-rejected', label: 'Rejected', icon: 'bi-x-circle' },
    CANCELLED: { class: 'badge-cancelled', label: 'Cancelled', icon: 'bi-dash-circle' },
  };

  const statusInfo = statusMap[status] || statusMap.PENDING;

  return (
    <span className={`badge ${statusInfo.class}`}>
      <i className={`bi ${statusInfo.icon} me-1`}></i>
      {statusInfo.label}
    </span>
  );
};

export default StatusBadge;