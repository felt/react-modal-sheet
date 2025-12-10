import {
  type Ref,
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type FunctionComponent,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  type RefObject,
} from 'react';

import {
  type DragHandler,
  type EasingDefinition,
  type MotionValue,
  type motion,
} from 'motion/react';

export type SheetDetent = 'default' | 'full' | 'content';

type CommonProps = {
  className?: string;
  unstyled?: boolean;
};

type MotionProps = ComponentPropsWithoutRef<typeof motion.div>;

type MotionCommonProps = Omit<
  MotionProps,
  'initial' | 'animate' | 'exit' | 'dragConstraints'
>;

export interface SheetTweenConfig {
  ease: EasingDefinition;
  duration: number;
}

export type SheetProps = {
  unstyled?: boolean;
  avoidKeyboard?: boolean;
  onKeyboardOpen?: (() => VoidFunction) | (() => void);
  children: ReactNode;
  detent?: SheetDetent;
  disableDismiss?: boolean;
  disableClose?: boolean;
  disableDrag?: boolean;
  disableScrollLocking?: boolean;
  disableCloseOnEscape?: boolean;
  dragCloseThreshold?: number;
  dragVelocityThreshold?: number;
  safeSpace?: Partial<{ top: number; bottom: number }>; // pixels
  initialSnap?: number; // index of snap points array
  isOpen: boolean;
  modalEffectRootId?: string;
  modalEffectThreshold?: number;
  mountPoint?: Element;
  prefersReducedMotion?: boolean;
  snapPoints?: number[];
  tweenConfig?: SheetTweenConfig;
  skipOpenAnimation?: boolean;
  onClose: () => void;
  onCloseEnd?: () => void;
  onCloseStart?: () => void;
  onOpenEnd?: () => void;
  onOpenStart?: () => void;
  onSnap?: (index: number) => void;
  inert?: '';
} & MotionCommonProps;

export type SheetContainerProps = MotionCommonProps &
  CommonProps & {
    children: ReactNode;
    renderAbove?: ReactNode;
    positionerRef?: Ref<HTMLDivElement>;
  };

export type SheetHeaderProps = MotionCommonProps &
  CommonProps & {
    children?: ReactNode;
    disableDrag?: boolean;
  };

export type SheetContentProps = MotionCommonProps &
  CommonProps & {
    disableDrag?: boolean | ((args: SheetStateInfo) => boolean);
    disableScroll?: boolean | ((args: SheetStateInfo) => boolean);
    scrollRef?: RefObject<HTMLDivElement | null>;
    avoidKeyboard?: boolean;
  };

export type SheetBackdropProps = MotionProps &
  CommonProps & {
    disableAnimation?: boolean;
  };

export type SheetDragIndicatorProps = HTMLAttributes<HTMLDivElement> &
  CommonProps;

export interface SheetDragProps {
  drag: 'y';
  dragElastic: number;
  dragMomentum: boolean;
  dragPropagation: boolean;
  onDrag: DragHandler;
  onDragStart: DragHandler;
  onDragEnd: DragHandler;
}

export type SheetStateInfo = {
  scrollPosition?: 'top' | 'bottom' | 'middle';
  currentSnap?: number;
};

export type SheetSnapPoint = {
  snapIndex: number;
  snapValue: number; // Absolute value from the bottom of the sheet
  snapValueY: number; // Y value is inverted as `y = 0` means sheet is at the top
};

export interface SheetContextType {
  currentSnap?: number;
  detent: SheetDetent;
  disableDrag: boolean;
  dragProps?: SheetDragProps;
  indicatorRotation: MotionValue<number>;
  avoidKeyboard: boolean;
  sheetBoundsRef: (node: HTMLDivElement | null) => void;
  positionerRef: RefObject<HTMLDivElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  unstyled: boolean;
  y: MotionValue<any>;
  yOverflow: MotionValue<number>;
  sheetHeight: number;
  safeSpaceTop: number;
  safeSpaceBottom: number;
}

export interface SheetScrollerContextType {
  disableDrag: boolean;
  setDragDisabled: () => void;
  setDragEnabled: () => void;
}

type SheetComponent = ForwardRefExoticComponent<
  SheetProps & RefAttributes<any>
>;

type ContainerComponent = ForwardRefExoticComponent<
  SheetContainerProps & RefAttributes<any>
>;

type HeaderComponent = ForwardRefExoticComponent<
  SheetHeaderProps & RefAttributes<any>
>;

type BackdropComponent = ForwardRefExoticComponent<
  SheetBackdropProps & RefAttributes<any>
>;

type ContentComponent = ForwardRefExoticComponent<
  SheetContentProps & RefAttributes<any>
>;

interface SheetCompoundComponent {
  Container: ContainerComponent;
  Header: HeaderComponent;
  DragIndicator: FunctionComponent<SheetDragIndicatorProps>;
  Content: ContentComponent;
  Backdrop: BackdropComponent;
}

export type SheetCompound = SheetComponent & SheetCompoundComponent;
