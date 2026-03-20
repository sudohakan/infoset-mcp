# Security

## Credential Handling

This server authenticates with the Infoset API using email and password credentials. These credentials are sensitive and must be handled with care:

- **Never commit credentials to version control.** The `.env` file is included in `.gitignore` by default.
- **Use environment variables or MCP client config** to pass credentials at runtime. The `.env.example` file contains placeholder values only.
- **JWT tokens are stored in memory only** and are never written to disk. Tokens are automatically refreshed before expiry and invalidated on 401 responses.
- **No credential caching.** The server does not persist tokens, session data, or credentials to the filesystem.

## Network Security

- All communication with the Infoset API uses HTTPS (TLS)
- API requests have a 30-second timeout to prevent hanging connections
- The server does not expose any network ports — it communicates exclusively over stdio

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| 1.x     | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not open a public GitHub issue** for security vulnerabilities
2. Email the maintainer directly at **hakan@finekra.com** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
3. You will receive an acknowledgment within 48 hours
4. A fix will be prioritized and released as a patch version

## Dependencies

This project uses a minimal dependency set to reduce attack surface:

| Dependency | Purpose |
|------------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol implementation |
| `axios` | HTTP client for Infoset API calls |
| `dotenv` | Environment variable loading from `.env` files |
| `zod` | Input schema validation for tool parameters |

All dependencies are regularly audited. Run `npm audit` to check for known vulnerabilities.
