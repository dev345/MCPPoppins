# Deployment Guide

## Public website and gateway together on Render

Use the repository's `render.yaml` Blueprint. It builds the full website from the
repository root and serves it alongside the gateway on one public address.

- Website: `/`
- Live chat: `/chat.html` (also linked from the website header)
- Connection status: `/health`

The Blueprint selects Render's free plan. It sleeps after 15 minutes without
traffic, and the next visit can take about a minute to wake it. Choose a paid
instance in Render if continuous availability is needed. No paid plan is required
by this configuration.

Public mode gives browsers separate signed chat sessions, limits chat requests,
and keeps audit, conversation, approval, direct tool execution, and webhook
endpoints behind the generated administrator secret. Connector writes are forced
off. Sessions, audit records, approvals, and limits are held in memory and reset
on restarts; use a single instance for this hackathon deployment.

Without connector credentials, the website and gateway run but live Jira and
Confluence queries are unavailable. The chat states this explicitly; the website's
interactive demo continues to use sample data.

To enable live queries, configure a **dedicated workspace approved for public
viewing** using the Jira/Confluence variables below and set
`PUBLIC_DATA_CONFIRMED=true`. Every public visitor can query anything those
credentials can read. Do not connect a private company workspace. Visitors cannot
yet connect separate personal accounts. Set `OPENAI_API_KEY` only if optional AI
intent routing is wanted; otherwise the existing keyword router is used.

Rate limits are deliberately conservative: 60 total chat requests per minute and
20 per socket address. Behind a hosting proxy, multiple visitors can share that
lower limit. This limits basic usage but is not a substitute for a provider budget.

The standalone MCP packages remain available for local IDE clients; they use
standard input/output and are not hosted remote MCP endpoints. Teams and Slack
also require their own account setup and are not enabled by public web access.

## Option 1: Gateway on Render.com (free, recommended)

The gateway serves the live chat + all API endpoints.

1. Go to [render.com](https://render.com) > New > Web Service > Connect GitHub
2. Repo: `aryan4avj/Project`
3. Settings:
   - Root directory: `apps/gateway`
   - Build command: `npm install`
   - Start command: `node src/index.js`
4. Add environment variables:
   - `JIRA_BASE_URL`, `JIRA_PAT`, `JIRA_EMAIL`
   - `CONFLUENCE_BASE_URL`, `CONFLUENCE_PAT`, `CONFLUENCE_EMAIL`
   - `OPENAI_API_KEY` (optional, enables LLM)
5. Deploy. Live chat at `https://your-app.onrender.com/chat.html`

## Option 2: Website on Vercel (free, recommended)

1. Go to [vercel.com](https://vercel.com) > New Project > Import GitHub
2. Root directory: `website`
3. Framework: Next.js (auto-detected)
4. Deploy. Website at `https://your-app.vercel.app`

The website reads from repo markdown files at build time — no backend needed.

## Option 3: Both Together

- Gateway on Render → `https://gateway.example.com` (chat, API, webhooks)
- Website on Vercel → `https://mcpoppins.vercel.app` (marketplace, docs, trust)

## Running Locally for Demo

### Gateway
```powershell
cd apps/gateway
npm install
$env:JIRA_BASE_URL="https://your-instance"
$env:JIRA_PAT="your-token"
$env:CONFLUENCE_BASE_URL="https://your-instance/wiki"
$env:CONFLUENCE_PAT="your-token"
$env:OPENAI_API_KEY="your-key"
node src/index.js
# http://localhost:3000/chat.html
```

### Website
```powershell
cd website
npm install
npm run dev
# http://localhost:3107
```

## Docker
```bash
cd apps/gateway
docker build -t mcpoppins-gateway .
docker run -p 3000:3000 -e JIRA_BASE_URL=... -e JIRA_PAT=... mcpoppins-gateway
```

## Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| JIRA_BASE_URL | Yes | — |
| JIRA_PAT | Yes | — |
| JIRA_EMAIL | Cloud only | — |
| CONFLUENCE_BASE_URL | Yes | — |
| CONFLUENCE_PAT | Yes | — |
| CONFLUENCE_EMAIL | Cloud only | — |
| OPENAI_API_KEY | No | — (enables LLM) |
| GATEWAY_SECRET | No | — (enables auth) |
| PORT | No | 3000 |
