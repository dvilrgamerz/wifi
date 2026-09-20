# Security Policy

## Supported version

The latest code on `main` is the supported version.

## Reporting a vulnerability

Please avoid posting exploitable security details, credentials, tokens, private IP information, or other secrets in a public issue. Use GitHub's private security reporting/security-advisory flow when it is available for this repository.

Include the affected file or endpoint, reproduction steps, expected impact, and a suggested fix if you have one.

## Security model

WiFi Pulse intentionally has no user accounts, password database, SQL database, or analytics database. The optional Python backend limits request sizes, rate-limits API traffic, avoids trusting proxy headers by default, and sends defensive browser headers.

A public speed-test service can consume meaningful bandwidth. Production operators should use HTTPS, monitor traffic, keep dependencies updated, and set conservative transfer/rate limits.
