import { useEffect, type RefObject } from 'react';
import { isTextInput } from './isTextInput';

type UseSnapOnFocusOptions = {
  /** Ref to the container element to listen for focus events */
  containerRef: RefObject<HTMLElement | null>;
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Current snap point index */
  currentSnap: number | undefined;
  /** The last (full height) snap point index */
  lastSnapPointIndex: number;
  /** Whether the hook is enabled */
  isEnabled: boolean;
  /** Callback to snap to full height, returns a cleanup function to restore */
  onSnapToFull: (() => VoidFunction) | (() => void);
};

/**
 * Snaps the sheet to full height when an input/textarea inside receives focus.
 * This happens before the keyboard opens, providing a smoother experience.
 */
export function useSnapOnFocus({
  containerRef,
  isOpen,
  currentSnap,
  lastSnapPointIndex,
  isEnabled,
  onSnapToFull,
}: UseSnapOnFocusOptions) {
  useEffect(() => {
    if (!isOpen) return;
    if (!isEnabled) return;

    const container = containerRef.current;
    if (!container) return;

    let cleanup: (() => void) | undefined;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (!isTextInput(target)) return;

      // Already at full height, nothing to do
      if (currentSnap === lastSnapPointIndex) return;

      cleanup = onSnapToFull() ?? undefined;
    };

    const handleFocusOut = (event: FocusEvent) => {
      const relatedTarget = event.relatedTarget as HTMLElement | null;

      // If focus is moving to another input inside the container, don't restore
      if (relatedTarget && container.contains(relatedTarget)) {
        if (!isTextInput(relatedTarget)) return;
      }

      // Focus left the container or moved to a non-input element, restore snap
      cleanup?.();
      cleanup = undefined;
    };

    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);

    return () => {
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
      cleanup?.();
    };
  }, [
    isOpen,
    isEnabled,
    containerRef,
    currentSnap,
    lastSnapPointIndex,
    onSnapToFull,
  ]);
}
