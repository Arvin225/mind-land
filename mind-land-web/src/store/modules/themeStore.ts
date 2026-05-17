import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'system' | 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      resolvedTheme: 'dark',
      fontSize: 'medium',
      setTheme: (theme: Theme) => {
        const resolved = getResolvedTheme(theme);
        set({ theme, resolvedTheme: resolved });
        applyTheme(resolved);
      },
      setFontSize: (fontSize: FontSize) => {
        set({ fontSize });
        applyFontSize(fontSize);
      },
    }),
    {
      name: 'mind-land-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = getResolvedTheme(state.theme);
          state.resolvedTheme = resolved;
          applyTheme(resolved);
          applyFontSize(state.fontSize);
        }
      },
    }
  )
);

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = FONT_SIZE_MAP[size];
}

let _mediaQueryCleanup: (() => void) | null = null;

export function initThemeListener() {
  if (typeof window === 'undefined' || _mediaQueryCleanup) return;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      const resolved = e.matches ? 'dark' : 'light';
      useThemeStore.setState({ resolvedTheme: resolved });
      applyTheme(resolved);
    }
  };
  mediaQuery.addEventListener('change', handler);
  _mediaQueryCleanup = () => mediaQuery.removeEventListener('change', handler);
}

export function cleanupThemeListener() {
  if (_mediaQueryCleanup) {
    _mediaQueryCleanup();
    _mediaQueryCleanup = null;
  }
}
