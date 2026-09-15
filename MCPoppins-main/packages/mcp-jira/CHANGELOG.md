# Changelog

## [1.0.0] - 2026-09-12

### Added
- Initial release of external-safe Jira MCP connector
- Read tools: health_check, get_issue, search_issues, my_issues, get_board_issues, whoami
- Write tools (disabled by default): create_issue, update_issue, transition_issue, add_comment, assign_issue, log_work
- Doctor script for connection diagnostics
- Project allowlist for access control
- Configurable request timeouts and pagination limits
- Structured error responses with correlation IDs
- Support for Jira Cloud, Data Center and Server editions
- Cloud basic auth and Data Center Bearer token auth
