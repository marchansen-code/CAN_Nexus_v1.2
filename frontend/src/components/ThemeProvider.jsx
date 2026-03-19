import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/App';

// Color presets with full HSL values for all CSS variables
const COLOR_PRESETS = {
  'canusa': {
    name: 'CANUSA Standard',
    light: {
      primary: '0 84% 50%',
      ring: '0 84% 50%',
      accent: '0 84% 96%',
      'accent-foreground': '0 84% 35%',
    },
    dark: {
      primary: '0 84% 55%',
      ring: '0 84% 55%',
      accent: '0 40% 15%',
      'accent-foreground': '0 84% 85%',
    }
  },
  'ocean': {
    name: 'Ozean Blau',
    light: {
      primary: '200 80% 45%',
      ring: '200 80% 45%',
      accent: '200 80% 96%',
      'accent-foreground': '200 80% 30%',
    },
    dark: {
      primary: '200 80% 55%',
      ring: '200 80% 55%',
      accent: '200 40% 15%',
      'accent-foreground': '200 80% 85%',
    }
  },
  'forest': {
    name: 'Wald Grün',
    light: {
      primary: '145 60% 40%',
      ring: '145 60% 40%',
      accent: '145 60% 95%',
      'accent-foreground': '145 60% 25%',
    },
    dark: {
      primary: '145 60% 50%',
      ring: '145 60% 50%',
      accent: '145 30% 15%',
      'accent-foreground': '145 60% 80%',
    }
  },
  'sunset': {
    name: 'Sonnenuntergang',
    light: {
      primary: '30 95% 50%',
      ring: '30 95% 50%',
      accent: '30 95% 95%',
      'accent-foreground': '30 95% 30%',
    },
    dark: {
      primary: '30 95% 55%',
      ring: '30 95% 55%',
      accent: '30 50% 15%',
      'accent-foreground': '30 95% 85%',
    }
  },
  'lavender': {
    name: 'Lavendel',
    light: {
      primary: '270 60% 55%',
      ring: '270 60% 55%',
      accent: '270 60% 96%',
      'accent-foreground': '270 60% 35%',
    },
    dark: {
      primary: '270 60% 65%',
      ring: '270 60% 65%',
      accent: '270 30% 15%',
      'accent-foreground': '270 60% 85%',
    }
  },
  'midnight': {
    name: 'Mitternacht',
    light: {
      primary: '220 70% 45%',
      ring: '220 70% 45%',
      accent: '220 70% 96%',
      'accent-foreground': '220 70% 30%',
    },
    dark: {
      primary: '220 70% 55%',
      ring: '220 70% 55%',
      accent: '220 40% 15%',
      'accent-foreground': '220 70% 85%',
    }
  }
};

// Default theme settings
const defaultThemeSettings = {
  mode: 'light',
  colorScheme: 'canusa'
};

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  resolvedTheme: 'light',
  themeSettings: defaultThemeSettings,
  colorScheme: 'canusa',
  setColorScheme: () => {},
  resetThemeSettings: () => {},
  saveThemeToServer: () => {},
  loadThemeFromServer: () => {},
  COLOR_PRESETS
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        localStorage.setItem('theme', 'light');
        return 'light';
      }
      return savedTheme;
    }
    return 'light';
  });
  
  const [resolvedTheme, setResolvedTheme] = useState('light');
  const [colorScheme, setColorSchemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('colorScheme') || 'canusa';
    }
    return 'canusa';
  });

  // Apply CSS variables based on color scheme
  const applyCssVariables = useCallback((scheme, isDark) => {
    const root = document.documentElement;
    const preset = COLOR_PRESETS[scheme] || COLOR_PRESETS['canusa'];
    const colors = isDark ? preset.dark : preset.light;
    
    // Apply all color variables
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    
    // Also update chart colors to match the theme
    root.style.setProperty('--chart-1', colors.primary);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const updateTheme = () => {
      let effectiveTheme = theme;
      
      if (theme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      setResolvedTheme(effectiveTheme);
      
      if (effectiveTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      // Apply color scheme CSS variables
      applyCssVariables(colorScheme, effectiveTheme === 'dark');
    };

    updateTheme();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, colorScheme, applyCssVariables]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setColorScheme = (newScheme) => {
    setColorSchemeState(newScheme);
    localStorage.setItem('colorScheme', newScheme);
    
    // Apply immediately
    const isDark = resolvedTheme === 'dark';
    applyCssVariables(newScheme, isDark);
  };

  const resetThemeSettings = () => {
    setThemeState('light');
    setColorSchemeState('canusa');
    localStorage.setItem('theme', 'light');
    localStorage.setItem('colorScheme', 'canusa');
    
    // Reset CSS variables
    applyCssVariables('canusa', false);
  };

  // Save theme settings to server (for user profile)
  const saveThemeToServer = async () => {
    try {
      await axios.put(`${API}/users/me/theme`, {
        theme_settings: {
          mode: theme,
          colorScheme: colorScheme
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to save theme to server:', error);
      return false;
    }
  };

  // Load theme settings from server
  const loadThemeFromServer = async () => {
    try {
      const response = await axios.get(`${API}/users/me/theme`);
      if (response.data?.theme_settings) {
        const serverSettings = response.data.theme_settings;
        
        // Apply server settings
        if (serverSettings.mode) {
          setTheme(serverSettings.mode);
        }
        
        if (serverSettings.colorScheme) {
          setColorScheme(serverSettings.colorScheme);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Failed to load theme from server:', error);
    }
    return false;
  };

  const themeSettings = {
    mode: theme,
    colorScheme: colorScheme
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      resolvedTheme, 
      themeSettings,
      colorScheme,
      setColorScheme,
      resetThemeSettings,
      saveThemeToServer,
      loadThemeFromServer,
      COLOR_PRESETS
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
