(async () => {
  const countEl = document.getElementById('block');
  const modeSelect = document.getElementById('modeSelect');
  const statusBadge = document.getElementById('statusBadge');

  const normalizeMode = (mode, checkedFallback) => {
    if (mode === 'off' || mode === 'normal' || mode === 'ultra') return mode;
    if (typeof checkedFallback === 'boolean') return checkedFallback ? 'normal' : 'off';
    return 'normal';
  };

  const renderMode = (mode) => {
    const isEnabled = mode !== 'off';
    statusBadge.textContent = isEnabled ? mode.toUpperCase() : 'OFF';
    statusBadge.classList.toggle('badge--on', isEnabled);
    statusBadge.classList.toggle('badge--off', !isEnabled);
  };

  const syncFromStorage = async () => {
    const { popupAttemptCount = 0, mode, checked } = await chrome.storage.local.get([
      'popupAttemptCount',
      'mode',
      'checked'
    ]);

    countEl.textContent = popupAttemptCount || 0;

    const effectiveMode = normalizeMode(mode, checked);
    modeSelect.value = effectiveMode;
    renderMode(effectiveMode);
  };

  await syncFromStorage();

  modeSelect.addEventListener('change', async () => {
    const newMode = normalizeMode(modeSelect.value);
    renderMode(newMode);
    await chrome.storage.local.set({
      mode: newMode,
      // Back-compat for older code paths
      checked: newMode !== 'off'
    });
  });

  // Live update while popup is open.
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes.popupAttemptCount) {
      countEl.textContent = changes.popupAttemptCount.newValue || 0;
    }

    if (changes.mode || changes.checked) {
      const effectiveMode = normalizeMode(
        changes.mode?.newValue,
        changes.checked?.newValue
      );
      modeSelect.value = effectiveMode;
      renderMode(effectiveMode);
    }
  });
})();
