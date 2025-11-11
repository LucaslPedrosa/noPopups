(() => {
  // Guardar o open nativo antes de endurecer
  const nativeOpen = window.open.bind(window);

  // Contador de tentativas de popup do site
  let popupAttemptCount = 0;
  let checked = false; // Começa desabilitado até receber resposta

  // Get initial count from storage
  window.postMessage({ type: "GET_POPUP_COUNT" }, "*");

  // Listen for the response
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data.type === "POPUP_COUNT_RESPONSE") {
      popupAttemptCount = event.data.count;
    }
    if (event.data.type === "CHECKBOX_RESPONSE") {
      checked = event.data.checkbox;
      // console.log("[NoPopup] Checkbox updated to:", checked);
      harden(); // Re-apply harden when checkbox changes
    }
  });

  // Função bloqueadora que também conta
  const block = function (...args) {
    popupAttemptCount++;
    console.warn(
      "[NoPopup] window.open bloqueado numero: " + popupAttemptCount,
      args
    );

    // Send message to content script to store the count
    window.postMessage(
      {
        type: "POPUP_BLOCKED",
        count: popupAttemptCount,
      },
      "*"
    );

    return null;
  };

  // Endurece window.open (Main world)
  const harden = () => {
    try {
      if (!checked) {
        // console.log("[NoPopup] OFF - Restoring native open");
        // Restaura o window.open nativo quando desabilitado
        try {
          Object.defineProperty(window, "open", {
            value: nativeOpen,
            writable: true,
            configurable: true,
          });
        } catch {
          window.open = nativeOpen;
        }
        try {
          Object.defineProperty(self, "open", {
            value: nativeOpen,
            writable: true,
            configurable: true,
          });
        } catch {}
        return;
      }
      
      // console.log("[NoPopup] ON - Blocking popups");
      // Só bloqueia se checkbox estiver marcado
      const desc = Object.getOwnPropertyDescriptor(window, "open");
      if (!desc || desc.configurable || desc.writable) {
        Object.defineProperty(window, "open", {
          value: block,
          writable: false,
          configurable: false,
        });
      } else {
        window.open = block;
      }
    } catch {
      try {
        window.open = checked ? block : nativeOpen;
      } catch {}
    }
    try {
      Object.defineProperty(self, "open", {
        value: checked ? block : nativeOpen,
        writable: false,
        configurable: false,
      });
    } catch {}
  };
  // Pedimos o estado inicial do checkbox
  window.postMessage({ type: "GET_CHECKBOX" }, "*");
  
  setInterval(() => {
    // Só reaplica se checkbox estiver ON e window.open não for block
    // OU se checkbox estiver OFF e window.open não for nativeOpen
    const shouldBeBlocked = checked && window.open !== block;
    const shouldBeNative = !checked && window.open !== nativeOpen;
    
    if (shouldBeBlocked || shouldBeNative) {
      harden();
    }
  }, 300);

  // Clique normal: ainda forca _self
  const clickHandler = (e) => {
    window.postMessage({ type: "GET_CHECKBOX" }, "*");
    if (!e.isTrusted) return;
    if (!checked) return;

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

  // MIDDLE CLICK
  document.addEventListener(
    "auxclick",
    (e) => {
      window.postMessage({ type: "GET_CHECKBOX" }, "*");
      if (!e.isTrusted || e.button !== 1) return; // só botão do meio
      if (!checked) return;
      const a = e.target?.closest?.("a[href]");
      if (!a) return;

      // Impede o comportamento padrão (que abriria 1 aba)…
      e.preventDefault();
      // …mas NÃO bloqueia propagação para deixar os scripts do site rodarem
      // (não chame stopPropagation aqui)
      e.stopPropagation();

      const href = a.href;
      // popupAttemptCount = 0;

      // Aguarda os handlers do site (sincronos/timeout curto)
      // setTimeout(() => {
      //   if (popupAttemptCount === 0) {
      //     // Site não tentou abrir nada extra -> abrimos UMA aba
      //     try {
      nativeOpen(href, "_blank");
      //     } catch (err) {
      //       console.warn("[NoPopup] falha ao abrir a aba única:", err);
      //     }
      //   } else {
      //     // Site tentou abrir 1+ popups -> abrimos NENHUMA
      //     console.warn(
      //       `[NoPopup] bloqueado: site tentou abrir ${
      //         popupAttemptCount + 1
      //       } janelas no clique do meio`
      //     );
      //   }
      // }, 200); // janela curta o suficiente; ajuste se precisar
    },
    true
  );

  //Desarma _blank dinâmico
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === "A" && node.target === "_blank")
          node.target = "_self";
        node
          .querySelectorAll?.('a[target="_blank"]')
          .forEach((el) => (el.target = "_self"));
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
