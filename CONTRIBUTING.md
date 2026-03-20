# Contributing

Thank you for your interest in contributing to Infoset MCP Server.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your Infoset credentials
4. Run the test suite: `npm test`

## Code Style

- **No code comments.** The code should be self-explanatory through clear naming and small functions.
- **No dead code.** Every function and variable must be actively used.
- **English only.** All code, variable names, strings, and documentation must be in English.
- **Single source file.** The server is intentionally a single `mcp-server.mjs` file. Do not split it into modules unless the tool count exceeds 25.
- **Immutable patterns.** Create new objects rather than mutating existing ones.
- **Explicit error handling.** All API errors must be caught, enriched with context, and re-thrown.

## Adding a New Tool

1. Define the tool using `server.registerTool()` with a Zod input schema and descriptive parameter documentation
2. Implement the handler using the `apiRequest()` helper for all Infoset API calls
3. Return the standard MCP response format: `{ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }`
4. Add tests covering happy path and error cases in `tests/mcp-server.test.mjs`
5. Update the Tools table in `README.md`
6. Add a changelog entry under `## [Unreleased]`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the code style guidelines above
3. Ensure all tests pass: `npm test`
4. Update documentation if adding or changing tools
5. Open a pull request with a clear description of what changed and why

## Reporting Issues

Use [GitHub Issues](https://github.com/sudohakan/infoset-mcp/issues) for bug reports and feature requests. Include:

- Node.js version
- MCP client name and version
- Steps to reproduce
- Expected vs actual behavior
- Error messages (from stderr output)
