import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import NotificationBell from '../components/NotificationBell';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navItems = [
    // Employee & HR shared items
    { 
      path: '/dashboard', 
      icon: 'bi-grid-1x2-fill', 
      label: 'Dashboard', 
      roles: ['EMPLOYEE', 'HR'] 
    },
    { 
      path: '/apply-leave', 
      icon: 'bi-calendar-plus', 
      label: 'Apply Leave', 
      roles: ['EMPLOYEE', 'HR']
    },
    { 
      path: '/my-leaves', 
      icon: 'bi-clock-history', 
      label: 'My Leaves', 
      roles: ['EMPLOYEE', 'HR']
    },
    { 
      path: '/leave-balance', 
      icon: 'bi-wallet2', 
      label: 'Leave Balance', 
      roles: ['EMPLOYEE', 'HR']
    },
    
    // HR only items
    { 
      path: '/hr/dashboard', 
      icon: 'bi-speedometer2', 
      label: 'HR Dashboard', 
      roles: ['HR'] 
    },
    { 
      path: '/hr/employees', 
      icon: 'bi-people-fill', 
      label: 'Employees', 
      roles: ['HR'] 
    },
    { 
      path: '/hr/departments', 
      icon: 'bi-building', 
      label: 'Departments', 
      roles: ['HR'] 
    },
    { 
      path: '/hr/leave-types', 
      icon: 'bi-tags-fill', 
      label: 'Leave Types', 
      roles: ['HR'] 
    },
    { 
      path: '/hr/leave-management', 
      icon: 'bi-sliders2', 
      label: 'Leave Management', 
      roles: ['HR'] 
    },
    { 
      path: '/hr/leave-requests', 
      icon: 'bi-file-earmark-text', 
      label: 'Leave Requests', 
      roles: ['HR'] 
    },
    { 
      path: '/hr/calendar', 
      icon: 'bi-calendar-event', 
      label: 'Calendar', 
      roles: ['HR'] 
    },
    { 
      path: '/hr/reports', 
      icon: 'bi-bar-chart-fill', 
      label: 'Reports', 
      roles: ['HR'] 
    },
    { 
      path: '/hr/audit', 
      icon: 'bi-clipboard-data', 
      label: 'Audit Trail', 
      roles: ['HR'] 
    },
    
    // Profile (everyone)
    { 
      path: '/profile', 
      icon: 'bi-person-circle', 
      label: 'Profile', 
      roles: ['EMPLOYEE', 'HR'] 
    },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <h4><i className="bi bi-building me-2"></i>HRConnect</h4>
          <small>Professional HRMS</small>
        </div>
        
        <div className="px-2">
          {filteredNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <i className={`bi ${item.icon}`}></i>
              <span>{item.label}</span>
            </Link>
          ))}
          
          <hr className="border-secondary opacity-25 my-3" />
          
          {/* ✅ Dark Mode Toggle */}
          <button 
            className="nav-link" 
            onClick={toggleTheme}
            style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
          >
            <i className={`bi ${isDark ? 'bi-sun-fill' : 'bi-moon-fill'}`}></i>
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          <button className="nav-link text-danger" onClick={handleLogout} style={{ width: '100%', border: 'none', background: 'none' }}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="mb-0 fw-bold">
              {filteredNavItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </h5>
            <small className="text-muted">
              Welcome back, {user?.name}
            </small>
          </div>
          <div className="d-flex align-items-center gap-3">
            {/* Notification Bell */}
            <NotificationBell />
            
            {/* ✅ Dark Mode Toggle Button (Alternative) */}
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <i className={`bi ${isDark ? 'bi-sun-fill' : 'bi-moon-fill'}`}></i>
            </button>
            
            <span className="badge bg-primary">{user?.role}</span>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <i className={`bi ${sidebarCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
            </button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;