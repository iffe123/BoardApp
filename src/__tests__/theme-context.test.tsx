import React from 'react';
import { render, screen, act, renderHook, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';

// Wrapper component for testing hooks
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider defaultTheme="light">{children}</ThemeProvider>;
}

function SystemWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider defaultTheme="system">{children}</ThemeProvider>;
}

// Helper to create a wrapper with a custom storage key
function createWrapper(opts?: { defaultTheme?: 'light' | 'dark' | 'system'; storageKey?: string }) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider
        defaultTheme={opts?.defaultTheme ?? 'light'}
        storageKey={opts?.storageKey ?? 'governanceos-theme'}
      >
        {children}
      </ThemeProvider>
    );
  };
}

describe('ThemeContext', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock = {};

    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => localStorageMock[key] ?? null,
    );
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => {
        localStorageMock[key] = value;
      },
    );

    // Reset document.documentElement classes
    document.documentElement.classList.remove('light', 'dark');

    // Reset matchMedia to default (prefers light)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ThemeProvider', () => {
    it('renders children', () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Hello</div>
        </ThemeProvider>,
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByTestId('child')).toHaveTextContent('Hello');
    });

    it('renders multiple children', () => {
      render(
        <ThemeProvider>
          <span data-testid="first">First</span>
          <span data-testid="second">Second</span>
        </ThemeProvider>,
      );

      expect(screen.getByTestId('first')).toBeInTheDocument();
      expect(screen.getByTestId('second')).toBeInTheDocument();
    });
  });

  describe('useTheme', () => {
    it('throws error when used outside ThemeProvider', () => {
      // Suppress console.error for this test since React will log the error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('returns default theme as system and resolvedTheme as light', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: SystemWrapper,
      });

      // Before mount, the provider returns defaultTheme values
      // After effects run, the mounted state changes
      await waitFor(() => {
        expect(result.current.theme).toBe('system');
        expect(result.current.resolvedTheme).toBe('light');
      });
    });

    it('returns light theme and resolvedTheme when defaultTheme is light', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
        expect(result.current.resolvedTheme).toBe('light');
      });
    });

    it('returns dark theme and resolvedTheme when defaultTheme is dark', async () => {
      const wrapper = createWrapper({ defaultTheme: 'dark' });
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.resolvedTheme).toBe('dark');
      });
    });
  });

  describe('setTheme', () => {
    it('updates the theme to dark', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });

      act(() => {
        result.current.setTheme('dark');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.resolvedTheme).toBe('dark');
      });
    });

    it('stores the theme in localStorage', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('governanceos-theme', 'dark');
      expect(localStorageMock['governanceos-theme']).toBe('dark');
    });

    it('stores the theme using a custom storageKey', async () => {
      const wrapper = createWrapper({ defaultTheme: 'light', storageKey: 'custom-key' });
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('custom-key', 'dark');
      expect(localStorageMock['custom-key']).toBe('dark');
    });

    it('updates the theme to system', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });

      act(() => {
        result.current.setTheme('system');
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
        // matchMedia returns false (light), so resolvedTheme should be light
        expect(result.current.resolvedTheme).toBe('light');
      });
    });
  });

  describe('toggleTheme', () => {
    it('switches from light to dark', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('light');
      });

      act(() => {
        result.current.toggleTheme();
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.resolvedTheme).toBe('dark');
      });
    });

    it('switches from dark to light', async () => {
      const wrapper = createWrapper({ defaultTheme: 'dark' });
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('dark');
      });

      act(() => {
        result.current.toggleTheme();
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
        expect(result.current.resolvedTheme).toBe('light');
      });
    });

    it('toggles back and forth correctly', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('light');
      });

      // light -> dark
      act(() => {
        result.current.toggleTheme();
      });

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('dark');
      });

      // dark -> light
      act(() => {
        result.current.toggleTheme();
      });

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('light');
      });
    });

    it('persists toggled theme to localStorage', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('light');
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('governanceos-theme', 'dark');
    });
  });

  describe('localStorage persistence', () => {
    it('reads initial theme from localStorage', async () => {
      localStorageMock['governanceos-theme'] = 'dark';

      const { result } = renderHook(() => useTheme(), {
        wrapper: SystemWrapper,
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.resolvedTheme).toBe('dark');
      });
    });

    it('reads light theme from localStorage', async () => {
      localStorageMock['governanceos-theme'] = 'light';

      const wrapper = createWrapper({ defaultTheme: 'dark' });
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
        expect(result.current.resolvedTheme).toBe('light');
      });
    });

    it('reads system theme from localStorage', async () => {
      localStorageMock['governanceos-theme'] = 'system';

      const wrapper = createWrapper({ defaultTheme: 'dark' });
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
        // matchMedia returns false (light)
        expect(result.current.resolvedTheme).toBe('light');
      });
    });

    it('ignores invalid values in localStorage', async () => {
      localStorageMock['governanceos-theme'] = 'invalid-theme';

      const { result } = renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        // Should keep the defaultTheme since stored value is invalid
        expect(result.current.theme).toBe('light');
      });
    });

    it('uses custom storageKey to read from localStorage', async () => {
      localStorageMock['my-custom-key'] = 'dark';

      const wrapper = createWrapper({ defaultTheme: 'light', storageKey: 'my-custom-key' });
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.resolvedTheme).toBe('dark');
      });
    });
  });

  describe('document.documentElement class management', () => {
    it('applies light class to document.documentElement', async () => {
      renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    it('applies dark class to document.documentElement', async () => {
      const wrapper = createWrapper({ defaultTheme: 'dark' });
      renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(false);
      });
    });

    it('switches class when theme changes from light to dark', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });

      act(() => {
        result.current.setTheme('dark');
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(false);
      });
    });

    it('switches class when theme is toggled', async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });

      act(() => {
        result.current.toggleTheme();
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(false);
      });
    });

    it('applies system-resolved theme class to document.documentElement', async () => {
      // matchMedia returns false by default, so system resolves to light
      renderHook(() => useTheme(), {
        wrapper: SystemWrapper,
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });
    });

    it('applies dark class when system prefers dark', async () => {
      // Override matchMedia to prefer dark
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: SystemWrapper,
      });

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(false);
      });
    });
  });
});
