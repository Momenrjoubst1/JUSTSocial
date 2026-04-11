import React from "react";
import { TwitterIcon, InstagramIcon, LinkedInIcon, GitHubIcon } from "@/components/ui/core";

export const Footer = ({ t }: { t: any }) => {
  return (
    <footer id="about" className="relative z-10 py-20 border-t border-border bg-background w-full flex flex-col items-center">
      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" className="w-10 h-12 -mr-1 drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]">
                <defs>
                  <filter id="neonGlowFooter" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path d="M 120 40 L 60 160 L 95 160 L 70 260 L 140 130 L 105 130 Z"
                  fill="none"
                  stroke="#00d2ff"
                  strokeWidth="4"
                  filter="url(#neonGlowFooter)" />
              </svg>
              <span className="text-2xl font-bold text-foreground tracking-tight">SkillSwap</span>
            </div>
            <p className="text-foreground/40 max-w-sm leading-relaxed">
              {String(t("landing.footer.tagline"))}
            </p>
            <div className="flex gap-4">
              {[
                { icon: <TwitterIcon />, href: "https://x.com/RjoubMomen57135", color: "hover:text-sky-400" },
                { icon: <InstagramIcon />, href: "https://www.instagram.com/momenrjoub/", color: "hover:text-pink-500" },
                { icon: <LinkedInIcon />, href: "https://www.linkedin.com/in/momen-rjoub-9a5ab5371", color: "hover:text-blue-500" },
                { icon: <GitHubIcon />, href: "https://github.com/Momenrjoubst1", color: "hover:text-foreground" }
              ].map((social, idx) => (
                <a key={idx} href={social.href} target="_blank" rel="noopener noreferrer" className={`text-foreground/30 transition-colors ${social.color}`}>
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-foreground font-bold mb-6">{String(t("landing.footer.product"))}</h4>
            <ul className="space-y-4 text-foreground/40 text-sm">
              <li><a href="#features" className="hover:text-primary-foreground transition-colors">{String(t("landing.footer.features"))}</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">{String(t("landing.footer.safety"))}</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">{String(t("landing.footer.enterprise"))}</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">{String(t("landing.footer.roadmap"))}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-bold mb-6">{String(t("landing.footer.company"))}</h4>
            <ul className="space-y-4 text-foreground/40 text-sm">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">{String(t("landing.footer.about"))}</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">{String(t("landing.footer.privacy"))}</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">{String(t("landing.footer.terms"))}</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">{String(t("landing.footer.contact"))}</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-foreground/20 text-xs tracking-widest uppercase">
            {String(t("landing.footer.copyright"))}
          </p>
          <div className="flex gap-8 text-[10px] tracking-widest text-foreground/20 uppercase font-bold">
            <a href="#" className="hover:text-foreground/60 transition-colors">{String(t("landing.footer.privacyLink"))}</a>
            <a href="#" className="hover:text-foreground/60 transition-colors">{String(t("landing.footer.termsLink"))}</a>
            <a href="#" className="hover:text-foreground/60 transition-colors">{String(t("landing.footer.cookiesLink"))}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};