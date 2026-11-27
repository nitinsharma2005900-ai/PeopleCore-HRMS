import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('peoplecore_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh on 401
let refreshing: Promise<any> | null = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      originalRequest._retry = true;
      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('peoplecore_refresh_token');
        if (refreshToken) {
          try {
            if (!refreshing) refreshing = axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }).finally(() => { refreshing = null; });
            const refreshRes = await refreshing;
            const { accessToken, refreshToken: newRefreshToken } = refreshRes.data.data;
            localStorage.setItem('peoplecore_access_token', accessToken);
            localStorage.setItem('peoplecore_refresh_token', newRefreshToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          } catch (refreshErr) {
            localStorage.removeItem('peoplecore_access_token');
            localStorage.removeItem('peoplecore_refresh_token');
            localStorage.removeItem('peoplecore_user');
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);
