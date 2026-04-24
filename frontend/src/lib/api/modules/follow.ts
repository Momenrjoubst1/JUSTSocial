import { apiClient } from '../client';

export const followApi = {
  follow: (userId: string) => apiClient.post('/api/follow/' + userId),
  unfollow: (userId: string) => apiClient.delete('/api/follow/' + userId),
};
