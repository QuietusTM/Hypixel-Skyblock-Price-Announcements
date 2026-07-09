# Public Discord Bot Deployment Checklist

## 1. Discord Developer Portal

- Create or open your application in the Discord Developer Portal.
- Go to Bot and create a bot user.
- Copy the bot token and keep it secret.
- Under OAuth2 > URL Generator, select:
  - bot
  - applications.commands
- Choose the bot permissions you need, such as:
  - Send Messages
  - Read Message History
  - Use Slash Commands
- Use the generated invite URL to add the bot to a server.

## 2. Environment Variables

Set these before starting the bot:

```powershell
$env:DISCORD_TOKEN="your_bot_token"
$env:DISCORD_CLIENT_ID="your_application_id"
$env:DISCORD_GUILD_ID=""  # leave empty for global commands; the bot will use the current server automatically for guild-scoped settings
$env:POLL_INTERVAL_MS="30000"
$env:CATALOG_REFRESH_INTERVAL_MS="86400000"
$env:DATABASE_PATH="./follows.sqlite"
```

## 3. Hosting Recommendation

For a public bot, host it on a service such as:
- Railway
- Render
- Fly.io
- DigitalOcean
- VPS

Make sure the host keeps the bot process running continuously.

## 4. Privacy and Safety

Because the bot may be used by many users:
- Avoid storing sensitive data beyond follow preferences.
- Consider adding a privacy notice in your bot description.
- Handle rate limits and API failures gracefully.
- Keep the token in environment variables or a secret manager.
- Make sure the host persists the SQLite database file between restarts.

## 5. Recommended Hosting Notes

- Use a process manager such as PM2 or a platform that keeps the bot alive.
- Set the bot to use a persistent filesystem volume for the SQLite database.
- Restart the bot after changing environment variables or adding slash commands.

## 6. HeavenCloud Setup

Current status: official HeavenCloud deployment is temporarily delayed because of platform-wide Node.js issues.

For your HeavenCloud app at `slu1.heavencloud.in:3045`, use these commands:

- Build command: `npm install`
- Start command: `npm start`
- HeavenCloud startup variable: set `NODE_ARGS=--no-deprecation` (or `--no-warnings` if you want all process warnings hidden)

This project now uses the `better-sqlite3` package, so SQLite is installed as a dependency during `npm install` and does not rely on Node's built-in `node:sqlite` module.
The repository includes an `allowScripts` entry in `package.json` for `better-sqlite3`, so npm can run its install/build script during deployment.

Deprecation warnings are also suppressed in the start command with `--no-deprecation` to reduce noisy logs.
If your host ignores the start command and launches `node index.js` directly, set `NODE_OPTIONS=--no-deprecation` in the host environment variables.
HeavenCloud's startup command uses `${NODE_ARGS}` after the main file, so setting `NODE_ARGS=--no-deprecation` is usually the most direct fix there.
