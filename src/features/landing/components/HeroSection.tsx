import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RainbowButton } from "@/components/ui/effects";
import { Button } from "@/components/ui/core";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const SparklesCore = lazy(() => import("@/components/ui/effects/sparkles").then(m => ({ default: m.SparklesCore })));

const words = ["Skill", "Design", "Code", "Music", "Art"];
const INTERVAL = 2000;

interface HeroSectionProps {
  isLoggedIn: boolean;
  onStartClick: () => void;
  scrollToFeatures: () => void;
}

export const HeroSection = ({ isLoggedIn, onStartClick, scrollToFeatures }: HeroSectionProps) => {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="top" className="relative min-h-screen flex flex-col items-center justify-center w-full z-10 px-4">
      {/* SkillSwap title */}
      <div className="relative z-20 flex items-center justify-center gap-3 md:gap-5">
        <div
          className="relative h-[1.2em] flex items-center justify-center overflow-visible"
          style={{ minWidth: "clamp(180px, 35vw, 420px)" }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={words[index]}
              initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute whitespace-nowrap text-6xl md:text-8xl lg:text-9xl font-bold bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent"
            >
              {words[index]}
            </motion.span>
          </AnimatePresence>
        </div>
        <span className="text-6xl md:text-8xl lg:text-9xl font-bold text-foreground">
          Swap
        </span>
      </div>

      {/* Subtitle */}
      <p className="relative z-20 mt-3 text-sm md:text-base text-center font-light tracking-widest text-foreground/40">
        {String(t("landing.subtitle"))}
      </p>

      {/* Sparkles cloud below the gradient line */}
      <div className="w-[50rem] max-w-[95vw] h-52 relative z-10 overflow-visible">
        {/* Gradient accent lines */}
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm z-10" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4 z-10" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm z-10" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4 z-10" />

        {/* Particles with cloud-shaped radial mask */}
        <div
          className="absolute inset-0"
          style={{
            maskImage: "radial-gradient(ellipse 70% 80% at 50% 0%, white 0%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 80% at 50% 0%, white 0%, transparent 100%)",
          }}
        >
          <Suspense fallback={null}>
            <SparklesCore
              id="skillswap-sparkles"
              background="transparent"
              minSize={0.3}
              maxSize={1.2}
              particleDensity={1200}
              className="w-full h-full"
              particleColor="#a8c5f0"
              speed={0.5}
            />
          </Suspense>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="relative z-20 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <RainbowButton onClick={onStartClick}>{String(t("landing.start"))}</RainbowButton>
        <Button
          variant="outline"
          size="lg"
          onClick={scrollToFeatures}
          rightIcon={<ArrowRight size={18} />}
        >
          {String(t("landing.learnMore") || "Learn More")}
        </Button>
      </div>

      <div className="relative z-20 mt-4 flex flex-col items-center justify-center gap-2">
        <p className="text-foreground/50 text-xs font-light tracking-wide text-center">
          {isLoggedIn
            ? String(t("landing.connectNew"))
            : String(t("landing.signInHint"))}
        </p>
      </div>

      {/* Scroll indicator for hero */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        onClick={scrollToFeatures}
        className="absolute bottom-10 flex flex-col items-center gap-2 cursor-pointer text-foreground/20 hover:text-foreground/50 transition-colors z-20"
      >
        <span className="text-[10px] tracking-[0.2em] uppercase font-medium">{String(t("landing.exploreFeatures"))}</span>
        <ChevronDown className="w-5 h-5" />
      </motion.div>
    </section>
  );
};