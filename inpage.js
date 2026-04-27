(() => {
  const nativeOpen = window.open.bind(window);
  const nativeClick = HTMLElement.prototype.click;
  const nativeSubmit = HTMLFormElement.prototype.submit;

  let popupAttemptCount = 0;
  /** @type {'off' | 'normal' | 'ultra'} */
  let mode = 'normal';
  let enabled = true;
  let ultra = false;
  let hasModeResponse = false;

  window.postMessage({ type: "GET_POPUP_COUNT" }, "*");

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data.type === "POPUP_COUNT_RESPONSE") {
      popupAttemptCount = event.data.count;
    }
    if (event.data.type === "MODE_RESPONSE") {
      hasModeResponse = true;
      if (event.data.mode === 'off' || event.data.mode === 'normal' || event.data.mode === 'ultra') {
        mode = event.data.mode;
      } else {
        mode = 'normal';
      }
      enabled = mode !== 'off';
      ultra = mode === 'ultra';
      harden();
    }
    // Back-compat: treat checkbox response as normal/off
    if (event.data.type === "CHECKBOX_RESPONSE" && typeof event.data.checkbox === 'boolean') {
      if (!hasModeResponse) {
        mode = event.data.checkbox ? 'normal' : 'off';
        enabled = mode !== 'off';
        ultra = false;
        harden();
      }
    }
  });

  const notifyBlock = (method, data) => {
    popupAttemptCount++;
    console.warn(`[NoPopup] Bloqueado via ${method} numero: ` + popupAttemptCount, data);
    window.postMessage({ type: "POPUP_BLOCKED", count: popupAttemptCount }, "*");
  };

  const blockOpen = function (...args) {
    notifyBlock("window.open", args);
    return { close: () => { }, focus: () => { }, closed: false };
  };

  // MUDANÇA: Sequestro do método click() nativo
  const blockClick = function () {
    if (enabled && this.tagName === "A" && this.target === "_blank") {
      notifyBlock("Programmatic Click", this.href);
      return; // Morre aqui, não executa o clique nativo
    }
    return nativeClick.apply(this, arguments);
  };

  // MUDANÇA: Sequestro do método submit() nativo de formulários
  const blockSubmit = function () {
    if (enabled && this.target === "_blank") {
      notifyBlock("Form Submit", this.action);
      this.target = "_self"; // Força abrir na mesma aba para estragar a tentativa
    }
    return nativeSubmit.apply(this, arguments);
  };

  const harden = () => {
    try {
      if (!enabled) {
        try { Object.defineProperty(window, "open", { value: nativeOpen, writable: true, configurable: true }); } catch { try { window.open = nativeOpen; } catch { } }
        try { Object.defineProperty(self, "open", { value: nativeOpen, writable: true, configurable: true }); } catch { }
        HTMLElement.prototype.click = nativeClick;
        HTMLFormElement.prototype.submit = nativeSubmit;
        return;
      }

      const desc = Object.getOwnPropertyDescriptor(window, "open");
      // Important: keep it configurable so we can reliably restore nativeOpen when toggling OFF.
      if (!desc || desc.configurable) {
        Object.defineProperty(window, "open", { value: blockOpen, writable: false, configurable: true });
      } else {
        // If some site already locked it down, fall back to best-effort assignment.
        try { window.open = blockOpen; } catch { }
      }

      HTMLElement.prototype.click = blockClick;
      HTMLFormElement.prototype.submit = blockSubmit;

    } catch {
      try { window.open = enabled ? blockOpen : nativeOpen; } catch { }
      HTMLElement.prototype.click = enabled ? blockClick : nativeClick;
      HTMLFormElement.prototype.submit = enabled ? blockSubmit : nativeSubmit;
    }
    try { Object.defineProperty(self, "open", { value: enabled ? blockOpen : nativeOpen, writable: false, configurable: true }); } catch { }
  };

  window.postMessage({ type: "GET_MODE" }, "*");

  const tick = () => {
    try {
      const shouldBeBlocked = enabled && (window.open !== blockOpen || HTMLElement.prototype.click !== blockClick);
      const shouldBeNative = !enabled && (window.open !== nativeOpen || HTMLElement.prototype.click !== nativeClick);
      if (shouldBeBlocked || shouldBeNative) harden();
    } finally {
      setTimeout(tick, ultra ? 250 : 1000);
    }
  };
  tick();

  const clickHandler = (e) => {
    if (!enabled) return;

    // Se o alvo do clique (ou o pai dele) for o wrapper do Iframe invisível, paramos a propagação
    const a = e.target?.closest?.("a[href]");
    const modifier = e.ctrlKey || e.metaKey || e.shiftKey;

    if (a && (a.target === "_blank" || (ultra && modifier))) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      if (a.href) location.href = a.href;
      return;
    }

    // NORMAL: let the user intentionally open new tabs (ctrl/cmd/shift click)
    if (!ultra && a && modifier) {
      return;
    }
  };

  document.addEventListener("click", clickHandler, true);
  document.addEventListener("mousedown", clickHandler, true);

  document.addEventListener("auxclick", (e) => {
    if (e.button !== 1 || !enabled) return;
    const a = e.target?.closest?.("a[href]");
    if (!a) return;

    // NORMAL: allow middle-click unless it's explicitly target=_blank
    if (!ultra && a.target !== '_blank') return;

    e.preventDefault();
    e.stopPropagation();
    // Keep consistent with the extension goal: no new tabs while enabled.
    if (a.href) location.href = a.href;
  },
    true
  );

  const mo = new MutationObserver((muts) => {
    if (!enabled) return;
    for (const m of muts) {
      if (ultra && m.type === 'attributes') {
        const el = m.target;
        if (el?.tagName === 'A' && el.target === '_blank') el.target = '_self';
        if (el?.tagName === 'FORM' && el.target === '_blank') el.target = '_self';
        continue;
      }
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === "A" && node.target === "_blank") node.target = "_self";
        node.querySelectorAll?.('a[target="_blank"]').forEach((el) => (el.target = "_self"));
        if (node.tagName === "FORM" && node.target === "_blank") node.target = "_self";
        node.querySelectorAll?.('form[target="_blank"]').forEach((el) => (el.target = "_self"));
      }
    }
  });
  // Observe new nodes always; in ULTRA we also enforce when target changes.
  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['target']
  });

  harden();
})();
