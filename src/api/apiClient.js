// QualityStudio API Client
// Redirects all API calls to the local FastAPI backend

import localBackend from './localBackendClient';

console.log('🟢 QualityStudio API initialized');

export const api = localBackend;
export default localBackend;
