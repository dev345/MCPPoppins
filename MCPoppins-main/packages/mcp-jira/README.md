# @mcp-platform/jira

> MCP connector for Jira Cloud and Data Center. Search issues, view boards, manage work items, and track projects from your AI-powered IDE.

## Supported Editions
- Jira Cloud (atlassian.net)
- Jira Data Center
- Jira Server (v7.x+)

## Prerequisites
- Node.js 18+
- Jira instance access
- API token (Cloud) or Personal Access Token (Data Center/Server)

## Quick Start (5 minutes)

```bash
npm install
cp .env.example .env   # Edit with your URL and token
npm run doctor         # Verify connection
npm start              # Run the MCP server
```

## IDE Setup

### Kiro IDE
Create `.kiro/settings/mcp.json`:
```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["PATH/TO/mcp-jira/src/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_PAT": "YOUR_TOKEN_HERE",
        "JIRA_EMAIL": "you@example.com"
      }
    }
  }
}
```

### VS Code / Claude Desktop
Same JSON structure in your MCP config file. Replace placeholders with real values.

## Available Tools

| Tool | Description | Mode |
|------|-------------|------|
| health_check | Validate connection | Read |
| get_issue | Get issue details by key | Read |
| search_issues | Search using JQL | Read |
| my_issues | Your open issues | Read |
| get_board_issues | Sprint/board issues | Read |
| whoami | Current user info | Read |
| create_issue | Create issue | Write |
| update_issue | Update issue fields | Write |
| transition_issue | Change status | Write |
| add_comment | Add comment | Write |
| assign_issue | Assign to user | Write |
| log_work | Log time spent | Write |

## Example Prompts
- "Show me my open Jira issues"
- "Find all high-priority bugs in project PROJ"
- "What's the status of PROJ-456?"
- "Create a task in PROJ: Set up CI pipeline"
- "Transition PROJ-123 to In Progress"

## Read-Only vs Write Mode
By default only read tools are available. Set `JIRA_ENABLE_WRITES=true` to enable writes.

## Project Allowlist
Set `JIRA_ALLOWED_PROJECTS=PROJ1,PROJ2` to restrict accessible projects.

## Troubleshooting
| Problem | Solution |
|---------|----------|
| "JIRA_BASE_URL is required" | Set URL in .env or mcp.json |
| "Authentication failed (401)" | Regenerate your token |
| "Permission denied (403)" | Check API access |
| SSL errors | Set NODE_EXTRA_CA_CERTS=/path/to/ca.pem |

## Security
See [SECURITY.md](./SECURITY.md). Read-only default, no embedded credentials, no TLS bypass.
