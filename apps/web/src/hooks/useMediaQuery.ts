import { useEffect, useState } from 'react';

/** Subscribe to a media query. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Phone-sized viewport: the side panels become drawers and the bars compact. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 900px)');
}

/**
 * A finger rather than a mouse. Hit targets grow and single-finger dragging on
 * empty canvas pans instead of starting a rubber-band selection.
 */
export function useIsTouch(): boolean {
  return useMediaQuery('(pointer: coarse)');
}
