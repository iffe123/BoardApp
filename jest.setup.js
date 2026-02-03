import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Node.js environment
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder;
}

// Simple polyfills for Web APIs needed by Next.js server components
// Using simplified mocks instead of full polyfill libraries for better compatibility
class MockHeaders {
  constructor(init) {
    this._headers = new Map();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this._headers.set(key.toLowerCase(), value);
      });
    }
  }
  get(name) { return this._headers.get(name.toLowerCase()) || null; }
  set(name, value) { this._headers.set(name.toLowerCase(), value); }
  has(name) { return this._headers.has(name.toLowerCase()); }
  delete(name) { this._headers.delete(name.toLowerCase()); }
  forEach(callback) { this._headers.forEach((v, k) => callback(v, k, this)); }
}

class MockRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.method = init.method || 'GET';
    this.headers = new MockHeaders(init.headers);
    this._body = init.body;
  }
  async json() { return JSON.parse(this._body || '{}'); }
  async text() { return this._body || ''; }
}

class MockResponse {
  constructor(body, init = {}) {
    this._body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new MockHeaders(init.headers);
    this.ok = this.status >= 200 && this.status < 300;
  }
  async json() { return JSON.parse(this._body || '{}'); }
  async text() { return this._body || ''; }
  static json(data, init = {}) {
    return new MockResponse(JSON.stringify(data), {
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers }
    });
  }
}

if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = MockRequest;
}
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = MockResponse;
}
if (typeof globalThis.Headers === 'undefined') {
  globalThis.Headers = MockHeaders;
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));
