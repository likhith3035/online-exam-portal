// NBKRIST Examination Portal - Shared Client API Helper

const API = {
  // Determine backend API origin
  // If the frontend is loaded via Live Server (port 5500) or file://, target Express on http://localhost:3000
  getBaseUrl() {
    if (window.location.port !== '3000') {
      return 'http://localhost:3000';
    }
    return '';
  },

  getUrl(endpoint) {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const base = this.getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    return `${base}${cleanEndpoint}`;
  },

  // Store authentication state
  setAuth(token, user) {
    localStorage.setItem('nbkrist_token', token);
    localStorage.setItem('nbkrist_user', JSON.stringify(user));
  },

  getToken() {
    return localStorage.getItem('nbkrist_token');
  },

  getUser() {
    const u = localStorage.getItem('nbkrist_user');
    try {
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem('nbkrist_token');
    localStorage.removeItem('nbkrist_user');
    sessionStorage.clear();
    fetch(this.getUrl('/api/auth/logout'), { method: 'POST', cache: 'no-store' }).finally(() => {
      window.location.href = 'index.html';
    });
  },

  // Require auth on page load
  checkAuth(expectedRole = null) {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user) {
      window.location.href = 'index.html';
      return false;
    }

    if (expectedRole && user.role !== expectedRole) {
      window.location.href = user.role === 'admin' ? 'admin.html' : 'student.html';
      return false;
    }

    return user;
  },

  // Generic Request Helper
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    let targetUrl = this.getUrl(endpoint);
    // Cache buster for GET requests to guarantee fresh data
    if (!options.method || options.method.toUpperCase() === 'GET') {
      const sep = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${sep}_t=${Date.now()}`;
    }

    try {
      const response = await fetch(targetUrl, {
        cache: 'no-store',
        ...options,
        headers
      });

      // Handle direct downloads
      if (options.isDownload) {
        return response;
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/login')) {
          this.logout();
        }
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  // Toast Notification
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span style="font-weight: bold; font-size: 16px;">${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};
