# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.1] - 2026-04-12

### Changed
- Auth model migrated from JWT to API key (`X-API-Key` header)
- Coverage thresholds adjusted for new batch tools
- Unused dependencies removed (`dotenv`)
- Security contact updated

### Added
- 4 batch tools: `batch_get_tickets`, `batch_get_ticket_logs`, `batch_get_contacts`, `batch_get_companies`
- README redesigned with HakanMCP-style centered header, badges, and tool tables

## [2.2.0] - 2026-03-20

### Added
- `scripts/env-wrapper.sh` — loads `.env` before starting MCP server, no hardcoded credentials in config
- README documents env-wrapper as recommended configuration pattern

### Security
- Credentials no longer need to be inline in `.claude.json` — read from `.env` at runtime
- Wrapper handles Windows CRLF line endings in `.env` files

## [2.1.1] - 2026-03-20

### Changed
- Remove dead code (unused config.js, utils.js and their tests)
- Remove all code comments from source files
- Rename jest.config.js to jest.config.cjs for ESM compatibility
- Add `type: module` and `files` array to package.json

### Fixed
- McpServer version now matches package.json (was hardcoded as 1.0.0)
- Replace Turkish test data with English equivalents

### Added
- Comprehensive README with architecture, rate limiting, error handling, and scope sections
- CONTRIBUTING.md with code style and PR guidelines
- SECURITY.md with credential handling and vulnerability reporting

## [2.1.0] - 2026-03-17

### Fixed
- Automatic token refresh on 401 unauthorized responses — JWT expiry no longer breaks mid-session API calls

## [2.0.0] - 2026-03-17

### Changed
- Renamed project from `infoset-calendar-sync` to `infoset-mcp`
- MCP server now focuses exclusively on Infoset API integration
- Google Calendar/Tasks sync logic moved to external orchestration

### Removed
- Google Calendar and Tasks API integration
- Node.js orchestrator, lock mechanism, and file logger
- Google OAuth setup modules
- Dependencies: `googleapis`, `@google-cloud/local-auth`, `node-cron`, `dayjs`

## [1.0.0] - 2026-03-15

### Added
- Initial release with 12 Infoset MCP tools
- JWT authentication with automatic token refresh
- Rate limiting with smart backoff (429 retry)
- Retry logic for transient errors (401, 429)
- Ticket operations: list, get, search, create, update, logs
- Contact operations: list, get
- Company lookup
- Email thread retrieval
- SLA breach queries
- Ticket statistics dashboard
