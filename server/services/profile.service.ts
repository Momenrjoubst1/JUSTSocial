import { supabase } from './supabase.service.js';

export const ProfileService = {
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('users') // Note: In this project, the table seems to be 'users' instead of 'profiles' based on previous search results
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  updateProfile: async (userId: string, updates: any) => {
    // strict parameter allowing list to prevent mass assignment vulnerabilities
      const allowedFields = ['username', 'bio', 'social_links', 'full_name', 'avatar_frame', 'chat_hanger', 'university', 'user_metadata'];
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) return null;

    const { data, error } = await supabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
