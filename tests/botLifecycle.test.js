const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionsBitField } = require('discord.js');
const {
  registerReadyHandler,
  registerGuildJoinHandler,
  hasModeratorPermissions,
  getAnnouncementChannelId,
  setAnnouncementChannelId,
} = require('../botLifecycle');

test('registerReadyHandler listens for the clientReady event', async () => {
  let triggered = false;
  const client = {
    once(eventName, handler) {
      assert.equal(eventName, 'clientReady');
      triggered = true;
      handler();
    },
  };

  registerReadyHandler(client, async () => {
    assert.equal(triggered, true);
  });

  assert.equal(triggered, true);
});

test('registerGuildJoinHandler listens for the guildCreate event', async () => {
  let joinedGuildId = null;
  const client = {
    on(eventName, handler) {
      assert.equal(eventName, 'guildCreate');
      handler({ id: '999' });
    },
  };

  registerGuildJoinHandler(client, async (guild) => {
    joinedGuildId = guild.id;
  });

  assert.equal(joinedGuildId, '999');
});

test('guild join handler can autofill DISCORD_GUILD_ID when empty', async () => {
  delete process.env.DISCORD_GUILD_ID;
  const client = {
    on(_eventName, handler) {
      handler({ id: '1234567890' });
    },
  };

  registerGuildJoinHandler(client, async (guild) => {
    const currentGuildId = String(process.env.DISCORD_GUILD_ID || '').trim();
    if (!currentGuildId && guild?.id) {
      process.env.DISCORD_GUILD_ID = guild.id;
    }
  });

  assert.equal(process.env.DISCORD_GUILD_ID, '1234567890');
});

test('hasModeratorPermissions accepts manage guild or administrator permissions', () => {
  assert.equal(hasModeratorPermissions({ has: (permission) => permission === PermissionsBitField.Flags.ManageGuild }), true);
  assert.equal(hasModeratorPermissions({ has: (permission) => permission === PermissionsBitField.Flags.Administrator }), true);
  assert.equal(hasModeratorPermissions({ has: () => false }), false);
  assert.equal(hasModeratorPermissions(null), false);
});

test('announcement channel id helpers read and write env state', () => {
  delete process.env.ANNOUNCEMENT_CHANNEL_ID;
  assert.equal(getAnnouncementChannelId(), null);

  setAnnouncementChannelId('123456');
  assert.equal(getAnnouncementChannelId(), '123456');
});
