let popupCount = 0;

// Listen for messages from the main world script
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'POPUP_BLOCKED') {
    popupCount++;
    console.log('[NoPopup] Storing count:', popupCount);
    await chrome.storage.local.set({ popupAttemptCount: popupCount });
  }
  
  if (event.data.type === 'GET_POPUP_COUNT') {
    const result = await chrome.storage.local.get('popupAttemptCount');
    popupCount = result.popupAttemptCount || 0;
    window.postMessage({
      type: 'POPUP_COUNT_RESPONSE',
      count: popupCount
    }, '*');
  }

  if(event.data.type === 'GET_CHECKBOX'){
    const check = await chrome.storage.local.get('checked');
    const checkbox = check.checked;
    window.postMessage({
      type: 'CHECKBOX_RESPONSE',
      checkbox: checkbox
    }, '*');
  }
});

// Initialize count on load
(async () => {
  const result = await chrome.storage.local.get('popupAttemptCount');
  popupCount = result.popupAttemptCount || 0;
})();