import { useEffect, useState } from 'react';
import useLocalStorage from './useLocalStorage';

const useColorMode = (baseTheme?: 'light' | 'dark' | 'both') => {
  const [storedColorMode, setStoredColorMode] = useLocalStorage('color-theme', 'light');
  const [currentColorMode, setCurrentColorMode] = useState<string>(storedColorMode);

  useEffect(() => {
    let activeMode = storedColorMode;

    if (baseTheme === 'dark') {
      activeMode = 'dark';
    } else if (baseTheme === 'light') {
      activeMode = 'light';
    } else if (baseTheme === 'both') {
      // If "both", respect the stored preference.
      // We only fallback to time-based if there's no stored preference OR we want to initialize it once.
      // For this app, let's just let the storedColorMode drive it when baseTheme is both.
      activeMode = storedColorMode;
    }

    setCurrentColorMode(activeMode);

    const className = 'dark';
    const bodyClass = window.document.body.classList;

    activeMode === 'dark'
      ? bodyClass.add(className)
      : bodyClass.remove(className);
  }, [baseTheme, storedColorMode]);

  return [currentColorMode, setStoredColorMode] as const;
};

export default useColorMode;
