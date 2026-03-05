/**
 * Hook for responsive design utilities
 */

import { useState, useEffect, useCallback } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

interface Breakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
}

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

export function useBreakpoints(): Breakpoints {
  const { width, height } = useWindowSize();

  const isMobile = width < MOBILE_BREAKPOINT;
  const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
  const isDesktop = width >= TABLET_BREAKPOINT;
  const isLandscape = width > height;
  const isPortrait = height >= width;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
    isPortrait,
  };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOrientation = () => {
      if (window.innerWidth > window.innerHeight) {
        setOrientation('landscape');
      } else {
        setOrientation('portrait');
      }
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}

export function useResponsive() {
  const size = useWindowSize();
  const breakpoints = useBreakpoints();
  const orientation = useOrientation();

  const isCompact = useCallback(
    () => breakpoints.isMobile || (breakpoints.isTablet && orientation === 'portrait'),
    [breakpoints, orientation]
  );

  return {
    ...size,
    ...breakpoints,
    orientation,
    isCompact: isCompact(),
  };
}

export default useResponsive;
