// Entry point for content scripts. Currently minimal: it ensures other modules initialize.
(function () {
  console.log('DropNKeep content script loaded');
  // Modules (keep-client and drop-handler) self-initialize when loaded as separate files.
})();