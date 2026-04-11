import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@/index.css";
import { App } from "@/App";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { SecurityProvider } from "@/context/SecurityContext";
import { CallProvider } from "@/features/calls/CallProvider";
import { TitleProvider } from "@/context/TitleContext";
import { ChatProvider } from "@/features/chat/ChatProvider";
import { E2EEProvider } from "@/features/chat/hooks/useE2EE";
import { HelmetProvider } from "react-helmet-async";
import { initSentry } from "@/lib/sentry";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

initSentry();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <SecurityProvider>
                <CallProvider>
                  <TitleProvider>
                    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                      <E2EEProvider>
                        <ChatProvider>
                          <App />
                        </ChatProvider>
                      </E2EEProvider>
                    </BrowserRouter>
                  </TitleProvider>
                </CallProvider>
              </SecurityProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);