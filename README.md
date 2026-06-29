# FreeCut

FreeCut is a local-first, source-available non-commercial short-form video editor aimed at the trim, resize, caption, and export workflows commonly locked behind web subscriptions.

Public demo page: https://martin123132.github.io/freecut/

## MVP

- Import one local clip
- Preview, scrub, and review playback timing
- Set trim start/end with draggable In/Out handles on a media-aware thumbnail timeline
- Choose short-form framing and reframe the crop focus
- Add a text overlay
- Add timed captions with clickable timeline markers, duplicate/split actions, style presets (`Clean`, `Bold Box`, `Shorts Pop`), and SRT/VTT import
- Autosave project settings locally and import/export `.freecut.json` project files
- Restore a saved project or recent local route with guided source-clip relink and preserved trim timing
- Restore session checkpoints after exploratory frame, quality, and caption-style changes
- Undo and redo edit changes from the toolbar or keyboard
- Check export readiness with a guided ship preflight, render summary, dock render plan, Export Center, and estimated output size
- Choose Quick, Balanced, or Master export quality
- Export MP4 through the local FFmpeg worker with no watermark, session downloads, render-again actions, and reload-safe Export Center receipts that can restore the route
- Use keyboard shortcuts (`I`, `Space`, `C`, `F`, `R`, `E`, `S`, `U`, `Ctrl+Z`, `Ctrl+Y`, `Q`, `Left/Right`) while editing and `?` / `Shift` + `K` for Mission Control.
- Mission flow is intentionally guided: Import -> Frame -> (Optional) Captions -> Trim -> Export.

## Known limits

- FreeCut edits one local source clip at a time.
- Browser storage keeps project settings and export receipts, not the original video file.
- Reloaded projects and receipts can restore the route, but you must relink the original local source clip before rendering again.
- Export requires the local FreeCut API and FFmpeg worker; the GitHub Pages demo page does not collect uploads or run cloud conversion.

## License

FreeCut is source-available software for personal and non-commercial use under the PolyForm Noncommercial License 1.0.0.

- See [LICENSE](LICENSE) for the full public license.
- See [NOTICE.md](NOTICE.md) for required notices and usage boundaries.
- See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md) for examples of uses that require a separate written commercial license.

Commercial use, including paid products, hosted services, enterprise tools, commercial developer tools, and commercial AI systems or training/evaluation pipelines, is not granted by the public license.

## Development

Keep project files, npm, Playwright, and temporary caches on the D drive when developing on this machine.

Clone example on D:

```powershell
git clone https://github.com/Martin123132/freecut.git D:\codex-projects\freecut
cd D:\codex-projects\freecut
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd run doctor
powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-FreeCut.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd run dev
```

The API listens on `127.0.0.1:5174`; Vite listens on `127.0.0.1:5173`.

For a production-style local run, build the app and serve the UI plus API from the FreeCut server:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-FreeCut.ps1
```

That command keeps the D-drive environment active, checks Node/npm/dependencies/port use, runs `npm run build`, then starts FreeCut at `http://127.0.0.1:5174`. Use `-SkipBuild` after an unchanged build. The in-app Runtime preflight reports local API, FFmpeg, storage, and built web status.

For first-run help, see [README-FIRST.md](README-FIRST.md). For launch and export troubleshooting, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

FreeCut uses `ffmpeg-static` by default. On Linux machines where that binary lacks caption filters such as `drawtext`, install system FFmpeg and set `FREECUT_FFMPEG_PATH=ffmpeg` before running the API or smoke tests.

## QA

The native OS file-picker window is not reliably automatable. The import-transition smoke verifies the same app path immediately behind that picker by setting the real file input to a generated WebM clip, waiting for browser media metadata, and checking that the FreeCut dock reaches export-ready state. The export smoke also starts the local API and verifies a real FFmpeg MP4 output for requested dimensions and duration.

```powershell
cd D:\codex-projects\freecut
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd run doctor
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd run qa:smoke
```

The smoke uses `127.0.0.1:51713` by default so it does not accidentally reuse a different app already running on Vite's usual `5173` port. Override it with `$env:FREECUT_QA_WEB_PORT='<port>'` if needed.

If the Chromium browser is not present yet, install it into the same D-drive cache first:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd exec playwright install chromium
```

## Release Package Prep

Prepare a source release zip on D with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd run package:release
```

The package script builds the production UI, runs the runtime smoke unless `-SkipSmoke` is passed directly to `scripts\package-release.ps1`, verifies the zip unless `-SkipVerify` is passed, stages the release under `D:\codex-tmp`, and writes the zip to `D:\codex-releases\freecut`.

It also writes a `.sha256` checksum beside the zip and embeds `RELEASE-MANIFEST.json` in the package. Verify a generated zip with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-release-package.ps1 -PackagePath D:\codex-releases\freecut\<zip-name>.zip
```
