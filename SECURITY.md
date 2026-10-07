# Security Policy

## Supported Versions

Security fixes are provided for the latest published version of Vegas. Older releases may not receive security updates.

Vegas is still experimental, so security-related changes may require upgrading to the latest release even when they include breaking changes.

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues.

Use GitHub's private vulnerability reporting for this repository:

https://github.com/vegas-js/vegas/security/advisories/new

When possible, include:

- The affected Vegas version.
- The affected component or workflow.
- Steps to reproduce the issue with a minimal example.
- The security impact you expect.
- Any mitigation or workaround you have identified.

Do not include live credentials, access tokens, OAuth client secrets, private Apps Script project contents, or other sensitive data. Use redacted values or disposable test resources when a reproduction requires credentials or external services.

Security reports involving Vegas authentication, credential handling, push workflows, development servers, Local Runtime behavior, browser bridges, package publishing, or distributed package contents are in scope.

If the issue is exclusively in an upstream service or dependency and does not result from Vegas behavior, report it to the upstream project or provider instead.

We will coordinate disclosure through the private security advisory when the issue is confirmed and a fix is available.
