import { useEffect, useState } from 'react';

/**
 * useDebouncedLocalStorage
 * - key: full localStorage key (string) or null
 * - defaultValue: object stored when no value exists
 * - delay: ms debounce before writing to localStorage
 *
 * Returns [value, setValue]
 */
export function useDebouncedLocalStorage<T>(
  key: string | null,
  defaultValue: T,
  delay = 500
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(defaultValue);

  // load initial when key changes
  useEffect(() => {
    if (!key) {
      setState(defaultValue);
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setState(JSON.parse(raw) as T);
      } else {
        setState(defaultValue);
      }
    } catch {
      setState(defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // write with debounce
  useEffect(() => {
    if (!key) return;
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (e) {
        // ignore
      }
    }, delay);
    return () => clearTimeout(handle);
  }, [key, state, delay]);

  return [state, setState];
}
