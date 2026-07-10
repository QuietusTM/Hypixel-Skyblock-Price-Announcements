## Personal Note:
This was entirely vibe coded in like a day and a half with some help of the limited knowledge I do have, I am just fucking around with things to be totally honest if you like the idea and can improve on it absolutely feel free. I will work to improve it as I notice more issues come up once this is properly hosted I will see how things go. 


# Discord Bazaar Alert Bot

Discord bot that tracks Hypixel SkyBlock Bazaar prices and posts alerts to your configured server channel when tracked items move under or over your target threshold.

## What The Bot Does

- Polls the Hypixel Bazaar API on a schedule.
- Lets each user follow one or more Bazaar items at custom price thresholds.
- Sends a public alert message to the server alert channel when an item is at or below your tracked price, or at or above your tracked price (based on rule direction).
- Prevents repeated spam for the same unchanged low-price state until price conditions reset.
- Stores follows and guild settings in SQLite.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set environment variables.

Windows CMD:

```bat
set DISCORD_TOKEN=your_bot_token
set DISCORD_CLIENT_ID=your_application_id
set DISCORD_GUILD_ID=
set POLL_INTERVAL_MS=30000
set CATALOG_REFRESH_INTERVAL_MS=86400000
set DATABASE_PATH=./follows.sqlite
```

PowerShell:

```powershell
$env:DISCORD_TOKEN="your_bot_token"
$env:DISCORD_CLIENT_ID="your_application_id"
$env:DISCORD_GUILD_ID=""
$env:POLL_INTERVAL_MS="30000"
$env:CATALOG_REFRESH_INTERVAL_MS="86400000"
$env:DATABASE_PATH="./follows.sqlite"
```

Important: leave DISCORD_GUILD_ID blank by default. The bot now auto-fills it from the first server it is invited into.

3. Start the bot:

```bash
npm start
```

## Slash Commands

### /follow

Adds or updates a follow alert.

- item: item name to follow.
- price: target threshold for alerts.
- direction (optional):
	- under: triggers when current tracked price is less than or equal to target (default).
	- over: triggers when current tracked price is greater than or equal to target.
- target (optional): user mention or user ID to ping in alerts. If omitted, the command user is pinged.

Special behavior:

- item=all clears your existing follows and replaces them with a single all-items follow rule at the chosen threshold and direction.

### /followlist

Shows your active follows for the current server, split into two sections:

- Falling under target price.
- Rising over target price.

### /unfollow

Removes a single followed item from your list.

- item: item name to remove.

### /clearfollowlist

Removes all your follows in the current server.

### /searchitem

Searches the Bazaar catalog by keyword and returns top matches.

- query: search text.

### /setchannel

Sets the server channel where public alert messages are posted.

- channel (optional): channel mention or numeric channel ID.
- if omitted: uses the channel where the command is run.

## Invite And Permissions

When generating your OAuth2 invite URL, include:

- bot
- applications.commands

Recommended bot permissions:

- Send Messages
- Read Message History
- Use Slash Commands

## Storage And Runtime Notes

- Uses SQLite via better-sqlite3.
- Default database file is follows.sqlite.
- Alert polling interval defaults to 30 seconds.
- Bazaar catalog refresh defaults to once every 24 hours.

## Hosting Status

Official HeavenCloud deployment is currently delayed while platform-wide Node.js issues are being resolved.
For now, local or alternate-host runs are recommended.

## Havencloud Deployment

This repository can also run on Havencloud with a direct node entrypoint instead of `npm start`.

Use these Havencloud environment values:

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

Notes:

- Set `MAIN_FILE` to `heavencloud.mts` because Havencloud's startup condition falls through to the `ts-node --esm` path for normal JavaScript entrypoints, and `.mts` gives `ts-node` an explicit ESM entry file.
- Keep `NODE_ARGS=--no-deprecation` if you want the cleanest runtime logs.
- Make sure `/home/container/follows.sqlite` is on persistent storage if your Havencloud setup separates ephemeral and persistent paths.
