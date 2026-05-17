import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
    : 'http://127.0.0.1:8000/api';

// Create axios instance with base config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only clear auth data if we get 401 specifically from an auth-protected endpoint
        // Don't redirect - let the page handle the error gracefully
        if (error.response?.status === 401) {
            console.warn('API returned 401 - unauthorized request');
        }
        return Promise.reject(error);
    }
);

// ==================== AUTH ====================
export const authAPI = {
    login: (email, password, role) =>
        api.post('/auth/login', { email, password, role }),

    register: (data) =>
        api.post('/auth/register', data),

    getMe: () =>
        api.get('/auth/me'),

    forgotPassword: (email) =>
        api.post('/auth/forgot-password', { email }),

    resetPassword: (token, new_password) =>
        api.post('/auth/reset-password', { token, new_password }),
};

// ==================== DEGREES / CERTIFICATES ====================
export const degreesAPI = {
    list: () =>
        api.get('/degrees/'),

    get: (id) =>
        api.get(`/degrees/${id}`),

    issue: (data) =>
        api.post('/degrees/issue', data),

    bulkIssue: (degrees) =>
        api.post('/degrees/bulk-issue', { degrees }),

    revoke: (id, reason) =>
        api.post(`/degrees/${id}/revoke`, { reason }),

    updateStatus: (id, status) =>
        api.put(`/degrees/${id}/status`, { status }),

    delete: (id) =>
        api.delete(`/degrees/${id}`),
};

// ==================== VERIFICATION ====================
export const verifyAPI = {
    verify: (data) =>
        api.post('/verify/', data),

    verifyByToken: (tokenId) =>
        api.get(`/verify/${tokenId}`),
};

// ==================== UNIVERSITIES ====================
export const universitiesAPI = {
    list: () =>
        api.get('/universities/'),

    listPublic: () =>
        api.get('/universities/public'),

    create: (data) =>
        api.post('/universities/', data),

    update: (id, data) =>
        api.put(`/universities/${id}`, data),

    delete: (id) =>
        api.delete(`/universities/${id}`),

    toggleStatus: (id) =>
        api.put(`/universities/${id}/toggle-status`),
};

// ==================== USERS ====================
export const usersAPI = {
    list: (params) =>
        api.get('/users/', { params }),

    create: (data) =>
        api.post('/users/', data),

    updateStatus: (id, status) =>
        api.put(`/users/${id}/status`, { status }),

    delete: (id) =>
        api.delete(`/users/${id}`),

    updatePassword: (current_password, new_password) =>
        api.put('/users/me/password', { current_password, new_password }),

    uploadPhoto: (formData) =>
        api.post('/users/me/photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    getPreferences: () =>
        api.get('/users/me/preferences'),

    updatePreferences: (preferences) =>
        api.put('/users/me/preferences', { preferences }),
};

// ==================== ANALYTICS ====================
export const analyticsAPI = {
    getDashboard: () =>
        api.get('/analytics/dashboard'),
};

// ==================== AUDIT LOGS ====================
export const auditAPI = {
    getLogs: (page = 1, limit = 20, action = '') =>
        api.get('/audit/logs', { params: { page, limit, action: action || undefined } }),
};

export default api;
