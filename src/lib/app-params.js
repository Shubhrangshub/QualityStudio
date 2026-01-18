// QualityStudio App Parameters
// Simple configuration without Base44 dependencies

const isNode = typeof window === 'undefined';

export const appParams = {
  appName: 'QualityStudio',
  version: '1.0.0',
  apiBaseUrl: isNode ? 'http://localhost:8001/api' : (
    window.location.hostname.includes('emergentagent.com') 
      ? '/api' 
      : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api')
  )
};
