import {
  type MotionStyle,
  motion,
  useMotionTemplate,
  useTransform,
} from 'motion/react';
import React, { forwardRef } from 'react';

import { DEFAULT_HEIGHT } from './constants';
import { useSheetContext } from './context';
import { styles } from './styles';
import { type SheetContainerProps } from './types';
import { applyStyles, mergeRefs } from './utils';
import { useDimensions } from './hooks/use-dimensions';

type SheetPositionerProps = {
  children: React.ReactNode;
};

export const SheetPositioner = forwardRef<HTMLDivElement, SheetPositionerProps>(
  ({ children }, ref) => {
    const sheetContext = useSheetContext();

    const isUnstyled = sheetContext.unstyled;

    // y might be negative due to elastic
    // for a better experience, we clamp the y value to 0
    // and use the overflow value to add padding to the bottom of the container
    // causing the illusion of the sheet being elastic
    const y = sheetContext.y;
    const nonNegativeY = useTransform(sheetContext.y, (val) =>
      Math.max(0, val)
    );

    const positionerStyle: MotionStyle = {
      // Use motion template for performant CSS variable updates
      '--overflow': useMotionTemplate`${sheetContext.yOverflow}px`,
      ...applyStyles(styles.positioner, isUnstyled),
      ...(isUnstyled ? { y } : { y: nonNegativeY }),
    } as any;

    if (sheetContext.detent === 'default') {
      positionerStyle.height = DEFAULT_HEIGHT;
    }

    if (sheetContext.detent === 'full') {
      positionerStyle.height = '100%';
      positionerStyle.maxHeight = '100%';
    }

    if (sheetContext.detent === 'content') {
      positionerStyle.height = 'auto';
      positionerStyle.maxHeight = `calc(${DEFAULT_HEIGHT} - ${sheetContext.safeSpaceTop}px)`;
    }

    if (sheetContext.detent === 'content-fixed') {
      // Use locked height if available, otherwise auto (during initial measurement)
      if (sheetContext.lockedContentHeight !== null) {
        positionerStyle.height = `${sheetContext.lockedContentHeight}px`;
      } else {
        positionerStyle.height = 'auto';
      }
      positionerStyle.maxHeight = `calc(${DEFAULT_HEIGHT} - ${sheetContext.safeSpaceTop}px)`;
    }

    return (
      <motion.div
        ref={mergeRefs([
          sheetContext.positionerRef,
          sheetContext.sheetBoundsRef,
          ref,
        ])}
        className="react-modal-sheet-positioner"
        style={positionerStyle}
      >
        {children}
      </motion.div>
    );
  }
);

SheetPositioner.displayName = 'SheetPositioner';

export const SheetContainer = forwardRef<HTMLDivElement, SheetContainerProps>(
  (
    {
      children,
      style,
      className = '',
      unstyled,
      renderAbove,
      positionerRef,
      ...rest
    },
    ref
  ) => {
    const sheetContext = useSheetContext();
    const containerRef = sheetContext.containerRef;

    const isUnstyled = unstyled ?? sheetContext.unstyled;

    const { windowHeight } = useDimensions();
    const didHitMaxHeight =
      windowHeight - sheetContext.safeSpaceTop <= sheetContext.sheetHeight;

    const containerStyle: MotionStyle = {
      ...applyStyles(styles.container, isUnstyled),
      ...style,
      // compensate height for the elastic behavior of the sheet
      ...(!didHitMaxHeight && { paddingBottom: sheetContext.yOverflow }),
      // Ensure the container sits above the "above" element
      position: 'relative',
      zIndex: 1,
    };

    // Animate the translateY of the above element so it slides down behind the sheet as it closes
    // The minimum y value (fully open) depends on the detent type
    const isContentDetent =
      sheetContext.detent === 'content' ||
      sheetContext.detent === 'content-fixed';
    const minY =
      sheetContext.detent === 'full' || isContentDetent
        ? 0
        : sheetContext.safeSpaceTop;

    // When y is at minY (fully open), translateY is -100% (above the sheet)
    // As y increases (sheet closing), translateY moves toward 0% (behind the sheet)
    const aboveTranslateYPercent = useTransform(
      sheetContext.y,
      [minY, sheetContext.sheetHeight],
      [-100, 0]
    );
    const aboveTranslateY = useMotionTemplate`translateY(${aboveTranslateYPercent}%)`;

    return (
      <SheetPositioner ref={positionerRef}>
        {renderAbove && (
          <motion.div
            className="react-modal-sheet-above"
            style={{
              position: 'absolute',
              transform: aboveTranslateY,
              width: '100%',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            {renderAbove}
          </motion.div>
        )}
        <motion.div
          {...rest}
          ref={mergeRefs([ref, containerRef])}
          className={`react-modal-sheet-container ${className}`}
          style={containerStyle}
        >
          {children}
        </motion.div>
      </SheetPositioner>
    );
  }
);

SheetContainer.displayName = 'SheetContainer';
