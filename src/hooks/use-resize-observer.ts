import { useEffect, useRef, useState } from 'react';
import { useStableCallback } from './use-stable-callback';

export function useResizeObserver<T extends Element = HTMLDivElement>(
  callback: ResizeObserverCallback
) {
  const [observeElement, setObserveElement] = useState<T | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback: ResizeObserverCallback = useStableCallback(
    (entries, observer) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(entries, observer), 32);
    }
  );

  useEffect(() => {
    const element = observeElement;
    if (!element) return;

    const observer = new ResizeObserver(debouncedCallback);
    observer.observe(element, { box: 'border-box' });

    return () => {
      observer.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [observeElement]);

  return { observeRef: setObserveElement };
}
