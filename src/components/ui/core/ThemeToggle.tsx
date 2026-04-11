import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "./Button";
import { LazyIcon } from "./IconSystem";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 hover:bg-primary/10"
            aria-label="Toggle theme"
        >
            <AnimatePresence mode="wait" initial={false}>
                {theme === "dark" ? (
                    <motion.div
                        key="moon"
                        initial={{ y: 20, opacity: 0, rotate: 45 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: -20, opacity: 0, rotate: -45 }}
                        transition={{ duration: 0.3, ease: "backOut" }}
                        className="text-primary drop-shadow-[0_0_8px_rgba(120,119,198,0.5)]"
                    >
                        <LazyIcon name="moon" size={20} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="sun"
                        initial={{ y: 20, opacity: 0, rotate: 45 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: -20, opacity: 0, rotate: -45 }}
                        transition={{ duration: 0.3, ease: "backOut" }}
                        className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    >
                        <LazyIcon name="sun" size={20} />
                    </motion.div>
                )}
            </AnimatePresence>
        </Button>
    );
}
