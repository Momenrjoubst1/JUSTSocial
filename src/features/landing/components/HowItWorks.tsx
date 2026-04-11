import React from "react";
import { motion } from "framer-motion";
import { Video, MessageSquare, Users } from "lucide-react";
import { RainbowButton } from "@/components/ui/effects";

interface HowItWorksProps {
  onStartClick: () => void;
}

export const HowItWorks = ({ onStartClick }: HowItWorksProps) => {
  return (
    <section className="relative py-24 px-6 z-10 w-full flex flex-col items-center bg-gradient-to-b from-transparent via-indigo-950/10 to-transparent border-y border-border">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          {/* Left side: Video Chat Preview UI */}
          <div className="w-full lg:w-1/2 relative flex justify-center lg:justify-start">
            {/* Decorative Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/20 blur-[100px] rounded-full z-0 opacity-50" />

            {/* OmeTV-style Chat Window Concept */}
            <motion.div
              initial={{ opacity: 0, rotateY: 15, x: -50 }}
              whileInView={{ opacity: 1, rotateY: 0, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, type: "spring" }}
              className="relative z-10 w-full max-w-lg aspect-[4/3] bg-background/40 border border-border rounded-3xl backdrop-blur-xl shadow-2xl overflow-visible group"
            >
              {/* Main Remote Video (Girl/Woman) */}
              <img
                src="/girl_chat.webp"
                alt="Remote User Talking"
                className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
              />

              {/* Local Video (Guy/Person) - PIP */}
              <div className="absolute bottom-4 right-4 w-1/3 aspect-[3/4] sm:aspect-video rounded-xl overflow-hidden bg-background border border-indigo-500/30 shadow-2xl z-20 transition-transform duration-300 hover:scale-105 cursor-pointer">
                <img
                  src="/guy_chat.webp"
                  alt="Local User"
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-border rounded-xl pointer-events-none" />
              </div>

              {/* Status Overlays */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-border">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-foreground text-xs font-medium">Live Connection</span>
              </div>

              {/* Call Controls Overlay */}
              <div className="absolute bottom-4 left-4 flex gap-3 z-20">
                <div className="bg-background/40 hover:bg-background/60 transition-colors backdrop-blur-md w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground cursor-pointer"><Video className="w-4 h-4" /></div>
                <div className="bg-background/40 hover:bg-background/60 transition-colors backdrop-blur-md w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground cursor-pointer"><MessageSquare className="w-4 h-4" /></div>
              </div>
            </motion.div>
          </div>

          {/* Right side: Connection Steps */}
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest"
            >
              <Users className="w-3.5 h-3.5" />
              HOW IT WORKS
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-bold text-foreground leading-tight"
            >
              Not just for learning, but <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">For Fun too!</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-foreground/60 text-lg max-w-xl"
            >
              Start video chatting with enthusiasts around the world. It's not just about exchanging skills—it's about making friends, having fun, and meeting new people! Connect in 3 simple steps.
            </motion.p>

            <div className="flex flex-col gap-4 w-full max-w-xl mt-2 relative before:absolute before:left-6 md:before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500/50 before:to-purple-500/50 before:hidden md:before:block">
              {/* Step 1 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left p-4 rounded-2xl bg-card border border-border/50 hover:border-indigo-500/30 hover:bg-card/80 transition-all z-10 shadow-lg"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-foreground font-bold text-lg shadow-[0_0_15px_rgba(99,102,241,0.4)] relative z-10 border-4 border-background">1</div>
                <div className="pt-2">
                  <h4 className="text-lg font-bold text-foreground mb-1">Sign Up</h4>
                  <p className="text-foreground/50 text-sm leading-relaxed">Register your free account to access features.</p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left p-4 rounded-2xl bg-card border border-border/50 hover:border-cyan-500/30 hover:bg-card/80 transition-all z-10 shadow-lg"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-foreground font-bold text-lg shadow-[0_0_15px_rgba(6,182,212,0.4)] relative z-10 border-4 border-background">2</div>
                <div className="pt-2">
                  <h4 className="text-lg font-bold text-foreground mb-1">Click Start</h4>
                  <p className="text-foreground/50 text-sm leading-relaxed">Hit the start button to quickly match with someone.</p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left p-4 rounded-2xl bg-card border border-border/50 hover:border-purple-500/30 hover:bg-card/80 transition-all z-10 shadow-lg"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-foreground font-bold text-lg shadow-[0_0_15px_rgba(168,85,247,0.4)] relative z-10 border-4 border-background">3</div>
                <div className="pt-2">
                  <h4 className="text-lg font-bold text-foreground mb-1">Start Talking</h4>
                  <p className="text-foreground/50 text-sm leading-relaxed">Turn on your camera and microphone, chat and start exchanging skills!</p>
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
                    Start Chatting Now
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