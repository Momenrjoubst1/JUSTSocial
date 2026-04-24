import React from "react";
import { motion } from "framer-motion";
import { Palette, Music, Code2, Users } from "lucide-react";

export const CommunitySection = ({ t, onStartClick }: { t: any, onStartClick: () => void }) => {
  return (
    <section id="community" className="relative py-32 px-6 z-10 bg-gradient-to-b from-transparent to-background w-full flex flex-col items-center">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16 w-full">
        <div className="lg:w-1/2 space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-[#FFFFFF] leading-tight text-center lg:text-start">
            {(() => {
              const title = String(t("landing.cta.title"));
              const highlight = String(t("landing.cta.highlightWord"));
              if (!highlight || !title.includes(highlight)) return title;

              const parts = title.split(highlight);
              return (
                <>
                  {parts[0]}
                  <span className="text-[#A1A1A1]">{highlight}</span>
                  {parts.slice(1).join(highlight)}
                </>
              );
            })()}
          </h2>
          <p className="text-[#525252] text-xl leading-relaxed text-center lg:text-left">
            {String(t("landing.cta.description"))}
          </p>
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
            {/* Primary CTA button */}
            <button
              onClick={onStartClick}
              className="px-8 py-4 bg-[#FFFFFF] text-[#0A0A0A] font-bold rounded-2xl hover:bg-[#E2E2E2] hover:scale-105 transition-all duration-300 cursor-pointer relative z-20"
            >
              {String(t("landing.cta.button"))}
            </button>
            <div className="flex items-center gap-4 bg-[#161616] border border-[#262626] px-6 py-4 rounded-2xl cursor-default">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0A0A0A] bg-[#1F1F1F] flex items-center justify-center text-[10px] font-bold text-[#A1A1A1]">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-[#525252] text-sm font-medium">{String(t("landing.cta.onlineUsers"))}</span>
            </div>
          </div>
        </div>

        <div className="lg:w-1/2 grid grid-cols-2 gap-4">
          <div className="space-y-4 pt-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="h-64 rounded-3xl bg-[#161616] border border-[#262626] flex items-center justify-center p-8 text-center group hover:bg-[#1F1F1F] transition-all cursor-pointer shadow-lg"
            >
              <div>
                <Palette className="w-12 h-12 text-[#A1A1A1] mx-auto mb-4" />
                <h4 className="text-[#FFFFFF] font-bold">{String(t("landing.categories.artDesign"))}</h4>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="h-48 rounded-3xl bg-[#161616] border border-[#262626] flex items-center justify-center p-8 group hover:bg-[#1F1F1F] transition-all cursor-pointer shadow-lg"
            >
              <Music className="w-10 h-10 text-[#525252] group-hover:text-[#A1A1A1] transition-colors" />
            </motion.div>
          </div>
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="h-48 rounded-3xl bg-[#161616] border border-[#262626] flex items-center justify-center p-8 group hover:bg-[#1F1F1F] transition-all cursor-pointer shadow-lg"
            >
              <Code2 className="w-10 h-10 text-[#525252] group-hover:text-[#A1A1A1] transition-colors" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="h-64 rounded-3xl bg-[#161616] border border-[#262626] flex items-center justify-center p-8 text-center group hover:bg-[#1F1F1F] transition-all cursor-pointer shadow-lg"
            >
              <div>
                <Users className="w-12 h-12 text-[#A1A1A1] mx-auto mb-4" />
                <h4 className="text-[#FFFFFF] font-bold">{String(t("landing.categories.languages"))}</h4>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};