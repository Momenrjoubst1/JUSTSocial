import { messagesApi } from './modules/messages';
import { followApi } from './modules/follow';
import { profileApi } from './modules/profile';
import { keysApi } from './modules/keys';
import { apiClient } from './client';

export const api = {
  client: apiClient,
  messages: messagesApi,
  follow: followApi,
  profile: profileApi,
  keys: keysApi
};
