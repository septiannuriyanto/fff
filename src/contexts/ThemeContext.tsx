import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ThemePreset } from '../types/Theme';
import systemTheme from '../themes/system.json';
import emeraldNight from '../themes/emeraldNight.json';
import oceanDeep from '../themes/oceanDeep.json';
import midnightPurple from '../themes/midnightPurple.json';

const themes: ThemePreset[] = [
  systemTheme as unknown as ThemePreset,
  emeraldNight as unknown as ThemePreset,
  oceanDeep as unknown as ThemePreset,
  midnightPurple as unknown as ThemePreset,
];

import useColorMode from '../hooks/useColorMode';

interface ThemeContextType {
  currentThemeId: string;
  selectedThemeId: string;
  appliedTheme: ThemePreset;
  trialTheme: ThemePreset | null;
  activeTheme: ThemePreset; // Added activeTheme
  colorMode: string; // Added
  setColorMode: (mode: string) => void; // Added
  showUndoToast: boolean;
  themes: ThemePreset[];
  setCurrentTheme: (id: string) => void;
  setSelectedTheme: (id: string) => void;
  applyThemeWithUndo: (id: string) => void;
  undoThemeChange: () => void;
  clearUndo: () => void;
  updateTrialTheme: (updates: any) => void;
  resetTrial: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

import useLocalStorage from '../hooks/useLocalStorage';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persist currentThemeId in localStorage
  const [currentThemeId, setCurrentThemeId] = useLocalStorage<string>('current-theme-id', 'system');
  
  // Selected theme in the dialog doesn't strictly need persistence, but we can if desired.
  // For now, let's keep it in state, initializing with currentThemeId
  const [selectedThemeId, setSelectedThemeId] = useState<string>(currentThemeId);
  
  // Initialize appliedTheme based on the persisted ID
  const [appliedTheme, setAppliedTheme] = useState<ThemePreset>(() => {
    return themes.find(t => t.id === currentThemeId) || (systemTheme as ThemePreset);
  });
  const [trialTheme, setTrialTheme] = useState<ThemePreset | null>(null);
  
  // Use generic hook to get color mode
  const [colorMode, setColorMode] = useColorMode() as [string, (mode: string) => void];
  
  // Undo State
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [previousThemeId, setPreviousThemeId] = useState<string>('system');
  const [previousTheme, setPreviousTheme] = useState<ThemePreset>(systemTheme as ThemePreset);

  const resolveTheme = useCallback((theme: ThemePreset, mode: string): ThemePreset => {
    // If baseTheme is 'light' or 'dark' (fixed), stick to it unless it's 'both'
    // Actually, if it's 'both', we check mode.
    // However, user might expect even fixed themes to have some behavior? 
    // Usually 'both' themes adapt, others are static.
    
    if (theme.baseTheme !== 'both' && theme.baseTheme !== mode) {
       // If a theme is explicitly 'light', it stays light even in dark mode usually, 
       // but here we might want to respect the theme's intent.
       // For now, let's only resolve if baseTheme is 'both' OR if we want to support universal dark mode.
       // The user request specific to system.json which is 'both'.
       if (theme.baseTheme === 'light' || theme.baseTheme === 'dark') return theme;
    }

    const isDark = mode === 'dark';
    if (!isDark) return theme;

    // Helper to resolve a set of properties
    const resolveProps = (props: any, mappings: Record<string, string>) => {
      const newProps = { ...props };
      Object.keys(mappings).forEach(key => {
         const darkKey = mappings[key];
         if (props[darkKey]) {
            newProps[key] = props[darkKey];
         }
      });
      return newProps;
    };

    return {
      ...theme,
      baseTheme: isDark ? 'dark' : theme.baseTheme === 'both' ? 'light' : theme.baseTheme,
      background: resolveProps(theme.background, { color: 'colorDark', gradient: 'gradientDark' }),
      header: resolveProps(theme.header, { 
         color: 'colorDark', 
         textColor: 'textColorDark', 
         iconColor: 'iconColorDark' 
      }),
      sidebar: resolveProps(theme.sidebar, { 
         color: 'colorDark', 
         textColor: 'textColorDark',
         iconColor: 'iconColorDark'
      }),
      container: resolveProps(theme.container, {
         color: 'colorDark',
         textColor: 'textColorDark',
         iconColor: 'iconColorDark',
         borderColor: 'borderColorDark'
      }),
      card: resolveProps(theme.card, {
         shadow: 'shadowDark',
         borderColor: 'borderColorDark',
         textColor: 'textColorDark',
         iconColor: 'iconColorDark'
      }),
      input: resolveProps(theme.input, {
         color: 'colorDark',
         textColor: 'textColorDark',
         borderColor: 'borderColorDark',
         shadow: 'shadowDark'
      }),
      button: {
         primary: resolveProps(theme.button.primary, { 
             color: 'colorDark', 
             textColor: 'textColorDark', 
             borderColor: 'borderColorDark', 
             shadow: 'shadowDark' 
         }),
         secondary: resolveProps(theme.button.secondary, { 
             color: 'colorDark', 
             textColor: 'textColorDark', 
             borderColor: 'borderColorDark', 
             shadow: 'shadowDark' 
         }),
         tertiary: resolveProps(theme.button.tertiary, { 
             color: 'colorDark', 
             textColor: 'textColorDark', 
             borderColor: 'borderColorDark', 
             shadow: 'shadowDark' 
         }),
      },
      grid: resolveProps(theme.grid, { 
         backgroundColor: 'backgroundColorDark',
         borderColor: 'borderColorDark',
         headerColor: 'headerColorDark',
         primaryTextColor: 'primaryTextColorDark',
         headerTextColor: 'headerTextColorDark',
         secondaryTextColor: 'secondaryTextColorDark',
         headerHoverColor: 'headerHoverColorDark',
         headerMovingColor: 'headerMovingColorDark',
         showWrapperBorder: 'showWrapperBorderDark',
         showHeaderRowBorder: 'showHeaderRowBorderDark',
         rowBorderStyle: 'rowBorderStyleDark',
         rowBorderWidth: 'rowBorderWidthDark',
         rowBorderColor: 'rowBorderColorDark',
         columnBorderStyle: 'columnBorderStyleDark',
         columnBorderWidth: 'columnBorderWidthDark',
         columnBorderColor: 'columnBorderColorDark'
      }),
      ui: resolveProps(theme.ui, { primaryColor: 'primaryColorDark' }),
      popup: resolveProps(theme.popup, {
         backgroundColor: 'backgroundColorDark',
         borderColor: 'borderColorDark',
         textColor: 'textColorDark',
         textActiveColor: 'textActiveColorDark',
         textHoverColor: 'textHoverColorDark',
         iconColor: 'iconColorDark',
         separatorColor: 'separatorColorDark',
         headerIconColor: 'headerIconColorDark',
         headerTextColor: 'headerTextColorDark'
      })
    };
  }, []);

