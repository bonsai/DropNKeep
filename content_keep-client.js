// Lightweight Keep "client" implemented by DOM automation.
// NOTE: Google Keep doesn't provide a public browser API for creating notes,
// so we use DOM interactions. Selectors may need updates if Keep's UI changes.

(function () {
  window.DropNKeep = window.DropNKeep || {};

  /**
   * Create a new note in Google Keep with optional title and body.
   * Returns a Promise that resolves with an object {success: boolean, url?: string, error?: string}
   */
  async function createNote(title, body) {
    try {
      // Open the "Take a note" composer
      const takeNoteButton = document.querySelector('div[aria-label^="Take a note"], div[aria-label*="Take a note"], textarea[aria-label^="Take a note"], div[role="button"][data-se="create-note-button"]');
      if (takeNoteButton) {
        takeNoteButton.click();
      }

      // Wait for composer to appear
      await waitFor(() => document.querySelector('div[role="dialog"], div[role="textbox"], div[contenteditable="true"]'));

      // Keep often uses two contenteditable boxes: title and body.
      // Find visible contenteditable textboxes inside the composer.
      const composer = document.querySelector('div[role="dialog"]') || document.body;
      const textboxes = Array.from(composer.querySelectorAll('div[contenteditable="true"][role="textbox"]'))
        .filter(el => el.offsetParent !== null);

      // Fallback: any contenteditable in composer
      if (textboxes.length === 0) {
        const allCE = Array.from(composer.querySelectorAll('div[contenteditable="true"]')).filter(el => el.offsetParent !== null);
        if (allCE.length > 0) textboxes.push(...allCE);
      }

      // Try to set title and body
      if (title && textboxes[0]) {
        setEditableText(textboxes[0], title);
        // If there's a separate body, use the second textbox
        if (body && textboxes[1]) setEditableText(textboxes[1], body);
        else if (body && textboxes[0]) setEditableText(textboxes[0], title + '\n' + body);
      } else if (body && textboxes[0]) {
        setEditableText(textboxes[0], body);
      }

      // Click the close/save button (Keep auto-saves, but closing ensures note is stored)
      const closeButton = composer.querySelector('button[aria-label="Close"], div[aria-label="Close"], button[aria-label^="Close"]');
      if (closeButton) {
        closeButton.click();
      } else {
        // If no explicit close button, click outside to blur
        document.body.click();
      }

      // Wait a moment for Keep to save and update URL/list
      await sleep(800);

      return {success: true};
    } catch (err) {
      console.error('createNote error', err);
      return {success: false, error: String(err)};
    }
  }

  function setEditableText(el, text) {
    // Prefer setting innerText and dispatch input events so Keep notices changes.
    el.focus();
    // Clear existing content
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);

    // Insert text (use insertText to try to preserve proper events)
    if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
    } else {
      el.innerText = text;
      dispatchInputEvent(el);
    }
    dispatchInputEvent(el);
  }

  function dispatchInputEvent(target) {
    const ev = new Event('input', {bubbles: true});
    target.dispatchEvent(ev);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function waitFor(checkFn, timeout = 3000, interval = 100) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function poll() {
        if (checkFn()) return resolve();
        if (Date.now() - start > timeout) return reject(new Error('waitFor timeout'));
        setTimeout(poll, interval);
      })();
    });
  }

  window.DropNKeep.createNote = createNote;
})();