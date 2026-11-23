import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
});

// Mock ResizeObserver
if (typeof window !== 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  (global as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;
}
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'storage', {
    writable: true,
    value: {
      estimate: async () => ({
        usage: 1024 * 1024 * 5, // 5 MB
        quota: 1024 * 1024 * 1024 * 10 // 10 GB
      })
    }
  });
}
