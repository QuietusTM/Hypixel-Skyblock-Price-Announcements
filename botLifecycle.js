const { PermissionsBitField } = require('discord.js');

function registerReadyHandler(client, onReady) {
  client.once('clientReady', async () => {
    await onReady();
  });
}

function registerGuildJoinHandler(client, onGuildJoin) {
  client.on('guildCreate', async (guild) => {
    await onGuildJoin(guild);
  });
}

function hasModeratorPermissions(memberPermissions) {
  return Boolean(
    memberPermissions?.has?.(PermissionsBitField.Flags.ManageGuild)
    || memberPermissions?.has?.(PermissionsBitField.Flags.Administrator)
  );
}

function getAnnouncementChannelId() {
  return process.env.ANNOUNCEMENT_CHANNEL_ID || null;
}

function setAnnouncementChannelId(channelId) {
  process.env.ANNOUNCEMENT_CHANNEL_ID = channelId;
  return channelId;
}

module.exports = {
  registerReadyHandler,
  registerGuildJoinHandler,
  hasModeratorPermissions,
  getAnnouncementChannelId,
  setAnnouncementChannelId,
};
