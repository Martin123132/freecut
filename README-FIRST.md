# FreeCut First Run

FreeCut is a local-first video editor. Your source clips stay on this machine, and MP4 export is rendered by the local FFmpeg worker.

## Start On Windows

Keep the FreeCut folder on the D drive, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-FreeCut.ps1
```

Then start FreeCut:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-FreeCut.ps1
```

Open the local URL printed by the launcher, usually:

```text
http://127.0.0.1:5174
```

## If Dependencies Are Missing

Run setup again from the FreeCut folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Setup-FreeCut.ps1
```

Then start FreeCut again with `.\Start-FreeCut.ps1`.

To reinstall dependencies from scratch, run setup with `-ForceInstall`.

## What To Expect

- Import one local video.
- Trim the useful range.
- Pick the output frame.
- Add captions if needed.
- Export a local MP4 with no upload step.

For troubleshooting, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).
