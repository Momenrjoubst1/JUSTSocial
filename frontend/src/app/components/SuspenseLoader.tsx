import { motion } from "framer-motion";

export function SuspenseLoader() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[9999]">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-3xl bg-primary/10 backdrop-blur-3xl border border-primary/20 flex items-center justify-center relative overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="40 20 140 260" className="w-12 h-12">
            <path
              d="M 120 40 L 60 160 L 95 160 L 70 260 L 140 130 L 105 130 Z"
              fill="none"
              stroke="#7c3aed"
              strokeWidth="12"
              strokeLinejoin="round"
              className="suspense-loader-path"
            />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-50" />
        </div>

        <div className="absolute -inset-4 border border-primary/30 rounded-[2.5rem] pointer-events-none suspense-loader-ring" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 flex flex-col items-center"
      >
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-foreground/80">
          JUST Social
        </h2>
        <div className="mt-4 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-primary suspense-loader-dot" />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
