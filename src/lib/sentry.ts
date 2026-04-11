import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn || dsn.trim() === '') {
    console.warn("Sentry DSN not found, skipping initialization.");
    return;
  }

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // Privacy by default
        blockAllMedia: true,
      }),
    ],
    // Tracing
    tracesSampleRate: 1.0, 
    tracePropagationTargets: ["localhost", /^\//],
    
    // Session Replay
    replaysSessionSampleRate: 0.1, 
    replaysOnErrorSampleRate: 1.0, 
    
    // Release tracking
    release: "skillswap@2.0.0",
    
    environment: import.meta.env.MODE,

    // Critical: scrubbing before sending
    beforeSend(event, hint) {
      // 1. Scrub HTTP requests that might contain sensitive data
      if (event.request?.data) {
        try {
          const payloadStr = typeof event.request.data === 'string' 
            ? event.request.data 
            : JSON.stringify(event.request.data);
            
          if (
            payloadStr.includes("encrypted_content") || 
            payloadStr.includes("E2EE") ||
            payloadStr.includes("private_key")
          ) {
            event.request.data = "[SCRUBBED_SENSITIVE_DATA]";
          }
        } catch (e) {
          event.request.data = "[UNSTRINGIFIABLE_DATA_SCRUBBED]";
        }
      }

      // 2. Mask exception messages if they contain key/crypto leakage
      if (event.exception?.values) {
        event.exception.values.forEach(exception => {
          if (exception.value && /(private.key|jwk|e2ee)/i.test(exception.value)) {
            exception.value = "[REDACTED_CRYPTO_ERROR]";
          }
        });
      }

      // 3. Mask breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs.forEach(breadcrumb => {
          if (breadcrumb.message && /(private.key|jwk|e2ee)/i.test(breadcrumb.message)) {
            breadcrumb.message = "[REDACTED_BREADCRUMB]";
          }
        });
      }

      return event;
    },
  });
}
