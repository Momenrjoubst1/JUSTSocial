import React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export const SafetySection = ({ t }: { t: any }) => {
  return (
    <section className="relative py-24 px-6 z-10 w-full flex flex-col items-center border-t border-[#262626]">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center gap-8 bg-[#161616] border border-[#262626] p-8 md:p-12 rounded-3xl shadow-2xl"
        >
          <div className="flex-shrink-0 relative">
            <div className="relative w-24 h-24 bg-[#1F1F1F] border border-[#262626] rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-12 h-12 text-[#A1A1A1]" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-start">
            <h3 className="text-3xl font-bold text-[#FFFFFF] mb-4">
              {String(t("landing.safety.title")) || "Safe & Moderated by AI"}
            </h3>
            <p className="text-[#A1A1A1] text-lg leading-relaxed">
              {String(t("landing.safety.desc")) || "Our platform takes immediate action against violators to ensure a safe learning environment using advanced AI moderation."}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};