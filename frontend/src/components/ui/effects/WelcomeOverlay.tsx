import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import TextPressure from "./TextPressure";

interface WelcomeOverlayProps {
  isVisible: boolean;
  userName: string;
  onClose: () => void;
}

export function WelcomeOverlay({ isVisible, userName, onClose }: WelcomeOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="welcome-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer bg-[#0A0A0A] bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#0a0a0a_100%)] overflow-hidden"
          onClick={onClose}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="w-full max-w-[90vw] h-[40vh] flex items-center justify-center relative"
          >
            <TextPressure
              text={`Hellooo ${userName || "There"}`}
              flex={true}
              alpha={false}
              stroke={false}
              width={true}
              weight={true}
              italic={true}
              textColor="#ffffff"
              strokeColor="#ffffff"
              minFontSize={48}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-12 text-[#A1A1A1] text-sm md:text-base font-light tracking-[0.4em] uppercase text-center"
          >
            Welcome to JUST Social
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
