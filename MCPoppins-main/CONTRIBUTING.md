# Contributing to MCP Platform

## Setup

```bash
git clone <repo-url>
cd mcp-platform
cd packages/mcp-jira && npm install && cd ../..
cd packages/mcp-confluence && npm install && cd ../..
```

## Run Tests

```bash
cd packages/mcp-jira && npm test
cd packages/mcp-confluence && npm test
```

## Adding a New Connector

Copy an existing package and ensure it has:

1. `package.json` — name, version, engines, scripts (start, doctor, test)
2. `src/index.js` — MCP server with validated config, read-only default, structured errors
3. `src/doctor.js` — connection diagnostic
4. `tests/unit.test.js` — unit tests
5. `.env.example` — config vars with descriptions
6. `mcp.local.example.json` — IDE config with placeholders
7. `Dockerfile` — non-root container
8. `README.md` — 5-minute setup guide
9. `SECURITY.md` — security model
10. `CHANGELOG.md` — version history
11. `LICENSE`
12. `docs/tools.md` — tool catalogue with risk levels

## Rules

- No organisation-specific URLs or credentials in code
- No NODE_TLS_REJECT_UNAUTHORIZED=0
- Read-only by default
- Structured errors, not raw API bodies
- Timeouts on every request (AbortController)
- Correlation IDs (X-Request-ID)
- Tests pass before merge

## Branch Naming

- `feature/<description>`
- `fix/<description>`
- `docs/<description>`

## Commit Messages

```
type(scope): description

feat(jira): add get_sprint_issues tool
fix(confluence): handle version conflict on update
```
