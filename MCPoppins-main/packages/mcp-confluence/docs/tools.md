# Confluence MCP Tool Catalogue

## Read Tools (11 — always available)

| Tool | Description | Inputs |
|------|-------------|--------|
| health_check | Validate connection | None |
| get_page | Page by ID with labels and path | pageId |
| get_page_by_title | Find page by title | spaceKey, title |
| search_pages | CQL search | query, spaceKey? |
| search_pages_advanced | Paginated search | query, spaceKey?, start?, limit? |
| list_child_pages | Navigate page tree | pageId |
| get_page_raw | Raw XHTML storage | pageId |
| get_page_metadata | JSON metadata with labels | pageId |
| get_attachments | Page attachments | pageId |
| get_labels | Page labels | pageId |
| get_page_history | Version history | pageId, limit? |

## Write Tools (2 — require CONFLUENCE_ENABLE_WRITES=true)

| Tool | Description | Inputs |
|------|-------------|--------|
| create_page | Create page | spaceKey, title, content, parentPageId? |
| update_page | Update with version conflict handling | pageId, newContent, title?, expectedVersion? |

## Gateway-Only Tools

| Tool | Description |
|------|-------------|
| confluence_get_labels | Page labels |
| confluence_get_children | Child pages |
| confluence_get_history | Version history |
| confluence_get_attachments | Page attachments |
| confluence_find_related | Pages mentioning a Jira issue key |
