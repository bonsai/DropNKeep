// Handles drag & drop, reads text files and sends content to the Keep client.
(function () {
  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

  function initDropOverlay() {
    if (document.getElementById('dropnkeep-overlay')) return;

    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = chrome.runtime.getURL('assets/styles/overlay.css');
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'dropnkeep-overlay';
    overlay.className = 'dropnkeep-overlay';
    overlay.innerHTML = '<div class="dropnkeep-inner">Drop .txt file here to create a Keep note</div>';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);

    setupListeners(overlay);
  }

  function setupListeners(overlay) {
    let counter = 0;
    function show() { overlay.style.display = 'flex'; }
    function hide() { overlay.style.display = 'none'; }

    window.addEventListener('dragenter', (e) => {
      counter++;
      if (hasFiles(e)) show();
    }, {passive: true});

    window.addEventListener('dragleave', (e) => {
      counter--;
      if (counter <= 0) { counter = 0; hide(); }
    }, {passive: true});

    window.addEventListener('dragover', (e) => {
      if (hasFiles(e)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        show();
      }
    }, {passive: false});

    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      hide();
      counter = 0;

      const files = Array.from(e.dataTransfer.files || []);
      if (files.length === 0) return;

      // Only handle the first .txt file for Phase 1
      const file = files.find(f => f.name && f.name.toLowerCase().endsWith('.txt')) || files[0];
      if (!file) return;

      if (file.size > MAX_SIZE_BYTES) {
        alert('File is too large (max 10MB)');
        return;
      }

      try {
        const buffer = await readFileAsArrayBuffer(file);
        const text = detectAndDecode(buffer);
        const useFilenameAsTitle = await getSetting('useFilenameAsTitle', true);
        const title = useFilenameAsTitle ? file.name.replace(/\.txt$/i, '') : '';

        const res = await window.DropNKeep.createNote(title, text);
        if (res && res.success) {
          toast('Note created successfully');
        } else {
          toast('Failed to create note: ' + (res && res.error ? res.error : 'unknown'));
        }
      } catch (err) {
        console.error(err);
        alert('Failed to read file: ' + err.message);
      }
    }, {passive: false});
  }

  function hasFiles(e) {
    const dt = e.dataTransfer;
    if (!dt) return false;
    return Array.from(dt.types || []).indexOf && Array.from(dt.types).indexOf('Files') !== -1;
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsArrayBuffer(file);
    });
  }

  function detectAndDecode(buffer) {
    // Try UTF-8, fall back to shift_jis if available, otherwise use latin1
    let decoded = '';
    try {
      decoded = new TextDecoder('utf-8', {fatal: true}).decode(buffer);
      return decoded;
    } catch (e) {
      try {
        // Some browsers support shift_jis in TextDecoder
        decoded = new TextDecoder('shift_jis').decode(buffer);
        return decoded;
      } catch (e2) {
        // Fallback: decode as latin1 and replace unknowns
        decoded = new TextDecoder('windows-1252').decode(buffer);
        return decoded;
      }
    }
  }

  function toast(msg, ms = 2500) {
    const existing = document.getElementById('dropnkeep-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'dropnkeep-toast';
    t.className = 'dropnkeep-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('visible'), 10);
    setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); }, ms);
  }

  function getSetting(key, fallback) {
    return new Promise((resolve) => {
      chrome.storage.local.get({[key]: fallback}, (items) => resolve(items[key]));
    });
  }

  // Initialize
  initDropOverlay();
})();