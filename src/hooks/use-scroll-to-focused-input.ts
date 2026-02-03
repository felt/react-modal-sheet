import { type RefObject, useEffect, useRef } from 'react';
import { isTextInput } from './isTextInput';

type UseScrollToFocusedInputOptions = {
  /**
   * Ref to the container element that contains the inputs
   */
  containerRef: RefObject<HTMLElement | null>;
  /**
   * Whether the keyboard is currently open
   */
  isKeyboardOpen: boolean;
  /**
   * The current keyboard height in pixels
   */
  keyboardHeight: number;
  /**
   * Bottom offset to account for (e.g. safe area + custom spacing)
   */
  bottomOffset?: number;
};

/**
 * Finds the nearest scrollable ancestor of an element
 */
function findScrollableAncestor(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;

  while (parent) {
    const style = getComputedStyle(parent);
    const overflowY = style.overflowY;

    if (
      overflowY === 'auto' ||
      overflowY === 'scroll' ||
      // Check if element is actually scrollable
      (overflowY !== 'hidden' && parent.scrollHeight > parent.clientHeight)
    ) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}

/**
 * Finds the label associated with an input element
 */
function findAssociatedLabel(element: HTMLElement): HTMLElement | null {
  // Check if input is wrapped in a label
  const parentLabel = element.closest('label');
  if (parentLabel) return parentLabel as HTMLElement;

  // Check for label with matching 'for' attribute
  if (element.id) {
    const labelFor = document.querySelector(
      `label[for="${element.id}"]`
    ) as HTMLElement | null;
    if (labelFor) return labelFor;
  }

  // Check for aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ariaLabel = document.getElementById(labelledBy) as HTMLElement | null;
    if (ariaLabel) return ariaLabel;
  }

  return null;
}

/**
 * Scrolls a focused input (and its label) into view, centering it in the
 * visible area while respecting scroll bounds.
 */
function scrollFocusedInputIntoView(
  element: HTMLElement,
  keyboardHeight: number,
  bottomOffset: number
) {
  // setTimeout instead of requestAnimationFrame is required otherwise the
  // scrolling doesn't work if you switch from one field to another.
  setTimeout(() => {
    const inputRect = element.getBoundingClientRect();
    const label = findAssociatedLabel(element);

    // Calculate combined rect including label
    let targetTop = inputRect.top;
    let targetBottom = inputRect.bottom;

    if (label) {
      const labelRect = label.getBoundingClientRect();
      targetTop = Math.min(inputRect.top, labelRect.top);
      targetBottom = Math.max(inputRect.bottom, labelRect.bottom);
    }

    const scrollContainer = findScrollableAncestor(element);

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();

      // Account for keyboard height + bottom offset when calculating visible bottom
      const effectiveBottomOffset = Math.max(keyboardHeight, bottomOffset);

      // Calculate visible boundaries relative to viewport
      const visibleTop = containerRect.top;
      const visibleBottom = Math.min(
        containerRect.bottom,
        window.innerHeight - effectiveBottomOffset
      );

      // Calculate centers for centering logic
      const targetCenter = (targetTop + targetBottom) / 2;
      const visibleCenter = (visibleTop + visibleBottom) / 2;

      // Calculate ideal scroll to center the element
      let scrollOffset = targetCenter - visibleCenter;

      // Clamp scroll offset to prevent overscrolling
      const maxScrollDown =
        scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight;
      const maxScrollUp = -scrollContainer.scrollTop;

      scrollOffset = Math.max(
        maxScrollUp,
        Math.min(maxScrollDown, scrollOffset)
      );

      // Only scroll if there's a meaningful offset
      if (Math.abs(scrollOffset) > 1) {
        scrollContainer.scrollBy({
          top: scrollOffset,
          behavior: 'smooth',
        });
      }
    } else {
      // Fallback to native scrollIntoView
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, 0);
}

/**
 * Hook that automatically scrolls focused inputs into view when the keyboard
 * opens or when focus changes between inputs while the keyboard is open.
 */
export function useScrollToFocusedInput({
  containerRef,
  isKeyboardOpen,
  keyboardHeight,
  bottomOffset = 0,
}: UseScrollToFocusedInputOptions) {
  const prevKeyboardOpen = useRef(false);

  useEffect(() => {
    const keyboardOpening = isKeyboardOpen && !prevKeyboardOpen.current;
    prevKeyboardOpen.current = isKeyboardOpen;

    // Scroll on keyboard open
    if (keyboardOpening && containerRef.current) {
      const focusedElement = document.activeElement;
      if (
        isTextInput(focusedElement) &&
        containerRef.current.contains(focusedElement)
      ) {
        scrollFocusedInputIntoView(
          focusedElement,
          keyboardHeight,
          bottomOffset
        );
      }
    }

    // Listen for focus changes while keyboard is open
    if (!isKeyboardOpen) return;
    if (!containerRef.current) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Element | null;
      if (isTextInput(target) && containerRef.current?.contains(target)) {
        scrollFocusedInputIntoView(target, keyboardHeight, bottomOffset);
      }
    };

    containerRef.current.addEventListener('focusin', handleFocusIn);
    const currentContainerRef = containerRef.current;

    return () => {
      currentContainerRef.removeEventListener('focusin', handleFocusIn);
    };
  }, [isKeyboardOpen, keyboardHeight, bottomOffset, containerRef]);
}
