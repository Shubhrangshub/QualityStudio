import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import localBackend from './localBackendClient';

const { appId, serverUrl, token, functionsVersion } = appParams;

// Check if we should use local backend
const useLocalBackend = import.meta.env.VITE_USE_LOCAL_BACKEND === 'true';

let base44Client;

if (useLocalBackend) {
  // Use local backend
  console.log('🟢 Using LOCAL backend at:', import.meta.env.VITE_API_BASE_URL);
  base44Client = localBackend;
} else {
  // Use Base44
  console.log('🔵 Using BASE44 backend');
  base44Client = createClient({
    appId,
    serverUrl,
    token,
    functionsVersion,
    requiresAuth: false
  });
}

export const base44 = base44Client;
