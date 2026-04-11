import React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export const SafetySection = ({ t }: { t: any }) => {
  return (
    <section className="relative py-24 px-6 z-10 w-full flex flex-col items-center bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent border-t border-indigo-500/20">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center gap-8 bg-card/80 border border-indigo-500/30 p-8 md:p-12 rounded-3xl backdrop-blur-xl shadow-2xl shadow-indigo-500/10"
        >
          <div className="flex-shrink-0 relative">
            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-30 rounded-full" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg border-4 border-background">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              {String(t("landing.safety.title")) || "Safe & Moderated by AI"}
            </h3>
            <p className="text-foreground/70 text-lg leading-relaxed">
              {String(t("landing.safety.desc")) || "Our platform takes immediate action against violators to ensure a safe learning environment using advanced AI moderation."}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};