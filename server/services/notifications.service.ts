import { supabase } from './supabase.service.js';

export const NotificationService = {
  deleteNotification: async (id: string, userId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    return;
  },

  deleteAllNotifications: async (userId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
      
    if (error) throw error;
    return;
  },

  createNotification: async (data: any) => {
    const { error } = await supabase
      .from('notifications')
      .insert([data]);
    if (error) throw error;
    return;
  }
};
