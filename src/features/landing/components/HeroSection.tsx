import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RainbowButton, ShinyText } from "@/components/ui/effects";
import { Button } from "@/components/ui/core";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import SplitText from "@/components/ui/effects/SplitText";

const INTERVAL = 2000;

interface HeroSectionProps {
  isLoggedIn: boolean;
  onStartClick: () => void;
  scrollToFeatures: () => void;
}

export const HeroSection = ({ isLoggedIn, onStartClick, scrollToFeatures }: HeroSectionProps) => {
  const { t } = useLanguage();
  const [isFinished, setIsFinished] = useState(false);

  const handleAnimationComplete = () => {
    // Delay a bit before fading out so user can see it briefly
    setTimeout(() => {
      setIsFinished(true);
    }, 2500);
  };

  return (
    <section id="top" className="relative min-h-screen flex flex-col items-center justify-center w-full z-10 px-4">
      <AnimatePresence>
        {!isFinished && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center w-full relative z-20"
          >
            {/* JUST Social title via SplitText combined with ShinyText effect */}
            <div className="[&_.split-word:first-child]:font-bold [&_.split-word:last-child]:font-medium [&_.split-word:last-child]:opacity-80 mt-6 relative z-20">
              <ShinyText
                speed={3}
                color="#b5b5b5"
                shineColor="#ffffff"
                spread={120}
                direction="left"
                className="text-6xl md:text-8xl lg:text-9xl tracking-tighter"
              >
                <SplitText
                  text="JUST Social"
                  tag="span"
                  className=""
                  delay={80}
                  duration={1.8}
                  ease="power3.out"
                  splitType="chars"
                  from={{ opacity: 0, y: 40 }}
                  to={{ opacity: 1, y: 0 }}
                />
              </ShinyText>
            </div>

            {/* Subtitle via SplitText */}
            <SplitText
              text={String(t("landing.subtitle") || "Swap Skills · Grow Together · Connect with the World")}
              className="mt-6 text-sm md:text-base text-center font-light tracking-widest text-[#A1A1A1]"
              delay={60}
              duration={1.5}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 30 }}
              to={{ opacity: 1, y: 0 }}
              onLetterAnimationComplete={handleAnimationComplete}
            />

            {/* Minimalist Divider Animated */}
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "50rem", opacity: 1 }}
              transition={{ delay: 0.8, duration: 1, ease: "circOut" }}
              className="max-w-[95vw] h-px relative z-10 mt-8 mb-8 bg-[#262626]" 
            />

          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};