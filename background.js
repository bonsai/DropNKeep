// Simple background service worker for DropNKeep
// Currently handles storing settings and relaying messages if needed.
chrome.runtime.onInstalled.addListener(() => {
  console.log('DropNKeep installed');
  chrome.storage.local.get({useFilenameAsTitle: true, maxFileSizeMB: 10}, (items) => {
    chrome.storage.local.set(items);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'save-settings') {
    chrome.storage.local.set(message.settings, () => sendResponse({ok: true}));
    return true; // keep channel open for async response
  }
});

// placeholder for future background tasks