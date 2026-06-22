# Contributing to FreeCut

Thanks for helping make FreeCut better. This project exists to give people a capable, local-first video editor without subscription gates.

## Project Values

- Keep editing workflows local-first and privacy-respecting.
- Prefer simple, inspectable code over clever abstractions.
- Make the common path fast: import, trim, arrange, preview, export.
- Avoid adding cloud services, telemetry, or account requirements to core editing features.
- Keep paid-service replacement features usable without artificial limits.

## Development Setup

Requirements:

- Node.js 22 or newer
- npm
- FFmpeg support as documented in the README

Install dependencies:

```powershell
npm ci
```

Run the app locally:

```powershell
npm run dev
```

Build the app:

```powershell
npm run build
```

Run the import transition smoke test:

```powershell
npm run qa:import-transition
```

## Pull Requests

Before opening a PR:

- Keep the change focused on one feature, fix, or documentation improvement.
- Update docs when behavior, setup, or user-facing workflows change.
- Avoid committing generated output, local media, logs, reports, or secrets.
- Use sample or synthetic media for test cases whenever possible.
- Note any FFmpeg, browser, or platform-specific behavior in the PR description.

## Bug Reports

Useful bug reports include:

- Operating system and browser
- FreeCut version, branch, or commit
- Steps to reproduce
- Expected behavior
- Actual behavior
- Console output or screenshots when relevant
- Media details such as format, codec, duration, and resolution

Please do not upload private videos or sensitive media. If a media file is required to reproduce a bug, use a synthetic sample or describe the file characteristics.

## Licensing

FreeCut is licensed under AGPL-3.0-only. Contributions are accepted under the same license.
