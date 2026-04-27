async function ensureDefaults() {
  const stored = await chrome.storage.local.get(['mode', 'checked', 'popupAttemptCount']);

  const updates = {};

  // New setting: mode = off | normal | ultra
  if (stored.mode !== 'off' && stored.mode !== 'normal' && stored.mode !== 'ultra') {
    if (typeof stored.checked === 'boolean') {
      updates.mode = stored.checked ? 'normal' : 'off';
    } else {
      updates.mode = 'normal';
    }
  }

  // Keep old boolean for compatibility with older versions / edge cases
  const effectiveMode = updates.mode ?? stored.mode;
  const shouldBeChecked = effectiveMode !== 'off';
  if (typeof stored.checked !== 'boolean') updates.checked = shouldBeChecked;
  else if (stored.checked !== shouldBeChecked) updates.checked = shouldBeChecked;

  if (typeof stored.popupAttemptCount !== 'number') updates.popupAttemptCount = 0;

  if (Object.keys(updates).length) {
    await chrome.storage.local.set(updates);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'INCREMENT_POPUP_COUNT') {
    (async () => {
      const result = await chrome.storage.local.get('popupAttemptCount');
      const next = (result.popupAttemptCount || 0) + 1;
      await chrome.storage.local.set({ popupAttemptCount: next });
      sendResponse({ ok: true, value: next });
    })().catch(() => sendResponse({ ok: false }));

    // Keep the message channel open for async response
    return true;
  }
});
