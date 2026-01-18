// QualityStudio API Client
// Redirects all API calls to the local FastAPI backend

import localBackend from './localBackendClient';

// Always use local backend - Base44 dependency removed
console.log('🟢 QualityStudio API initialized');

export const base44 = localBackend;
