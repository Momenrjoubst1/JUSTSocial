import React from "react";
import { motion } from "framer-motion";
import { Video, MessageSquare, Users } from "lucide-react";
import { RainbowButton } from "@/components/ui/effects";
import { useLanguage } from "@/context/LanguageContext";

interface HowItWorksProps {
  onStartClick: () => void;
}

export const HowItWorks = ({ onStartClick }: HowItWorksProps) => {
  const { t } = useLanguage();

  return (
    <section className="relative py-24 px-6 z-10 w-full flex flex-col items-center border-y border-[#262626]">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          {/* Left side: Video Chat Preview UI */}
          <div className="w-full lg:w-1/2 relative flex justify-center lg:justify-start">
            {/* OmeTV-style Chat Window Concept */}
            <motion.div
              initial={{ opacity: 0, rotateY: 15, x: -50 }}
              whileInView={{ opacity: 1, rotateY: 0, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, type: "spring" }}
              className="relative z-10 w-full max-w-lg aspect-[4/3] bg-[#161616] border border-[#262626] rounded-3xl shadow-2xl overflow-visible group"
            >
              {/* Main Remote Video */}
              <img
                src="/girl_chat.webp"
                alt="Remote User Talking"
                className="w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105 rounded-3xl"
              />

              {/* Local Video (Guy/Person) - PIP */}
              <div className="absolute bottom-4 end-4 w-1/3 aspect-[3/4] sm:aspect-video rounded-xl overflow-hidden bg-[#0A0A0A] border border-[#262626] shadow-2xl z-20 transition-transform duration-300 hover:scale-105 cursor-pointer">
                <img
                  src="/guy_chat.webp"
                  alt="Local User"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-[#262626] rounded-xl pointer-events-none" />
              </div>

              {/* Status Overlay */}
              <div className="absolute top-4 start-4 flex items-center gap-2 bg-[#0A0A0A]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#262626]">
                <div className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
                <span className="text-[#A1A1A1] text-xs font-medium">Live Connection</span>
              </div>

              {/* Call Controls Overlay */}
              <div className="absolute bottom-4 start-4 flex gap-3 z-20">
                <div className="bg-[#0A0A0A]/80 hover:bg-[#1F1F1F] transition-colors backdrop-blur-md w-10 h-10 rounded-full border border-[#262626] flex items-center justify-center text-[#A1A1A1] cursor-pointer">
                  <Video className="w-4 h-4" />
                </div>
                <div className="bg-[#0A0A0A]/80 hover:bg-[#1F1F1F] transition-colors backdrop-blur-md w-10 h-10 rounded-full border border-[#262626] flex items-center justify-center text-[#A1A1A1] cursor-pointer">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right side: Connection Steps */}
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1F1F1F] border border-[#262626] text-[#A1A1A1] text-xs font-bold uppercase tracking-widest"
            >
              <Users className="w-3.5 h-3.5" />
              {String(t("landing.howItWorks.title"))}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-bold text-[#FFFFFF] leading-tight"
            >
              {String(t("landing.howItWorks.subtitle"))}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-[#525252] text-lg max-w-xl"
            >
              {String(t("landing.howItWorks.description"))}
            </motion.p>

            <div className="flex flex-col gap-4 w-full max-w-xl mt-2 relative before:absolute before:inset-inline-start-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-[#262626] before:to-transparent before:hidden md:before:block">
              {/* Step 1 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-start p-4 rounded-2xl bg-[#161616] border border-[#262626] hover:border-[#3a3a3a] hover:bg-[#1F1F1F] transition-all z-10 shadow-lg"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1F1F1F] border border-[#262626] flex items-center justify-center text-[#FFFFFF] font-bold text-lg relative z-10">1</div>
                <div className="pt-2">
                  <h4 className="text-lg font-bold text-[#FFFFFF] mb-1">{String(t("landing.howItWorks.step1.title"))}</h4>
                  <p className="text-[#525252] text-sm leading-relaxed">{String(t("landing.howItWorks.step1.desc"))}</p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-start p-4 rounded-2xl bg-[#161616] border border-[#262626] hover:border-[#3a3a3a] hover:bg-[#1F1F1F] transition-all z-10 shadow-lg"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1F1F1F] border border-[#262626] flex items-center justify-center text-[#FFFFFF] font-bold text-lg relative z-10">2</div>
                <div className="pt-2">
                  <h4 className="text-lg font-bold text-[#FFFFFF] mb-1">{String(t("landing.howItWorks.step2.title"))}</h4>
                  <p className="text-[#525252] text-sm leading-relaxed">{String(t("landing.howItWorks.step2.desc"))}</p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-start p-4 rounded-2xl bg-[#161616] border border-[#262626] hover:border-[#3a3a3a] hover:bg-[#1F1F1F] transition-all z-10 shadow-lg"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1F1F1F] border border-[#262626] flex items-center justify-center text-[#FFFFFF] font-bold text-lg relative z-10">3</div>
                <div className="pt-2">
                  <h4 className="text-lg font-bold text-[#FFFFFF] mb-1">{String(t("landing.howItWorks.step3.title"))}</h4>
                  <p className="text-[#525252] text-sm leading-relaxed">{String(t("landing.howItWorks.step3.desc"))}</p>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-4 w-full flex justify-center lg:justify-start"
            >
              <div onClick={onStartClick} className="cursor-pointer">
                <RainbowButton>
                  <span className="flex items-center gap-2 px-2">
                    <Video className="w-5 h-5" />
                    {String(t("landing.howItWorks.cta"))}
                  </span>
                </RainbowButton>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};