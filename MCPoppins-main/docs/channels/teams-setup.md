# Connect Microsoft Teams to MCP Platform

## Prerequisites
- Azure account (to register a bot)
- Teams admin access (to install custom apps)
- MCP Gateway running and publicly reachable (or ngrok for local testing)

## Steps

### 1. Register a Bot in Azure
1. Azure Portal > **Azure Bot** > Create
2. Bot handle: `mcp-platform-bot`, Pricing: F0 (Free), Type: Multi-tenant
3. Copy the **Microsoft App ID** and create a **client secret**

### 2. Configure Gateway
Add to `apps/gateway/.env`:
```
TEAMS_APP_ID=your-app-id
TEAMS_APP_PASSWORD=your-client-secret
```

### 3. Set Messaging Endpoint
Azure Bot > Configuration > Messaging endpoint: `https://your-domain/webhooks/teams`

For local testing: `ngrok http 3000` then use the https URL.

### 4. Enable Teams Channel
Azure Bot > Channels > Microsoft Teams > Apply

### 5. Create App Manifest
Create `manifest.json` with your bot ID, zip with icons, upload as custom app in Teams.

### 6. Test
Chat with the bot: "show my issues", "who am I", "check Jira health"

## Troubleshooting
| Problem | Fix |
|---------|-----|
| No response | Check messaging endpoint URL and gateway is running |
| 401 | Verify APP_ID and PASSWORD match Azure |
| Can't install | Need Teams admin permission |
