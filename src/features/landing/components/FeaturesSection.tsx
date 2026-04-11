import React from "react";
import { motion } from "framer-motion";
import { Zap, Video, MessageSquare, Code2, Gamepad2, Shield, Rocket } from "lucide-react";
import { FeatureItem } from "./FeatureItem";

const featureGradients = [
  "from-indigo-500 to-blue-600",
  "from-cyan-500 to-teal-600",
  "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-green-600",
  "from-rose-500 to-red-600",
  "from-violet-500 to-fuchsia-600",
];

export const FeaturesSection = ({ t }: { t: any }) => {
  return (
    <section id="features" className="relative min-h-screen py-32 px-6 z-10 w-full flex flex-col items-center overflow-visible">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col items-center text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-indigo-500/20 text-primary-foreground text-xs font-bold tracking-widest uppercase mb-6"
          >
            <Zap className="w-3.5 h-3.5" />
            {String(t("landing.nav.features"))}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight"
          >
            {String(t("landing.features.title")).split(String(t("landing.features.highlightWord")))[0]}
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              {String(t("landing.features.highlightWord"))}
            </span>
            {String(t("landing.features.title")).split(String(t("landing.features.highlightWord")))[1] || ""}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-foreground/40 text-lg max-w-2xl mx-auto"
          >
            {String(t("landing.features.description"))}
          </motion.p>
        </div>

        {/* Animated Timeline Features */}
        <div className="relative">
          <FeatureItem
            icon={Video}
            title={String(t("landing.feature.video"))}
            description={String(t("landing.feature.videoDesc"))}
            index={0}
            gradient={featureGradients[0]}
          />
          <FeatureItem
            icon={MessageSquare}
            title={String(t("landing.feature.chat"))}
            description={String(t("landing.feature.chatDesc"))}
            index={1}
            gradient={featureGradients[1]}
          />
          <FeatureItem
            icon={Code2}
            title={String(t("landing.feature.workspace"))}
            description={String(t("landing.feature.workspaceDesc"))}
            index={2}
            gradient={featureGradients[2]}
          />
          <FeatureItem
            icon={Gamepad2}
            title={String(t("landing.feature.games"))}
            description={String(t("landing.feature.gamesDesc"))}
            index={3}
            gradient={featureGradients[3]}
          />
          <FeatureItem
            icon={Shield}
            title={String(t("landing.feature.security"))}
            description={String(t("landing.feature.securityDesc"))}
            index={4}
            gradient={featureGradients[4]}
          />
          <FeatureItem
            icon={Rocket}
            title={String(t("landing.feature.community"))}
            description={String(t("landing.feature.communityDesc"))}
            index={5}
            gradient={featureGradients[5]}
          />
        </div>
      </div>
    </section>
  );
};