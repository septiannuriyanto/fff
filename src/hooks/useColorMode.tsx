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
      // Time-based logic: 6 PM (18:00) to 6 AM (06:00) is dark
      const hour = new Date().getHours();
      activeMode = (hour >= 18 || hour < 6) ? 'dark' : 'light';
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
