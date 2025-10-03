import { useEffect, useState } from 'react';
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

  const { observeRef: ref } = useResizeObserver(
    () => ref.current && determineScrollPosition(ref.current)
  );

  useEffect(() => {
    const element = ref.current;
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
  }, []);

  return { ref, scrollPosition };
}
