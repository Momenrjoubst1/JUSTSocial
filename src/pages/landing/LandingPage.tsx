import { RainbowButton } from "@/components/ui/effects";
import React, { lazy, Suspense } from "react";
const SparklesCore = lazy(() => import("@/components/ui/effects/sparkles").then(m => ({ default: m.SparklesCore })));
import { Button, ThemeToggle } from "@/components/ui/core";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ProfileMenu, SearchBar, NotificationsPanel } from "@/components/ui/shared";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { getUserAvatarUrl } from "@/lib/utils";
import { useTitle } from "@/context/TitleContext";

interface LandingPageProps {
  isLoggedIn: boolean;
  onStartClick: () => void;
  onMessagesClick?: () => void;
  getAvatarUrl: (email: string) => string;
  userEmail: string;
  onSignInClick: () => void;
  onSignUpClick: () => void;
  onSignOutClick: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  unreadCount?: number;
  latestMessage?: { senderName: string, text: string } | null;
  notificationCount?: number;
  setNotificationCount?: (count: number | ((prev: number) => number)) => void;
  latestNotification?: { actorName: string, type: string } | null;
  userId?: string | null;
  onSenderClick?: (senderId: string) => void;
}

import { TwitterIcon, InstagramIcon, LinkedInIcon, GitHubIcon, Icon as LucideIcon } from "@/components/ui/core";
import { BrandLogo } from "@/components/ui/effects";
import { ChevronDown, Bell, Star, Send, Lightbulb, Bug, CheckCircle2, ArrowRight, MessageSquare } from "lucide-react";

const featureGradients = [
  "from-indigo-500 to-blue-600",
  "from-cyan-500 to-teal-600",
  "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-green-600",
  "from-rose-500 to-red-600",
  "from-violet-500 to-fuchsia-600",
];

import { HeroSection } from "@/features/landing/components/HeroSection";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { FeedbackModal } from "@/features/landing/components/FeedbackModal";
import { Footer } from "@/features/landing/components/Footer";

import { FeaturesSection } from "@/features/landing/components/FeaturesSection";
import { SafetySection } from "@/features/landing/components/SafetySection";
import { CommunitySection } from "@/features/landing/components/CommunitySection";

