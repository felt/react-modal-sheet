import type { MotionValue } from 'motion/react';

import { SheetBackdrop } from './SheetBackdrop';
import { SheetContainer } from './SheetContainer';
import { SheetContent } from './SheetContent';
import { SheetDragIndicator } from './SheetDragIndicator';
import { SheetHeader } from './SheetHeader';
import { Sheet as SheetBase } from './sheet';
import type { SheetCompound, SheetSnapPoint } from './types';
import { useScrollPosition } from './hooks/use-scroll-position';
import { useSafeAreaInsets } from './hooks/use-safe-area-insets';
import { RefObject } from 'react';

export interface SheetRef {
  y: MotionValue<number>;
  yInverted: MotionValue<number>;
  height: number;
  snapTo: (index: number, options?: { immediate?: boolean }) => Promise<void>;
  currentSnap: number | undefined;
  getSnapPoint: (index: number) => SheetSnapPoint | null;
  snapPoints: SheetSnapPoint[];
  currentSnapPoint: SheetSnapPoint | null;
  openStateRef: RefObject<'closed' | 'open' | 'opening' | 'closing'>;
}

export const Sheet: SheetCompound = Object.assign(SheetBase, {
  Container: SheetContainer,
  Header: SheetHeader,
  DragIndicator: SheetDragIndicator,
  Content: SheetContent,
  Backdrop: SheetBackdrop,
});

export { useScrollPosition, useSafeAreaInsets };

// Export types
export type {
  SheetBackdropProps,
  SheetContainerProps,
  SheetContentProps,
  SheetDetent,
  SheetDragIndicatorProps,
  SheetHeaderProps,
  SheetProps,
  SheetSnapPoint,
  SheetStateInfo,
  SheetTweenConfig,
} from './types';
