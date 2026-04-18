import React from "react";
import { motion } from "framer-motion";
import { Icon as LucideIcon } from "@/components/ui/core";

interface FeatureItemProps {
  icon: any;
  title: string;
  description: string;
  index: number;
  gradient: string; // kept for API compatibility but used minimally
}

export const FeatureItem = ({ icon: Icon, title, description, index }: FeatureItemProps) => {
  const isEven = index % 2 === 0;

  return (
    <div className="relative flex items-center w-full mb-8 last:mb-0">
      {/* Timeline connector line (hidden on mobile) */}
      <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 z-0">
        <motion.div
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full h-full origin-top bg-gradient-to-b from-[#262626] to-transparent"
        />
      </div>

      {/* Timeline dot (hidden on mobile) */}
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.3, type: "spring", stiffness: 200 }}
        className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full items-center justify-center"
      >
        <div className="w-12 h-12 rounded-full bg-[#1F1F1F] border border-[#262626] flex items-center justify-center shadow-lg">
          <span className="text-[#A1A1A1] text-sm font-bold">{String(index + 1).padStart(2, '0')}</span>
        </div>
      </motion.div>

      {/* Content wrapper */}
      <div className={`w-full flex flex-col lg:flex-row items-center gap-6 lg:gap-0 ${isEven ? '' : 'lg:flex-row-reverse'}`}>
        {/* Card side */}
        <div className={`w-full lg:w-[calc(50%-40px)] ${isEven ? 'lg:pr-4' : 'lg:pl-4'}`}>
          <motion.div
            initial={{ opacity: 0, x: isEven ? -80 : 80 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="group relative p-8 rounded-3xl bg-[#161616] border border-[#262626] overflow-visible transition-all duration-500 hover:border-[#3a3a3a] hover:bg-[#1F1F1F] cursor-pointer"
          >
            {/* Top accent line */}
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="absolute top-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-[#525252] to-transparent"
            />

            {/* Content */}
            <div className="relative z-10 flex items-start gap-5">
              {/* Icon */}
              <motion.div
                whileHover={{ rotate: [0, -10, 10, -5, 5, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#1F1F1F] border border-[#262626] flex items-center justify-center shadow-lg group-hover:border-[#3a3a3a] transition-colors duration-500"
              >
                <LucideIcon icon={Icon} size={28} className="text-[#A1A1A1]" strokeWidth={1.5} />
              </motion.div>

              <div className="flex-1 min-w-0">
                {/* Mobile number badge */}
                <div className="lg:hidden inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1F1F1F] border border-[#262626] text-[#525252] text-[10px] font-bold mb-2">
                  #{String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="text-xl font-bold text-[#FFFFFF] mb-2">{title}</h3>
                <p className="text-[#525252] text-sm leading-relaxed group-hover:text-[#A1A1A1] transition-colors duration-300">{description}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Spacer for the other side (hidden on mobile) */}
        <div className="hidden lg:block lg:w-20 flex-shrink-0" />
        <div className="hidden lg:block lg:w-[calc(50%-40px)]" />
      </div>
    </div>
  );
};