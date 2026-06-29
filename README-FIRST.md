# FreeCut First Run

FreeCut is a local-first video editor. Your source clips stay on this machine, and MP4 export is rendered by the local FFmpeg worker.

## Start On Windows

Keep the FreeCut folder on the D drive, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-FreeCut.ps1
```

Open the local URL printed by the launcher, usually:

```text
http://127.0.0.1:5174
```

## If Dependencies Are Missing

Run this once from the FreeCut folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd install
```

Then start FreeCut again with `.\Start-FreeCut.ps1`.

## What To Expect

- Import one local video.
- Trim the useful range.
- Pick the output frame.
- Add captions if needed.
- Export a local MP4 with no upload step.

For troubleshooting, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).
