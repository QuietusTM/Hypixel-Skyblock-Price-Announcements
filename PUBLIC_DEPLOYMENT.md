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

This project is compatible with Havencloud's direct startup command flow.

Set these environment variables in Havencloud:

- `MAIN_FILE=heavencloud.mts`
- `NODE_ARGS=--no-deprecation`
- `DISCORD_TOKEN=your_bot_token`
- `DISCORD_CLIENT_ID=your_application_id`
- `DISCORD_GUILD_ID=`
- `POLL_INTERVAL_MS=30000`
- `CATALOG_REFRESH_INTERVAL_MS=86400000`
- `DATABASE_PATH=/home/container/follows.sqlite`

Use this startup command:

```bash
if [[ -d .git ]] && [[ 1 == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; if [[ "${MAIN_FILE}" == "*.js" ]]; then /usr/local/bin/node "/home/container/${MAIN_FILE}" ${NODE_ARGS}; else /usr/local/bin/ts-node --esm "/home/container/${MAIN_FILE}" ${NODE_ARGS}; fi
```

Deployment notes:

- This project uses `better-sqlite3`, so SQLite support is installed through `npm install` and does not depend on Node's built-in `node:sqlite` module.
- The repository includes an `allowScripts` entry in `package.json` for `better-sqlite3`, so npm can run its install/build step during deployment.
- Havencloud's startup condition does not treat `index.js` as a JavaScript match in practice, so this branch uses `heavencloud.mts` as the explicit `ts-node --esm` entrypoint and hands off to the existing CommonJS bot runtime.
- The runtime entrypoint is already guarded in code against the noisy deprecation warning seen on some Node 22 hosts, and `NODE_ARGS=--no-deprecation` keeps the host logs cleaner.
- If Havencloud provides a separate persistent disk path, point `DATABASE_PATH` there instead of the default container root.
