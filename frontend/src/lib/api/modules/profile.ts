import { apiClient } from '../client';

export const profileApi = {
  update: (updates: any) => apiClient.put('/api/profile/me', updates),
};
