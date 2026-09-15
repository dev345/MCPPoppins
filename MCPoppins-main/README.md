# MCPoppins — MCP Platform

> Connect your work tools to every AI workspace, safely.

**Live Website:** [https://mcpoppins-public-ui.vercel.app](https://mcpoppins-public-ui.vercel.app)

**Repo:** [https://github.com/aryan4avj/Project](https://github.com/aryan4avj/Project)

MCPoppins is an AI agent platform that connects Jira and Confluence to any channel — IDEs, web chat, Microsoft Teams, and Slack — through a governed MCP gateway with LLM-powered intent resolution, cross-system workflows, conversation memory, and a full audit trail.

**Live demo:** Start the gateway and open `http://localhost:3000/chat.html`

## What It Does

- **33 MCP tools** across Jira (17) and Confluence (13) connector packages + 20 gateway HTTP tools
- **LLM-powered chat** — GPT-4o-mini understands natural language and picks the right tool
- **Cross-system workflows** — "project status" chains Jira + Confluence into one view
- **Conversation memory** — "tell me more" resolves from previous turns
- **Audit trail** — every tool call logged with intent, timing, correlation IDs
- **Channel adapters** — Teams, Slack, web chat with channel-aware formatting
- **Read-only by default** — writes require explicit enablement and approval
- **Any Jira/Confluence instance** — Cloud, Data Center, Server

## Quick Start

```bash
git clone https://github.com/aryan4avj/Project.git
cd Project/apps/gateway
npm install
# Set env vars: JIRA_BASE_URL, JIRA_PAT, CONFLUENCE_BASE_URL, CONFLUENCE_PAT
# Optional: OPENAI_API_KEY (enables LLM)
node src/index.js
# Open http://localhost:3000/chat.html
```

## Architecture

```
User (natural language)
  |
GPT-4o-mini intent resolution (optional)
  |
Gateway v2 (Express, 22 intents, 4 workflows)
/chat  /tools  /audit  /approvals  /webhooks/*
  |
Jira MCP (17 tools) + Confluence MCP (13 tools)
  |
Jira API + Confluence API
```

## Project Structure

```
apps/gateway/           # HTTP gateway + LLM + chat UI + webhooks
  public/chat.html      # Live web chat
  src/connectors/       # Jira + Confluence handlers
packages/
  mcp-jira/             # Jira stdio package (17 tools)
  mcp-confluence/       # Confluence stdio package (13 tools)
website/                # Next.js marketplace (MCPoppins)
docs/channels/          # Teams, Slack, Web Chat guides
DEPLOYMENT.md           # Hosting guide
```

## Gateway Features

| Feature | Description |
|---------|-------------|
| LLM intent | GPT-4o-mini with keyword fallback |
| Workflows | project_status, knowledge_action, deep_dive, context_followup |
| Memory | Per-user, 10 turns, 30min TTL |
| Audit | Correlation IDs, timing, intent logging |
| Approvals | Write preview/confirm/reject |
| Channels | Teams, Slack, web formatting |
| Insights | High-priority and overdue detection |

## Platforms

**Works today:** Kiro, VS Code, GitLab Duo, Claude Desktop, Cursor, Windsurf, Web Chat

**Adapters ready:** Microsoft Teams, Slack

## Security

Read-only default, no TLS bypass, no embedded credentials, project allowlist, safe CQL, correlation IDs, audit trail, non-root Docker.

## Tests

```bash
cd packages/mcp-jira && npm test      # 12/12
cd packages/mcp-confluence && npm test # 12/12
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Team

Built by Aryan Jain and team.
