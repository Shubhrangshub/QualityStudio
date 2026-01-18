// Local backend API client (replaces Base44)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

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
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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

// Simple auth mock (replace with real auth in production)
export const auth = {
  me: async () => {
    return { id: 'demo-user', name: 'Demo User', email: 'demo@qualitystudio.com' };
  },
  logout: () => {
    // Handle logout
  },
  redirectToLogin: () => {
    // Handle login redirect
  },
};

// Export as base44 compatible interface
export const localBackend = {
  entities,
  auth,
};

export default localBackend;
