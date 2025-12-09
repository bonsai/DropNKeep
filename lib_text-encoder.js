// Small helper utilities for encoding detection and conversion.
// For Phase 1 we keep this minimal; more advanced detection can be added later.

export function decodeArrayBuffer(buffer) {
  try {
    return new TextDecoder('utf-8', {fatal: true}).decode(buffer);
  } catch (e) {
    try { return new TextDecoder('shift_jis').decode(buffer); } catch (e2) {}
    try { return new TextDecoder('windows-1252').decode(buffer); } catch (e3) {}
    // Last resort: build string byte-by-byte
    const bytes = new Uint8Array(buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }
}