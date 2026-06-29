# FreeCut Release Checklist

Use this checklist before publishing a public FreeCut release.

## Build And QA

- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd run doctor`.
- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-env.ps1 npm.cmd run qa:smoke`.
- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-FreeCut.ps1 -Port 5299 -SkipBuild`, then confirm `/api/health` reports API, FFmpeg, storage, and web checks as true.
- Stop the local test server after the health check.

## Package

- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\prepare-github-release.ps1`.
- Confirm the generated zip and `.sha256` live under `D:\codex-releases\freecut`.
- Confirm `scripts\verify-release-package.ps1` passes for the generated zip.
- Confirm `RELEASE-MANIFEST.json` inside the zip points at the intended commit.

## Public Copy

- Confirm the release notes avoid cloud-upload claims.
- Confirm the release notes explain that export requires the local FreeCut API and FFmpeg worker.
- Confirm the license remains PolyForm Noncommercial 1.0.0 and commercial use is not granted by the public license.
- Confirm contact and commercial-license docs are present.

## GitHub

- Confirm local `main` and `origin/main` point at the same commit.
- Confirm GitHub CI is green for the commit.
- Confirm GitHub Pages remains built.
- Only after the above, create or update the GitHub release with the verified zip and `.sha256`.

Recommended tag format: `v0.1.0`, `v0.1.1`, and so on.
