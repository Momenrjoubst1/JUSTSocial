import React from "react";
import { motion } from "framer-motion";
import { Icon as LucideIcon } from "@/components/ui/core";

interface FeatureItemProps {
  icon: any;
  title: string;
  description: string;
  index: number;
  gradient: string;
}

export const FeatureItem = ({ icon: Icon, title, description, index, gradient }: FeatureItemProps) => {
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
          className="w-full h-full origin-top bg-gradient-to-b from-indigo-500/30 via-purple-500/20 to-transparent"
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
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-indigo-500/20`}>
          <span className="text-foreground text-sm font-bold">{String(index + 1).padStart(2, '0')}</span>
        </div>
      </motion.div>

      {/* Content wrapper */}
      <div className={`w-full flex flex-col lg:flex-row items-center gap-6 lg:gap-0 ${isEven ? '' : 'lg:flex-row-reverse'}`}>
        {/* Card side */}
        <div className={`w-full lg:w-[calc(50%-40px)] ${isEven ? 'lg:pr-4' : 'lg:pl-4'}`}>
          <motion.div
            initial={{ opacity: 0, x: isEven ? -80 : 80, rotateY: isEven ? -8 : 8 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="group relative p-8 rounded-3xl bg-card/80 border border-border/50 backdrop-blur-xl overflow-visible transition-all duration-500 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer"
            style={{ perspective: "1000px" }}
          >
            {/* Animated gradient border on hover */}
            <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10 blur-xl bg-gradient-to-br ${gradient}`} style={{ margin: "-1px" }} />

            {/* Glow effect */}
            <motion.div
              className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-700 blur-3xl`}
            />

            {/* Top accent */}
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className={`absolute top-0 left-0 h-[2px] bg-gradient-to-r ${gradient}`}
            />

            {/* Content */}
            <div className="relative z-10 flex items-start gap-5">
              {/* Icon */}
              <motion.div
                whileHover={{ rotate: [0, -10, 10, -5, 5, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-500`}
              >
                <LucideIcon icon={Icon} size={28} className="text-foreground" strokeWidth={1.5} />
              </motion.div>

              <div className="flex-1 min-w-0">
                {/* Mobile number badge */}
                <div className={`lg:hidden inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r ${gradient} text-foreground text-[10px] font-bold mb-2`}>
                  #{String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-foreground transition-colors duration-300">{title}</h3>
                <p className="text-foreground/45 text-sm leading-relaxed group-hover:text-foreground/65 transition-colors duration-300">{description}</p>
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