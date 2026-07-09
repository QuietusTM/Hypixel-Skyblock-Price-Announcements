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
  getAnnouncementChannelId,
  setAnnouncementChannelId,
};
