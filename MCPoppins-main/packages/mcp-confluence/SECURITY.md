# Security Policy — @mcp-platform/confluence

Read-only by default. Write tools require CONFLUENCE_ENABLE_WRITES=true.
No TLS bypass. Use NODE_EXTRA_CA_CERTS for corporate certificates.
CQL input is escaped to prevent injection.
Tokens from environment variables only.

Report vulnerabilities directly to maintainers.
