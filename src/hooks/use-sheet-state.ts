import { useEffect, useRef, useState } from 'react';
import { useStableCallback } from './use-stable-callback';

type SheetState = 'closed' | 'opening' | 'open' | 'closing';

type UseSheetStatesProps = {
  isOpen: boolean;
  onClosed?: () => Promise<void> | void;
  onOpening?: () => Promise<void> | void;
  onOpen?: () => Promise<void> | void;
  onClosing?: () => Promise<void> | void;
};

export function useSheetState({
  isOpen,
  onClosed: _onClosed,
  onOpening: _onOpening,
  onOpen: _onOpen,
  onClosing: _onClosing,
}: UseSheetStatesProps) {
  const [state, setState] = useState<SheetState>(isOpen ? 'opening' : 'closed');
  const abortControllerRef = useRef<AbortController | null>(null);
  const onClosed = useStableCallback(() => _onClosed?.());
  const onOpening = useStableCallback(() => _onOpening?.());
  const onOpen = useStableCallback(() => _onOpen?.());
  const onClosing = useStableCallback(() => _onClosing?.());

  useEffect(() => {
    abortControllerRef.current?.abort();
    setState(isOpen ? 'opening' : 'closing');
  }, [isOpen]);

  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    async function handle() {
      switch (state) {
        case 'closed':
          await onClosed?.();
          break;

        case 'opening':
          await onOpening?.();
          if (!abortController.signal.aborted) setState('open');
          break;

        case 'open':
          await onOpen?.();
          break;

        case 'closing':
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
  }, [state]);

  return state;
}
