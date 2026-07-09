@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

if exist .env (
  for /f "usebackq tokens=* delims=" %%A in (.env) do (
    set "%%A"
  )
)

if not defined DISCORD_TOKEN (
  set /p DISCORD_TOKEN=Enter your Discord bot token: 
)

if not defined DISCORD_CLIENT_ID (
  set /p DISCORD_CLIENT_ID=Enter your Discord application ID: 
)

if not defined DISCORD_GUILD_ID (
  set "DISCORD_GUILD_ID="
)

node --no-deprecation index.js
endlocal
