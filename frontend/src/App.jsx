import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Layouts
import AppLayout from './layouts/AppLayout';

// Employee Pages (also accessible to HR)
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import ApplyLeave from './pages/employee/ApplyLeave';
import MyLeaves from './pages/employee/MyLeaves';
import LeaveBalance from './pages/employee/LeaveBalance';

// HR Pages
import HRDashboard from './pages/hr/HRDashboard';
import Employees from './pages/hr/Employees';
import Departments from './pages/hr/Departments';
import LeaveTypes from './pages/hr/LeaveTypes';
import LeaveManagement from './pages/hr/LeaveManagement';
import LeaveRequests from './pages/hr/LeaveRequests';
import LeaveCalendar from './pages/hr/LeaveCalendar';
import Reports from './pages/hr/Reports';
import AuditTrail from './pages/hr/AuditTrail';

// Profile
import Profile from './pages/Profile';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// App Routes
const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* ============================================
          PUBLIC ROUTES (No authentication required)
          ============================================ */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* ============================================
          PROTECTED ROUTES (Authentication required)
          ============================================ */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Default redirect based on role */}
        <Route
          index
          element={
            <Navigate
              to={user?.role === 'HR' || user?.role === 'ADMIN' ? '/hr/dashboard' : '/dashboard'}
              replace
            />
          }
        />

        {/* ============================================
            EMPLOYEE & HR SHARED ROUTES
            ============================================ */}
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="apply-leave" element={<ApplyLeave />} />
        <Route path="my-leaves" element={<MyLeaves />} />
        <Route path="leave-balance" element={<LeaveBalance />} />

        {/* ============================================
            HR ONLY ROUTES
            ============================================ */}
        <Route
          path="hr/dashboard"
          element={
            <ProtectedRoute requiredRole="HR">
              <HRDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/employees"
          element={
            <ProtectedRoute requiredRole="HR">
              <Employees />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/departments"
          element={
            <ProtectedRoute requiredRole="HR">
              <Departments />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/leave-types"
          element={
            <ProtectedRoute requiredRole="HR">
              <LeaveTypes />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/leave-management"
          element={
            <ProtectedRoute requiredRole="HR">
              <LeaveManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/leave-requests"
          element={
            <ProtectedRoute requiredRole="HR">
              <LeaveRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/calendar"
          element={
            <ProtectedRoute requiredRole="HR">
              <LeaveCalendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/reports"
          element={
            <ProtectedRoute requiredRole="HR">
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/audit"
          element={
            <ProtectedRoute requiredRole="HR">
              <AuditTrail />
            </ProtectedRoute>
          }
        />

        {/* ============================================
            PROFILE ROUTE (All authenticated users)
            ============================================ */}
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* ============================================
          404 - NOT FOUND
          ============================================ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <AppRoutes />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;