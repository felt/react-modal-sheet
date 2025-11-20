import {
  animate,
  Axis,
  type DragHandler,
  motion,
  type Transition,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import useMeasure from 'react-use-measure';

import {
  DEFAULT_DRAG_CLOSE_THRESHOLD,
  DEFAULT_DRAG_VELOCITY_THRESHOLD,
  DEFAULT_TOP_CONSTRAINT,
  DEFAULT_TWEEN_CONFIG,
  IS_SSR,
  REDUCED_MOTION_TWEEN_CONFIG,
} from './constants';
import { SheetContext } from './context';
import { useDimensions } from './hooks/use-dimensions';
import { useModalEffect } from './hooks/use-modal-effect';
import { usePreventScroll } from './hooks/use-prevent-scroll';
import { useSheetState } from './hooks/use-sheet-state';
import { useStableCallback } from './hooks/use-stable-callback';
import { useVirtualKeyboard } from './hooks/use-virtual-keyboard';
import {
  computeSnapPoints,
  handleHighVelocityDrag,
  handleLowVelocityDrag,
} from './snap';
import { styles } from './styles';
import { type SheetContextType, type SheetProps } from './types';
import { applyConstraints, applyStyles, waitForElement } from './utils';
import { useSafeAreaInsets } from './hooks/use-safe-area-insets';

export const Sheet = forwardRef<any, SheetProps>(
  (
    {
      avoidKeyboard = true,
      children,
      className = '',
      detent = 'default',
      disableDismiss = false,
      disableDrag: disableDragProp = false,
      disableScrollLocking = false,
      dragCloseThreshold = DEFAULT_DRAG_CLOSE_THRESHOLD,
      dragVelocityThreshold = DEFAULT_DRAG_VELOCITY_THRESHOLD,
      initialSnap,
      isOpen,
      modalEffectRootId,
      modalEffectThreshold,
      mountPoint,
      prefersReducedMotion = false,
      snapPoints: snapPointsProp,
      style,
      tweenConfig = DEFAULT_TWEEN_CONFIG,
      unstyled = false,
      safeSpace: safeSpaceProp,
      onOpenStart,
      onOpenEnd,
      onClose,
      onCloseStart,
      onCloseEnd,
      onSnap,
      onDrag: onDragProp,
      onDragStart: onDragStartProp,
      onDragEnd: onDragEndProp,
      onKeyboardOpen,
      ...rest
    },
    ref
  ) => {
    const { windowHeight } = useDimensions();
    const safeAreaInsets = useSafeAreaInsets();

    const [sheetBoundsRef, sheetBounds] = useMeasure();
    const sheetRef = useRef<HTMLDivElement>(null);
    const sheetHeight = Math.round(sheetBounds.height);
    const [currentSnap, setCurrentSnap] = useState(initialSnap);

    const safeSpaceTop =
      detent === 'full' ? 0 : (safeSpaceProp?.top ?? DEFAULT_TOP_CONSTRAINT);

    const safeSpaceBottom = safeSpaceProp?.bottom ?? 0;

    const minSnapValue = safeSpaceBottom
      ? safeSpaceBottom + safeAreaInsets.bottom
      : 0;
    const maxSnapValueOnDefaultDetent =
      windowHeight - safeSpaceTop - safeAreaInsets.top;
    const maxSnapValue =
      detent === 'full' || detent === 'content'
        ? windowHeight
        : maxSnapValueOnDefaultDetent;

    const dragConstraints: Axis = {
      min:
        detent === 'full' || detent === 'content'
          ? 0
          : safeSpaceTop + safeAreaInsets.top, // top constraint (applied through sheet height instead)
      max: windowHeight - safeSpaceBottom - safeAreaInsets.bottom, // bottom constraint
    };

    const snapPoints = useMemo(() => {
      return snapPointsProp && sheetHeight > 0
        ? computeSnapPoints({
            sheetHeight,
            snapPointsProp,
            minSnapValue,
            maxSnapValue,
          })
        : [];
    }, [sheetHeight, snapPointsProp, minSnapValue, maxSnapValue]);

    const closedY = sheetHeight > 0 ? sheetHeight : windowHeight;
    const y = useMotionValue(closedY);
    const yUnconstrainedRef = useRef<number | undefined>(undefined);
    // y is below 0 when the sheet is overextended
    // this happens because the sheet is elastic and can be dragged beyond the full open position
    const yOverflow = useTransform(y, (val) => (val < 0 ? Math.abs(val) : 0));
    const yInverted = useTransform(y, (val) => Math.max(sheetHeight - val, 0));
    const indicatorRotation = useMotionValue(0);

    const shouldReduceMotion = useReducedMotion();
    const reduceMotion = Boolean(prefersReducedMotion || shouldReduceMotion);
    const animationOptions: Transition = {
      type: 'tween',
      ...(reduceMotion ? REDUCED_MOTION_TWEEN_CONFIG : tweenConfig),
    };

    const keyboard = useVirtualKeyboard({
      isEnabled: isOpen && avoidKeyboard,
      containerRef: sheetRef,
      debounceDelay: 0,
    });

    // Disable drag if the keyboard is open to avoid weird behavior
    const disableDrag = keyboard.isKeyboardOpen || disableDragProp;

    // +2 for tolerance in case the animated value is slightly off
    const zIndex = useTransform(y, (val) =>
      val + 2 >= closedY ? -1 : (style?.zIndex ?? 9999)
    );
    const visibility = useTransform(y, (val) =>
      val + 2 >= closedY ? 'hidden' : 'visible'
    );

    const updateSnap = useStableCallback((snapIndex: number) => {
      setCurrentSnap(snapIndex);
      onSnap?.(snapIndex);
    });

    const getSnapPoint = useStableCallback((snapIndex: number) => {
      if (snapPointsProp && snapPoints) {
        if (snapIndex < 0 || snapIndex >= snapPoints.length) {
          console.warn(
            `Invalid snap index ${snapIndex}. Snap points are: [${snapPointsProp.join(', ')}] and their computed values are: [${snapPoints
              .map((point) => point.snapValue)
              .join(', ')}]`
          );
          return null;
        }
        return snapPoints[snapIndex];
      }
      return null;
    });

    const snapTo = useStableCallback(
      async (snapIndex: number, options?: { immediate?: boolean }) => {
        if (!snapPointsProp) {
          console.warn('Snapping is not possible without `snapPoints` prop.');
          return;
        }

        const snapPoint = getSnapPoint(snapIndex);

        if (snapPoint === null) {
          console.warn(`Invalid snap index ${snapIndex}.`);
          return;
        }

        if (snapIndex === 0) {
          onClose();
          return;
        }

        if (options?.immediate) {
          y.set(snapPoint.snapValueY);
          updateSnap(snapIndex);
          return;
        }

        await animate(y, snapPoint.snapValueY, {
          ...animationOptions,
          onComplete: () => updateSnap(snapIndex),
        });
      }
    );

    const blurActiveInput = useStableCallback(() => {
      // Find focused input inside the sheet and blur it when dragging starts
      // to prevent a weird ghost caret "bug" on mobile
      const focusedElement = document.activeElement as HTMLElement | null;
      if (!focusedElement || !sheetRef.current) return;

      const isInput =
        focusedElement.tagName === 'INPUT' ||
        focusedElement.tagName === 'TEXTAREA';

      // Only blur the focused element if it's inside the sheet
      if (isInput && sheetRef.current.contains(focusedElement)) {
        focusedElement.blur();
      }
    });

    const onDrag = useStableCallback<DragHandler>((event, info) => {
      if (yUnconstrainedRef.current === undefined) return;

      onDragProp?.(event, info);
      if (event.defaultPrevented) return;

      // Update drag indicator rotation based on drag velocity
      const velocity = y.getVelocity();
      if (velocity > 0) indicatorRotation.set(10);
      if (velocity < 0) indicatorRotation.set(-10);

      const currentY = yUnconstrainedRef.current;
      const nextY = currentY + info.delta.y;
      yUnconstrainedRef.current = nextY;
      const constrainedY = applyConstraints(nextY, dragConstraints, {
        min: 0.1,
        max: 0.1,
      });
      y.set(constrainedY);
    });

    const onDragStart = useStableCallback<DragHandler>((event, info) => {
      yUnconstrainedRef.current = y.get();
      if (y.isAnimating()) {
        y.stop();
      }
      onDragStartProp?.(event, info);
      if (event.defaultPrevented) return;
      blurActiveInput();
    });

    const onDragEnd = useStableCallback<DragHandler>((event, info) => {
      onDragEndProp?.(event, info);
      if (event.defaultPrevented) return;
      blurActiveInput();

      const currentY = y.get();

      let yTo = 0;
      let snapIndex: number | undefined;

      const currentSnapPoint =
        currentSnap !== undefined ? getSnapPoint(currentSnap) : null;

      if (currentSnapPoint) {
        const dragOffsetDirection = info.offset.y > 0 ? 'down' : 'up';
        const dragVelocityDirection = info.velocity.y > 0 ? 'down' : 'up';
        const isHighVelocity =
          Math.abs(info.velocity.y) > dragVelocityThreshold;

        let result: { yTo: number; snapIndex: number | undefined };

        if (isHighVelocity) {
          result = handleHighVelocityDrag({
            snapPoints,
            dragDirection: dragVelocityDirection,
          });
        } else {
          result = handleLowVelocityDrag({
            currentSnapPoint,
            currentY,
            dragDirection: dragOffsetDirection,
            snapPoints,
            velocity: info.velocity.y,
          });
        }

        yTo = result.yTo;
        snapIndex = result.snapIndex;

        // If disableDismiss is true, prevent closing via gesture
        if (disableDismiss && yTo + 1 >= sheetHeight) {
          // Use the bottom-most open snap point
          const bottomSnapPoint = snapPoints.find((s) => s.snapValue > 0);

          if (bottomSnapPoint) {
            yTo = bottomSnapPoint.snapValueY;
            snapIndex = bottomSnapPoint.snapIndex;
            updateSnap(bottomSnapPoint.snapIndex);
          } else {
            // If no open snap points available, stay at current position
            yTo = currentY;
          }
        } else if (result.snapIndex !== undefined) {
          updateSnap(result.snapIndex);
        }
      } else if (
        info.velocity.y > dragVelocityThreshold ||
        currentY > sheetHeight * dragCloseThreshold
      ) {
        // Close the sheet if dragged past the threshold or if the velocity is high enough
        // But only if disableDismiss is false
        if (disableDismiss) {
          // If disableDismiss, snap back to the open position
          yTo = 0;
        } else {
          yTo = closedY;
        }
      }

      const shouldBounce = currentSnapPoint?.snapIndex !== snapIndex;

      const bounce = shouldBounce
        ? linear(Math.abs(info.velocity.y), 0, 1000, 0.175, 0.25)
        : 0;

      // Update the spring value so that the sheet is animated to the snap point
      animate(y, yTo, { ...animationOptions, bounce });
      yUnconstrainedRef.current = undefined;

      // +1px for imprecision tolerance
      // Only call onClose if disableDismiss is false or if we're actually closing
      if (yTo + 1 >= sheetHeight && !disableDismiss) {
        onClose();
      }

      // Reset indicator rotation after dragging
      indicatorRotation.set(0);
    });

    const openStateRef = useRef<'closed' | 'open' | 'opening' | 'closing'>(
      isOpen ? 'opening' : 'closed'
    );

    const currentSnapPoint = currentSnap ? getSnapPoint(currentSnap) : null;

    useImperativeHandle(
      ref,
      () => ({
        y,
        yInverted,
        height: sheetHeight,
        snapTo,
        getSnapPoint,
        snapPoints,
        currentSnap,
        currentSnapPoint,
        openStateRef,
      }),
      [
        y,
        yInverted,
        sheetHeight,
        snapTo,
        getSnapPoint,
        snapPoints,
        currentSnap,
        currentSnapPoint,
        openStateRef,
      ]
    );

    useModalEffect({
      y,
      detent,
      sheetHeight,
      snapPoints,
      rootId: modalEffectRootId,
      startThreshold: modalEffectThreshold,
    });

    const lastSnapPointIndex = snapPoints.length - 1;

    const handleKeyboardOpen = useStableCallback(() => {
      if (!onKeyboardOpen) {
        const currentSnapPoint = currentSnap;
        if (currentSnapPoint === lastSnapPointIndex) return;

        // fully open the sheet
        snapTo(lastSnapPointIndex, { immediate: true });

        // restore the previous snap point once the keyboard is closed
        return () => {
          currentSnapPoint !== undefined &&
            snapTo(currentSnapPoint, { immediate: true });
        };
      }

      return onKeyboardOpen();
    });

    useEffect(() => {
      if (openStateRef.current !== 'open') return;
      if (detent !== 'default') return;
      if (!keyboard.isKeyboardOpen) return;
      return handleKeyboardOpen();
    }, [keyboard.isKeyboardOpen]);

    // keep the sheet at the current snap point if it changes
    const currentSnapPointY = currentSnap
      ? getSnapPoint(currentSnap)?.snapValueY
      : null;
    useEffect(() => {
      if (currentSnapPointY === undefined) return;
      if (currentSnapPointY === null) return;
      if (openStateRef.current !== 'open') return;
      animate(y, currentSnapPointY);
    }, [currentSnapPointY]);

    /**
     * Motion should handle body scroll locking but it's not working properly on iOS.
     * Scroll locking from React Aria seems to work much better 🤷‍♂️
     */
    usePreventScroll({
      isDisabled: disableScrollLocking || !isOpen,
    });

    const yListenersRef = useRef<VoidFunction[]>([]);
    const clearYListeners = useStableCallback(() => {
      yListenersRef.current.forEach((listener) => listener());
      yListenersRef.current = [];
    });

    const state = useSheetState({
      isOpen,
      onOpen: () => {
        return new Promise((resolve, reject) => {
          clearYListeners();

          openStateRef.current = 'opening';
          y.stop();
          onOpenStart?.();

          const handleOpenEnd = () => {
            if (initialSnap !== undefined) {
              updateSnap(initialSnap);
            }

            onOpenEnd?.();
            openStateRef.current = 'open';
          };

          yListenersRef.current.push(
            y.on('animationCancel', () => {
              clearYListeners();

              if (openStateRef.current === 'opening') {
                handleOpenEnd();
                resolve();
              } else {
                reject('stopped opening');
              }
            }),
            y.on('animationComplete', () => {
              clearYListeners();

              handleOpenEnd();
              resolve();
            })
          );

          /**
           * This is not very React-y but we need to wait for the sheet
           * but we need to wait for the sheet to be rendered and visible
           * before we can measure it and animate it to the initial snap point.
           */
          waitForElement('react-modal-sheet-container').then(() => {
            const initialSnapPoint =
              initialSnap !== undefined ? getSnapPoint(initialSnap) : null;

            if (!initialSnapPoint) {
              console.warn(
                'No initial snap point found',
                initialSnap,
                snapPoints
              );
              clearYListeners();
              handleOpenEnd();
              resolve();
              return;
            }

            animate(y, initialSnapPoint.snapValueY, animationOptions);
          });
        });
      },
      onClosing: () => {
        return new Promise((resolve, reject) => {
          clearYListeners();

          y.stop();
          openStateRef.current = 'closing';
          onCloseStart?.();

          const handleCloseEnd = () => {
            if (onCloseEnd) {
              // waiting a frame to ensure the sheet is fully closed
              // otherwise it was causing some issue with AnimatePresence's safeToRemove
              requestAnimationFrame(() => onCloseEnd());
            }
            openStateRef.current = 'closed';
          };

          yListenersRef.current.push(
            y.on('animationCancel', () => {
              clearYListeners();

              if (openStateRef.current === 'closing') {
                handleCloseEnd();
                resolve();
              } else {
                reject('stopped closing');
              }
            }),
            y.on('animationComplete', () => {
              clearYListeners();

              handleCloseEnd();
              resolve();
            })
          );

          animate(y, closedY, animationOptions);
        });
      },
    });

    const dragProps: SheetContextType['dragProps'] = {
      drag: 'y',
      dragElastic: 0,
      dragMomentum: false,
      dragPropagation: false,
      onDrag,
      onDragStart,
      onDragEnd,
    };

    const context: SheetContextType = {
      currentSnap,
      detent,
      disableDrag,
      dragProps,
      indicatorRotation,
      avoidKeyboard,
      sheetBoundsRef,
      sheetRef,
      unstyled,
      y,
      yOverflow,
      sheetHeight,
      safeSpaceTop: safeSpaceTop + safeAreaInsets.top,
      safeSpaceBottom: safeSpaceBottom + safeAreaInsets.bottom,
    };

    const sheet = (
      <SheetContext.Provider value={context}>
        <motion.div
          {...rest}
          ref={ref}
          data-sheet-state={state}
          className={`react-modal-sheet-root ${className}`}
          style={{
            ...applyStyles(styles.root, unstyled),
            zIndex,
            visibility,
            ...style,
          }}
        >
          {state !== 'closed' ? children : null}
        </motion.div>
      </SheetContext.Provider>
    );

    if (IS_SSR) return sheet;

    return createPortal(sheet, mountPoint ?? document.body);
  }
);

Sheet.displayName = 'Sheet';

function linear(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number
): number {
  const t = Math.max(
    0,
    Math.min(1, (value - inputMin) / (inputMax - inputMin))
  );
  return outputMin + (outputMax - outputMin) * t;
}
