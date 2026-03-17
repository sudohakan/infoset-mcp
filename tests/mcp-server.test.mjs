import { jest, describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';

// ── Env setup (must be before module import) ─────────────────────────────────
process.env.INFOSET_EMAIL = 'test@test.com';
process.env.INFOSET_PASSWORD = 'test-pass';
process.env.INFOSET_BASE_URL = 'https://test.infoset.app';

// ── Build fake JWT ───────────────────────────────────────────────────────────
const fakePayload = { Id: '42', exp: Math.floor(Date.now() / 1000) + 3600 };
const fakeJwt = 'hdr.' + Buffer.from(JSON.stringify(fakePayload)).toString('base64') + '.sig';

const expiredPayload = { Id: '42', exp: Math.floor(Date.now() / 1000) - 100 };
const expiredJwt = 'hdr.' + Buffer.from(JSON.stringify(expiredPayload)).toString('base64') + '.sig';

// ── Mock axios ───────────────────────────────────────────────────────────────
const mockAxios = jest.fn();
mockAxios.post = jest.fn().mockResolvedValue({ data: fakeJwt });
mockAxios.create = jest.fn(() => mockAxios);

jest.unstable_mockModule('axios', () => ({
  default: mockAxios,
}));

// ── Mock MCP SDK — capture tool handlers ─────────────────────────────────────
const toolHandlers = {};
const toolSchemas = {};
const mockRegisterTool = jest.fn((name, schema, handler) => {
  toolHandlers[name] = handler;
  toolSchemas[name] = schema;
});
const mockConnect = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool: mockRegisterTool,
    connect: mockConnect,
  })),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({})),
}));

// ── Import module (triggers main()) ──────────────────────────────────────────
let axiosModule;

