import { useEffect, useRef, useState } from 'react';
import { useStableCallback } from './use-stable-callback';

type SheetState = 'closed' | 'opening' | 'open' | 'closing';

type UseSheetStatesProps = {
  isOpen: boolean;
  onOpening?: () => Promise<void> | void;
  onClosing?: () => Promise<void> | void;
};

export function useSheetState({
  isOpen,
  onOpening: _onOpening,
  onClosing: _onClosing,
}: UseSheetStatesProps) {
  const [state, setState] = useState<SheetState>(isOpen ? 'opening' : 'closed');
  const abortControllerRef = useRef<AbortController | null>(null);
  const onOpening = useStableCallback(() => _onOpening?.());
  const onClosing = useStableCallback(() => _onClosing?.());

  useEffect(() => {
    abortControllerRef.current?.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    async function handle() {
      switch (isOpen) {
        case true:
          setState('opening');
          await onOpening?.();
          if (!abortController.signal.aborted) setState('open');
          break;

        case false:
          setState('closing');
          await onClosing?.();
          if (!abortController.signal.aborted) setState('closed');
          break;
      }
    }

    handle().catch((error) => {
      if (error instanceof Error) {
        console.error('Internal sheet state error:', error);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [isOpen]);

  return state;
}
