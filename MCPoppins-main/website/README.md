# MCPoppins MCP Platform UI

Source-faithful, backend-independent website prototype for the repository's governed MCP connector marketplace and omnichannel gateway.

**Message:** “Connect your work tools to every AI workspace, safely.”

## Included

- Responsive home page with a simulated Slack, Teams and Telegram context demo.
- Real OpenUI `Renderer` seam using the official React packages and a static OpenUI Lang response.
- Filterable MCP Marketplace.
- Reusable package-detail route with Jira and Confluence sample listings.
- Installation and usage-guide layout.
- Workflow and example-prompt page with a 90-second judge story.
- Pricing hypotheses without invented prices.
- Trust and security page.
- Sitemap and low-fidelity wireframes in `docs/`.

## Boundaries

This UI uses static sample content and placeholder actions. It does not connect credentials, authenticate users, download packages or change Jira, Confluence, Slack, Teams or Telegram.

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm run verify
```

The verifier checks required content/routes and runs a production Next.js build.
