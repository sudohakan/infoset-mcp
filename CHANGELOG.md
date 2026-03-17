# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-03-17

### Fixed
- Automatic token refresh on 401 unauthorized responses — JWT expiry no longer breaks mid-session API calls

## [2.0.0] - 2026-03-17

### Changed
- Renamed project from `infoset-calendar-sync` to `infoset-mcp`
- MCP server now focuses exclusively on Infoset API integration
- Moved Google Calendar/Tasks sync logic to Claude Code slash command (`/infoset-sync`)

### Removed
- Google Calendar API integration (moved to slash command)
- Google Tasks API integration (moved to slash command)
- Calendar slot planner and bumping mechanism
- Claude CLI bridge (`claude-bridge.js`)
- Delta/state management (`delta.js`)
- Node.js orchestrator (`index.js`)
- Lock mechanism (`lock.js`)
- File logger (`logger.js`)
- Google OAuth setup (`auth-setup.js`, `google-auth.js`)
- Dependencies: `googleapis`, `@google-cloud/local-auth`, `node-cron`, `dayjs`

### Fixed
- Lock TOCTOU race condition (exclusive create with `wx` flag)
- Calendar-Tasks due date synchronization
- Reopened ticket support (task reactivation + new calendar event)
- Current time awareness (past slot filtering)
- Standup/wrap-up blocked intervals
- Clean mode state update + orphan cleanup
- Dry-run status file side effect
- Google API retry mechanism (429/503 backoff)
- Corrupted state auto-restore from backup
- Holiday/half-day slot planning (Turkish public holidays)

## [1.0.0] - 2026-03-15

### Added
- Initial release with Infoset CRM + Google Calendar + Google Tasks sync
- 12 Infoset MCP tools
- Delta-based change detection
- Priority-based calendar slot planning
- Claude CLI ticket analysis bridge
