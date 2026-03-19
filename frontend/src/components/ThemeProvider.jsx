import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/App';

// Default theme settings
const defaultThemeSettings = {
  mode: 'light', // 'light', 'dark', 'system'
  colors: {
    primary: '0 84% 50%',      // CANUSA Red
    secondary: '210 30% 95%',
    accent: '210 30% 96%',
    background: '0 0% 98%',
    foreground: '210 50% 15%',
    card: '0 0% 100%',
    muted: '210 30% 96%',
    border: '210 25% 90%',
  },
  darkColors: {
    primary: '0 84% 55%',
    secondary: '217 33% 17%',
    accent: '217 33% 17%',
    background: '222 47% 8%',
    foreground: '210 20% 98%',
    card: '222 47% 11%',
    muted: '217 33% 17%',
    border: '217 33% 25%',
  }
};

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  resolvedTheme: 'light',
  themeSettings: defaultThemeSettings,
  updateThemeSettings: () => {},
  resetThemeSettings: () => {},
  saveThemeToServer: () => {},
  loadThemeFromServer: () => {},
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
  const [themeSettings, setThemeSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('themeSettings');
      if (saved) {
        try {
          return { ...defaultThemeSettings, ...JSON.parse(saved) };
        } catch (e) {
          return defaultThemeSettings;
        }
      }
    }
    return defaultThemeSettings;
  });

  // Apply CSS variables based on theme settings
  const applyCssVariables = useCallback((settings, isDark) => {
    const root = document.documentElement;
    const colors = isDark ? settings.darkColors : settings.colors;
    
    if (colors) {
      Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
    }
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
      
      // Apply custom CSS variables
      applyCssVariables(themeSettings, effectiveTheme === 'dark');
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
  }, [theme, themeSettings, applyCssVariables]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Also update themeSettings.mode
    setThemeSettings(prev => {
      const updated = { ...prev, mode: newTheme };
      localStorage.setItem('themeSettings', JSON.stringify(updated));
      return updated;
    });
  };

  const updateThemeSettings = (newSettings) => {
    setThemeSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('themeSettings', JSON.stringify(updated));
      
      // If mode changed, update theme too
      if (newSettings.mode && newSettings.mode !== theme) {
        setThemeState(newSettings.mode);
        localStorage.setItem('theme', newSettings.mode);
      }
      
      return updated;
    });
  };

  const resetThemeSettings = () => {
    setThemeSettings(defaultThemeSettings);
    setThemeState('light');
    localStorage.setItem('theme', 'light');
    localStorage.setItem('themeSettings', JSON.stringify(defaultThemeSettings));
    
    // Reset CSS variables
    const root = document.documentElement;
    Object.entries(defaultThemeSettings.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  };

  // Save theme settings to server (for user profile)
  const saveThemeToServer = async () => {
    try {
      await axios.put(`${API}/users/me/theme`, {
        theme_settings: {
          mode: theme,
          ...themeSettings
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
        
        setThemeSettings(prev => {
          const updated = { ...prev, ...serverSettings };
          localStorage.setItem('themeSettings', JSON.stringify(updated));
          return updated;
        });
        
        return true;
      }
    } catch (error) {
      console.error('Failed to load theme from server:', error);
    }
    return false;
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      resolvedTheme, 
      themeSettings,
      updateThemeSettings,
      resetThemeSettings,
      saveThemeToServer,
      loadThemeFromServer,
      defaultThemeSettings
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
