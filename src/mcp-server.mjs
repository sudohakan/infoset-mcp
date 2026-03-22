import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';

const BASE_URL = process.env.INFOSET_BASE_URL || 'https://api.infoset.app';
const EMAIL = process.env.INFOSET_EMAIL;
const PASSWORD = process.env.INFOSET_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Missing INFOSET_EMAIL or INFOSET_PASSWORD env vars');
  process.exit(1);
}

let jwtToken = null;
let tokenExpiry = 0;
let userId = null;

async function login() {
  const res = await axios.post(`${BASE_URL}/v1/login/token`, {
    email: EMAIL,
    password: PASSWORD,
    remember: false,
  }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });

  const token = typeof res.data === 'string' ? res.data : res.data.token || res.data;
  jwtToken = token;

  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  userId = parseInt(payload.Id || payload.UserId, 10);
  tokenExpiry = payload.exp || (Math.floor(Date.now() / 1000) + 3600);

  console.error(`Logged in as userId: ${userId}, token expires: ${new Date(tokenExpiry * 1000).toISOString()}`);
  return userId;
}

async function ensureAuth() {
  const now = Math.floor(Date.now() / 1000);
  if (!jwtToken || now >= tokenExpiry - 60) {
    await login();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiRequest(method, url, data = null, params = null) {
  await ensureAuth();

  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    timeout: 30000,
  };
  if (data) config.data = data;
  if (params) config.params = params;

  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
    try {
      const res = await axios(config);
      const remaining = parseInt(res.headers['x-ratelimit-remaining'], 10);
      if (!isNaN(remaining) && remaining < 2) {
        console.error(`Rate limit low (${remaining}), waiting 60s...`);
        await sleep(60000);
      }
      return res.data;
    } catch (err) {
      if (err.response && err.response.status === 401 && retries < maxRetries) {
        retries++;
        console.error(`401 unauthorized, refreshing token (retry ${retries}/${maxRetries})...`);
        jwtToken = null;
        tokenExpiry = 0;
        await ensureAuth();
        config.headers['Authorization'] = `Bearer ${jwtToken}`;
        continue;
      }
      if (err.response && err.response.status === 429 && retries < maxRetries) {
        retries++;
        console.error(`429 rate limited, retry ${retries}/${maxRetries}, waiting 60s...`);
        await sleep(60000);
        continue;
      }
      const status = err.response ? err.response.status : 'network';
      const msg = err.response ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`Infoset API ${method.toUpperCase()} ${url} failed (${status}): ${msg}`);
    }
  }
}

const server = new McpServer({
  name: 'infoset',
  version: '2.2.0',
});

