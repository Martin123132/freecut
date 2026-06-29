# FreeCut Troubleshooting

## FreeCut Will Not Start

Run the D-drive doctor:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd run doctor
```

If the project, temp folder, npm cache, or Playwright cache is not on D, move the repo or rerun through `scripts\dev-env.ps1`.

## Dependencies Are Missing

Install once through the D-drive setup script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-FreeCut.ps1
```

If dependency files look broken, force a clean reinstall:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-FreeCut.ps1 -ForceInstall
```

## Port Already In Use

Start FreeCut on a different local port:

```powershell
.\Start-FreeCut.ps1 -Port 5280
```

## Export Is Blocked

Check the Runtime panel in the Inspector.

- Local API must be connected.
- FFmpeg must be available.
- Storage must point at a D-drive data folder.
- Web app should report that the production UI is served by FreeCut for local runs.

The GitHub Pages demo does not run export jobs and does not collect uploads.

## Export Fails After It Starts

Try a shorter trim range first. If the clip still fails, the source codec may not be readable by the local FFmpeg binary. Installing a system FFmpeg and setting `FREECUT_FFMPEG_PATH=ffmpeg` can help on Linux.

## Verify A Release Zip

Release zips can be checked without installing dependencies:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-release-package.ps1 -PackagePath D:\codex-releases\freecut\freecut-v0.1.0-source-example.zip
```

The verifier extracts to `D:\codex-tmp`, checks required files, checks the production web build, and makes sure bulky/private paths such as `node_modules`, `.env`, uploads, and exports are absent.
