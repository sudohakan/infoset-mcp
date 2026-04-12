<div align="center">

<img src="https://img.shields.io/badge/MCP-Infoset%20CRM-0066FF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTIwIDJINGMtMS4xIDAtMi45LTIgLjktMkgxMHYyaDRWMmg2YzEuMSAwIDIgLjkgMiAydjE4YzAgMS4xLS45IDItMiAySDRjLTEuMSAwLTItLjktMi0yVjRjMC0xLjEuOS0yIDItMmgxNnptMCAySDR2MTZoMTZWNHpNNiA4aDEydjJINnptMCA0aDEydjJINnptMCA0aDh2Mkg2eiIvPjwvc3ZnPg==&logoColor=white" alt="Infoset MCP" />

# infoset-mcp

**Model Context Protocol server for Infoset CRM helpdesk and ticket management**

Tickets &middot; Contacts &middot; Companies &middot; SLA &middot; Email Threads &middot; Batch Operations

[![CI](https://github.com/sudohakan/infoset-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sudohakan/infoset-mcp/actions/workflows/ci.yml)
[![Release](https://github.com/sudohakan/infoset-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/sudohakan/infoset-mcp/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/sudohakan/infoset-mcp?style=flat-square)](https://github.com/sudohakan/infoset-mcp/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue?style=flat-square)](https://modelcontextprotocol.io/)

</div>

---

## Why infoset-mcp?

AI assistants need structured access to helpdesk data. REST APIs require authentication boilerplate, pagination handling, and rate limit management on every call. infoset-mcp wraps the [Infoset](https://infoset.app) CRM API into **16 MCP tools** with built-in retry logic, rate limit protection, and batch operations, so your AI assistant can query tickets, contacts, and companies without dealing with HTTP plumbing.

- **API key auth**: stateless `X-API-Key` header, no token refresh, no login flow
- **Rate limit aware**: monitors `x-ratelimit-remaining` headers, auto-pauses before hitting limits
- **Retry with backoff**: automatic 429 retry (3 attempts, 60s intervals)
- **Batch tools**: fetch multiple tickets, logs, contacts, or companies in a single call with controlled concurrency
- **3 dependencies**: `@modelcontextprotocol/sdk`, `axios`, `zod`

---

## Quick Start

```bash
git clone https://github.com/sudohakan/infoset-mcp.git
cd infoset-mcp
npm install
```

### MCP Client Configuration (Recommended)

Using env-wrapper (reads credentials from `.env`, no secrets in config):

```json
{
  "mcpServers": {
    "infoset": {
      "command": "/absolute/path/to/infoset-mcp/scripts/env-wrapper.sh",
      "args": ["/absolute/path/to/infoset-mcp/src/mcp-server.mjs"],
      "env": {}
    }
  }
}
```

Then create a `.env` file:

```bash
cp .env.example .env
# Set INFOSET_API_KEY in .env
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `INFOSET_API_KEY` | Yes | - | Infoset API key (sent as `X-API-Key` header) |
| `INFOSET_BASE_URL` | No | `https://api.infoset.app` | API base URL |
| `INFOSET_USER_ID` | No | Auto-detected | Override user ID for owner-based filtering |

---

## Tools

### Ticket Operations (7 tools)

| Tool | Description |
|------|-------------|
| `infoset_list_tickets` | List tickets with status, owner, date, sort filters and pagination |
| `infoset_get_ticket` | Get full ticket detail by ID |
| `infoset_search_tickets` | Search tickets by keyword with status and priority filters |
| `infoset_create_ticket` | Create a new ticket with subject, contact, priority, content |
| `infoset_update_ticket` | Update ticket status, priority, owners, subject, stage, pipeline |
| `infoset_get_ticket_logs` | Get activity logs for a ticket |
| `infoset_get_ticket_stats` | Get ticket count breakdown by status (Open/Pending/Resolved/Closed) |

### Contact and Company (3 tools)

| Tool | Description |
|------|-------------|
| `infoset_get_contact` | Get contact details by ID |
| `infoset_list_contacts` | List or search contacts by name, email, phone |
| `infoset_get_company` | Get company details by ID |

### Communication and SLA (2 tools)

| Tool | Description |
|------|-------------|
| `infoset_get_email` | Get email thread content by email ID |
| `infoset_get_sla_breaches` | Get SLA breach data for a ticket |

### Batch Operations (4 tools)

| Tool | Description |
|------|-------------|
| `infoset_batch_get_tickets` | Get multiple tickets in parallel (concurrency: 5) |
| `infoset_batch_get_ticket_logs` | Get logs for multiple tickets in parallel |
| `infoset_batch_get_contacts` | Get multiple contacts with auto-deduplication |
| `infoset_batch_get_companies` | Get multiple companies with auto-deduplication |

### Reference Codes

| | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| **Status** | Open | Pending | Resolved | Closed |
| **Priority** | Low | Normal | High | Urgent |

---

## Architecture

```
MCP Client (Claude, Cursor)  <--stdio-->  infoset-mcp (Node.js)  <--HTTPS-->  Infoset API
                                               |
                                    API Key Auth (X-API-Key)
                                    Rate Limit Monitor
                                    Retry Handler (429)
```

- **Transport**: stdio (spawned by MCP client, JSON over stdin/stdout, logs to stderr)
- **Auth**: `X-API-Key` header on every request, no token management needed
- **Rate limiting**: monitors `x-ratelimit-remaining`, pauses 60s when remaining < 2
- **Retry**: 429 responses trigger up to 3 retries with 60s backoff
- **Batch concurrency**: max 5 parallel API calls per batch operation

---

## Development

```bash
npm test              # Run 29 tests
npm run test:coverage # Run with coverage report
npm start             # Start server standalone
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and pull request guidelines.

## Security

See [SECURITY.md](SECURITY.md) for credential handling and vulnerability reporting.

---

<div align="center">

[MIT](LICENSE) | Built with [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

</div>
