import { useState, useEffect, useRef } from "react";
import { supabase, saveUserProfileImage, saveUserCoverImage, uploadImageToStorage, getCurrentUser } from "@/lib/supabaseClient";
import { useAuthRefresh } from "@/features/auth/hooks/useAuthRefresh";
import { getUserAvatarUrl } from "@/lib/utils";
import { processImage } from "@/lib/imageUtils";
import { SocialLinks, AvatarModStatus } from "../types";
import { API_BASE, MODERATION_REASONS, UNIVERSITY_OPTIONS } from "../constants";
import { FrameId } from "../components/atoms/AvatarFrame";

export const useProfile = (id: string | undefined, email: string) => {
  const { refreshIfNeeded, fetchWithAuth } = useAuthRefresh();
  const [bio, setBio] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [university, setUniversity] = useState("");
  const [profileImage, setProfileImage] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string>("");
  const [avatarFrame, setAvatarFrame] = useState<FrameId>("none");
  const [chatHanger, setChatHanger] = useState<string>("none");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    instagram: "", twitter: "", github: "", discord: "", tiktok: "",
  });

  const isOwnProfile = !id || id === currentUserId;

  const [avatarModStatus, setAvatarModStatus] = useState<AvatarModStatus>({
    checking: false, error: null
  });
  const [coverModStatus, setCoverModStatus] = useState<AvatarModStatus>({
    checking: false, error: null
  });
  
  const avatarErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        const targetId = id || user?.id;
        if (!targetId) return;
        setViewedUserId(targetId);

        const authProvider = localStorage.getItem('auth_provider');
        const googleAvatar = user && authProvider === 'google'
          ? (user.user_metadata?.avatar_url || user.user_metadata?.picture)
          : null;

        let { data, error } = await supabase
          .from("public_profiles")
          .select("avatar_url, bio, social_links, full_name, username, university, chat_hanger, cover_url, avatar_frame")
          .eq("id", targetId)
          .single();

        if (
          error &&
          (
            error.code === 'PGRST116' ||
            error?.message?.includes('chat_hanger') ||
            error?.message?.includes('university') ||
            error?.message?.includes('cover_url') ||
            error?.message?.includes('avatar_frame')
          )
        ) {
          const fallback = await supabase
            .from("public_profiles")
            .select("avatar_url, bio, social_links, full_name, username")
            .eq("id", targetId)
            .single();
          data = fallback.data as any;
          error = fallback.error;
        }

        if (!error && data) {
          const profileExtras = data as {
            cover_url?: string | null;
            avatar_frame?: FrameId | null;
          };

          if (authProvider === 'google' && data.avatar_url && data.avatar_url !== "") {
            setProfileImage(data.avatar_url);
          } else if (authProvider === 'google' && googleAvatar) {
            setProfileImage(googleAvatar);
            if (user) await saveUserProfileImage(user.id, googleAvatar);
          } else if (authProvider !== 'google' && data.avatar_url && !data.avatar_url.startsWith('http')) {
            setProfileImage(data.avatar_url);
          } else {
            setProfileImage(getUserAvatarUrl(data.avatar_url, data.full_name || data.username || email));
          }
          if (profileExtras.cover_url) setCoverImage(profileExtras.cover_url);
          if (profileExtras.avatar_frame) setAvatarFrame(profileExtras.avatar_frame);
          
          if (data.chat_hanger) setChatHanger(data.chat_hanger as string);
          else {
            const localHanger = localStorage.getItem(`hanger_${targetId}`);
            if (localHanger) setChatHanger(localHanger);
          }
          
          if (data.bio) setBio(data.bio);
          if (data.full_name) setFullName(data.full_name);

          const dbUniversity = (data as any).university;
          if (typeof dbUniversity === 'string' && UNIVERSITY_OPTIONS.includes(dbUniversity as any)) {
            setUniversity(dbUniversity);
          } else {
            setUniversity('');
          }
          
          if (data.username) {
            setUsername(data.username);
          } else if (isOwnProfile && email) {
            const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const generatedUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
            setUsername(generatedUsername);
            await supabase.from("users").update({ username: generatedUsername }).eq("id", user?.id);
          } else {
            setUsername(email?.split("@")[0] || "user");
          }

          if (data.social_links) {
            const links = typeof data.social_links === "string" ? JSON.parse(data.social_links) : data.social_links;
            setSocialLinks(links);
          }
        } else if (googleAvatar) {
          setProfileImage(googleAvatar);
        } else {
          setProfileImage(getUserAvatarUrl(null, user?.user_metadata?.full_name || email));
        }

        const fetchFollowStats = async () => {
          const { count: fCount } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", targetId);
          const { count: flCount } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", targetId);
          setFollowersCount(fCount || 0);
          setFollowingCount(flCount || 0);

          if (user && targetId !== user.id) {
            const { count: isFollowingCount } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id).eq("following_id", targetId);
            setIsFollowing((isFollowingCount || 0) > 0);
          }
        };

        await fetchFollowStats();
        setProfileLoaded(true);
      } catch (err) {
        console.error("Error loading profile:", err);
        setProfileImage(getUserAvatarUrl(null, email));
        setProfileLoaded(true);
      }
    };

    loadProfileData();
  }, [id, email]);

  const saveSocialLinks = async (links: SocialLinks) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase.from("users").update({ social_links: links }).eq("id", currentUserId);
      if (error) throw error;
      setSocialLinks(links);
    } catch (err) { console.error("Error saving social links:", err); }
  };

  const saveBio = async (newBio: string) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase.from("users").update({ bio: newBio }).eq("id", currentUserId);
      if (error) throw error;
      setBio(newBio);
    } catch (err) { console.error("Error saving bio:", err); }
  };

  const saveFullName = async (newName: string) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase.from("users").update({ full_name: newName }).eq("id", currentUserId);
      if (error) throw error;
      setFullName(newName);
    } catch (err) { console.error("Error saving full name:", err); }
  };

  const saveUniversity = async (newUniversity: string) => {
    if (!currentUserId) return;
    const safeUniversity = UNIVERSITY_OPTIONS.includes(newUniversity as any) ? newUniversity : '';
    try {
      const { error } = await supabase
        .from("users")
        .update({ university: safeUniversity || null })
        .eq("id", currentUserId);
      if (error) throw error;
      setUniversity(safeUniversity);
    } catch (err) {
      console.error("Error saving university:", err);
    }
  };

  const saveAvatarFrame = async (newFrame: FrameId) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase.from("users").update({ avatar_frame: newFrame }).eq("id", currentUserId);
      if (error) throw error;
      setAvatarFrame(newFrame);
    } catch (err) { console.error("Error saving avatar frame:", err); }
  };

  const saveChatHanger = async (newHanger: string) => {
    if (!currentUserId) return;
    try {
      setChatHanger(newHanger);
      localStorage.setItem(`hanger_${currentUserId}`, newHanger);
      const { error } = await supabase.from("users").update({ chat_hanger: newHanger }).eq("id", currentUserId);
      if (error) console.warn("Supabase chat_hanger error (Add it to DB):", error.message);
    } catch (err) { console.error("Error saving chat hanger:", err); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    if (!file.type.startsWith('image/')) {
      setAvatarModStatus({ checking: false, error: "الرجاء اختيار ملف صورة صالح" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarModStatus({ checking: false, error: "حجم الصورة يجب أن لا يتجاوز 5 ميجابايت" });
      return;
    }

    if (avatarErrorTimerRef.current) clearTimeout(avatarErrorTimerRef.current);
    setAvatarModStatus({ checking: true, error: null });

    try {
      const imageDataUrl = await processImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.85 });
      
      const { getFingerprint } = await import('@/hooks/useFingerprint');
      const fp = await getFingerprint();

      // Moderation call with automatic token management and retry logic
      const res = await fetchWithAuth(`${API_BASE}/api/moderation/moderate-avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageDataUrl, userId: currentUserId, fingerprint: fp }),
      });
      
      if (!res.ok) throw new Error('Moderation API error');
      const data = await res.json();
      
      if (!data.safe) {
        if (data.banned) {
          setAvatarModStatus({ checking: false, error: '🚫 تم حظر حسابك نهائياً بسبب محاولة رفع محتوى مخالف' });
          return;
        }
        const errorMsg = MODERATION_REASONS[data.reason] || '🚫 لا يمكن استخدام هذه الصورة';
        setAvatarModStatus({ checking: false, error: errorMsg });
        avatarErrorTimerRef.current = setTimeout(() => setAvatarModStatus(prev => ({ ...prev, error: null })), 5000);
        return;
      }

      const finalImageUrl = await uploadImageToStorage(imageDataUrl, currentUserId, 'avatar');
      if (!finalImageUrl || finalImageUrl.startsWith('data:')) {
        throw new Error('فشل الرفع إلى الخادم');
      }

      const { error: saveError } = await saveUserProfileImage(currentUserId, finalImageUrl);
      if (saveError) {
        setAvatarModStatus({ checking: false, error: `⚠️ فشل في الحفظ: ${saveError.message}` });
        return;
      }
      
      setProfileImage(finalImageUrl);
      setAvatarModStatus({ checking: false, error: null });
    } catch (err) {
      console.error("Error processing/uploading avatar:", err);
      setAvatarModStatus({ checking: false, error: "فشل المعالجة. تأكد من اتصالك بالإنترنت." });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    if (!file.type.startsWith('image/')) {
      setCoverModStatus({ checking: false, error: "الرجاء اختيار ملف صورة صالح" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverModStatus({ checking: false, error: "حجم الصورة يجب أن لا يتجاوز 5 ميجابايت" });
      return;
    }

    setCoverModStatus({ checking: true, error: null });

    try {
      const imageDataUrl = await processImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
      
      const { getFingerprint } = await import('@/hooks/useFingerprint');
      const fp = await getFingerprint();

      // Moderation call with automatic token management and retry logic
      const res = await fetchWithAuth(`${API_BASE}/api/moderation/moderate-avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageDataUrl, userId: currentUserId, fingerprint: fp }),
      });
      
      if (!res.ok) throw new Error('Moderation API error');
      const data = await res.json();
      
      if (!data.safe) {
        if (data.banned) {
          setCoverModStatus({ checking: false, error: '🚫 تم حظر حسابك' });
          return;
        }
        const errorMsg = MODERATION_REASONS[data.reason] || '🚫 غير مقبول';
        setCoverModStatus({ checking: false, error: errorMsg });
        setTimeout(() => setCoverModStatus(prev => ({ ...prev, error: null })), 5000);
        return;
      }

      const finalImageUrl = await uploadImageToStorage(imageDataUrl, currentUserId, 'cover');
      if (!finalImageUrl || finalImageUrl.startsWith('data:')) {
        throw new Error('فشل الرفع إلى الخادم');
      }

      const { error: saveError } = await saveUserCoverImage(currentUserId, finalImageUrl);
      if (saveError) {
        setCoverModStatus({ checking: false, error: `⚠️ فشل في الحفظ: ${saveError.message}` });
        return;
      }
      
      setCoverImage(finalImageUrl);
      setCoverModStatus({ checking: false, error: null });
    } catch (err) {
      console.error("Error processing/uploading cover:", err);
      setCoverModStatus({ checking: false, error: "فشل المعالجة. تأكد من اتصالك بالإنترنت." });
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUserId || !viewedUserId) return;
    try {
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", viewedUserId);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await supabase.from("follows").insert([{ follower_id: currentUserId, following_id: viewedUserId }]);
        const { data: isFollowingUs } = await supabase.from("follows").select("*").eq("follower_id", viewedUserId).eq("following_id", currentUserId).single();
        await supabase.from("notifications").insert([{
          user_id: viewedUserId, actor_id: currentUserId, type: 'follow', message: isFollowingUs ? 'followed you back' : 'started following you'
        }]);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err) { console.error("Error toggling follow:", err); }
  };

  return {
    bio, fullName, username, university, profileImage, coverImage, avatarFrame, chatHanger, profileLoaded,
    isOwnProfile, isFollowing, followersCount, followingCount, socialLinks,
    avatarModStatus, coverModStatus, currentUserId, viewedUserId,
    saveBio, saveFullName, saveUniversity, saveAvatarFrame, saveChatHanger, saveSocialLinks,
    handleImageUpload, handleCoverUpload, handleFollowToggle
  };
};
