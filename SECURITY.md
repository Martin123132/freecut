# Security Policy

FreeCut is a local-first video editor. Security reports are welcome, especially issues involving file handling, export behavior, dependency risk, or accidental data exposure.

## Supported Versions

The `main` branch receives security fixes.

## Reporting a Vulnerability

Please report security issues privately when possible through GitHub security advisories for this repository.

If private advisories are not available, open a public issue with a minimal description and avoid posting exploit details, private media, credentials, or sensitive logs. A maintainer can then coordinate a safer disclosure path.

Helpful reports include:

- Affected commit, release, or branch
- Operating system and browser
- Steps to reproduce
- Impact and likely affected users
- Whether the issue requires a malicious media file, project file, dependency, or user action

## Scope

In scope:

- Local file handling vulnerabilities
- Unsafe export or conversion behavior
- Dependency vulnerabilities with a practical impact on FreeCut
- Accidental network access or data exposure
- Cross-site scripting or unsafe browser APIs in the app UI

Out of scope:

- Issues requiring already compromised machines
- Vulnerabilities in unsupported forks or deployments
- Reports without enough detail to reproduce or assess impact

## Disclosure

Please give maintainers reasonable time to investigate and release a fix before public disclosure.
