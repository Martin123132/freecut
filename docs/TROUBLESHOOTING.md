# FreeCut Troubleshooting

## FreeCut Will Not Start

Run the D-drive doctor:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd run doctor
```

If the project, temp folder, npm cache, or Playwright cache is not on D, move the repo or rerun through `scripts\dev-env.ps1`.

## Dependencies Are Missing

Install once through the D-drive environment:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd install
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
