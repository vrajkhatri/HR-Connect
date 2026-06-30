import React, { useState, useEffect, useRef } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Load notifications
    const loadNotifications = async () => {
        try {
            const response = await getNotifications({ limit: 30 });
            setNotifications(response.data.data || []);
            setUnreadCount(response.data.unreadCount || 0);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    // Load on mount and every 30 seconds
    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle mark as read
    const handleMarkAsRead = async (id) => {
        try {
            const response = await markNotificationRead(id);
            setUnreadCount(response.data.unreadCount || 0);
            setNotifications(prev => 
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
            toast.error('Failed to mark as read');
        }
    };

    // Handle mark all as read
    const handleMarkAllRead = async () => {
        try {
            const response = await markAllNotificationsRead();
            setUnreadCount(0);
            setNotifications(prev => 
                prev.map(n => ({ ...n, read: true }))
            );
            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Error marking all as read:', error);
            toast.error('Failed to mark all as read');
        }
    };

    // ✅ Enhanced notification icon based on title
    const getNotificationIcon = (title) => {
        if (title.includes('Approved')) return 'bi-check-circle-fill text-success';
        if (title.includes('Rejected')) return 'bi-x-circle-fill text-danger';
        if (title.includes('New Leave')) return 'bi-bell-fill text-primary';
        if (title.includes('Welcome')) return 'bi-person-fill text-success';
        if (title.includes('Added') || title.includes('Addition')) return 'bi-plus-circle-fill text-success';
        if (title.includes('Deducted') || title.includes('Deduction')) return 'bi-dash-circle-fill text-danger';
        if (title.includes('Monthly Credits')) return 'bi-calendar2-plus-fill text-info';
        if (title.includes('Compensatory Off')) return 'bi-clock-history text-warning';
        if (title.includes('Manual')) return 'bi-pencil-fill text-warning';
        return 'bi-bell-fill text-secondary';
    };

    // ✅ Get notification type for styling
    const getNotificationType = (title, message) => {
        if (title.includes('Monthly Credits')) return 'credit';
        if (title.includes('Approved')) return 'success';
        if (title.includes('Rejected')) return 'danger';
        if (title.includes('Added') || title.includes('Addition')) return 'success';
        if (title.includes('Deducted') || title.includes('Deduction')) return 'danger';
        if (title.includes('Compensatory Off')) return 'warning';
        if (title.includes('Manual')) return 'info';
        if (title.includes('New Leave')) return 'primary';
        return 'secondary';
    };

    // Get time ago
    const getTimeAgo = (date) => {
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true });
        } catch {
            return 'Recently';
        }
    };

    // Toggle dropdown
    const toggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            loadNotifications();
        }
    };

    return (
        <div className="notification-bell" ref={dropdownRef}>
            <button 
                className="btn btn-link position-relative text-white text-decoration-none"
                onClick={toggleDropdown}
                style={{ padding: '8px' }}
            >
                <i className="bi bi-bell-fill" style={{ fontSize: '1.3rem' }}></i>
                {unreadCount > 0 && (
                    <span className="badge bg-danger position-absolute top-0 start-100 translate-middle rounded-circle">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="dropdown-menu show" style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    width: '400px',
                    maxHeight: '500px',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    padding: '0',
                    zIndex: 1050,
                    backgroundColor: '#fff',
                    border: 'none'
                }}>
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                        <h6 className="mb-0 fw-bold">
                            <i className="bi bi-bell-fill me-2"></i>
                            Notifications
                            {unreadCount > 0 && (
                                <span className="badge bg-danger ms-2">{unreadCount}</span>
                            )}
                        </h6>
                        <div>
                            {unreadCount > 0 && (
                                <button 
                                    className="btn btn-sm btn-outline-primary me-2"
                                    onClick={handleMarkAllRead}
                                >
                                    Mark all read
                                </button>
                            )}
                            <button 
                                className="btn btn-sm btn-close" 
                                onClick={() => setIsOpen(false)}
                            ></button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {loading ? (
                            <div className="text-center py-4">
                                <div className="spinner-border spinner-border-sm text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="bi bi-bell-slash fs-1 text-muted"></i>
                                <p className="text-muted mt-2 mb-0">No notifications</p>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const notifType = getNotificationType(notification.title, notification.message);
                                const isUnread = !notification.read;
                                
                                return (
                                    <div 
                                        key={notification.id} 
                                        className={`dropdown-item d-flex align-items-start gap-3 p-3 border-bottom ${isUnread ? 'bg-light border-start border-3 border-primary' : ''}`}
                                        style={{ 
                                            cursor: 'pointer', 
                                            transition: 'all 0.2s ease',
                                            borderLeft: isUnread ? '3px solid #0d6efd' : 'none'
                                        }}
                                        onClick={() => {
                                            if (isUnread) {
                                                handleMarkAsRead(notification.id);
                                            }
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.closest('.dropdown-item').style.backgroundColor = '#f8f9fa';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (isUnread) {
                                                e.target.closest('.dropdown-item').style.backgroundColor = '#f0f7ff';
                                            } else {
                                                e.target.closest('.dropdown-item').style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            <i className={`bi ${getNotificationIcon(notification.title)} fs-5`}></i>
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="fw-semibold small">{notification.title}</div>
                                                {isUnread && (
                                                    <span className="badge bg-primary rounded-pill" style={{ fontSize: '0.5rem' }}>
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-muted small" style={{ fontSize: '0.85rem' }}>
                                                {notification.message}
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center mt-1">
                                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                    <i className="bi bi-clock me-1"></i>
                                                    {getTimeAgo(notification.createdAt)}
                                                </div>
                                                {notifType === 'credit' && (
                                                    <span className="badge bg-info text-white" style={{ fontSize: '0.6rem' }}>
                                                        Credit
                                                    </span>
                                                )}
                                                {notifType === 'success' && (
                                                    <span className="badge bg-success text-white" style={{ fontSize: '0.6rem' }}>
                                                        Added
                                                    </span>
                                                )}
                                                {notifType === 'danger' && (
                                                    <span className="badge bg-danger text-white" style={{ fontSize: '0.6rem' }}>
                                                        Deducted
                                                    </span>
                                                )}
                                                {notifType === 'warning' && (
                                                    <span className="badge bg-warning text-dark" style={{ fontSize: '0.6rem' }}>
                                                        Comp Off
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-2 border-top text-center">
                            <button 
                                className="btn btn-sm btn-link text-muted text-decoration-none"
                                onClick={() => setIsOpen(false)}
                            >
                                <i className="bi bi-eye me-1"></i>
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;