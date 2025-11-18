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

export const SheetContainer = forwardRef<any, SheetContainerProps>(
  ({ children, style, className = '', unstyled, ...rest }, ref) => {
    const sheetContext = useSheetContext();

    const isUnstyled = unstyled ?? sheetContext.unstyled;

    const sheetHeightConstraint = sheetContext.sheetHeightConstraint;

    // y might be negative due to elastic
    // for a better experience, we clamp the y value to 0
    // and use the overflow value to add padding to the bottom of the container
    // causing the illusion of the sheet being elastic
    const y = sheetContext.y;
    const nonNegativeY = useTransform(sheetContext.y, (val) =>
      Math.max(0, val)
    );

    const { windowHeight } = useDimensions();
    const didHitMaxHeight =
      windowHeight - sheetHeightConstraint <= sheetContext.sheetHeight;

    const containerStyle: MotionStyle = {
      // Use motion template for performant CSS variable updates
      '--overflow': useMotionTemplate`${sheetContext.yOverflow}px`,
      ...applyStyles(styles.container, isUnstyled),
      ...style,
      ...(isUnstyled
        ? {
            y,
          }
        : {
            y: nonNegativeY,
            // compensate height for the elastic behavior of the sheet
            ...(!didHitMaxHeight && { paddingBottom: sheetContext.yOverflow }),
          }),
    } as any;

    if (sheetContext.detent === 'default') {
      containerStyle.height = DEFAULT_HEIGHT;
    }

    if (sheetContext.detent === 'full') {
      containerStyle.height = '100%';
      containerStyle.maxHeight = '100%';
    }

    if (sheetContext.detent === 'content') {
      containerStyle.height = 'auto';
      containerStyle.maxHeight = DEFAULT_HEIGHT;
    }

    return (
      <motion.div
        {...rest}
        ref={mergeRefs([
          ref,
          sheetContext.sheetRef,
          sheetContext.sheetBoundsRef,
        ])}
        className={`react-modal-sheet-container ${className}`}
        style={containerStyle}
      >
        {children}
      </motion.div>
    );
  }
);

SheetContainer.displayName = 'SheetContainer';
