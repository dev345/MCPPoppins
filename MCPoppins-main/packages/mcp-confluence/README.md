# @mcp-platform/confluence

> MCP connector for Confluence Cloud and Data Center. Read pages, search content, navigate page trees, and create or update pages from your AI-powered IDE.

## Quick Start
```bash
npm install
cp .env.example .env   # Set CONFLUENCE_BASE_URL and CONFLUENCE_PAT
npm run doctor         # Verify
npm start              # Run
```

## IDE Setup (Kiro)
```json
{
  "mcpServers": {
    "confluence": {
      "command": "node",
      "args": ["PATH/TO/mcp-confluence/src/index.js"],
      "env": {
        "CONFLUENCE_BASE_URL": "https://your-domain.atlassian.net/wiki",
        "CONFLUENCE_PAT": "YOUR_TOKEN_HERE",
        "CONFLUENCE_EMAIL": "you@example.com"
      }
    }
  }
}
```

## Tools
| Tool | Description | Mode |
|------|-------------|------|
| health_check | Validate connection | Read |
| get_page | Get page by ID | Read |
| get_page_by_title | Find page by title | Read |
| search_pages | Search using CQL | Read |
| list_child_pages | List children | Read |
| get_page_raw | Raw XHTML | Read |
| create_page | Create page | Write |
| update_page | Update page | Write |

## Example Prompts
- "Find the Confluence page about deployment"
- "Show child pages of our architecture docs"
- "Search for API design in DOCS space"
- "Create a new page: Sprint 5 Retro"

## Security
See [SECURITY.md](./SECURITY.md). Read-only default, safe CQL escaping, no TLS bypass, no embedded secrets.
