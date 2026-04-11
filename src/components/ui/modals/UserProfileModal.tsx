import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { getUserAvatarUrl } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { VerifiedBadge, isUserVerified, Button, Avatar } from '@/components/ui/core';
import { X, MessageCircle, UserPlus, UserMinus, Link, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

interface UserProfileData {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  university: string | null;
  avatar_url?: string | null;
  bio: string | null;
  social_links: any | null;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      if (user) {
        // Check if following
        const { data } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .single();

        setIsFollowing(!!data);
      }
    };
    init();
  }, [userId]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setProfile(data);

        // Pre-populate badge cache if user is verified
        if (data?.is_verified) {
          import('@/components/ui/core/VerifiedBadge').then(m => m.fetchAndCacheVerification(userId));
        }


        // Fetch stats
        const [followersCount, followingCount] = await Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
        ]);

        setStats({
          followers: followersCount.count || 0,
          following: followingCount.count || 0
        });

      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const toggleFollow = async () => {
    if (!currentUserId || userId === currentUserId) return;

    setActionLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', userId);
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: userId });

        // Check if they are already following us to send "followed you back"
        const { data: isFollowingUs } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', userId)
          .eq('following_id', currentUserId)
          .single();

        // Create a real notification for the followed user
        await supabase.from('notifications').insert([{
          user_id: userId,
          actor_id: currentUserId,
          type: 'follow',
          message: isFollowingUs ? 'followed you back' : 'started following you'
        }]);

        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = () => {
    onClose();
    navigate(`/messages?user=${userId}`);
  };

  const getAvatar = () => {
    return getUserAvatarUrl(profile?.avatar_url, profile?.full_name || profile?.email || 'User');
  };

  const parseSocialLinks = (links: any) => {
    if (!links) return null;
    if (typeof links === 'string') {
      try {
        return JSON.parse(links);
      } catch (e) {
        return null;
      }
    }
    return links;
  };

  const socialLinksParams = parseSocialLinks(profile?.social_links);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-card border border-border shadow-2xl z-10"
        >
          {/* Header Cover Background */}
          <div className="h-28 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
            <Button
              variant="glass"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="px-6 pb-6 relative">
            {/* Avatar Profile */}
            <div className="flex justify-between items-end -mt-10 mb-4">
              {loading ? (
                <div className="w-20 h-20 rounded-full border-4 border-card bg-muted animate-pulse" />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-card bg-background shrink-0 relative flex items-center justify-center">
                  <Avatar 
                    src={profile?.avatar_url}
                    name={profile?.full_name || profile?.email || 'User'}
                    size={72}
                  />
                  {/* Status Indicator */}
                  <div className="absolute bottom-1 right-1 w-3 h-3 bg-accent rounded-full border-2 border-background" />
                </div>
              )}

              {/* Action Buttons */}
              {!loading && currentUserId !== userId && (
                <div className="flex gap-2 pb-1">
                  <Button
                    isLoading={actionLoading}
                    onClick={toggleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    className="rounded-full font-bold h-9"
                    leftIcon={isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                  <Button
                    onClick={handleMessage}
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded animate-pulse w-1/2" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                  <div className="h-4 bg-muted rounded animate-pulse w-full mt-4" />
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      {profile?.full_name || profile?.email?.split('@')[0] || 'Unknown User'}
                      {isUserVerified(profile?.email) && <VerifiedBadge size={18} />}
                    </h2>
                    <p className="text-foreground/50 text-xs">
                      {profile?.username ? `@${profile.username}` : profile?.email}
                    </p>
                    {profile?.university && (
                      <p className="text-foreground/60 text-xs mt-1">
                        {profile.university}
                      </p>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap rounded-xl bg-muted/30 p-3 border border-border/50 max-h-32 overflow-y-auto custom-scrollbar">
                    {profile?.bio ? profile.bio : "This user hasn't written a bio yet."}
                  </div>

                  {/* Stats snippet */}
                  <div className="flex items-center gap-6 py-2 border-y border-border/50">
                    <div className="flex flex-col items-center flex-1">
                      <span className="font-bold text-foreground">{stats.followers}</span>
                      <span className="text-[10px] text-foreground/50 uppercase tracking-wider font-semibold">Followers</span>
                    </div>
                    <div className="flex flex-col items-center flex-1">
                      <span className="font-bold text-foreground">{stats.following}</span>
                      <span className="text-[10px] text-foreground/50 uppercase tracking-wider font-semibold">Following</span>
                    </div>
                  </div>

                  {/* Social Links */}
                  {socialLinksParams && Object.entries(socialLinksParams).some(([_, val]) => val) && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Connect</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(socialLinksParams).map(([key, value]) => {
                          if (!value) return null;
                          return (
                            <a
                              key={key}
                              href={typeof value === 'string' && value.startsWith('http') ? value : `https://${key}.com/${value}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 hover:bg-muted text-[11px] font-medium rounded-full text-foreground transition-all border border-border/50 hover:border-border"
                            >
                              <Link className="w-3 h-3" />
                              <span className="capitalize">{key}</span>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default UserProfileModal;