beforeAll(async () => {
  axiosModule = (await import('axios')).default;
  // Import the server module — this triggers main() which calls login + connect
  await import('../src/mcp-server.mjs');
  // Wait a tick for the async main() to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

// ── Helper: setup default axios mock response ────────────────────────────────
function mockApiResponse(data, headers = {}) {
  mockAxios.mockResolvedValueOnce({
    data,
    headers: { 'x-ratelimit-remaining': '10', ...headers },
  });
}

function mockApiError(status, data = {}) {
  const err = new Error(`Request failed with status ${status}`);
  err.response = { status, data };
  mockAxios.mockRejectedValueOnce(err);
}

function mockNetworkError(message = 'Network Error') {
  const err = new Error(message);
  err.response = undefined;
  mockAxios.mockRejectedValueOnce(err);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('mcp-server.mjs', () => {
  beforeEach(() => {
    mockAxios.mockReset();
    mockAxios.post.mockReset();
    // Default: apiRequest calls ensureAuth which may call login
    mockAxios.post.mockResolvedValue({ data: fakeJwt });
    // Default: successful API response
    mockAxios.mockResolvedValue({
      data: { items: [], totalItems: 0 },
      headers: { 'x-ratelimit-remaining': '10' },
    });
  });

  // ── Auth Manager ─────────────────────────────────────────────────────────
  describe('Auth Manager', () => {
    test('login succeeds and enables API calls', async () => {
      // Verify auth works by making a successful tool handler call
      mockApiResponse({ id: 1, subject: 'Auth test' });
      const result = await toolHandlers.infoset_get_ticket({ ticketId: 1 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(1);
      // apiRequest calls ensureAuth → login if needed → sets Bearer token
      const lastCall = mockAxios.mock.calls[mockAxios.mock.calls.length - 1][0];
      expect(lastCall.headers.Authorization).toMatch(/^Bearer /);
    });

    test('all 12 tools are registered and callable', () => {
      const registeredTools = Object.keys(toolHandlers);
      expect(registeredTools).toHaveLength(12);
    });

    test('each tool handler is a function', () => {
      for (const [name, handler] of Object.entries(toolHandlers)) {
        expect(typeof handler).toBe('function');
      }
    });
  });

  // ── Tool Registration ────────────────────────────────────────────────────
  describe('Tool Registration', () => {
    const expectedTools = [
      'infoset_list_tickets',
      'infoset_get_ticket',
      'infoset_get_ticket_logs',
      'infoset_get_email',
      'infoset_get_sla_breaches',
      'infoset_get_contact',
      'infoset_search_tickets',
      'infoset_create_ticket',
      'infoset_update_ticket',
      'infoset_list_contacts',
      'infoset_get_company',
      'infoset_get_ticket_stats',
    ];

    test.each(expectedTools)('tool "%s" is registered', (toolName) => {
      expect(toolHandlers[toolName]).toBeDefined();
      expect(typeof toolHandlers[toolName]).toBe('function');
    });

    test.each(expectedTools)('tool "%s" has a schema with description', (toolName) => {
      expect(toolSchemas[toolName]).toBeDefined();
      expect(toolSchemas[toolName].description).toBeTruthy();
    });
  });

  // ── Tool Handlers — Happy Path ───────────────────────────────────────────
  describe('Tool Handlers — happy path', () => {
    test('infoset_list_tickets returns ticket data', async () => {
      mockApiResponse({ items: [{ id: 1, subject: 'Test' }], totalItems: 1 });
      const result = await toolHandlers.infoset_list_tickets({});
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(1);
    });

    test('infoset_list_tickets applies status filter', async () => {
      mockApiResponse({ items: [], totalItems: 0 });
      await toolHandlers.infoset_list_tickets({ status: [1, 2] });
      const callUrl = mockAxios.mock.calls[mockAxios.mock.calls.length - 1][0].url;
      expect(callUrl).toContain('Status=1');
      expect(callUrl).toContain('Status=2');
    });

    test('infoset_list_tickets applies pagination params', async () => {
      mockApiResponse({ items: [], totalItems: 0 });
      await toolHandlers.infoset_list_tickets({ page: 3, itemsPerPage: 50 });
      const callUrl = mockAxios.mock.calls[mockAxios.mock.calls.length - 1][0].url;
      expect(callUrl).toContain('Page=3');
      expect(callUrl).toContain('ItemsPerPage=50');
    });

    test('infoset_get_ticket returns ticket detail', async () => {
      mockApiResponse({ id: 123, subject: 'Detay' });
      const result = await toolHandlers.infoset_get_ticket({ ticketId: 123 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(123);
    });

    test('infoset_get_ticket_logs returns logs', async () => {
      mockApiResponse({ items: [{ id: 1, content: 'Log entry' }] });
      const result = await toolHandlers.infoset_get_ticket_logs({ ticketId: 1 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(1);
    });

    test('infoset_get_ticket_logs respects itemsPerPage', async () => {
      mockApiResponse({ items: [] });
      await toolHandlers.infoset_get_ticket_logs({ ticketId: 1, itemsPerPage: 30, sortDir: 'asc' });
      const callUrl = mockAxios.mock.calls[mockAxios.mock.calls.length - 1][0].url;
      expect(callUrl).toContain('ItemsPerPage=30');
      expect(callUrl).toContain('sortDir=asc');
    });

    test('infoset_get_email returns email data', async () => {
      mockApiResponse({ fromAddress: 'a@b.com', subject: 'Re: Test' });
      const result = await toolHandlers.infoset_get_email({ emailId: 456 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.fromAddress).toBe('a@b.com');
    });

    test('infoset_get_sla_breaches returns breaches', async () => {
      mockApiResponse({ items: [{ slaName: 'First Response' }] });
      const result = await toolHandlers.infoset_get_sla_breaches({ ticketId: 1 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(1);
    });

    test('infoset_get_contact returns contact', async () => {
      mockApiResponse({ fullName: 'Ali Veli', email: 'ali@test.com' });
      const result = await toolHandlers.infoset_get_contact({ contactId: 789 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.fullName).toBe('Ali Veli');
    });

    test('infoset_search_tickets returns search results', async () => {
      mockApiResponse({ items: [{ id: 5, subject: 'Ödeme' }], totalItems: 1 });
      const result = await toolHandlers.infoset_search_tickets({ query: 'ödeme' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.totalItems).toBe(1);
    });

    test('infoset_search_tickets applies filters', async () => {
      mockApiResponse({ items: [], totalItems: 0 });
      await toolHandlers.infoset_search_tickets({
        query: 'test',
        status: [1],
        priority: 3,
        page: 2,
        itemsPerPage: 25,
      });
      const callUrl = mockAxios.mock.calls[mockAxios.mock.calls.length - 1][0].url;
      expect(callUrl).toContain('Search=test');
      expect(callUrl).toContain('Status=1');
      expect(callUrl).toContain('Priority=3');
    });

    test('infoset_create_ticket sends POST', async () => {
      mockApiResponse({ id: 999, subject: 'New ticket' });
      const result = await toolHandlers.infoset_create_ticket({
        subject: 'New ticket',
        contactId: 1,
        priority: 3,
      });
      const lastCall = mockAxios.mock.calls[mockAxios.mock.calls.length - 1][0];
      expect(lastCall.method).toBe('post');
      expect(lastCall.data.subject).toBe('New ticket');
      expect(lastCall.data.priority).toBe(3);
    });

    test('infoset_create_ticket defaults priority and status', async () => {
      mockApiResponse({ id: 999 });
      await toolHandlers.infoset_create_ticket({ subject: 'Min', contactId: 1 });
      const lastCall = mockAxios.mock.calls[mockAxios.mock.calls.length - 1][0];
      expect(lastCall.data.priority).toBe(2);
      expect(lastCall.data.status).toBe(1);
    });

    test('infoset_update_ticket sends PUT', async () => {
      mockApiResponse({ id: 1, status: 4 });
      await toolHandlers.infoset_update_ticket({ ticketId: 1, status: 4 });
      const lastCall = mockAxios.mock.calls[mockAxios.mock.calls.length - 1][0];
      expect(lastCall.method).toBe('put');
      expect(lastCall.url).toContain('/v1/tickets/1');
    });

    test('infoset_update_ticket sends only provided fields', async () => {
      mockApiResponse({});
      await toolHandlers.infoset_update_ticket({ ticketId: 1, priority: 4 });
      const lastCall = mockAxios.mock.calls[mockAxios.mock.calls.length - 1][0];
      expect(lastCall.data.priority).toBe(4);
      expect(lastCall.data.status).toBeUndefined();
    });

    test('infoset_list_contacts returns contacts', async () => {
      mockApiResponse({ items: [{ fullName: 'Test' }], totalItems: 1 });
      const result = await toolHandlers.infoset_list_contacts({});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(1);
    });

    test('infoset_list_contacts applies search query', async () => {
      mockApiResponse({ items: [], totalItems: 0 });
      await toolHandlers.infoset_list_contacts({ query: 'ali' });
      const callUrl = mockAxios.mock.calls[mockAxios.mock.calls.length - 1][0].url;
      expect(callUrl).toContain('Search=ali');
    });

    test('infoset_get_company returns company', async () => {
      mockApiResponse({ id: 1, name: 'Acme Corp' });
      const result = await toolHandlers.infoset_get_company({ companyId: 1 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.name).toBe('Acme Corp');
    });

    test('infoset_get_ticket_stats returns status counts', async () => {
      // Stats makes 4 parallel API calls (one per status)
      mockApiResponse({ totalItems: 10 });
      mockApiResponse({ totalItems: 5 });
      mockApiResponse({ totalItems: 3 });
      mockApiResponse({ totalItems: 2 });

      const result = await toolHandlers.infoset_get_ticket_stats({});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(20);
    });
  });

  // ── Tool Handlers — Error Path ───────────────────────────────────────────
  describe('Tool Handlers — error path', () => {
    test('infoset_get_ticket throws on API error', async () => {
      mockApiError(404, { message: 'Not found' });
      await expect(toolHandlers.infoset_get_ticket({ ticketId: 99999 }))
        .rejects.toThrow(/404/);
    });

    test('infoset_get_contact throws on 500', async () => {
      mockApiError(500, { message: 'Server error' });
      await expect(toolHandlers.infoset_get_contact({ contactId: 1 }))
        .rejects.toThrow(/500/);
    });

    test('infoset_create_ticket throws on validation error', async () => {
      mockApiError(400, { message: 'subject is required' });
      await expect(toolHandlers.infoset_create_ticket({ subject: '', contactId: 1 }))
        .rejects.toThrow(/400/);
    });

    test('network error propagates', async () => {
      mockNetworkError('ECONNREFUSED');
      await expect(toolHandlers.infoset_get_ticket({ ticketId: 1 }))
        .rejects.toThrow(/ECONNREFUSED/);
    });
  });

  // ── apiRequest — Rate Limit & Retry ──────────────────────────────────────
  describe('apiRequest — rate limit & retry', () => {
    let origSetTimeout;

    beforeEach(() => {
      // Replace setTimeout to make sleep() instant (avoids 60s waits)
      origSetTimeout = global.setTimeout;
      global.setTimeout = (fn, _ms) => origSetTimeout(fn, 0);
    });

    afterEach(() => {
      global.setTimeout = origSetTimeout;
    });

    test('429 triggers retry and succeeds', async () => {
      const err429 = new Error('Rate limited');
      err429.response = { status: 429, data: {} };

      mockAxios
        .mockRejectedValueOnce(err429)
        .mockRejectedValueOnce(err429)
        .mockResolvedValueOnce({
          data: { id: 1 },
          headers: { 'x-ratelimit-remaining': '10' },
        });

      const result = await toolHandlers.infoset_get_ticket({ ticketId: 1 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(1);
    });

    test('429 exhausts retries and throws', async () => {
      const err429 = new Error('Rate limited');
      err429.response = { status: 429, data: {} };

      mockAxios
        .mockRejectedValueOnce(err429)
        .mockRejectedValueOnce(err429)
        .mockRejectedValueOnce(err429)
        .mockRejectedValueOnce(err429);

      await expect(toolHandlers.infoset_get_ticket({ ticketId: 1 }))
        .rejects.toThrow(/429/);
    });
  });

  // ── 401 Handling ────────────────────────────────────────────────────────
  describe('401 handling — automatic token refresh', () => {
    test('401 triggers re-login and retries the request', async () => {
      mockApiError(401, { message: 'Unauthorized' });
      mockApiResponse({ id: 123, subject: 'Test' });

      const result = await toolHandlers.infoset_get_ticket({ ticketId: 123 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(123);
    });

    test('401 after max retries throws error', async () => {
      mockApiError(401, { message: 'Unauthorized' });
      mockApiError(401, { message: 'Unauthorized' });
      mockApiError(401, { message: 'Unauthorized' });
      mockApiError(401, { message: 'Unauthorized' });

      await expect(toolHandlers.infoset_get_ticket({ ticketId: 1 }))
        .rejects.toThrow(/401/);
    });
  });
});
