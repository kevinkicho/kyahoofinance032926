import { createContext, useContext, useState, useEffect } from 'react';

const DARK = {
  bg: '#0f172a', bgDeep: '#0a0f1a', cardBg: '#1e293b',
  text: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#64748b', textDim: '#475569',
  border: '#334155', borderSubtle: '#1e293b',
  tooltipBg: '#1e293b', tooltipBorder: '#334155',
};

const LIGHT = {
  bg: '#ffffff', bgDeep: '#f8fafc', cardBg: '#f1f5f9',
  text: '#1e293b', textSecondary: '#64748b', textMuted: '#94a3b8', textDim: '#cbd5e1',
  border: '#e2e8f0', borderSubtle: '#f1f5f9',
  tooltipBg: '#ffffff', tooltipBorder: '#e2e8f0',
};

const ThemeContext = createContext({ theme: 'dark', colors: DARK, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('hub-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hub-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const colors = theme === 'dark' ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
