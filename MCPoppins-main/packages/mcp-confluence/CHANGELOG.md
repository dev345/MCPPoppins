# Changelog

## [1.0.0] - 2026-09-12

### Added
- Initial release of external-safe Confluence MCP connector
- Read tools: health_check, get_page, get_page_by_title, search_pages, list_child_pages, get_page_raw
- Write tools (disabled by default): create_page, update_page
- Safe CQL query builder with input escaping
- Configurable request timeouts and pagination
- Structured error responses with correlation IDs
- Support for Confluence Cloud and Data Center
