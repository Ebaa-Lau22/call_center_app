import axios from 'axios';

// Add token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cc_auth_token');
    if (token && config.data) {
      config.data.params = {
        ...config.data.params,
        token: token
      };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.data?.result?.message?.includes('Unauthorized')) {
      localStorage.removeItem('cc_auth_token');
      localStorage.removeItem('cc_user_id');
      localStorage.removeItem('cc_user_name');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);