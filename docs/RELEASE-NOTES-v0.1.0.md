# FreeCut v0.1.0

FreeCut v0.1.0 is the first public source release of the local-first short-form video editor.

## Highlights

- Import one local source clip.
- Trim with draggable In/Out handles.
- Reframe for common social formats, including 9:16.
- Add text overlays and timed captions.
- Choose caption styles: `Clean`, `Bold Box`, and `Shorts Pop`.
- Save and restore `.freecut.json` project routes.
- Export MP4 through the local FFmpeg worker.
- Use the Runtime preflight to check local API, FFmpeg, storage, and production web status.
- Start from Windows with `Setup-FreeCut.ps1`, then `Start-FreeCut.ps1`.

## Privacy

FreeCut is local-first. Source clips stay on the user machine. Browser storage keeps the edit route, project settings, and export receipts, not the original video file. The GitHub Pages demo does not collect uploads and does not run cloud conversion.

## Package Contents

The source package includes:

- production web build in `dist`
- local API server in `server`
- Windows setup/start scripts
- tests and source files
- release manifest
- license, notice, security, and commercial-license docs

The source package excludes:

- `node_modules`
- `.env` files
- uploaded source media
- exported media

## Requirements

- Windows users should keep the folder on the D drive on machines using the project guardrails.
- Node.js 22 or newer.
- Local FFmpeg is provided by `ffmpeg-static` by default.

## Known Limits

- FreeCut edits one source clip at a time.
- Reloaded projects can restore the edit route, but the original local source file must be relinked before rendering again.
- Export requires the local FreeCut API and FFmpeg worker.
- The package is source-available for personal and non-commercial use under PolyForm Noncommercial 1.0.0.

## Verification

Use the generated `.sha256` file to verify the downloaded zip. The package can also be checked with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-release-package.ps1 -PackagePath D:\codex-releases\freecut\<zip-name>.zip
```
