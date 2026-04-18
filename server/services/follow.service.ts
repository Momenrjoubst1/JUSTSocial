import { supabase } from './supabase.service.js';
import { NotificationService } from './notifications.service.js';

export const FollowService = {
  followUser: async (followerId: string, followingId: string) => {
    if (followerId === followingId) {
      throw new Error("Cannot follow yourself");
    }

    const { error: insertError } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });

    if (insertError) {
      // If code 23505, duplicate key constraint (already following). We can ignore or throw.
      if (insertError.code !== '23505') throw insertError;
    }

    // Check if they are already following us, to send the correct notification message
    const { data: isFollowingUs } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followingId)
      .eq('following_id', followerId)
      .maybeSingle();

    try {
        await NotificationService.createNotification({
            user_id: followingId,
            actor_id: followerId,
            type: 'follow',
            message: isFollowingUs ? 'followed you back' : 'started following you'
        });
    } catch (notifError) {
        console.error("Failed to create notification upon follow:", notifError);
        // We don't throw here to avoid failing the follow action if notifications fail
    }

    return true;
  },

  unfollowUser: async (followerId: string, followingId: string) => {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw error;

    return true;
  }
};
