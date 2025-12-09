# DropNKeep (Phase 1)

DropNKeep is a Chrome extension to drag & drop local .txt files into Google Keep to create new notes.

Installation (unpacked):
1. Build (if bundling) or use these files directly.
2. Visit chrome://extensions and enable Developer mode.
3. Click "Load unpacked" and select the extension folder.
4. Open https://keep.google.com and drop a .txt file onto the window.

Notes:
- This Phase 1 implementation uses DOM automation to create notes (no official Keep API).
- Encoding detection tries UTF-8 then Shift_JIS then windows-1252 as fallbacks.
- Selectors may need adjustments if Google Keep's DOM changes.