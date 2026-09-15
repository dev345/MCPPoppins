# Jira MCP Tool Catalogue

## Read Tools (11 — always available)

| Tool | Description | Inputs |
|------|-------------|--------|
| health_check | Validate connection | None |
| get_issue | Full details with links and comments | issueKey |
| search_issues | JQL search | jql, maxResults? |
| my_issues | Your open issues | None |
| get_board_issues | Active board issues | status? |
| get_sprint_issues | Agile sprint view | projectKey? |
| get_attachments | Issue attachments | issueKey |
| get_worklogs | Work logs with total hours | issueKey |
| get_comments | Issue comments | issueKey |
| get_links | Linked issues | issueKey |
| whoami | Current user info | None |

## Write Tools (6 — require JIRA_ENABLE_WRITES=true)

| Tool | Description | Inputs |
|------|-------------|--------|
| create_issue | Create issue | projectKey, summary, description?, issueType?, priority?, labels?, parentKey? |
| update_issue | Update fields | issueKey, summary?, description?, labels?, priority? |
| transition_issue | Change status | issueKey, statusName |
| add_comment | Add comment | issueKey, comment |
| assign_issue | Assign user | issueKey, username |
| log_work | Log time | issueKey, timeSpent, comment? |

## Gateway-Only Tools

| Tool | Description |
|------|-------------|
| jira_high_priority | High/Highest priority open issues |
| jira_overdue | Issues not updated in 14+ days |
| jira_get_sprint | Active sprint via JQL |
| jira_get_comments | Issue comments |
