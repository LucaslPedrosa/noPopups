let popupCount = 0;

const normalizeMode = (mode, checkedFallback) => {
  if (mode === 'off' || mode === 'normal' || mode === 'ultra') return mode;
  if (typeof checkedFallback === 'boolean') return checkedFallback ? 'normal' : 'off';
  return 'normal';
};

// Listen for messages from the main world script
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'POPUP_BLOCKED') {
    // Single-writer increment to avoid races across frames.
    try {
      const res = await chrome.runtime.sendMessage({ type: 'INCREMENT_POPUP_COUNT' });
      if (res?.ok) popupCount = res.value;
    } catch {
      // Fallback: best-effort local increment
      const result = await chrome.storage.local.get('popupAttemptCount');
      popupCount = (result.popupAttemptCount || 0) + 1;
      await chrome.storage.local.set({ popupAttemptCount: popupCount });
    }
  }
  
  if (event.data.type === 'GET_POPUP_COUNT') {
    const result = await chrome.storage.local.get('popupAttemptCount');
    popupCount = result.popupAttemptCount || 0;
    window.postMessage({
      type: 'POPUP_COUNT_RESPONSE',
      count: popupCount
    }, '*');
  }

  if (event.data.type === 'GET_MODE' || event.data.type === 'GET_CHECKBOX') {
    const stored = await chrome.storage.local.get(['mode', 'checked']);
    const mode = normalizeMode(stored.mode, stored.checked);
    window.postMessage({ type: 'MODE_RESPONSE', mode }, '*');

    // Back-compat response for older inpage scripts (if any page cached old code)
    window.postMessage({ type: 'CHECKBOX_RESPONSE', checkbox: mode !== 'off' }, '*');
  }
});

// Push updates immediately when the user toggles ON/OFF in the popup.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;

  if (changes.mode || changes.checked) {
    // Prefer explicit mode, but fall back to checked if needed
    const mode = normalizeMode(changes.mode?.newValue, changes.checked?.newValue);
    window.postMessage({ type: 'MODE_RESPONSE', mode }, '*');
    window.postMessage({ type: 'CHECKBOX_RESPONSE', checkbox: mode !== 'off' }, '*');
  }

  if (changes.popupAttemptCount) {
    window.postMessage(
      {
        type: 'POPUP_COUNT_RESPONSE',
        count: changes.popupAttemptCount.newValue || 0
      },
      '*'
    );
  }
});

// Initialize count on load
(async () => {
  const result = await chrome.storage.local.get('popupAttemptCount');
  popupCount = result.popupAttemptCount || 0;
})();