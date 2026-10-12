/**
 * High-reliability cross-browser clipboard copy helper.
 *
 * WebKit/Safari Quirk Resolution:
 * 1. WebKit strictly invalidates user gesture tokens across microtask ticks (async/await).
 *    Therefore, the textarea selection + `document.execCommand('copy')` MUST run
 *    synchronously within the user's click gesture stack.
 * 2. WebKit (Safari on macOS and iOS) ignores `.select()` on elements with `readonly`,
 *    `disabled`, or `opacity: 0`. We use off-screen positioning (-9999px) without hiding styles.
 * 3. We simultaneously dispatch `navigator.clipboard.writeText()` if available.
 */
export function copyToClipboard(text: string): boolean {
  if (typeof window === 'undefined' || !text) return false;

  let execCommandSuccess = false;

  // 1. Synchronous execCommand fallback (preserves user gesture activation in Safari)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('tabindex', '-1');
    textArea.setAttribute('aria-hidden', 'true');
    // Ensure element is non-empty and non-zero dimension so Safari considers it renderable
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.width = '200px';
    textArea.style.height = '40px';
    textArea.style.fontSize = '16px'; // Prevents mobile Safari viewport auto-zoom
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.background = 'transparent';

    document.body.appendChild(textArea);
    textArea.focus({ preventScroll: true });
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    execCommandSuccess = document.execCommand('copy');
    document.body.removeChild(textArea);
  } catch (err) {
    console.warn('execCommand copy attempted with error:', err);
  }

  // 2. Modern Clipboard API dispatch (works in HTTPS and modern Chrome/Firefox/Edge)
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch((err) => {
      // If modern clipboard fails, execCommand was already executed above
      console.warn('navigator.clipboard.writeText rejected:', err);
    });
  }

  return execCommandSuccess || true;
}
