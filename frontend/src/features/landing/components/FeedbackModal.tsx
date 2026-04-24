import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  MessageSquare,
  Zap,
  Bug,
  Palette,
  Star,
  CheckCircle2,
  Send,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface FeedbackModalProps {
  showFeedbackModal: boolean;
  setShowFeedbackModal: (show: boolean) => void;
  fbCategory: string;
  setFbCategory: (cat: string) => void;
  fbHoverRating: number;
  setFbHoverRating: (rating: number) => void;
  fbRating: number;
  setFbRating: (rating: number) => void;
  fbMessage: string;
  setFbMessage: (msg: string) => void;
  fbError: string;
  setFbError: (err: string) => void;
  fbSuccess: boolean;
  fbLoading: boolean;
  handleFeedbackSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  userId?: string | null;
  userEmail?: string;
}

export const FeedbackModal = ({
  showFeedbackModal,
  setShowFeedbackModal,
  fbCategory,
  setFbCategory,
  fbHoverRating,
  setFbHoverRating,
  fbRating,
  setFbRating,
  fbMessage,
  setFbMessage,
  fbError,
  setFbError,
  fbSuccess,
  fbLoading,
  handleFeedbackSubmit,
  userId,
  userEmail,
}: FeedbackModalProps) => {
  const { t } = useLanguage();

  const categories = [
    { id: "general", icon: MessageSquare, label: String(t("landing:feedback.categories.general")) },
    { id: "feature", icon: Zap, label: String(t("landing:feedback.categories.feature")) },
    { id: "bug", icon: Bug, label: String(t("landing:feedback.categories.bug")) },
    { id: "design", icon: Palette, label: String(t("landing:feedback.categories.design")) },
    { id: "performance", icon: Zap, label: String(t("landing:feedback.categories.performance")) },
  ];

  const ratingLabel =
    fbRating > 0 ? String(t(`landing:feedback.ratings.${fbRating}`)) : "";

  return (
    <AnimatePresence>
      {showFeedbackModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFeedbackModal(false)}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-3xl overflow-hidden overflow-y-auto max-h-[90vh]"
          >
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />

            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black text-foreground">
                    {String(t("landing:feedback.titlePrefix"))}{" "}
                    <span className="text-indigo-400">
                      {String(t("landing:feedback.titleAccent"))}
                    </span>
                  </h2>
                  <p className="text-foreground/50 text-sm">
                    {String(t("landing:feedback.description"))}
                  </p>
                </div>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors text-foreground/40 hover:text-foreground"
                  aria-label={String(t("common:close"))}
                >
                  <ChevronDown className="w-6 h-6 rotate-180" />
                </button>
              </div>

              <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground/70 mb-3">
                    {String(t("landing:feedback.categoryLabel"))}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFbCategory(id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                          fbCategory === id
                            ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                            : "border-border bg-muted/40 text-foreground/60 hover:border-indigo-400/50 hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground/70 mb-3">
                    {String(t("landing:feedback.ratingLabel"))}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setFbHoverRating(star)}
                        onMouseLeave={() => setFbHoverRating(0)}
                        onClick={() => setFbRating(star)}
                        className="transition-all duration-150 hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors duration-150 ${
                            star <= (fbHoverRating || fbRating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-foreground/20"
                          }`}
                        />
                      </button>
                    ))}
                    {fbRating > 0 && (
                      <span className="ml-2 text-xs text-foreground/50 self-center">
                        {ratingLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground/70 mb-3">
                    {String(t("landing:feedback.messageLabel"))}
                  </label>
                  <div className="relative">
                    <textarea
                      value={fbMessage}
                      onChange={(e) => {
                        setFbMessage(e.target.value);
                        setFbError("");
                      }}
                      rows={4}
                      maxLength={1000}
                      placeholder={String(t("landing:feedback.messagePlaceholder"))}
                      className="w-full bg-muted/30 border border-border/60 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/30 text-sm leading-relaxed resize-none focus:outline-none focus:border-indigo-500/60 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <AnimatePresence>
                    {fbError && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-red-400 text-xs flex items-center gap-2"
                      >
                        <Bug className="w-4 h-4" /> {fbError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-foreground/30 italic">
                      {userId
                        ? String(t("landing:feedback.loggedInAs")).replace(
                            "{{email}}",
                            userEmail || "",
                          )
                        : String(t("landing:feedback.anonymous"))}
                    </p>
                    <AnimatePresence mode="wait">
                      {fbSuccess ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {String(t("landing:feedback.sent"))}
                        </motion.div>
                      ) : (
                        <motion.button
                          key="submit"
                          type="submit"
                          disabled={fbLoading}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-200"
                        >
                          {fbLoading ? (
                            <div className="flex items-center gap-0.5">
                              <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                              <div
                                className="w-1 h-1 rounded-full bg-white animate-pulse"
                                style={{ animationDelay: "150ms" }}
                              />
                              <div
                                className="w-1 h-1 rounded-full bg-white animate-pulse"
                                style={{ animationDelay: "300ms" }}
                              />
                            </div>
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          {fbLoading
                            ? String(t("landing:feedback.sending"))
                            : String(t("landing:feedback.submit"))}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
