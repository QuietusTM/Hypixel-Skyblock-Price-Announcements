# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-07-09

### Release State

This release is considered stable for local/self-hosted use and includes verified test and security baselines.

- Test status: 17 passed, 0 failed.
- Security status: npm audit reports 0 known vulnerabilities.
- Branch status: main synced to origin/main.

### Added

- Guild join lifecycle hook so the bot can auto-detect guild context on invite.
- Safer repository defaults via .gitignore for secrets and runtime artifacts.
- Expanded documentation for setup, commands, and deployment behavior.
- Public deployment note updates covering current hosting conditions.

### Changed

- Guild ID flow now supports blank default DISCORD_GUILD_ID and auto-fills from the first guild the bot joins.
- Slash command registration flow now supports dynamic guild-context refresh after guild join events.
- Alert number formatting now renders with fixed 2-decimal precision for clearer price display.
- Dependency resolution now pins a patched undici line through npm overrides.

### Fixed

- Formatting test failures around alert message numeric output.
- Alert state test expectation mismatch for threshold-reset behavior.
- Vulnerability chain affecting discord.js transitive undici dependency path.

### Security

- Remediated reported advisories in undici-related transitive dependencies.
- Re-locked dependencies after override application and verified clean audit.

### Documentation

- README now includes:
  - Full bot behavior summary.
  - Secure environment variable setup examples.
  - Detailed slash command reference and command behavior notes.
  - Hosting status note indicating HeavenCloud deployment delay due to platform Node.js issues.
- PUBLIC_DEPLOYMENT updated with current HeavenCloud status note and environment guidance.

### Operational Notes

- Runtime data remains SQLite-backed (follows.sqlite).
- POLL_INTERVAL_MS default: 30000.
- CATALOG_REFRESH_INTERVAL_MS default: 86400000.
- Hosting recommendation remains local/alternate hosts until HeavenCloud Node.js stability is confirmed.

### Known Constraints

- DISCORD_TOKEN and DISCORD_CLIENT_ID must still be explicitly provided by environment.
- If running multi-guild at scale later, guild-scoped command strategy should be revisited for broader orchestration.
