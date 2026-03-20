# Infoset MCP Server

[![CI](https://github.com/sudohakan/infoset-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sudohakan/infoset-mcp/actions/workflows/ci.yml)
[![Release](https://github.com/sudohakan/infoset-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/sudohakan/infoset-mcp/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/sudohakan/infoset-mcp)](https://github.com/sudohakan/infoset-mcp/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io/)

A [Model Context Protocol](https://modelcontextprotocol.io/) server that connects AI assistants to [Infoset](https://infoset.app) — an omnichannel customer service and CRM platform used by thousands of businesses for helpdesk, live chat, email, and customer relationship management.

This server exposes 12 tools that give any MCP-compatible client (Claude Code, Cursor, Windsurf, etc.) full access to Infoset's ticket management, contact lookup, and helpdesk analytics capabilities.

## Features

- **12 production-ready tools** covering the full helpdesk ticket lifecycle
- **JWT authentication** with automatic token refresh on expiry — no mid-session interruptions
- **Smart rate limiting** — monitors `x-ratelimit-remaining` headers and pauses before hitting limits
- **Retry logic** — automatic retry with backoff for 401 (token refresh) and 429 (rate limit) responses
- **Zero configuration beyond credentials** — works out of the box with sensible defaults
- **Lightweight** — single file server with only 4 dependencies

## Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- An **Infoset account** with API access (get your credentials from your Infoset account settings)

### Installation

```bash
git clone https://github.com/sudohakan/infoset-mcp.git
cd infoset-mcp
npm install
```

### Configuration

The server requires three environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `INFOSET_EMAIL` | Yes | Your Infoset login email |
| `INFOSET_PASSWORD` | Yes | Your Infoset login password |
| `INFOSET_BASE_URL` | No | API base URL (default: `https://api.infoset.app`) |

#### Option A — MCP Client Configuration (Recommended)

Add the server to your MCP client config file. For Claude Code, add to `.claude.json`:

```json
{
  "mcpServers": {
    "infoset": {
      "command": "node",
      "args": ["/absolute/path/to/infoset-mcp/src/mcp-server.mjs"],
      "env": {
        "INFOSET_EMAIL": "your-email@example.com",
        "INFOSET_PASSWORD": "your-password",
        "INFOSET_BASE_URL": "https://api.infoset.app"
      }
    }
  }
}
```

#### Option B — Environment File (Standalone)

```bash
cp .env.example .env
# Edit .env with your credentials
npm start
```

## Tools

### Ticket Operations

| Tool | Description | Parameters |
|------|-------------|------------|
| `infoset_list_tickets` | List tickets with filters and pagination | `status[]`, `ownerIds`, `page`, `itemsPerPage`, `fromUpdatedDate`, `sortCol`, `sortDir` |
| `infoset_get_ticket` | Get full ticket detail by ID | `ticketId` |
| `infoset_search_tickets` | Search tickets by keyword with filters | `query`, `status[]`, `priority`, `page`, `itemsPerPage` |
| `infoset_create_ticket` | Create a new ticket | `subject`, `contactId`, `priority`, `status`, `content` |
| `infoset_update_ticket` | Update ticket fields | `ticketId`, `status`, `priority`, `ownerIds[]`, `subject` |
| `infoset_get_ticket_logs` | Get activity log for a ticket | `ticketId`, `itemsPerPage`, `sortDir` |
| `infoset_get_ticket_stats` | Get ticket count breakdown by status | `ownerIds`, `fromDate`, `toDate` |

### Contact & Company Operations

| Tool | Description | Parameters |
|------|-------------|------------|
| `infoset_get_contact` | Get contact details by ID | `contactId` |
| `infoset_list_contacts` | List or search contacts | `query`, `page`, `itemsPerPage` |
| `infoset_get_company` | Get company details by ID | `companyId` |

### Communication & SLA

| Tool | Description | Parameters |
|------|-------------|------------|
| `infoset_get_email` | Get email thread content | `emailId` |
| `infoset_get_sla_breaches` | Get SLA breach data for a ticket | `ticketId` |

### Status and Priority Codes

**Status:** 1 = Open, 2 = Pending, 3 = Resolved, 4 = Closed

**Priority:** 1 = Low, 2 = Normal, 3 = High, 4 = Urgent

## Usage Examples

```
List open and pending tickets:
  infoset_list_tickets { "status": [1, 2], "itemsPerPage": 50 }

Get ticket detail:
  infoset_get_ticket { "ticketId": 8837516 }

Search tickets:
  infoset_search_tickets { "query": "payment error" }

Create a ticket:
  infoset_create_ticket { "subject": "Login issue", "contactId": 12345, "priority": 3 }

Update ticket status to resolved:
  infoset_update_ticket { "ticketId": 8837516, "status": 3 }

Check SLA breaches:
  infoset_get_sla_breaches { "ticketId": 8837516 }

Get ticket statistics:
  infoset_get_ticket_stats {}
```

## Architecture

```
┌─────────────────┐     stdio      ┌──────────────────┐     HTTPS     ┌───────────────┐
│   MCP Client    │ ◄────────────► │  infoset-mcp     │ ◄───────────► │  Infoset API  │
│ (Claude, Cursor)│                │  (Node.js)       │               │  api.infoset.  │
└─────────────────┘                └──────────────────┘               │     app       │
                                     │                                └───────────────┘
                                     ├─ JWT Auth Manager
                                     ├─ Rate Limit Monitor
                                     └─ Retry Handler (401/429)
```

The server runs as a stdio-based MCP process. The MCP client spawns it, sends tool call requests over stdin, and receives JSON responses over stdout. All diagnostic logging goes to stderr to keep the MCP protocol channel clean.

### Authentication Flow

1. On startup, the server authenticates with Infoset using email/password credentials
2. A JWT token is obtained and cached in memory
3. Before each API request, the token expiry is checked — if within 60 seconds of expiry, a fresh token is obtained automatically
4. On 401 responses, the token is invalidated and re-obtained transparently (up to 3 retries)

### Rate Limiting

The server monitors `x-ratelimit-remaining` response headers from the Infoset API. When the remaining request quota drops below 2, the server pauses for 60 seconds before continuing. On 429 (Too Many Requests) responses, the server retries up to 3 times with 60-second backoff intervals.

### Error Handling

All API errors are caught and re-thrown with descriptive messages that include the HTTP method, endpoint path, status code, and response body. Network errors (timeouts, DNS failures) are propagated with the original error message. The MCP client receives these as tool call errors and can present them to the user or retry.

## Scope

This server covers the Infoset **helpdesk and CRM** domain: tickets, contacts, companies, email threads, SLA tracking, and ticket analytics. The Infoset platform also offers chat, call center, deals, automation, and reporting APIs that are outside the current scope. Feature requests for additional tool coverage are welcome via [GitHub Issues](https://github.com/sudohakan/infoset-mcp/issues).

## Development

```bash
npm test          # Run test suite (70 tests)
npm start         # Start server in standalone mode
```

### Running Tests

Tests use Jest with ES module support. The test suite covers:

- All 12 tool registrations and their schemas
- Happy path for every tool handler
- Error handling (404, 400, 500, network errors)
- Rate limit retry logic (429 backoff and exhaustion)
- Token refresh logic (401 re-authentication)

### Releasing

This project uses [Semantic Versioning](https://semver.org/). To create a new release:

1. Update `version` in `package.json` and the `McpServer` constructor in `src/mcp-server.mjs`
2. Add release notes to `CHANGELOG.md`
3. Commit, tag, and push:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

The GitHub Actions release workflow automatically creates a GitHub Release with notes extracted from the changelog.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and pull request guidelines.

## Security

See [SECURITY.md](SECURITY.md) for credential handling best practices and vulnerability reporting.

## License

[MIT](LICENSE)
