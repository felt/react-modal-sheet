import { type RefObject, useEffect, useRef, useState } from 'react';
import { useStableCallback } from './use-stable-callback';
import { isIOSSafari26 } from '../utils';

type VirtualKeyboardState = {
  isVisible: boolean;
  height: number;
};

type UseVirtualKeyboardOptions = {
  /**
   * Ref to the positioner element to apply `keyboard-inset-height` CSS variable updates (required)
   */
  positionerRef: RefObject<HTMLDivElement | null>;
  /**
   * Enable or disable the hook entirely (default: true)
   */
  isEnabled?: boolean;
  /**
   * Minimum pixel height difference to consider the keyboard visible (default: 100px)
   */
  visualViewportThreshold?: number;
  /**
   * Whether to treat contenteditable elements as text inputs (default: true)
   */
  includeContentEditable?: boolean;
  /**
   * Delay in ms for debouncing viewport changes (default: 100ms)
   */
  debounceDelay?: number;
};

export function useVirtualKeyboard({
  positionerRef,
  isEnabled = true,
  debounceDelay = 100,
  includeContentEditable = true,
  visualViewportThreshold = 100,
}: UseVirtualKeyboardOptions) {
  const [state, setState] = useState<VirtualKeyboardState>({
    isVisible: false,
    height: 0,
  });

  const focusedElementRef = useRef<HTMLElement | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTextInput = useStableCallback((el: Element | null) => {
    return (
      el?.tagName === 'INPUT' ||
      el?.tagName === 'TEXTAREA' ||
      (includeContentEditable &&
        el instanceof HTMLElement &&
        el.isContentEditable)
    );
  });

  useEffect(() => {
    if (!isEnabled) return;

    const vv = window.visualViewport;
    const vk = (navigator as any).virtualKeyboard;

    function setKeyboardInsetHeightEnv(height: number) {
      positionerRef.current?.style.setProperty(
        '--keyboard-inset-height',
        // Safari 26 uses a floating address bar when keyboard is open that occludes the bottom of the sheet
        // and its height is not considered in the visual viewport. It is estimated to be 25px.
        `${isIOSSafari26() ? (height ? height + 10 : 0) : height}px`
      );
    }

    function handleFocusIn(e: FocusEvent) {
      if (
        e.target instanceof HTMLElement &&
        isTextInput(e.target) &&
        positionerRef.current?.contains(e.target)
      ) {
        focusedElementRef.current = e.target;
        updateKeyboardState();
      }
    }

    function handleFocusOut() {
      focusedElementRef.current = null;
      updateKeyboardState();
    }

    function updateKeyboardState() {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        const active = focusedElementRef.current;
        const inputIsFocused = isTextInput(active);

        if (!inputIsFocused) {
          setKeyboardInsetHeightEnv(0);
          setState({ isVisible: false, height: 0 });
          return;
        }

        if (vk) {
          const virtualKeyboardHeight = vk.boundingRect.height;

          setKeyboardInsetHeightEnv(virtualKeyboardHeight);
          setState({
            isVisible: virtualKeyboardHeight > 0,
            height: virtualKeyboardHeight,
          });

          return;
        }

        if (vv) {
          const heightDiff = window.innerHeight - vv.height;

          if (heightDiff > visualViewportThreshold) {
            setKeyboardInsetHeightEnv(heightDiff);
            setState({ isVisible: true, height: heightDiff });
          } else {
            setKeyboardInsetHeightEnv(0);
            setState({ isVisible: false, height: 0 });
          }

          return;
        }
      }, debounceDelay);
    }

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    if (vv) {
      vv.addEventListener('resize', updateKeyboardState);
      vv.addEventListener('scroll', updateKeyboardState);
    }

    let currentOverlaysContent = false;

    if (vk) {
      currentOverlaysContent = vk.overlaysContent;
      vk.overlaysContent = true;
      vk.addEventListener('geometrychange', updateKeyboardState);
    }

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);

      if (vv) {
        vv.removeEventListener('resize', updateKeyboardState);
        vv.removeEventListener('scroll', updateKeyboardState);
      }

      if (vk) {
        vk.overlaysContent = currentOverlaysContent;
        vk.removeEventListener('geometrychange', updateKeyboardState);
      }

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [
    debounceDelay,
    includeContentEditable,
    isEnabled,
    visualViewportThreshold,
  ]);

  return {
    keyboardHeight: state.height,
    isKeyboardOpen: state.isVisible,
  };
}
