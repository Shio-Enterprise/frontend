// Leva o foco a um elemento que não é focável por natureza (título, body) sem deixá-lo na
// ordem do Tab: o tabindex sai assim que o foco vai embora.
export function focusTemporarily(element) {
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1');
    element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true });
  }
  element.focus();
}
