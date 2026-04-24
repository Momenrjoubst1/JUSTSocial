import React, { lazy, Suspense } from "react";
import { Button, LazyIcon, ThemeToggle } from "@/components/ui/core";
import { motion, AnimatePresence } from "framer-motion";
import { LANGUAGE_OPTIONS } from "@/features/settings/constants";
import { useSettingsPageController } from "@/features/settings/hooks/useSettingsPageController";

const SecurityStats = lazy(() =>
  import("@/features/chat/components/security/SecurityStats").then((m) => ({
    default: m.SecurityStats,
  })),
);

export default function SettingsPage() {
  const {
    activeTab,
    confirmPanicPin,
    emergencyContact,
    fingerprint,
    goBack,
    handleSavePanicPin,
    isBackedUp,
    isSavingPanic,
    language,
    panicError,
    panicPin,
    panicSuccess,
    selectLanguage,
    selectTheme,
    setActiveTab,
    setConfirmPanicPin,
    setEmergencyContact,
    setPanicPin,
    t,
    theme,
  } = useSettingsPageController();

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background text-foreground z-10 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] pointer-events-none" />

      <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-border/50 bg-background/80 backdrop-blur-xl flex flex-col flex-shrink-0 sticky top-0 z-20 shadow-sm md:h-screen overflow-hidden">
        <div className="p-6 pb-2">
          <Button
            variant="ghost"
            onClick={goBack}
            className="mb-6 pl-0 hover:bg-transparent opacity-70 hover:opacity-100 flex items-center px-0"
          >
            <LazyIcon name="arrowLeft" size={18} className="mr-2" />
            {String(t("settings.back") || "Back")}
          </Button>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            {String(t("settings.title") || "Settings")}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {String(t("settings.subtitle") || "Manage your site preferences")}
          </p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-x-auto md:overflow-y-auto flex md:block pb-4 hide-scrollbar">
          <TabButton
            active={activeTab === "security"}
            onClick={() => setActiveTab("security")}
            icon="shieldCheck"
            label={String(t("settings:tabs.security"))}
          />
          <TabButton
            active={activeTab === "preferences"}
            onClick={() => setActiveTab("preferences")}
            icon="sliders"
            label={String(t("settings:tabs.preferences"))}
          />
          <TabButton
            active={activeTab === "panic"}
            onClick={() => setActiveTab("panic")}
            icon="alertTriangle"
            label={String(t("settings:tabs.panic"))}
            isDanger
          />
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[calc(100vh-200px)] md:h-screen relative z-10">
        <div className="max-w-4xl mx-auto p-6 md:p-10 lg:p-14 mb-20">
          <AnimatePresence mode="wait">
            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-10"
              >
                <div className="space-y-2 mb-8 border-b border-border/50 pb-6">
                  <h2 className="text-2xl font-bold">
                    {String(t("settings:security.sectionTitle"))}
                  </h2>
                  <p className="text-muted-foreground">
                    {String(t("settings:security.sectionDescription"))}
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 md:p-8 shadow-sm">
                  <div className="absolute -top-10 -right-10 p-8 opacity-5">
                    <LazyIcon
                      name="shieldCheck"
                      size={240}
                      className="text-emerald-500"
                    />
                  </div>
                  <div className="relative z-10 flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                      <LazyIcon
                        name="lock"
                        size={20}
                        className="text-emerald-500"
                      />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-lg flex items-center gap-2">
                        {String(t("settings:security.encryptionTitle"))}
                        <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                          {String(t("settings:security.statusActive"))}
                        </span>
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                        {String(t("settings:security.encryptionDescription"))}
                      </p>
                    </div>
                  </div>
                  {fingerprint && (
                    <div className="relative z-10 mb-6 bg-black/10 dark:bg-black/40 p-5 rounded-2xl border border-border/50">
                      <h4 className="text-[11px] font-bold text-foreground opacity-60 uppercase mb-2 tracking-widest">
                        {String(t("settings:security.fingerprintLabel"))}
                      </h4>
                      <p className="font-mono text-xs md:text-sm tracking-widest break-all text-emerald-600 dark:text-emerald-400 select-all">
                        {fingerprint}
                      </p>
                    </div>
                  )}
                  <div className="relative z-10 flex items-center gap-2 pt-5 border-t border-emerald-500/10">
                    {isBackedUp ? (
                      <>
                        <LazyIcon
                          name="check"
                          size={16}
                          className="text-emerald-500"
                        />
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {String(t("settings:security.keysBackedUp"))}
                        </span>
                      </>
                    ) : (
                      <>
                        <LazyIcon
                          name="uploadCloud"
                          size={16}
                          className="text-amber-500"
                        />
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          {String(t("settings:security.keysSyncing"))}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card/50 p-6 md:p-8 shadow-sm">
                  <div className="flex items-start gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <LazyIcon name="activity" size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-lg">
                        {String(t("settings:security.dashboardTitle"))}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        {String(t("settings:security.dashboardDescription"))}
                      </p>
                    </div>
                  </div>
                  <Suspense
                    fallback={
                      <div className="animate-pulse bg-muted/30 rounded-3xl h-64 w-full" />
                    }
                  >
                    <SecurityStats isDark={theme === "dark"} />
                  </Suspense>
                </div>
              </motion.div>
            )}

            {activeTab === "preferences" && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-10"
              >
                <div className="space-y-2 mb-8 border-b border-border/50 pb-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {String(t("settings:preferences.sectionTitle"))}
                    </h2>
                    <p className="text-muted-foreground">
                      {String(t("settings:preferences.sectionDescription"))}
                    </p>
                  </div>
                  <ThemeToggle />
                </div>

                <div className="rounded-3xl border border-border bg-card/50 p-6 md:p-8 shadow-sm">
                  <div className="flex items-start gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <LazyIcon name="globe" size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-lg">
                        {String(t("settings.languageTitle") || "Site Language")}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        {String(
                          t("settings.languageDescription") ||
                            "Choose the language used across the website interface.",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    {LANGUAGE_OPTIONS.map((option) => (
                      <LanguageButton
                        key={option.value}
                        label={String(t(option.labelKey) || option.fallbackLabel)}
                        active={language === option.value}
                        onClick={() => selectLanguage(option.value)}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card/50 p-6 md:p-8 shadow-sm">
                  <div className="flex items-start gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <LazyIcon name="sliders" size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-lg">
                        {String(t("settings.themeTitle") || "Theme")}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1 mb-4">
                        {String(
                          t("settings.themeDescription") ||
                            "Choose the visual mode for the website.",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    <LanguageButton
                      label={String(t("settings.themeDark") || "Dark")}
                      active={theme === "dark"}
                      onClick={() => selectTheme("dark")}
                    />
                    <LanguageButton
                      label={String(t("settings.themeLight") || "Light")}
                      active={theme === "light"}
                      onClick={() => selectTheme("light")}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "panic" && (
              <motion.div
                key="panic"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-10"
              >
                <div className="space-y-2 mb-8 border-b border-border/50 pb-6">
                  <h2 className="text-2xl font-bold text-red-500">
                    {String(t("settings:panic.sectionTitle"))}
                  </h2>
                  <p className="text-muted-foreground">
                    {String(t("settings:panic.sectionDescription"))}
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-red-500/10 p-6 md:p-8 shadow-sm">
                  <div className="absolute -top-10 -right-10 p-8 opacity-5 pointer-events-none">
                    <LazyIcon
                      name="alertTriangle"
                      size={240}
                      className="text-red-500"
                    />
                  </div>
                  <div className="relative z-10 flex items-start gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center flex-shrink-0 animate-pulse">
                      <LazyIcon
                        name="alertTriangle"
                        size={20}
                        className="text-red-500"
                      />
                    </div>
                    <div>
                      <h3 className="text-foreground font-bold text-xl text-red-500 mb-1">
                        {String(t("settings:panic.protocolTitle"))}
                      </h3>
                      <p className="text-foreground/80 text-sm leading-relaxed max-w-2xl">
                        {String(t("settings:panic.protocolDescription"))}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 space-y-5 max-w-xl">
                    <div className="bg-background/40 p-6 rounded-2xl border border-red-500/20 space-y-5">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2 block text-red-400">
                          {String(t("settings:panic.fakePinLabel"))}
                        </label>
                        <input
                          type="password"
                          value={panicPin}
                          onChange={(e) => setPanicPin(e.target.value)}
                          placeholder={String(t("settings:panic.fakePinPlaceholder"))}
                          className={`w-full px-5 py-3.5 rounded-xl border outline-none focus:ring-2 transition-all ${
                            theme === "dark"
                              ? "bg-black/50 border-red-900/50 focus:ring-red-500/50"
                              : "bg-white border-red-200 focus:ring-red-500/50"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2 block text-red-400">
                          {String(t("settings:panic.confirmFakePinLabel"))}
                        </label>
                        <input
                          type="password"
                          value={confirmPanicPin}
                          onChange={(e) => setConfirmPanicPin(e.target.value)}
                          placeholder={String(
                            t("settings:panic.confirmFakePinPlaceholder"),
                          )}
                          className={`w-full px-5 py-3.5 rounded-xl border outline-none focus:ring-2 transition-all ${
                            theme === "dark"
                              ? "bg-black/50 border-red-900/50 focus:ring-red-500/50"
                              : "bg-white border-red-200 focus:ring-red-500/50"
                          }`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2 block pt-2">
                        {String(t("settings:panic.contactLabel"))}
                      </label>
                      <input
                        type="text"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        placeholder={String(t("settings:panic.contactPlaceholder"))}
                        className={`w-full px-5 py-3.5 rounded-xl border outline-none focus:ring-2 transition-all ${
                          theme === "dark"
                            ? "bg-background border-border focus:ring-primary/50"
                            : "bg-white border-border focus:ring-primary/50"
                        }`}
                      />
                      <p className="text-[11px] opacity-60 mt-2 ml-1">
                        {String(t("settings:panic.contactHelp"))}
                      </p>
                    </div>

                    <div className="pt-4">
                      <Button
                        onClick={handleSavePanicPin}
                        isLoading={isSavingPanic}
                        variant="destructive"
                        className="w-full sm:w-auto px-8 py-6 text-base font-bold tracking-wide rounded-xl shadow-lg shadow-red-500/20"
                      >
                        {String(t("settings:panic.activate"))}
                      </Button>

                      <AnimatePresence>
                        {panicError && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="text-sm text-red-400 mt-4 font-medium px-2"
                          >
                            {panicError}
                          </motion.p>
                        )}
                        {panicSuccess && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="text-sm text-green-500 mt-4 font-medium px-2"
                          >
                            {panicSuccess}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function LanguageButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      onClick={onClick}
      className={`w-full justify-between h-auto py-3 px-4 ${
        !active && "bg-card/50 text-muted-foreground hover:text-foreground"
      }`}
      rightIcon={active ? <LazyIcon name="check" size={16} /> : null}
    >
      <span className="font-medium">{label}</span>
    </Button>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  isDanger,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  isDanger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm whitespace-nowrap md:whitespace-normal text-left min-w-[max-content] md:min-w-0 ${
        active
          ? isDanger
            ? "bg-red-500/10 text-red-500 border border-red-500/20"
            : "bg-primary/10 text-primary border border-primary/20"
          : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground border border-transparent"
      }`}
    >
      <LazyIcon
        name={icon as any}
        size={18}
        className={active ? (isDanger ? "text-red-500" : "text-primary") : "opacity-50"}
      />
      {label}
    </button>
  );
}