  // Compute active theme based on trial/applied and color mode
  const rawActiveTheme = trialTheme || appliedTheme;
  const activeTheme = React.useMemo(() => {
     return resolveTheme(rawActiveTheme, colorMode);
  }, [rawActiveTheme, colorMode, resolveTheme]);

  // ... (existing helper functions: setCurrentTheme, setSelectedTheme, etc.)

  const setCurrentTheme = useCallback((id: string) => {
    let themeToApply = themes.find(t => t.id === id) || (systemTheme as ThemePreset);
    
    setTrialTheme((prevTrial) => {
      if (prevTrial && prevTrial.id === id) {
        themeToApply = { ...prevTrial };
      }
      return null;
    });

    setCurrentThemeId(id); // This now writes to localStorage
    setSelectedThemeId(id);
    setAppliedTheme(themeToApply);
  }, [setCurrentThemeId]);

  const setSelectedTheme = useCallback((id: string) => {
    const theme = themes.find(t => t.id === id);
    setSelectedThemeId(id);
    if (theme) {
      setTrialTheme(theme);
    }
  }, []);

  const applyThemeWithUndo = useCallback((id: string) => {
    setAppliedTheme((prevApplied) => {
      let themeToApply = themes.find(t => t.id === id) || (systemTheme as ThemePreset);
      
      setTrialTheme((prevTrial) => {
        if (prevTrial && prevTrial.id === id) {
          themeToApply = { ...prevTrial };
        }
        return null;
      });

      setPreviousThemeId(currentThemeId);
      setPreviousTheme(prevApplied);
      
      setCurrentThemeId(id); // writes to localStorage
      setShowUndoToast(true);
      return themeToApply;
    });
  }, [currentThemeId, setCurrentThemeId]);

  const undoThemeChange = useCallback(() => {
    setCurrentThemeId(previousThemeId);
    setSelectedThemeId(previousThemeId);
    setAppliedTheme(previousTheme);
    setShowUndoToast(false);
  }, [previousThemeId, previousTheme]);

  const clearUndo = useCallback(() => {
    setShowUndoToast(false);
  }, []);

  const updateTrialTheme = useCallback((updates: any) => {
    setTrialTheme((prev) => {
      const base = prev || appliedTheme;
      
      // Handle special nested cases manually
      const newTheme = { ...base };
      
      if (updates.container) {
        newTheme.container = { ...base.container, ...updates.container };
      }
      if (updates.card) {
        newTheme.card = { ...base.card, ...updates.card };
      }
      if (updates.background) {
        newTheme.background = { ...base.background, ...updates.background };
      }
      if (updates.ui) {
        newTheme.ui = { ...base.ui, ...updates.ui };
      }
      if (updates.grid) {
        newTheme.grid = { ...base.grid, ...updates.grid };
      }
      if (updates.popup) {
        newTheme.popup = { ...base.popup, ...updates.popup };
      }
      if (updates.sidebar) {
        newTheme.sidebar = { ...base.sidebar, ...updates.sidebar };
      }
      if (updates.header) {
        newTheme.header = { ...base.header, ...updates.header };
      }
      
      // Top level updates
      return { ...newTheme, ...Object.fromEntries(
        Object.entries(updates).filter(([k]) => !['container', 'card', 'background', 'ui', 'grid', 'popup', 'sidebar', 'header'].includes(k))
      )};
    });
  }, [appliedTheme]);

  const resetTrial = useCallback(() => {
    setSelectedThemeId(currentThemeId);
    setTrialTheme(null);
  }, [currentThemeId]);

  return (
    <ThemeContext.Provider value={{ 
      currentThemeId, 
      selectedThemeId, 
      appliedTheme,
      trialTheme,
      activeTheme, // Export activeTheme
      colorMode, // Export colorMode
      setColorMode, // Export setColorMode
      showUndoToast,
      themes,
      setCurrentTheme, 
      setSelectedTheme,
      applyThemeWithUndo,
      undoThemeChange,
      updateTrialTheme,
      clearUndo,
      resetTrial
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const hexToRgba = (hex: string | undefined, opacity: number): string | undefined => {
  if (!hex) return undefined;
  if (!hex.startsWith('#')) return hex;
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
