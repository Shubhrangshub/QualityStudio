// Local backend API client with JWT authentication
// Use relative URL if in Emergent preview, absolute URL for local dev
const API_BASE_URL = window.location.hostname.includes('emergentagent.com')
  ? '/api'  // Emergent preview uses proxy
  : import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

// Helper to get auth token
const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
};

class LocalAPIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401) {
        console.warn('Unauthorized - token may be expired');
        // Optionally trigger logout/redirect
        localStorage.removeItem('access_token');
        localStorage.removeItem('current_user');
        // window.location.reload();
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Entity class factory
  createEntityClass(collectionName) {
    return {
      list: async (sortBy = '-created_date', limit = 100) => {
        const sort = sortBy ? `?sort=${sortBy}&limit=${limit}` : `?limit=${limit}`;
        return await this.request(`/${collectionName}${sort}`);
      },

      create: async (data) => {
        return await this.request(`/${collectionName}`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      get: async (id) => {
        return await this.request(`/${collectionName}/${id}`);
      },

      update: async (id, data) => {
        return await this.request(`/${collectionName}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },

      delete: async (id) => {
        return await this.request(`/${collectionName}/${id}`, {
          method: 'DELETE',
        });
      },

      filter: async (filters, sortBy = '-created_date', limit = 100) => {
        return await this.request(`/${collectionName}/filter?sort=${sortBy}&limit=${limit}`, {
          method: 'POST',
          body: JSON.stringify(filters),
        });
      },
    };
  }
}

// Initialize client
const apiClient = new LocalAPIClient(API_BASE_URL);

// Create entity classes
export const entities = {
  CustomerComplaint: apiClient.createEntityClass('customer_complaints'),
  DefectTicket: apiClient.createEntityClass('defect_tickets'),
  RCARecord: apiClient.createEntityClass('rca_records'),
  CAPAPlan: apiClient.createEntityClass('capa_plans'),
  ProcessRun: apiClient.createEntityClass('process_runs'),
  GoldenBatch: apiClient.createEntityClass('golden_batches'),
  SOP: apiClient.createEntityClass('sops'),
  DoE: apiClient.createEntityClass('does'),
  KnowledgeDocument: apiClient.createEntityClass('knowledge_documents'),
  Equipment: apiClient.createEntityClass('equipment'),
  FileUploadHistory: apiClient.createEntityClass('file_upload_history'),
  KPI: apiClient.createEntityClass('kpis'),
};

// Auth API
export const auth = {
  // Login with email and password
  login: async (email, password) => {
    const response = await apiClient.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store token
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('current_user', JSON.stringify(response.user));
    }
    
    return response;
  },
  
  // Register new user
  register: async (email, password, name, role = 'operator') => {
    const response = await apiClient.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
    
    // Store token
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('current_user', JSON.stringify(response.user));
    }
    
    return response;
  },
  
  // Validate current token
  validateToken: async () => {
    const token = getAuthToken();
    if (!token) return null;
    
    try {
      const response = await apiClient.request('/auth/validate-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      return response.user;
    } catch (error) {
      console.warn('Token validation failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('current_user');
      return null;
    }
  },
  
  // Get current user
  me: async () => {
    try {
      return await apiClient.request('/auth/me');
    } catch (error) {
      console.warn('Failed to get current user:', error);
      return null;
    }
  },
  
  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('current_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },
  
  // Check if user is logged in
  isLoggedIn: () => {
    return !!getAuthToken() && !!localStorage.getItem('current_user');
  },
  
  // Logout
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    window.location.reload();
  },
  
  // Redirect to login
  redirectToLogin: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    window.location.href = '/';
  },
};

// AI Service API
export const ai = {
  getRCASuggestions: async (description, defectType, severity) => {
    return await apiClient.request('/ai/rca-suggestions', {
      method: 'POST',
      body: JSON.stringify({ description, defectType, severity }),
    });
  },
  
  classifyDefect: async (description, imageUrl = null) => {
    return await apiClient.request('/ai/classify-defect', {
      method: 'POST',
      body: JSON.stringify({ description, imageUrl }),
    });
  },
  
  generateCAPA: async (rootCause, defectType) => {
    return await apiClient.request('/ai/generate-capa', {
      method: 'POST',
      body: JSON.stringify({ rootCause, defectType }),
    });
  },
  
  predictTrend: async (historicalDefects) => {
    return await apiClient.request('/ai/predict-trend', {
      method: 'POST',
      body: JSON.stringify({ historicalDefects }),
    });
  },
  
  searchKnowledge: async (query) => {
    return await apiClient.request('/ai/search-knowledge', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },
};

// Statistics API
export const statistics = {
  get: async () => {
    return await apiClient.request('/statistics');
  },
};

// File Upload API
export const files = {
  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${API_BASE_URL}/files/upload`;
    const token = getAuthToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Upload failed');
    }
    
    return await response.json();
  },
  
  uploadMultiple: async (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const url = `${API_BASE_URL}/files/upload-multiple`;
    const token = getAuthToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Upload failed');
    }
    
    return await response.json();
  },
  
  list: async (subdirectory = '') => {
    return await apiClient.request(`/files/list?subdirectory=${subdirectory}`);
  },
  
  delete: async (filename, subdirectory = '') => {
    return await apiClient.request(`/files/${filename}?subdirectory=${subdirectory}`, {
      method: 'DELETE',
    });
  },
};

// Export API
export const exports = {
  defectsPDF: () => `${API_BASE_URL}/export/defects/pdf`,
  defectsExcel: () => `${API_BASE_URL}/export/defects/excel`,
  complaintsPDF: () => `${API_BASE_URL}/export/complaints/pdf`,
  complaintsExcel: () => `${API_BASE_URL}/export/complaints/excel`,
  kpisPDF: () => `${API_BASE_URL}/export/kpis/pdf`,
  kpisExcel: () => `${API_BASE_URL}/export/kpis/excel`,
  fullExcel: () => `${API_BASE_URL}/export/full/excel`,
  
  download: async (type, format) => {
    const urls = {
      'defects-pdf': exports.defectsPDF(),
      'defects-excel': exports.defectsExcel(),
      'complaints-pdf': exports.complaintsPDF(),
      'complaints-excel': exports.complaintsExcel(),
      'kpis-pdf': exports.kpisPDF(),
      'kpis-excel': exports.kpisExcel(),
      'full-excel': exports.fullExcel(),
    };
    
    const url = urls[`${type}-${format}`];
    if (!url) throw new Error('Invalid export type');
    
    const token = getAuthToken();
    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    
    if (!response.ok) throw new Error('Export failed');
    
    const blob = await response.blob();
    const filename = response.headers.get('content-disposition')?.split('filename=')[1] || 
                     `export.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename.replace(/"/g, '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    return { success: true };
  },
};

// Notifications API
export const notifications = {
  // Email service status
  getEmailStatus: async () => {
    return await apiClient.request('/notifications/email/status');
  },
  
  // Send test email (admin only)
  sendTestEmail: async (to_emails, subject, body) => {
    return await apiClient.request('/notifications/email/test', {
      method: 'POST',
      body: JSON.stringify({ to_emails, subject, body }),
    });
  },
  
  // Broadcast notification (admin only)
  broadcast: async (title, message, type = 'system_alert', priority = 'normal') => {
    return await apiClient.request('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({ title, message, type, priority }),
    });
  },
};

// WebSocket for real-time notifications
export class NotificationSocket {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Set();
    this.connected = false;
  }
  
  connect(userId = null) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname.includes('emergentagent.com')
      ? window.location.host
      : 'localhost:8001';
    
    const wsUrl = `${protocol}//${host}/ws/notifications${userId ? `?user_id=${userId}` : ''}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.notifyListeners({ type: 'connection', status: 'connected' });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connected = false;
        this.notifyListeners({ type: 'connection', status: 'disconnected' });
        this.attemptReconnect(userId);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      console.error('Failed to connect WebSocket:', e);
    }
  }
  
  attemptReconnect(userId) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      setTimeout(() => this.connect(userId), 3000 * this.reconnectAttempts);
    }
  }
  
  subscribe(room) {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify({ action: 'subscribe', room }));
    }
  }
  
  unsubscribe(room) {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify({ action: 'unsubscribe', room }));
    }
  }
  
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('Listener error:', e);
      }
    });
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

// Global notification socket instance
export const notificationSocket = new NotificationSocket();

// Export as API interface
export const localBackend = {
  entities,
  auth,
  ai,
  statistics,
  files,
  exports,
  notifications,
  notificationSocket,
};

export default localBackend;