export function LandingPage({
  isLoggedIn,
  onStartClick,
  onMessagesClick,
  getAvatarUrl,
  userEmail,
  onSignInClick,
  onSignUpClick,
  onSignOutClick,
  onProfileClick,
  onSettingsClick,
  showProfileMenu,
  setShowProfileMenu,
  unreadCount = 0,
  latestMessage = null,
  notificationCount = 0,
  setNotificationCount,
  latestNotification = null,
  userId = null,
  onSenderClick,
}: LandingPageProps) {
  const { t } = useLanguage();
  const [headerTranslate, setHeaderTranslate] = useState(0);
  const [activeSection, setActiveSection] = useState("top");
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const lastScrollRef = useRef(0);
  const ticking = useRef(false);
  const { setBaseTitle } = useTitle();

  // ── Feedback form state ────────────────────────────────────────────
  const [fbCategory, setFbCategory] = useState("general");
  const [fbRating, setFbRating] = useState(0);
  const [fbHoverRating, setFbHoverRating] = useState(0);
  const [fbMessage, setFbMessage] = useState("");
  const [fbLoading, setFbLoading] = useState(false);
  const [fbSuccess, setFbSuccess] = useState(false);
  const [fbError, setFbError] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [unreadSenders, setUnreadSenders] = useState<{ id: string, avatar: string }[]>([]);
  const [notifActors, setNotifActors] = useState<{ id: string, avatar: string, type: string }[]>([]);

  useEffect(() => {
    if (!isLoggedIn || !userId) {
      setUnreadSenders([]);
      setNotifActors([]);
      return;
    }

    const fetchData = async () => {
      try {
        // Unread Messengers
        if (unreadCount && unreadCount > 0) {
          // 1. Get user's conversations
          const { data: myConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', userId);
          const convIds = myConvs?.map(c => c.conversation_id) || [];

          if (convIds.length > 0) {
            const { data: messages } = await supabase
              .from("messages")
              .select("sender_id")
              .in("conversation_id", convIds)
              .neq("sender_id", userId)
              .neq("status", "read");

          if (messages && messages.length > 0) {
            const sIds = Array.from(new Set(messages.map(m => m.sender_id))).slice(0, 12);
            const { data: users } = await supabase
              .from("public_profiles")
              .select("id, avatar_url, full_name, username")
              .in("id", sIds);
            if (users) {
              setUnreadSenders(users.map(u => ({
                id: u.id,
                avatar: getUserAvatarUrl(u.avatar_url, u.full_name || u.username)
              })));
            }
            }
          } else {
            setUnreadSenders([]);
          }
        } else {
          setUnreadSenders([]);
        }

        // Unread Notification Actors
        if (notificationCount && notificationCount > 0) {
          const { data: notifs } = await supabase
            .from("notifications")
            .select("actor_id, type")
            .eq("user_id", userId)
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(30);

          if (notifs && notifs.length > 0) {
            const actorMap = new Map();
            notifs.forEach(n => { if (!actorMap.has(n.actor_id)) actorMap.set(n.actor_id, n.type); });
            const aIds = Array.from(actorMap.keys()).slice(0, 12);

            const { data: users } = await supabase
              .from("public_profiles")
              .select("id, avatar_url, full_name, username")
              .in("id", aIds);

            if (users) {
              setNotifActors(users.map(u => ({
                id: u.id,
                avatar: getUserAvatarUrl(u.avatar_url, u.full_name || u.username),
                type: actorMap.get(u.id)
              })));
            }
          }
        } else {
          setNotifActors([]);
        }
      } catch (err) {
        console.error("Fetch unread actors err:", err);
      }
    };
    fetchData();
  }, [userId, unreadCount, notificationCount, isLoggedIn]);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbMessage.trim()) { setFbError("Please write your suggestion."); return; }
    if (fbRating === 0) { setFbError("Please select a rating."); return; }
    setFbLoading(true); setFbError("");
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: userId || null,
        email: userEmail || null,
        name: userEmail ? userEmail.split("@")[0] : null,
        category: fbCategory,
        rating: fbRating,
        message: fbMessage.trim(),
      });
      if (error) throw error;
      setFbSuccess(true);
      setFbMessage(""); setFbRating(0); setFbCategory("general");
      setTimeout(() => {
        setFbSuccess(false);
        setShowFeedbackModal(false);
      }, 2500);
    } catch {
      setFbError("Something went wrong. Please try again.");
    } finally {
      setFbLoading(false);
    }
  };

  useEffect(() => {
    setBaseTitle('Home • SkillSwap');
  }, []);

  // Track active section using scroll position
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['top', 'features', 'community', 'about'];
      const scrollPosition = window.scrollY + 300; // offset to trigger slightly before reaching

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // run once on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Calculate scrollbar width and set it as a CSS variable on the document
    const updateScrollbarWidth = () => {
      const root = document.getElementById('root') || document.documentElement;
      const scrollbarWidth = window.innerWidth - root.clientWidth;
      document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    };

    updateScrollbarWidth();
    window.addEventListener('resize', updateScrollbarWidth);

    const handleScroll = (e: Event) => {
      // Only react to window/document or the main #root container scroll, 
      // ignoring small internal scrollable elements.
      const target = e.target as HTMLElement | Document;

      let currentScroll = window.scrollY;

      if (target instanceof Element) {
        // If it's a small container (not the root), ignore it
        if (target.id !== 'root' && target.tagName !== 'HTML' && target.tagName !== 'BODY') {
          return;
        }
        currentScroll = target.scrollTop;
      } else if (target instanceof Document) {
        currentScroll = target.documentElement.scrollTop || target.body.scrollTop;
      }

      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const lastScroll = lastScrollRef.current;

        if (currentScroll > lastScroll && currentScroll > 60) {
          setHeaderTranslate(-120); // Moved completely off-screen (-120px)
        } else if (currentScroll < lastScroll - 5 || currentScroll <= 30) {
          setHeaderTranslate(0);
        }

        lastScrollRef.current = currentScroll;
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', updateScrollbarWidth);
    };
  }, []);

  useEffect(() => {
    if (!showProfileMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showProfileMenu, setShowProfileMenu]);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>

      {/* Unified Main Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-transform duration-500 ease-in-out bg-transparent pt-4 pb-3 pr-2 sm:pr-4 md:pr-6"
        style={{ transform: `translateY(${headerTranslate}px)` }}
      >
        <div className="w-full flex items-center justify-between px-6 bg-transparent">
          {/* Left Section: Logo & Nav */}
          <div className="flex items-center gap-8 lg:gap-12">
            {/* Brand logo */}
            <div
              className="flex items-center gap-0 select-none cursor-pointer"
              onClick={() => {
                window.location.reload();
              }}
            >
              <BrandLogo className="w-10 h-12 -mr-1 drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]" />
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold tracking-tight hidden sm:block">
                  <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">Skill</span><span className="text-foreground/90">Swap</span>
                </span>
                <span className="text-[10px] font-semibold text-foreground">BETA</span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden lg:flex items-center gap-8">
              <a
                href="#top"
                onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`text-sm font-medium transition-colors ${activeSection === 'top' ? 'text-primary drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]' : 'text-foreground/80 hover:text-primary'}`}
              >
                {String(t("landing.nav.home"))}
              </a>
              <a
                href="#features"
                onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                className={`text-sm font-medium transition-colors ${activeSection === 'features' ? 'text-primary drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]' : 'text-foreground/80 hover:text-primary'}`}
              >
                {String(t("landing.nav.features"))}
              </a>
              <a
                href="#community"
                onClick={(e) => { e.preventDefault(); document.getElementById('community')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                className={`text-sm font-medium transition-colors ${activeSection === 'community' ? 'text-primary drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]' : 'text-foreground/80 hover:text-primary'}`}
              >
                {String(t("landing.nav.community"))}
              </a>
              <a
                href="#about"
                onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                className={`text-sm font-medium transition-colors ${activeSection === 'about' ? 'text-primary drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]' : 'text-foreground/80 hover:text-primary'}`}
              >
                {String(t("landing.nav.about"))}
              </a>
            </div>
          </div>

          {/* Top-right auth/profile buttons */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {!isLoggedIn ? (
              <>
                <button
                  onClick={onSignInClick}
                  className="px-5 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-xl border border-border hover:bg-primary/90 transition-all duration-300 hover:shadow-[0_0_18px_rgba(255,255,255,0.3)]"
                >
                  {String(t("landing.signIn"))}
                </button>
                <button
                  onClick={onSignUpClick}
                  className="px-5 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-xl border border-border hover:bg-primary/90 transition-all duration-300 hover:shadow-[0_0_18px_rgba(255,255,255,0.3)]"
                >
                  {String(t("landing.signUp"))}
                </button>
              </>
            ) : (
              <>
                {/* Search Bar */}
                <SearchBar placeholder={String(t("landing.searchPlaceholder"))} />

                {/* Messages Button (Icon) */}
                <div className="relative group/message z-50">
                  <button
                    onClick={onMessagesClick}
                    className="p-2 rounded-full border border-border bg-background/5 hover:bg-background/10 text-foreground/80 hover:text-foreground transition-all shadow-sm flex items-center justify-center relative cursor-pointer group"
                    title={String(t("landing.messages") || "الرسائل الخاصة")}
                  >
                    <MessageSquare size={20} />

                    {/* Notification Badge */}
                    <AnimatePresence>
                      {unreadCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full border-2 border-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>

                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <AnimatePresence>
                      {unreadSenders.length > 0 && (
                        <div className="relative w-full h-full opacity-0 group-hover/message:opacity-100 transition-opacity duration-300">
                          {unreadSenders.map((sender, i) => {
                            const total = unreadSenders.length;
                            // Adjacent clustering logic (Side-by-side at bottom)
                            const step = 32; // degrees between avatars
                            const maxSpan = 210;
                            const actualSpan = Math.min(maxSpan, (total - 1) * step);
                            const startAngle = 90 - (actualSpan / 2);
                            const angleDeg = total > 1 ? startAngle + (i / (total - 1)) * actualSpan : 90;
                            const angleRad = (angleDeg * Math.PI) / 180;

                            const r = 42;
                            const x = Math.cos(angleRad) * r;
                            const y = Math.sin(angleRad) * r;

                            return (
                              <motion.div
                                key={sender.id}
                                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                whileHover={{ scale: 1.3, zIndex: 100, transition: { duration: 0.2 } }}
                                animate={{
                                  opacity: 1,
                                  scale: 1,
                                  x: x,
                                  y: y,
                                  transition: {
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 25,
                                    delay: i * 0.03
                                  }
                                }}
                                exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                className="absolute left-1/2 top-1/2 -ml-3 -mt-3 w-6 h-6 rounded-full border border-primary/50 bg-background shadow-xl overflow-hidden pointer-events-auto cursor-pointer flex items-center justify-center transform-gpu"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSenderClick) onSenderClick(sender.id);
                                  else if (unreadCount > 0 && onMessagesClick) onMessagesClick();
                                }}
                              >
                                <img
                                  src={sender.avatar}
                                  alt="Sender"
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                  width="24"
                                  height="24"
                                />
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Icon-attached Toast */}
                  <AnimatePresence>
                    {latestMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.9, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 15, scale: 0.9, filter: "blur(4px)", pointerEvents: "none" }}
                        transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                        onClick={onMessagesClick}
                        className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-56 md:w-64 bg-card border border-primary/30 p-2.5 rounded-2xl shadow-2xl backdrop-blur-xl cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.15)]"
                        style={{ transformOrigin: "top center" }}
                      >
                        {/* Small arrow pointing up to the icon */}
                        <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 border-[7px] border-transparent border-b-primary/30" />
                        <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 border-[7.5px] border-transparent border-b-card" />

                        <div className="flex items-start gap-2.5 w-full">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                            <span className="text-primary font-bold text-xs">{latestMessage.senderName[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className="text-[13px] font-bold text-foreground mb-0.5 flex items-center justify-between gap-1.5 overflow-hidden w-full">
                              <span className="truncate">{latestMessage.senderName}</span>
                              <span className="text-[8px] text-primary/90 bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">New message</span>
                            </h4>
                            <p className="text-[10px] text-foreground/60 w-full line-clamp-2 leading-relaxed">{latestMessage.text}</p>
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl overflow-hidden pointer-events-none">
                          <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: "0%" }}
                            transition={{ duration: 5, ease: "linear" }}
                            className="h-full w-full bg-gradient-to-r from-cyan-400 via-primary to-indigo-500"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notifications Button (Bell Icon) */}
                <div className="relative group/notif z-50">
                  <button
                    className="p-2 rounded-full border border-border bg-background/5 hover:bg-background/10 text-foreground/80 hover:text-foreground transition-all shadow-sm flex items-center justify-center relative cursor-pointer group"
                    title="Notifications"
                    onClick={() => setShowNotifPanel(prev => !prev)}
                  >
                    <Bell size={20} />
                    {/* Notification Badge */}
                    <AnimatePresence>
                      {notificationCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                        >
                          {notificationCount > 99 ? '99+' : notificationCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>

                  {/* Circular Notification Actors on Hover (The Red Line Request) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <AnimatePresence>
                      {notifActors.length > 0 && (
                        <div className="relative w-full h-full opacity-0 group-hover/notif:opacity-100 transition-opacity duration-300">
                          {notifActors.map((actor, i) => {
                            const total = notifActors.length;
                            // Adjacent clustering logic (Side-by-side at bottom)
                            const step = 32; // degrees between avatars
                            const maxSpan = 210;
                            const actualSpan = Math.min(maxSpan, (total - 1) * step);
                            const startAngle = 90 - (actualSpan / 2);
                            const angleDeg = total > 1 ? startAngle + (i / (total - 1)) * actualSpan : 90;
                            const angleRad = (angleDeg * Math.PI) / 180;

                            const r = 42;
                            const x = Math.cos(angleRad) * r;
                            const y = Math.sin(angleRad) * r;

                            return (
                              <motion.div
                                key={`${actor.id}-${i}`}
                                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                whileHover={{ scale: 1.25, zIndex: 100 }}
                                animate={{
                                  opacity: 1,
                                  scale: 1,
                                  x: x,
                                  y: y,
                                  transition: {
                                    type: "spring",
                                    stiffness: 450,
                                    damping: 25,
                                    delay: i * 0.03
                                  }
                                }}
                                exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                className="absolute left-1/2 top-1/2 -ml-3 -mt-3 w-6 h-6 rounded-full border border-red-500/50 bg-background shadow-lg overflow-hidden pointer-events-auto cursor-pointer flex items-center justify-center transform-gpu"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowNotifPanel(true);
                                }}
                              >
                                <img
                                  src={actor.avatar}
                                  alt="Actor"
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                  width="24"
                                  height="24"
                                />
                                {actor.type === 'like' && <div className="absolute inset-0 bg-red-500/10" />}
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Notifications Dropdown Panel */}
                  <AnimatePresence>
                    {showNotifPanel && (
                      <NotificationsPanel
                        userId={userId}
                        notificationCount={notificationCount}
                        setNotificationCount={setNotificationCount || (() => { })}
                        onClose={() => setShowNotifPanel(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile Image with Dropdown */}
                <div className="relative" ref={profileMenuRef}>
                  {getAvatarUrl(userEmail) ? (
                    <img
                      src={getAvatarUrl(userEmail)}
                      alt="Profile"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail.split('@')[0])}&background=6366f1&color=fff&size=150`;
                        e.currentTarget.onerror = null;
                      }}
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="w-10 h-10 rounded-full border-2 border-border hover:border-border transition-colors duration-300 cursor-pointer"
                      loading="lazy"
                      decoding="async"
                      width="40"
                      height="40"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-border bg-muted animate-pulse" />
                  )}
                  {/* Profile Menu Dropdown */}
                  {showProfileMenu && (
                    <>
                      <div className="absolute top-full right-0 mt-2 z-50">
                        <ProfileMenu
                          onProfileClick={() => {
                            onProfileClick();
                            setShowProfileMenu(false);
                          }}
                          onSettingsClick={() => {
                            onSettingsClick();
                            setShowProfileMenu(false);
                          }}
                          onLogoutClick={() => {
                            onSignOutClick();
                            setShowProfileMenu(false);
                          }}
                          onFeedbackClick={() => {
                            setShowFeedbackModal(true);
                            setShowProfileMenu(false);
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div >
        </div >

        {/* Top border line - attached to bottom of header */}
        < div
          className="absolute bottom-0 left-0 right-0 h-[1px] pointer-events-none"
          style={{
            background: 'linear-gradient(to right, transparent, hsl(var(--border)), transparent)',
            boxShadow: '0 0 8px hsl(var(--foreground) / 0.15)',
          }
          }
        />
      </header >

      {/* Subtle ambient lighting effects for space theme */}
      < div
        className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] blur-[100px] opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)",
        }}
      />
      < div
        className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] blur-[120px] opacity-35 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(147, 51, 234, 0.35) 0%, transparent 70%)",
        }}
      />
      < div
        className="fixed top-[40%] right-[20%] w-[400px] h-[400px] blur-[90px] opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, transparent 70%)",
        }}
      />

      <HeroSection 
        isLoggedIn={isLoggedIn} 
        onStartClick={onStartClick} 
        scrollToFeatures={scrollToFeatures} 
      />

      <HowItWorks onStartClick={onStartClick} />

      <FeaturesSection t={t} />

      <SafetySection t={t} />

      <CommunitySection t={t} onStartClick={onStartClick} />

      {/* ═══════════ FEEDBACK MODAL ═══════════ */}
      <FeedbackModal 
        showFeedbackModal={showFeedbackModal}
        setShowFeedbackModal={setShowFeedbackModal}
        fbCategory={fbCategory}
        setFbCategory={setFbCategory}
        fbHoverRating={fbHoverRating}
        setFbHoverRating={setFbHoverRating}
        fbRating={fbRating}
        setFbRating={setFbRating}
        fbMessage={fbMessage}
        setFbMessage={setFbMessage}
        fbError={fbError}
        setFbError={setFbError}
        fbSuccess={fbSuccess}
        fbLoading={fbLoading}
        handleFeedbackSubmit={handleFeedbackSubmit}
        userId={userId}
        userEmail={userEmail}
      />

      {/* Modern Footer */}
      <Footer t={t} />
    </>
  );
}
