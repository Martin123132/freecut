# FreeCut

FreeCut is a local-first, open-source short-form video editor aimed at the trim, resize, caption, and export workflows commonly locked behind web subscriptions.

Public demo page: https://martin123132.github.io/freecut/

## MVP

- Import one video locally
- Preview, play, and seek
- Set trim start/end with a media-aware thumbnail timeline
- Choose an export aspect ratio
- Add a text overlay
- Add timed captions or import SRT/VTT captions
- Autosave project settings locally and import/export `.freecut.json` project files
- Restore a saved project with guided source-clip relink and preserved trim timing
- Check export readiness with a guided ship preflight
- Choose Quick, Balanced, or Master export quality
- Export MP4 through FFmpeg with no watermark

## Development

All project files are intended to live under `D:\codex-projects\open-video-editor`.
Keep npm, Playwright, and temporary caches on the D drive when developing on this machine.

```powershell
cd D:\codex-projects\open-video-editor
$env:TMP='D:\codex-tmp'
$env:TEMP='D:\codex-tmp'
$env:HOME='D:\codex-cache\node-home'
$env:USERPROFILE='D:\codex-cache\node-home'
$env:npm_config_cache='D:\codex-cache\npm'
$env:npm_config_prefix='D:\codex-cache\npm-global'
$env:npm_config_userconfig='D:\codex-cache\npm\.npmrc'
$env:PLAYWRIGHT_BROWSERS_PATH='D:\codex-cache\ms-playwright'
npm install
npm run dev
```

The API listens on `127.0.0.1:5174`; Vite listens on `127.0.0.1:5173`.

## QA

The native OS file-picker window is not reliably automatable. The import-transition smoke verifies the same app path immediately behind that picker by setting the real file input to a generated WebM clip, waiting for browser media metadata, and checking that the FreeCut dock reaches export-ready state.

```powershell
cd D:\codex-projects\open-video-editor
$env:TMP='D:\codex-tmp'
$env:TEMP='D:\codex-tmp'
$env:HOME='D:\codex-cache\node-home'
$env:USERPROFILE='D:\codex-cache\node-home'
$env:npm_config_cache='D:\codex-cache\npm'
$env:npm_config_prefix='D:\codex-cache\npm-global'
$env:npm_config_userconfig='D:\codex-cache\npm\.npmrc'
$env:PLAYWRIGHT_BROWSERS_PATH='D:\codex-cache\ms-playwright'
npm run qa:import-transition
```

The smoke uses `127.0.0.1:51713` by default so it does not accidentally reuse a different app already running on Vite's usual `5173` port. Override it with `$env:FREECUT_QA_WEB_PORT='<port>'` if needed.

If the Chromium browser is not present yet, install it into the same D-drive cache first:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='D:\codex-cache\ms-playwright'
npm exec playwright install chromium
```
