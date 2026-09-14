import { useCallback, useSyncExternalStore } from 'react';

// Suit une media query CSS (ex. '(max-width: 768px)') et se met à jour au redimensionnement
export default function useMediaQuery(query) {
  const subscribe = useCallback((onChange) => {
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener('change', onChange);
    return () => mediaQueryList.removeEventListener('change', onChange);
  }, [query]);

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
