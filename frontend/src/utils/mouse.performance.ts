/**
 * Performance optimization utilities for mouse events
 * Reduces unnecessary re-renders and calculations
 */

/**
 * Throttle function - limit how often a callback is called
 * @param callback - Function to throttle
 * @param delay - Minimum delay between calls in ms
 */
export function throttle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastRun = Date.now();

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun;

    if (timeSinceLastRun >= delay) {
      callback(...args);
      lastRun = now;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback(...args);
        lastRun = Date.now();
      }, delay - timeSinceLastRun);
    }
  };
}

/**
 * Debounce function - delay callback until action stops
 * @param callback - Function to debounce
 * @param delay - Delay in ms
 */
export function debounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

/**
 * Request Animation Frame throttle
 * Ensures callback runs at most once per frame (60fps = ~16.7ms)
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  callback: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function raf(...args: Parameters<T>) {
    lastArgs = args;

    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      if (lastArgs) {
        callback(...lastArgs);
      }
      rafId = null;
    });
  };
}
