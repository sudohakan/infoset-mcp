# infoset-mcp

[![CI](https://github.com/sudohakan/infoset-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sudohakan/infoset-mcp/actions/workflows/ci.yml)
[![Release](https://github.com/sudohakan/infoset-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/sudohakan/infoset-mcp/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/sudohakan/infoset-mcp)](https://github.com/sudohakan/infoset-mcp/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

Infoset CRM MCP Server — a [Model Context Protocol](https://modelcontextprotocol.io/) server for Infoset ticket management.

Provides integration with the Infoset helpdesk system through MCP tools. Supports ticket listing, detail viewing, searching, creating, updating, and statistics queries for use with Claude Code and other MCP-compatible clients.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `INFOSET_EMAIL` | Infoset login email |
| `INFOSET_PASSWORD` | Infoset login password |
| `INFOSET_BASE_URL` | API base URL (default: `https://api.infoset.app`) |

## MCP Configuration

Add the following to your `.claude.json`:

```json
{
  "mcpServers": {
    "infoset": {
      "command": "node",
      "args": ["C:\\dev\\infoset-mcp\\src\\mcp-server.mjs"],
      "env": {
        "INFOSET_EMAIL": "your-email@example.com",
        "INFOSET_PASSWORD": "your-password",
        "INFOSET_BASE_URL": "https://api.infoset.app"
      }
    }
  }
}
```

## Tools

| # | Tool | Description |
|---|------|-------------|
| 1 | `infoset_list_tickets` | List tickets with status, owner, date filters and pagination |
| 2 | `infoset_get_ticket` | Get single ticket detail by ID |
| 3 | `infoset_get_ticket_logs` | Get activity logs for a ticket |
| 4 | `infoset_get_email` | Get email content by email ID |
| 5 | `infoset_get_sla_breaches` | Get SLA breach data for a ticket |
| 6 | `infoset_get_contact` | Get contact information by ID |
| 7 | `infoset_search_tickets` | Search tickets by keyword |
| 8 | `infoset_create_ticket` | Create a new ticket |
| 9 | `infoset_update_ticket` | Update an existing ticket (status, priority, owner, subject) |
| 10 | `infoset_list_contacts` | List or search contacts |
| 11 | `infoset_get_company` | Get company information by ID |
| 12 | `infoset_get_ticket_stats` | Get ticket statistics (counts by status) |

## Usage Examples

```
# List open tickets
mcp__infoset__infoset_list_tickets status=[1,2] itemsPerPage=50

# Get ticket detail
mcp__infoset__infoset_get_ticket ticketId=8837516

# Search tickets
mcp__infoset__infoset_search_tickets query="payment error"

# Check SLA breaches
mcp__infoset__infoset_get_sla_breaches ticketId=8837516

# Get statistics
mcp__infoset__infoset_get_ticket_stats
```

## Development

```bash
# Run tests
npm test

# Start server directly
npm start
```

## Releasing

This project uses [Semantic Versioning](https://semver.org/). To create a new release:

```bash
# Update CHANGELOG.md with new version notes
git tag -a v2.1.0 -m "v2.1.0"
git push origin v2.1.0
```

The GitHub Actions release workflow automatically creates a GitHub Release with notes extracted from `CHANGELOG.md`.

## License

MIT
