# MCP Gateway v2

> Intelligent HTTP gateway with cross-system workflows, conversation memory, audit trail, and channel adapters.

## Features
- 22 intent patterns, 4 workflows, 20 tools (12 Jira + 8 Confluence)
- Conversation memory (per-user, 10 turns, 30min TTL)
- Audit trail with correlation IDs
- Action approval flow (preview/confirm/reject)
- Channel-aware formatting (Teams, Slack, web)
- Proactive insights (high-priority and overdue detection)
- Graceful degradation, suggested actions

## Quick Start
```bash
npm install && cp .env.example .env && node src/index.js
```

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Status, tools, memory, audit |
| GET | /tools | List tools and workflows |
| POST | /tools/:name | Execute tool |
| POST | /chat | Intelligent chat |
| GET | /audit | Audit trail |
| GET | /conversation/:userId | Conversation history |
| GET | /approvals | Pending approvals |
| POST | /approvals/:id/confirm | Confirm write |
| POST | /approvals/:id/reject | Reject write |
| POST | /webhooks/teams | Teams webhook |
| POST | /webhooks/slack | Slack webhook |

## Workflows
- **project_status** — Jira issues + Confluence pages combined
- **knowledge_action** — Decisions + related work
- **deep_dive** — Issue + related pages + comments
- **context_followup** — Conversation memory resolution
