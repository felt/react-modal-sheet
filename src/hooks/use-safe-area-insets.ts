import { useLayoutEffect, useState } from 'react';

import { IS_SSR } from '../constants';

const fallback = { top: 0, left: 0, right: 0, bottom: 0 };
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState(fallback);

  useLayoutEffect(() => {
    if (IS_SSR) return setInsets(fallback);

    // Create a hidden element that uses safe area insets
    const safeAreaDetector = createSafeAreaDetector();

    const observer = new ResizeObserver(() => {
      const insets = getSafeAreaInsets(safeAreaDetector);
      setInsets(insets);
    });

    observer.observe(safeAreaDetector);

    return () => {
      observer.disconnect();
      document.body.removeChild(safeAreaDetector);
    };
  }, []);

  return insets;
}

const safeAreaDetectorId = 'react-modal-sheet-safe-area-detector';
const safeAreaDetectorStyle = `
  position: fixed;
  top: -1000px;
  left: -1000px;
  pointer-events: none;
  z-index: -1;
  visibility: hidden;
  width: 1px;
  height: 1px;
  padding-top: env(safe-area-inset-top);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
`;

function createSafeAreaDetector() {
  let safeAreaDetector = document.getElementById(safeAreaDetectorId);
  if (safeAreaDetector) return safeAreaDetector;

  safeAreaDetector = document.createElement('div');
  safeAreaDetector.id = safeAreaDetectorId;
  safeAreaDetector.style.cssText = safeAreaDetectorStyle;
  document.body.appendChild(safeAreaDetector);
  return safeAreaDetector;
}

// Read the computed values
function getSafeAreaInsets(element: HTMLElement) {
  const styles = getComputedStyle(element);
  return {
    top: parseFloat(styles.paddingTop) || 0,
    right: parseFloat(styles.paddingRight) || 0,
    bottom: parseFloat(styles.paddingBottom) || 0,
    left: parseFloat(styles.paddingLeft) || 0,
  };
}
