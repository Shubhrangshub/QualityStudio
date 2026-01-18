// QualityStudio API Client
// Redirects all API calls to the local FastAPI backend

import localBackend from './localBackendClient';

console.log('🟢 QualityStudio API initialized');

export const api = localBackend;

// Keep backward compatible export during transition
export const base44 = localBackend;
