import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTHENTICATION
// ============================================
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (data) => api.post('/auth/register', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (data) => api.post('/auth/reset-password', data);
export const getCurrentUser = () => api.get('/auth/me');
export const sendOTP = (email) => api.post('/auth/send-otp', { email });
export const verifyOTP = (data) => api.post('/auth/verify-otp', data);
export const verifyOTPAndResetPassword = (data) => api.post('/auth/verify-otp-and-reset', data);

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// ============================================
// DASHBOARD
// ============================================
export const getHRDashboard = () => api.get('/dashboard/hr');
export const getEmployeeDashboard = () => api.get('/dashboard/employee');

// ============================================
// EMPLOYEES
// ============================================
export const getEmployees = (params) => api.get('/employees', { params });
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

// ============================================
// DEPARTMENTS
// ============================================
export const getDepartments = () => api.get('/departments');
export const createDepartment = (data) => api.post('/departments', data);
export const updateDepartment = (id, data) => api.put(`/departments/${id}`, data);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);

// ============================================
// LEAVE TYPES
// ============================================
export const getLeaveTypes = () => api.get('/leave-types');
export const createLeaveType = (data) => api.post('/leave-types', data);
export const updateLeaveType = (id, data) => api.put(`/leave-types/${id}`, data);
export const deleteLeaveType = (id) => api.delete(`/leave-types/${id}`);

// ============================================
// LEAVES
// ============================================
export const applyLeave = (data) => api.post('/leaves/apply', data);
export const getMyLeaves = (params) => api.get('/leaves/my', { params });
export const getMyLeaveBalances = () => api.get('/leaves/balances/my');
export const getLeaveRequests = (params) => api.get('/leaves/requests', { params });
export const updateLeaveStatus = (id, data) => api.put(`/leaves/${id}/status`, data);
export const searchEmployees = (query) => api.get('/leaves/search/employees', { params: { query } });
export const getLeaveStatistics = (params) => api.get('/leaves/statistics', { params });

// ✅ Cancel Leave (Employee)
export const cancelLeave = (id, data) => {
    return api.put(`/leaves/${id}/cancel`, data);
};

// ✅ Reverse Leave (HR)
export const reverseLeave = (id, data) => {
    return api.put(`/leaves/${id}/reverse`, data);
};

// ============================================
// LEAVES - EXPORT
// ============================================
export const exportLeaveRequestsPDF = async (params) => {
    try {
        const response = await api.get('/leaves/export/pdf', { 
            params, 
            responseType: 'blob' 
        });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leave-requests-${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return response;
    } catch (error) {
        console.error('PDF Export error:', error);
        throw error;
    }
};

export const exportLeaveRequestsExcel = async (params) => {
    try {
        const response = await api.get('/leaves/export/excel', { 
            params, 
            responseType: 'blob' 
        });
        const url = window.URL.createObjectURL(new Blob([response.data], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leave-requests-${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return response;
    } catch (error) {
        console.error('Excel Export error:', error);
        throw error;
    }
};

// ============================================
// NOTIFICATIONS
// ============================================
export const getNotifications = (params) => api.get('/notifications', { params });
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const deleteAllNotifications = () => api.delete('/notifications/all');

// ============================================
// AUDIT
// ============================================
export const getAuditLogs = (params) => api.get('/audit', { params });

// ============================================
// PROFILE
// ============================================
export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.put('/profile', data);
export const changePassword = (data) => api.put('/profile/password', data);
export const updateEmail = (data) => api.put('/profile/email', data);
export const updatePhone = (data) => api.put('/profile/phone', data);
export const updateAddress = (data) => api.put('/profile/address', data);

// ============================================
// LEAVE MANAGEMENT
// ============================================
export const getEmployeesForManagement = (params) => api.get('/leave-management/employees', { params });
export const getEmployeeLeaveBalance = (employeeId, params) => 
    api.get(`/leave-management/balance/${employeeId}`, { params });
export const getEmployeeLeaveHistory = (employeeId, params) => 
    api.get(`/leave-management/history/${employeeId}`, { params });
export const manualAddLeave = (data) => api.post('/leave-management/manual-add', data);
export const generateMonthlyCredits = (data) => api.post('/leave-management/generate-credits', data);

// ============================================
// UTILITY - Test API Connection
// ============================================
export const testApiConnection = () => api.get('/health');

export default api;