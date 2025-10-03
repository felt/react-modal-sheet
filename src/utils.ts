import { type CSSProperties, type ForwardedRef, type RefCallback } from 'react';
import { IS_SSR } from './constants';
import type { Axis } from 'motion/react';
import { mixNumber } from 'motion/react';

export function applyStyles(
  styles: { base: CSSProperties; decorative: CSSProperties },
  unstyled: boolean
) {
  return unstyled ? styles.base : { ...styles.base, ...styles.decorative };
}

export function isAscendingOrder(arr: number[]) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i + 1] < arr[i]) return false;
  }
  return true;
}

export function mergeRefs<T = any>(refs: ForwardedRef<T>[]): RefCallback<T> {
  return (value: any) => {
    refs.forEach((ref: any) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref) {
        ref.current = value;
      }
    });
  };
}

export function isTouchDevice() {
  if (IS_SSR) return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function testPlatform(re: RegExp) {
  return typeof window !== 'undefined' && window.navigator != null
    ? re.test(
        // @ts-expect-error
        window.navigator.userAgentData?.platform || window.navigator.platform
      )
    : false;
}

function cached(fn: () => boolean) {
  let res: boolean | null = null;
  return () => {
    if (res == null) {
      res = fn();
    }
    return res;
  };
}

const isMac = cached(function () {
  return testPlatform(/^Mac/i);
});

const isIPhone = cached(function () {
  return testPlatform(/^iPhone/i);
});

const isIPad = cached(function () {
  // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
  return testPlatform(/^iPad/i) || (isMac() && navigator.maxTouchPoints > 1);
});

export const isIOS = cached(function () {
  return isIPhone() || isIPad();
});

/** Wait for an element to be rendered and visible */
export function waitForElement(
  className: string,
  interval = 50,
  maxAttempts = 20
) {
  return new Promise<HTMLElement | null>((resolve) => {
    let attempts = 0;
    const timer = setInterval(() => {
      const element = document.getElementsByClassName(
        className
      )[0] as HTMLElement;
      attempts++;
      if (element || attempts >= maxAttempts) {
        clearInterval(timer);
        resolve(element);
      }
    }, interval);
  });
}

// source: https://github.com/motiondivision/motion/blob/main/packages/framer-motion/src/gestures/drag/utils/constraints.ts#L18
/**
 * Apply constraints to a point. These constraints are both physical along an
 * axis, and an elastic factor that determines how much to constrain the point
 * by if it does lie outside the defined parameters.
 */
export function applyConstraints(
  point: number,
  { min, max }: Partial<Axis>,
  elastic?: Axis
): number {
  if (min !== undefined && point < min) {
    // If we have a min point defined, and this is outside of that, constrain
    point = elastic ? mixNumber(min, point, elastic.min) : Math.max(point, min);
  } else if (max !== undefined && point > max) {
    // If we have a max point defined, and this is outside of that, constrain
    point = elastic ? mixNumber(max, point, elastic.max) : Math.min(point, max);
  }

  return point;
}
