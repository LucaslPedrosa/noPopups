# No Popups

A small, no-dependency Chrome/Brave extension that blocks popups opened by scripts and links. Toggle it on/off from the toolbar popup and refresh the page after toggling. The popup shows a live counter of blocked attempts; extra logs appear in the DevTools console.

Works on most sites, runs at document start, and doesn’t phone home.

If a site doesn’t work, please open an issue with the URL and a short description.

## Why

Many sites hijack user interactions to open new tabs or windows. No Popups takes a strict approach: when enabled, it prevents scripted `window.open` calls and neutralizes `target="_blank"` so links open in the same tab.

## Permissions

- `scripting` — to register the content scripts at runtime
- `storage` — to persist the ON/OFF state and the blocked attempts counter
- `host_permissions: <all_urls>` — to allow running on every site

The extension does not make network requests or send data to external services.

## Installation and usage (from source)

1) Download or clone this repository.

2) In Chrome or Brave, open: `chrome://extensions`

3) Enable “Developer mode”.

4) Click “Load unpacked” and select the project folder.

5) Open the popup and turn the switch ON.

That’s it.

## FAQ

Q: Why can’t I sign in with Google/SSO when it’s ON?

A: LoL

Q: Something doesn’t work on a specific site.

A: Please open an issue with the URL and a short description.

## License

MIT — see [`LICENSE`](./LICENSE).