/**
 * Checks if an element is a text input
 */

export function isTextInput(el: Element | null): el is HTMLElement {
  return (
    el instanceof HTMLElement &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable)
  );
}
