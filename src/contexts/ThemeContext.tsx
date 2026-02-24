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

// Helper to get effective theme properties (supports both core and legacy root-level structures)
const getThemeCore = (theme: ThemePreset) => {
  if (theme.core) {
    return theme.core;
  }
  // Legacy fallback - use root-level properties
  return {
    id: theme.id || 'unknown',
    name: theme.name || 'Unknown Theme',
    baseTheme: theme.baseTheme || 'dark',
    isSystem: theme.isSystem || false
  };
};

// Helper to get theme id
const getThemeId = (theme: ThemePreset): string => {
  return getThemeCore(theme).id;
};

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
  getBackgroundCss: (bg: any) => string;
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
    return themes.find(t => getThemeId(t) === currentThemeId) || (systemTheme as ThemePreset);
  });
  const [trialTheme, setTrialTheme] = useState<ThemePreset | null>(null);
  
  // Compute the current active base theme to pass into useColorMode
  const currentBaseTheme = (trialTheme || appliedTheme).baseTheme || getThemeCore(trialTheme || appliedTheme).baseTheme;

  // Use generic hook to get color mode, now passing the active base theme
  const [colorMode, setColorMode] = useColorMode(currentBaseTheme) as [string, (mode: string) => void];
  
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
       const themeBase = theme.core?.baseTheme || theme.baseTheme;
       if (themeBase === 'light' || themeBase === 'dark') return theme;
    }

    const isDark = mode === 'dark';

    const ensureNewBackground = (bg: any) => {
      if (!bg || (typeof bg === 'object' && bg.mode)) return bg;
      const type = bg.type || (bg.gradient && typeof bg.gradient === 'string' ? 'gradient' : 'solid');
      return {
        mode: type,
        color: bg.color || (typeof bg === 'string' ? bg : '#F1F5F9'),
        colorDark: bg.colorDark,
        gradient: typeof bg.gradient === 'object' ? bg.gradient : {
          stops: [bg.color || '#4f46e5', '#9333ea'],
          from: 'TopLeft',
          to: 'BottomRight',
          reverse: false
        },
        useSystem: bg.useSystem ?? true
      };
    };

    const resolvedBackground = ensureNewBackground(theme.background);

    if (!isDark) return { ...theme, background: resolvedBackground };

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
      baseTheme: isDark ? 'dark' : (theme.core?.baseTheme || theme.baseTheme || 'light'),
      background: {
        ...resolvedBackground,
        color: resolvedBackground.colorDark || resolvedBackground.color
      },
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

  const getBackgroundCss = useCallback((bg: any) => {
    if (!bg) return '';
    if (bg.mode === 'gradient' && bg.gradient) {
      const { stops, to, reverse } = bg.gradient;
      if (!stops || stops.length < 2) return bg.color || '';
      
      const posMap: any = {
        'TopLeft': 'to bottom right',
        'TopCenter': 'to bottom',
        'TopRight': 'to bottom left',
        'CenterLeft': 'to right',
        'Center': 'to right',
        'CenterRight': 'to left',
        'BottomLeft': 'to top right',
        'BottomCenter': 'to top',
        'BottomRight': 'to top left'
      };

      const direction = posMap[to] || 'to bottom right';
      const colorStops = reverse ? [...stops].reverse().join(', ') : stops.join(', ');
      return `linear-gradient(${direction}, ${colorStops})`;
    }
    return bg.color || '';
  }, []);

  // Compute active theme based on trial/applied and color mode
  const rawActiveTheme = trialTheme || appliedTheme;
  const activeTheme = React.useMemo(() => {
     return resolveTheme(rawActiveTheme, colorMode);
  }, [rawActiveTheme, colorMode, resolveTheme]);

  // ... (existing helper functions: setCurrentTheme, setSelectedTheme, etc.)

  const setCurrentTheme = useCallback((id: string) => {
    let themeToApply = themes.find(t => getThemeId(t) === id) || (systemTheme as ThemePreset);
    
    setTrialTheme((prevTrial) => {
      if (prevTrial && getThemeId(prevTrial) === id) {
        themeToApply = { ...prevTrial };
      }
      return null;
    });

    setCurrentThemeId(id); // This now writes to localStorage
    setSelectedThemeId(id);
    setAppliedTheme(themeToApply);
  }, [setCurrentThemeId]);

  const setSelectedTheme = useCallback((id: string) => {
    const theme = themes.find(t => getThemeId(t) === id);
    setSelectedThemeId(id);
    if (theme) {
      setTrialTheme(theme);
    }
  }, []);

  const applyThemeWithUndo = useCallback((id: string) => {
    setAppliedTheme((prevApplied) => {
      let themeToApply = themes.find(t => getThemeId(t) === id) || (systemTheme as ThemePreset);
      
      setTrialTheme((prevTrial) => {
        if (prevTrial && getThemeId(prevTrial) === id) {
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
    const deepMerge = (target: any, source: any) => {
      const output = { ...target };
      if (typeof target === 'object' && target !== null && typeof source === 'object' && source !== null) {
        Object.keys(source).forEach(key => {
          if (typeof source[key] === 'object' && source[key] !== null && key in target) {
            output[key] = deepMerge(target[key], source[key]);
          } else {
            output[key] = source[key];
          }
        });
      }
      return output;
    };

    setTrialTheme((prev) => {
      const base = prev || appliedTheme;
      return deepMerge(base, updates);
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
      resetTrial,
      getBackgroundCss
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
