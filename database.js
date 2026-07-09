const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

class FollowStore {
  constructor(dbPath = path.join(__dirname, 'follows.sqlite')) {
    this.dbPath = dbPath;
    this.db = new Database(this.dbPath);
    this.initialize();
    this.prepareStatements();
  }

  initialize() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA busy_timeout = 5000;
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS follows (
        guild_id TEXT NOT NULL DEFAULT '',
        user_id TEXT NOT NULL,
        item TEXT NOT NULL,
        price REAL NOT NULL,
        notify TEXT NOT NULL,
        target TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        alert_sent INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        announcement_channel_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bazaar_items (
        item_key TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_sellable INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS bazaar_aliases (
        alias TEXT NOT NULL,
        item_key TEXT NOT NULL,
        normalized_alias TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (alias, item_key)
      );
    `);

    this.ensureColumn('follows', 'alert_sent', 'INTEGER NOT NULL DEFAULT 0');
    this.ensureColumn('follows', 'guild_id', "TEXT NOT NULL DEFAULT ''");

    // Keep only the newest row for each guild/user/item triplet before enforcing uniqueness.
    this.db.exec(`
      DELETE FROM follows
      WHERE rowid NOT IN (
        SELECT MAX(rowid)
        FROM follows
        GROUP BY guild_id, user_id, item
      );
    `);
    this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_guild_user_item ON follows(guild_id, user_id, item)');
  }

  prepareStatements() {
    this.upsertFollowStmt = this.db.prepare(`
      INSERT INTO follows (guild_id, user_id, item, price, notify, target, alert_sent)
      VALUES (?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(guild_id, user_id, item) DO UPDATE SET
        price = excluded.price,
        notify = excluded.notify,
        target = excluded.target,
        alert_sent = 0
    `);
  }

  runWrite(statement, ...params) {
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return statement.run(...params);
      } catch (error) {
        const isBusy = error?.code === 'SQLITE_BUSY' || Number(error?.errcode) === 5;
        if (!isBusy || attempt === maxAttempts) {
          throw error;
        }

        // Brief synchronous backoff for short lock windows from concurrent writes.
        const waitUntil = Date.now() + attempt * 25;
        while (Date.now() < waitUntil) {
          // Intentional spin-wait; writes are tiny and this keeps the API synchronous.
        }
      }
    }

    return null;
  }

  ensureColumn(tableName, columnName, columnDefinition) {
    const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
    const hasColumn = columns.some((column) => column.name === columnName);
    if (!hasColumn) {
      this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    }
  }

  upsertFollow(userId, follow, guildId = follow?.guildId || '') {
    const resolvedGuildId = String(guildId || '').trim();
    this.runWrite(this.upsertFollowStmt, resolvedGuildId, userId, follow.item, follow.price, follow.notify, follow.target || null);
  }

  getUserFollows(userId, guildId = '') {
    const resolvedGuildId = String(guildId || '').trim();
    const rows = this.db.prepare('SELECT guild_id, user_id, item, price, notify, target, alert_sent FROM follows WHERE user_id = ? AND guild_id = ? ORDER BY item').all(userId, resolvedGuildId);
    return rows.map((row) => ({
      guildId: row.guild_id,
      userId: row.user_id,
      item: row.item,
      price: Number(row.price),
      notify: row.notify,
      target: row.target,
      alertSent: Number(row.alert_sent) === 1,
    }));
  }

  getAllFollows(guildId = null) {
    const resolvedGuildId = guildId === null || guildId === undefined ? null : String(guildId).trim();
    const rows = resolvedGuildId
      ? this.db.prepare('SELECT guild_id, user_id, item, price, notify, target, alert_sent FROM follows WHERE guild_id = ? ORDER BY user_id, item').all(resolvedGuildId)
      : this.db.prepare('SELECT guild_id, user_id, item, price, notify, target, alert_sent FROM follows ORDER BY guild_id, user_id, item').all();
    return rows.map((row) => ({
      guildId: row.guild_id,
      userId: row.user_id,
      item: row.item,
      price: Number(row.price),
      notify: row.notify,
      target: row.target,
      alertSent: Number(row.alert_sent) === 1,
    }));
  }

  removeFollow(userId, item, guildId = '') {
    const resolvedGuildId = String(guildId || '').trim();
    const result = this.runWrite(this.db.prepare('DELETE FROM follows WHERE user_id = ? AND item = ? AND guild_id = ?'), userId, item, resolvedGuildId);
    return result.changes > 0;
  }

  setAlertSent(userId, item, alertSent, guildId = '') {
    const resolvedGuildId = String(guildId || '').trim();
    const result = this.runWrite(this.db.prepare('UPDATE follows SET alert_sent = ? WHERE user_id = ? AND item = ? AND guild_id = ?'), alertSent ? 1 : 0, userId, item, resolvedGuildId);
    return result.changes > 0;
  }

  setAnnouncementChannelId(guildId, channelId) {
    const resolvedGuildId = String(guildId || '').trim();
    const resolvedChannelId = channelId ? String(channelId).trim() : null;
    this.runWrite(this.db.prepare(`
      INSERT INTO guild_settings (guild_id, announcement_channel_id)
      VALUES (?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET announcement_channel_id = excluded.announcement_channel_id
    `), resolvedGuildId, resolvedChannelId);
  }

  getAnnouncementChannelId(guildId) {
    const resolvedGuildId = String(guildId || '').trim();
    const row = this.db.prepare('SELECT announcement_channel_id FROM guild_settings WHERE guild_id = ?').get(resolvedGuildId);
    return row?.announcement_channel_id || null;
  }

  upsertBazaarItem(itemKey, displayName) {
    const normalizedName = displayName.toLowerCase().trim();
    this.runWrite(this.db.prepare(`
      INSERT INTO bazaar_items (item_key, display_name, normalized_name, last_seen_at, is_sellable)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
      ON CONFLICT(item_key) DO UPDATE SET
        display_name = excluded.display_name,
        normalized_name = excluded.normalized_name,
        last_seen_at = CURRENT_TIMESTAMP,
        is_sellable = 1;
    `), itemKey, displayName, normalizedName);
  }

  upsertAlias(alias, itemKey) {
    const normalizedAlias = String(alias || '').toLowerCase().trim();
    if (!normalizedAlias) return;
    this.runWrite(this.db.prepare(`
      INSERT INTO bazaar_aliases (alias, item_key, normalized_alias)
      VALUES (?, ?, ?)
      ON CONFLICT(alias, item_key) DO NOTHING;
    `), normalizedAlias, itemKey, normalizedAlias);
  }

  getItemAliases(itemKey) {
    return this.db.prepare('SELECT alias FROM bazaar_aliases WHERE item_key = ? ORDER BY alias').all(itemKey).map((row) => row.alias);
  }

  getItemByAlias(alias) {
    const normalizedAlias = String(alias || '').toLowerCase().trim();
    const row = this.db.prepare('SELECT item_key FROM bazaar_aliases WHERE normalized_alias = ? LIMIT 1').get(normalizedAlias);
    return row ? row.item_key : null;
  }

  getAllCatalogItems() {
    return this.db.prepare('SELECT item_key, display_name, normalized_name, last_seen_at FROM bazaar_items ORDER BY display_name').all();
  }

  pruneMissingItems(currentItemKeys) {
    const seen = new Set(currentItemKeys);
    const existing = this.db.prepare('SELECT item_key FROM bazaar_items').all();
    for (const row of existing) {
      if (!seen.has(row.item_key)) {
        this.runWrite(this.db.prepare('UPDATE bazaar_items SET is_sellable = 0 WHERE item_key = ?'), row.item_key);
      }
    }
  }

  close() {
    this.db.close();
  }
}

module.exports = { FollowStore };
