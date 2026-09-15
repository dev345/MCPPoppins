# Security Policy — @mcp-platform/jira

## Security Model

This connector follows a **read-only by default** security posture. Write operations (create, update, transition, comment, assign, log work) are only available when explicitly enabled via `JIRA_ENABLE_WRITES=true`.

## Authentication

- **Jira Cloud**: API token with email-based Basic Auth
- **Jira Data Center/Server**: Personal Access Token with Bearer auth
- Tokens are read from environment variables — never embedded in code or config files
- Each user must generate and manage their own credentials

## Access Controls

- **Project allowlist**: Set `JIRA_ALLOWED_PROJECTS` to restrict which projects the connector can access
- **Read-only default**: Write tools are not registered unless explicitly enabled
- **Per-user identity**: Each installation uses individual credentials, not shared tokens

## TLS / Certificate Handling

This package does **NOT** disable TLS certificate verification. For environments with corporate or self-signed certificates:

- Set `NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.pem` in your environment
- Or set `JIRA_CA_CERT_PATH` to point to your certificate file

**Never set `NODE_TLS_REJECT_UNAUTHORIZED=0` in production.**

## Vulnerability Reporting

If you discover a security vulnerability, please report it responsibly:

1. Do NOT create a public issue
2. Contact the maintainers directly
3. Allow reasonable time for a fix before disclosure

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |
