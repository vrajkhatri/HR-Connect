import React from 'react';

const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => {
  const colorMap = {
    primary: { bg: 'bg-primary bg-opacity-10', text: 'text-primary' },
    success: { bg: 'bg-success bg-opacity-10', text: 'text-success' },
    warning: { bg: 'bg-warning bg-opacity-10', text: 'text-warning' },
    danger: { bg: 'bg-danger bg-opacity-10', text: 'text-danger' },
    info: { bg: 'bg-info bg-opacity-10', text: 'text-info' },
    secondary: { bg: 'bg-secondary bg-opacity-10', text: 'text-secondary' },
  };

  const colors = colorMap[color] || colorMap.primary;

  return (
    <div className="stat-card">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <p className="stat-label">{title}</p>
          <h3 className="stat-value">{value}</h3>
          {subtitle && <small className="text-muted">{subtitle}</small>}
        </div>
        <div className={`stat-icon ${colors.bg} ${colors.text}`}>
          <i className={`bi ${icon}`}></i>
        </div>
      </div>
    </div>
  );
};

export default StatCard;