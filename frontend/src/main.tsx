import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Initialise i18next before any component renders
import "@/i18n/i18next";

import "@/index.css";
import { App } from "@/App";
import { initSentry } from "@/lib/sentry";
import { AppProviders } from "@/providers/AppProviders";

initSentry();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
);
