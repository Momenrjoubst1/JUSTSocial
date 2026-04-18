import { apiClient } from '../client';

export const keysApi = {
  register: (publicKey: string, encryptedPrivateKey: string = '') => apiClient.post('/api/keys', { publicKey, encryptedPrivateKey }),
  delete: () => apiClient.delete('/api/keys'),
};
