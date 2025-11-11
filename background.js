async function register() {
  try {
    await chrome.scripting.unregisterContentScripts().catch(() => {});
    
    await chrome.scripting.registerContentScripts([
      {
        id: "nopopup-main",
        js: ["inpage.js"],
        matches: ["<all_urls>"],
        runAt: "document_start",
        allFrames: true,
        world: "MAIN",
        matchOriginAsFallback: true,
        persistAcrossSessions: true,
      },
      {
        id: "nopopup-content",
        js: ["content.js"],
        matches: ["<all_urls>"],
        runAt: "document_start",
        allFrames: true,
        world: "ISOLATED", // This has access to Chrome APIs
      }
    ]);
    console.log("[NoPopup] registrado");
  } catch (e) {
    console.error("[NoPopup] erro ao registrar:", e);
  }
}

chrome.runtime.onInstalled.addListener(register);
chrome.runtime.onStartup.addListener(register);
