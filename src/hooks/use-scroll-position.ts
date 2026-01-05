import { RefObject, useCallback, useEffect, useMemo, useState } from 'react';
import { useStableCallback } from './use-stable-callback';
import { useResizeObserver } from './use-resize-observer';

export function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState<
    'top' | 'bottom' | 'middle' | undefined
  >(undefined);

  const determineScrollPosition = useStableCallback(
    (element: HTMLDivElement) => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const isScrollable = scrollHeight > clientHeight;

      if (!isScrollable) {
        // Reset scroll position if the content is not scrollable anymore
        setScrollPosition(undefined);
        return;
      }

      const isAtTop = scrollTop <= 0;
      const isAtBottom =
        Math.ceil(scrollHeight) - Math.ceil(scrollTop) <=
        Math.ceil(clientHeight);

      let position: 'top' | 'bottom' | 'middle';

      if (isAtTop) {
        position = 'top';
      } else if (isAtBottom) {
        position = 'bottom';
      } else {
        position = 'middle';
      }

      setScrollPosition(position);
    }
  );

  const [internalRef, setInternalRef] = useState<HTMLDivElement | null>(null);

  const { observeRef } = useResizeObserver(
    () => internalRef && determineScrollPosition(internalRef)
  );

  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setInternalRef(el);
      observeRef(el);
    },
    [observeRef]
  );

  const ref = useMemo(
    () => Object.assign(mergedRef, { current: internalRef }),
    [mergedRef, internalRef]
  ) as RefObject<HTMLDivElement>;

  useEffect(() => {
    const element = internalRef;
    if (!element) return;

    let scrollTimeout: number | null = null;

    function onScroll(event: Event) {
      if (event.currentTarget instanceof HTMLDivElement) {
        const el = event.currentTarget;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        // Debounce the scroll handler
        scrollTimeout = setTimeout(() => determineScrollPosition(el), 32);
      }
    }

    function onTouchStart(event: Event) {
      if (event.currentTarget instanceof HTMLDivElement) {
        determineScrollPosition(event.currentTarget);
      }
    }

    determineScrollPosition(element);

    element.addEventListener('scroll', onScroll);
    element.addEventListener('touchstart', onTouchStart);

    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      element.removeEventListener('scroll', onScroll);
      element.removeEventListener('touchstart', onTouchStart);
    };
  }, [internalRef]);

  return { ref, scrollPosition };
}
