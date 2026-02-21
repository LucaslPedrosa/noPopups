(() => {
  const nativeOpen = window.open.bind(window);
  const nativeClick = HTMLElement.prototype.click;
  const nativeSubmit = HTMLFormElement.prototype.submit;

  let popupAttemptCount = 0;
  let checked = true;

  window.postMessage({ type: "GET_POPUP_COUNT" }, "*");

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data.type === "POPUP_COUNT_RESPONSE") {
      popupAttemptCount = event.data.count;
    }
    if (event.data.type === "CHECKBOX_RESPONSE") {
      checked = event.data.checkbox;
      harden();
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
    if (checked && this.tagName === "A" && this.target === "_blank") {
      notifyBlock("Programmatic Click", this.href);
      return; // Morre aqui, não executa o clique nativo
    }
    return nativeClick.apply(this, arguments);
  };

  // MUDANÇA: Sequestro do método submit() nativo de formulários
  const blockSubmit = function () {
    if (checked && this.target === "_blank") {
      notifyBlock("Form Submit", this.action);
      this.target = "_self"; // Força abrir na mesma aba para estragar a tentativa
    }
    return nativeSubmit.apply(this, arguments);
  };

  const harden = () => {
    try {
      if (!checked) {
        try { Object.defineProperty(window, "open", { value: nativeOpen, writable: true, configurable: true }); } catch { window.open = nativeOpen; }
        try { Object.defineProperty(self, "open", { value: nativeOpen, writable: true, configurable: true }); } catch { }
        HTMLElement.prototype.click = nativeClick;
        HTMLFormElement.prototype.submit = nativeSubmit;
        return;
      }

      const desc = Object.getOwnPropertyDescriptor(window, "open");
      if (!desc || desc.configurable || desc.writable) {
        Object.defineProperty(window, "open", { value: blockOpen, writable: false, configurable: false });
      } else {
        window.open = blockOpen;
      }

      HTMLElement.prototype.click = blockClick;
      HTMLFormElement.prototype.submit = blockSubmit;

    } catch {
      try { window.open = checked ? blockOpen : nativeOpen; } catch { }
      HTMLElement.prototype.click = checked ? blockClick : nativeClick;
      HTMLFormElement.prototype.submit = checked ? blockSubmit : nativeSubmit;
    }
    try { Object.defineProperty(self, "open", { value: checked ? blockOpen : nativeOpen, writable: false, configurable: false }); } catch { }
  };

  window.postMessage({ type: "GET_CHECKBOX" }, "*");

  setInterval(() => {
    const shouldBeBlocked = checked && (window.open !== blockOpen || HTMLElement.prototype.click !== blockClick);
    const shouldBeNative = !checked && (window.open !== nativeOpen || HTMLElement.prototype.click !== nativeClick);
    if (shouldBeBlocked || shouldBeNative) harden();
  }, 300);

  const clickHandler = (e) => {
    window.postMessage({ type: "GET_CHECKBOX" }, "*");
    if (!checked) return;

    // Se o alvo do clique (ou o pai dele) for o wrapper do Iframe invisível, paramos a propagação
    const a = e.target?.closest?.("a[href]");
    const modifier = e.ctrlKey || e.metaKey || e.shiftKey;

    if (a && (a.target === "_blank" || modifier)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      if (a.href) location.href = a.href;
    }
  };

  document.addEventListener("click", clickHandler, true);
  document.addEventListener("mousedown", clickHandler, true);

  document.addEventListener("auxclick", (e) => {
    window.postMessage({ type: "GET_CHECKBOX" }, "*");
    if (e.button !== 1 || !checked) return;
    const a = e.target?.closest?.("a[href]");
    if (!a) return;

    e.preventDefault();
    e.stopPropagation();
    nativeOpen(a.href, "_blank");
  },
    true
  );

  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === "A" && node.target === "_blank") node.target = "_self";
        node.querySelectorAll?.('a[target="_blank"]').forEach((el) => (el.target = "_self"));
        if (node.tagName === "FORM" && node.target === "_blank") node.target = "_self";
        node.querySelectorAll?.('form[target="_blank"]').forEach((el) => (el.target = "_self"));
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  harden();
})();
