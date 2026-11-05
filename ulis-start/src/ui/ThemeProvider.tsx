import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type ColorScheme, type Theme } from './theme';

const ThemeContext = createContext<Theme | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Force a scheme; defaults to the system setting. */
  scheme?: ColorScheme;
}

export function ThemeProvider({ children, scheme }: ThemeProviderProps) {
  const system = useColorScheme();
  const resolved: ColorScheme = scheme ?? (system === 'dark' ? 'dark' : 'light');
  return (
    <ThemeContext.Provider value={resolved === 'dark' ? darkTheme : lightTheme}>{children}</ThemeContext.Provider>
  );
}

/** Current theme. Works without a provider (falls back to the system color scheme). */
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  const system = useColorScheme();
  if (ctx) return ctx;
  return system === 'dark' ? darkTheme : lightTheme;
}
