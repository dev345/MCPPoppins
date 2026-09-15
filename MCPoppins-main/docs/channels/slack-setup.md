# Connect Slack to MCP Platform

## Prerequisites
- Slack workspace admin access
- MCP Gateway running and publicly reachable

## Steps

### 1. Create Slack App
1. api.slack.com/apps > Create New App > From scratch
2. Add Bot Scopes: `chat:write`, `app_mentions:read`, `im:read`, `im:history`
3. Install to Workspace, copy Bot Token (`xoxb-...`)

### 2. Enable Events
1. Event Subscriptions > Enable > Request URL: `https://your-domain/webhooks/slack`
2. Subscribe to: `message.im`, `app_mention`

### 3. Configure Gateway
```
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-secret
```

### 4. Test
DM the bot: "show my issues", "who am I", "check Confluence health"

## Troubleshooting
| Problem | Fix |
|---------|-----|
| Verification fails | Start gateway before enabling events |
| No reply | Check SLACK_BOT_TOKEN |
| not_authed | Reinstall the app |