server.registerTool(
  'infoset_list_tickets',
  {
    description: 'List Infoset tickets with optional filters and pagination',
    inputSchema: z.object({
      status: z.array(z.number()).optional().describe('Status filter array (1=Open, 2=Pending, 3=Resolved, 4=Closed)'),
      ownerIds: z.string().optional().describe('Comma-separated owner user IDs. Defaults to logged-in user.'),
      page: z.number().optional().describe('Page number (default: 1)'),
      itemsPerPage: z.number().optional().describe('Items per page (default: 100)'),
      fromUpdatedDate: z.string().optional().describe('ISO8601 date — only tickets updated after this date'),
      sortCol: z.string().optional().describe('Sort column (e.g., priority, updatedDate)'),
      sortDir: z.string().optional().describe('Sort direction: asc or desc'),
    }),
  },
  async (params) => {
    const p = {
      OwnerIds: params.ownerIds || String(userId),
      ItemsPerPage: params.itemsPerPage || 100,
      Page: params.page || 1,
      ReturnTotalItems: true,
    };
    if (params.fromUpdatedDate) p.FromUpdatedDate = params.fromUpdatedDate;
    if (params.sortCol) p.sortCol = params.sortCol;
    if (params.sortDir) p.sortDir = params.sortDir;

    const queryParts = Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
    if (params.status && params.status.length > 0) {
      params.status.forEach(s => queryParts.push(`Status=${s}`));
    }

    const data = await apiRequest('get', `/v1/tickets?${queryParts.join('&')}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'infoset_get_ticket',
  {
    description: 'Get single Infoset ticket detail by ID',
    inputSchema: z.object({
      ticketId: z.number().describe('Ticket ID'),
    }),
  },
  async ({ ticketId }) => {
    const data = await apiRequest('get', `/v1/tickets/${ticketId}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'infoset_get_ticket_logs',
  {
    description: 'Get activity logs for an Infoset ticket',
    inputSchema: z.object({
      ticketId: z.number().describe('Ticket ID'),
      itemsPerPage: z.number().optional().describe('Number of logs to return (default: 15)'),
      sortDir: z.string().optional().describe('Sort direction: asc or desc (default: desc)'),
    }),
  },
  async ({ ticketId, itemsPerPage, sortDir }) => {
    const ipp = itemsPerPage || 15;
    const sd = sortDir || 'desc';
    const data = await apiRequest('get', `/v1/tickets/logs?TicketId=${ticketId}&ItemsPerPage=${ipp}&sortDir=${sd}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'infoset_get_email',
  {
    description: 'Get email thread content by email ID',
    inputSchema: z.object({
      emailId: z.number().describe('Email ID from ticket logs'),
    }),
  },
  async ({ emailId }) => {
    const data = await apiRequest('get', `/v1/email/${emailId}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'infoset_get_sla_breaches',
  {
    description: 'Get SLA breach data for an Infoset ticket',
    inputSchema: z.object({
      ticketId: z.number().describe('Ticket ID'),
    }),
  },
  async ({ ticketId }) => {
    const data = await apiRequest('get', `/v1/slas/breaches?LinkedType=ticket&LinkedId=${ticketId}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'infoset_get_contact',
  {
    description: 'Get contact information by contact ID',
    inputSchema: z.object({
      contactId: z.number().describe('Contact ID'),
    }),
  },
  async ({ contactId }) => {
    const data = await apiRequest('get', `/v1/contacts/${contactId}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'infoset_search_tickets',
  {
    description: 'Search Infoset tickets by keyword and optional filters',
    inputSchema: z.object({
      query: z.string().describe('Search keyword'),
      status: z.array(z.number()).optional().describe('Status filter (1=Open, 2=Pending, 3=Resolved, 4=Closed)'),
      priority: z.number().optional().describe('Priority filter (1=Low, 2=Normal, 3=High, 4=Urgent)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      itemsPerPage: z.number().optional().describe('Items per page (default: 50)'),
    }),
  },
  async ({ query, status, priority, page, itemsPerPage }) => {
    const p = {
      Search: query,
      ItemsPerPage: itemsPerPage || 50,
      Page: page || 1,
      ReturnTotalItems: true,
    };
    if (priority) p.Priority = priority;

    const queryParts = Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
    if (status && status.length > 0) {
      status.forEach(s => queryParts.push(`Status=${s}`));
    }

    const data = await apiRequest('get', `/v1/tickets?${queryParts.join('&')}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'infoset_create_ticket',
  {
    description: 'Create a new Infoset ticket',
    inputSchema: z.object({
      subject: z.string().describe('Ticket subject'),
      contactId: z.number().describe('Contact ID'),
      priority: z.number().optional().describe('Priority (1=Low, 2=Normal, 3=High, 4=Urgent). Default: 2'),
      status: z.number().optional().describe('Status (1=Open, 2=Pending). Default: 1'),
      content: z.string().optional().describe('Ticket body/content'),
    }),
  },
  async ({ subject, contactId, priority, status, content }) => {
    const body = {
      subject,
      contactId,
      priority: priority || 2,
      status: status || 1,
    };
    if (content) body.content = content;

    const data = await apiRequest('post', '/v1/tickets', body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'infoset_update_ticket',
  {
    description: 'Update an existing Infoset ticket',
    inputSchema: z.object({
      ticketId: z.number().describe('Ticket ID'),
      status: z.number().optional().describe('New status (1=Open, 2=Pending, 3=Resolved, 4=Closed)'),
      priority: z.number().optional().describe('New priority (1=Low, 2=Normal, 3=High, 4=Urgent)'),
      ownerIds: z.array(z.number()).optional().describe('New owner user IDs'),
      subject: z.string().optional().describe('New subject'),
    }),
  },
  async ({ ticketId, ...updates }) => {
    const body = {};
    if (updates.status !== undefined) body.status = updates.status;
    if (updates.priority !== undefined) body.priority = updates.priority;
    if (updates.ownerIds) body.ownerIds = updates.ownerIds;
    if (updates.subject) body.subject = updates.subject;

    const data = await apiRequest('put', `/v1/tickets/${ticketId}`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'infoset_list_contacts',
  {
    description: 'List or search Infoset contacts',
    inputSchema: z.object({
      query: z.string().optional().describe('Search keyword (name, email, phone)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      itemsPerPage: z.number().optional().describe('Items per page (default: 50)'),
    }),
  },
  async ({ query, page, itemsPerPage }) => {
    const p = {
      ItemsPerPage: itemsPerPage || 50,
      Page: page || 1,
      ReturnTotalItems: true,
    };
    if (query) p.Search = query;

    const queryParts = Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
    const data = await apiRequest('get', `/v1/contacts?${queryParts.join('&')}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'infoset_get_company',
  {
    description: 'Get company information by company ID',
    inputSchema: z.object({
      companyId: z.number().describe('Company ID'),
    }),
  },
  async ({ companyId }) => {
    const data = await apiRequest('get', `/v1/companies/${companyId}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'infoset_get_ticket_stats',
  {
    description: 'Get ticket statistics dashboard (counts by status)',
    inputSchema: z.object({
      ownerIds: z.string().optional().describe('Comma-separated owner IDs. Defaults to logged-in user.'),
      fromDate: z.string().optional().describe('ISO8601 start date'),
      toDate: z.string().optional().describe('ISO8601 end date'),
    }),
  },
  async ({ ownerIds, fromDate, toDate }) => {
    const owner = ownerIds || String(userId);
    const p = { OwnerIds: owner, ItemsPerPage: 1, Page: 1, ReturnTotalItems: true };
    const queryBase = Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);

    const statuses = [
      { name: 'Open', code: 1 },
      { name: 'Pending', code: 2 },
      { name: 'Resolved', code: 3 },
      { name: 'Closed', code: 4 },
    ];

    const results = {};
    const promises = statuses.map(async (s) => {
      const parts = [...queryBase, `Status=${s.code}`];
      if (fromDate) parts.push(`FromCreatedDate=${encodeURIComponent(fromDate)}`);
      if (toDate) parts.push(`ToCreatedDate=${encodeURIComponent(toDate)}`);
      const data = await apiRequest('get', `/v1/tickets?${parts.join('&')}`);
      return { name: s.name, count: data.totalItems || 0 };
    });
    const counts = await Promise.all(promises);
    for (const { name, count } of counts) results[name] = count;
    results.total = Object.values(results).reduce((a, b) => a + b, 0);

    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }
);

async function main() {
  await login();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Infoset MCP Server running on stdio');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
