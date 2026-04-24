import type { PropsWithChildren } from "react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { SecurityProvider } from "@/context/SecurityContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TitleProvider } from "@/context/TitleContext";
import { CallProvider } from "@/features/calls/CallProvider";
import { ChatProvider } from "@/features/chat/ChatProvider";
import { E2EEProvider } from "@/features/chat/hooks/useE2EE";

export function AppProviders({ children }: PropsWithChildren) {
  return (
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
                        <ChatProvider>{children}</ChatProvider>
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
  );
}
