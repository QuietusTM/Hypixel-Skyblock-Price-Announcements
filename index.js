const originalEmitWarning = process.emitWarning.bind(process);

// Some hosting environments running Node 22 emit DEP0180 from dependency code.
// Drop only that specific warning to keep logs clean while preserving other warnings.
process.emitWarning = (warning, ...args) => {
  const warningCode = typeof warning === 'object' && warning !== null
    ? warning.code
    : args.find((arg) => typeof arg === 'string' && /^DEP\d+$/.test(arg));
  const warningMessage = typeof warning === 'string' ? warning : warning?.message || '';

  if (warningCode === 'DEP0180' || /fs\.Stats constructor is deprecated/i.test(warningMessage)) {
    return;
  }

  return originalEmitWarning(warning, ...args);
};

process.noDeprecation = true;

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { normalizeItem, formatItemName, validateFollowInput } = require('./validation');
const { FollowStore } = require('./database');
const { getItemInfo } = require('./itemMatcher');
const { refreshBazaarCatalog, fetchBazaarDataWithRetry } = require('./catalog');
const {
  registerReadyHandler,
  registerGuildJoinHandler,
  getAnnouncementChannelId,
  setAnnouncementChannelId,
} = require('./botLifecycle');
const { formatAlertMessage, evaluateAlertState } = require('./alerts');

function loadEnvFile(envPath = path.join(__dirname, '.env')) {
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'follows.sqlite');
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 30000);
const CATALOG_REFRESH_INTERVAL_MS = Number(process.env.CATALOG_REFRESH_INTERVAL_MS || 24 * 60 * 60 * 1000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const followStore = new FollowStore(DB_PATH);
let lastBazaarSnapshot = null;

function resolveGuildId(guildOrId) {
  const rawGuildId = typeof guildOrId === 'string'
    ? guildOrId
    : guildOrId?.id || guildOrId?.guildId || guildOrId?.guild?.id || '';
  const resolvedGuildId = String(rawGuildId || process.env.DISCORD_GUILD_ID || client.guilds.cache.first()?.id || '').trim();
  if (resolvedGuildId) {
    process.env.DISCORD_GUILD_ID = resolvedGuildId;
  }
  return resolvedGuildId;
}

async function fetchBazaarData() {
  return fetchBazaarDataWithRetry(async () => {
    const response = await fetch('https://api.hypixel.net/v2/skyblock/bazaar');
    return response;
  });
}

async function replyEphemeral(interaction, content) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(content);
      return;
    }
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  } catch (error) {
    if (error?.code === 10062 || error?.status === 404) {
      console.warn('Ignored stale interaction response for a command that is no longer valid.');
      return;
    }
    throw error;
  }
}

async function getAnnouncementChannel(guildId = GUILD_ID) {
  const resolvedGuildId = guildId || GUILD_ID || '';
  const announcementChannelId = followStore.getAnnouncementChannelId(resolvedGuildId) || getAnnouncementChannelId();
  if (!announcementChannelId) return null;

  const guild = client.guilds.cache.get(resolvedGuildId) || client.guilds.cache.first();
  if (!guild) return null;

  const channel = guild.channels.cache.get(announcementChannelId) || guild.channels.cache.find((ch) => ch.id === announcementChannelId);
  if (!channel || !channel.isTextBased || !channel.permissionsFor(client.user)?.has('SendMessages')) {
    return null;
  }

  return channel;
}

async function sendStartupTestMessage(guild) {
  try {
    const channel = await getAnnouncementChannel(resolveGuildId(guild));
    if (!channel) {
      console.warn('No announcement channel configured or available for startup message test.');
      return;
    }

    await channel.send('SB Price Announcements is online and able to send public messages.');
    console.log('Startup public message test sent.');
  } catch (error) {
    console.warn('Startup public message test failed:', error.message);
  }
}

async function checkAndNotify() {
  try {
    const products = await fetchBazaarData();
    if (!lastBazaarSnapshot) {
      lastBazaarSnapshot = products;
      return;
    }

    const allFollows = followStore.getAllFollows();
    for (const follow of allFollows) {
      const product = getItemInfo(products, follow.item);
      if (!product) continue;

      const buyPrice = Number(product.quick_status?.buyPrice || 0);
      const sellPrice = Number(product.quick_status?.sellPrice || 0);
      const currentPrice = Math.min(buyPrice, sellPrice);
      const alertState = evaluateAlertState({ currentPrice, threshold: follow.price, alertSent: follow.alertSent });

      if (alertState.shouldResetAlertSent) {
        followStore.setAlertSent(follow.userId, follow.item, false, follow.guildId || resolveGuildId(client.guilds.cache.first()));
        continue;
      }

      if (alertState.shouldAlert) {
        const guildId = follow.guildId || resolveGuildId(client.guilds.cache.first());
        const guild = client.guilds.cache.get(guildId) || client.guilds.cache.first();
        if (!guild) continue;

        const member = await guild.members.fetch(follow.userId).catch(() => null);
        const pingTarget = follow.notify === 'everyone'
          ? '@everyone'
          : follow.notify === 'here'
            ? '@here'
            : follow.notify === 'user'
              ? (follow.target ? `<@${follow.target}>` : (member ? `<@${follow.userId}>` : `<@${follow.userId}>`))
              : null;

        const channel = await getAnnouncementChannel(guildId);
        if (!channel) continue;

        const content = formatAlertMessage({
          item: follow.item,
          price: follow.price,
          currentPrice,
          pingTarget,
        });
        await channel.send(content);
        followStore.setAlertSent(follow.userId, follow.item, true, follow.guildId || resolveGuildId(client.guilds.cache.first()));
      }
    }

    lastBazaarSnapshot = products;
  } catch (error) {
    console.error('Alert check failed:', error.message);
  }
}

async function registerSlashCommands() {
  if (!TOKEN || !CLIENT_ID) {
    console.warn('DISCORD_TOKEN or DISCORD_CLIENT_ID is not set. Commands will not be registered.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const effectiveGuildId = resolveGuildId(process.env.DISCORD_GUILD_ID || GUILD_ID || client.guilds.cache.first());

  if (!effectiveGuildId) {
    console.log('No guild ID is set, so slash commands will be registered globally and may take a while to appear.');
  } else {
    console.log(`Registering slash commands for guild ${effectiveGuildId}`);
  }

  const commands = [
    new SlashCommandBuilder().setName('follow').setDescription('Follow an item on the Bazaar').addStringOption((option) => option.setName('item').setDescription('Item name from the Bazaar').setRequired(true)).addNumberOption((option) => option.setName('price').setDescription('Alert when price drops below this amount').setRequired(true)).addStringOption((option) => option.setName('target').setDescription('Optional user mention or ID to ping when this alert triggers').setRequired(false)).toJSON(),
    new SlashCommandBuilder().setName('followlist').setDescription('List your Bazaar follow alerts').toJSON(),
    new SlashCommandBuilder().setName('searchitem').setDescription('Search the Bazaar catalog for an item').addStringOption((option) => option.setName('query').setDescription('Keyword to search for').setRequired(true)).toJSON(),
    new SlashCommandBuilder().setName('clearfollowlist').setDescription('Clear all of your Bazaar follows').toJSON(),
    new SlashCommandBuilder().setName('setchannel').setDescription('Set the channel for Bazaar alert messages').addStringOption((option) => option.setName('channel').setDescription('Optional channel ID or mention for alert messages').setRequired(false)).toJSON(),
    new SlashCommandBuilder().setName('unfollow').setDescription('Remove an item from your follow list').addStringOption((option) => option.setName('item').setDescription('Item to remove').setRequired(true)).toJSON(),
  ];

  try {
    if (effectiveGuildId) {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, effectiveGuildId), { body: commands });
      console.log('Slash commands registered for guild');
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('Slash commands registered globally');
    }
  } catch (error) {
    console.error('Failed to register commands:', error.message);
  }
}

registerReadyHandler(client, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  registerSlashCommands();
  await sendStartupTestMessage(client.guilds.cache.first());
  try {
    const refreshed = await refreshBazaarCatalog(followStore, fetchBazaarData);
    console.log(`Bazaar catalog refreshed with ${refreshed} items`);
  } catch (error) {
    console.error('Initial catalog refresh failed:', error.message);
  }
  setInterval(checkAndNotify, POLL_INTERVAL_MS);
  setInterval(() => {
    refreshBazaarCatalog(followStore, fetchBazaarData).catch((error) => {
      console.error('Scheduled catalog refresh failed:', error.message);
    });
  }, CATALOG_REFRESH_INTERVAL_MS);
});

registerGuildJoinHandler(client, async (guild) => {
  const currentGuildId = String(process.env.DISCORD_GUILD_ID || '').trim();
  if (!currentGuildId && guild?.id) {
    process.env.DISCORD_GUILD_ID = guild.id;
    console.log(`Auto-filled DISCORD_GUILD_ID from guild join: ${guild.id}`);
  }

  const effectiveGuildId = String(process.env.DISCORD_GUILD_ID || '').trim();
  if (effectiveGuildId === guild?.id && TOKEN && CLIENT_ID) {
    await registerSlashCommands();
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.deferred && !interaction.replied) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } catch (error) {
      if (error?.code === 10062 || error?.status === 404) {
        console.warn('Ignored stale interaction before command handling started.');
        return;
      }
      console.error('Failed to defer interaction reply:', error);
      return;
    }
  }

  const { commandName, user } = interaction;

  try {
    if (commandName === 'follow') {
      const item = interaction.options.getString('item');
      const price = interaction.options.getNumber('price');
      const target = interaction.options.getString('target');

      const validation = validateFollowInput(item, price, 'user', target);
      const guildId = resolveGuildId(interaction.guild || interaction.guildId);
      if (!validation.ok) {
        await replyEphemeral(interaction, validation.error);
        return;
      }

      if (validation.clearExisting) {
        const existingFollows = followStore.getUserFollows(user.id, guildId);
        for (const follow of existingFollows) {
          followStore.removeFollow(user.id, follow.item, guildId);
        }
      }

      const notifyTarget = validation.target ? validation.target : user.id;

      followStore.upsertFollow(user.id, {
        item: validation.normalizedItem,
        price: validation.price,
        notify: 'user',
        target: notifyTarget,
      }, guildId);

      const responseText = validation.normalizedItem === 'all'
        ? `Now following all Bazaar items at ${validation.price}. Your previous follow list was cleared.`
        : `Now following ${formatItemName(validation.normalizedItem)} at ${validation.price} and notifying you.`;

      await replyEphemeral(interaction, responseText);
    }

    if (commandName === 'followlist') {
      const userFollows = followStore.getUserFollows(user.id, resolveGuildId(interaction.guild || interaction.guildId));
      if (!userFollows.length) {
        await replyEphemeral(interaction, 'You are not following any Bazaar items yet.');
        return;
      }

      const lines = userFollows.map((entry) => `- ${formatItemName(entry.item)} | threshold: ${entry.price} | notify: ${entry.notify}${entry.target ? ` | ping: <@${entry.target}>` : ''}`);
      await replyEphemeral(interaction, `Your followed items:\n${lines.join('\n')}`);
    }

    if (commandName === 'searchitem') {
      const query = interaction.options.getString('query');
      if (!query || !query.trim()) {
        await replyEphemeral(interaction, 'Please provide a search term.');
        return;
      }

      const items = followStore.getAllCatalogItems();
      const normalizedQuery = query.toLowerCase().trim();
      const matches = items.filter((entry) => {
        const haystack = `${entry.display_name} ${entry.normalized_name}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      }).slice(0, 10);

      if (!matches.length) {
        await replyEphemeral(interaction, `No Bazaar items matched "${query}".`);
        return;
      }

      const lines = matches.map((entry) => `- ${entry.display_name}`);
      await replyEphemeral(interaction, `Matching Bazaar items for "${query}":\n${lines.join('\n')}`);
    }

    if (commandName === 'clearfollowlist') {
      const existingFollows = followStore.getUserFollows(user.id, resolveGuildId(interaction.guild || interaction.guildId));
      for (const follow of existingFollows) {
        followStore.removeFollow(user.id, follow.item, resolveGuildId(interaction.guild || interaction.guildId));
      }
      await replyEphemeral(interaction, 'Your follow list has been cleared.');
    }

    if (commandName === 'setchannel') {
      const channelInput = interaction.options.getString('channel');
      const inputId = channelInput?.replace(/<|#|>/g, '').trim();
      const channelId = inputId && /^\d+$/.test(inputId) ? inputId : (inputId ? null : interaction.channel?.id);

      if (!channelId) {
        await replyEphemeral(interaction, 'Please provide a valid channel ID or mention, or run the command in the channel you want to use.');
        return;
      }

      let channel = interaction.channel?.id === channelId ? interaction.channel : null;
      if (!channel && interaction.guild) {
        channel = interaction.guild.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null);
      }

      if (!channel || !channel.isTextBased) {
        await replyEphemeral(interaction, 'That channel was not found or is not a text channel.');
        return;
      }

      if (!channel.permissionsFor(client.user)?.has('SendMessages')) {
        await replyEphemeral(interaction, 'The bot does not have permission to send messages in that channel.');
        return;
      }

      const guildId = resolveGuildId(interaction.guild || interaction.guildId);
      followStore.setAnnouncementChannelId(guildId, channel.id);
      console.log(`Announcement channel set to ${channel.id} for guild ${guildId}`);
      await replyEphemeral(interaction, `Alert messages will now be sent to <#${channel.id}> for this server.`);
    }

    if (commandName === 'unfollow') {
      const item = interaction.options.getString('item');
      if (!item || !item.trim()) {
        await replyEphemeral(interaction, 'Please provide a non-empty item name to unfollow.');
        return;
      }

      const normalizedItem = normalizeItem(item);
      const removed = followStore.removeFollow(user.id, normalizedItem, resolveGuildId(interaction.guild || interaction.guildId));

      if (!removed) {
        await replyEphemeral(interaction, `You are not following ${formatItemName(normalizedItem)}.`);
        return;
      }

      await replyEphemeral(interaction, `Removed ${formatItemName(normalizedItem)} from your follow list.`);
    }
  } catch (error) {
    console.error('Interaction handler failed:', error);
    try {
      await replyEphemeral(interaction, 'Something went wrong while processing that command. Please try again.');
    } catch (replyError) {
      if (replyError?.code !== 10062 && replyError?.status !== 404) {
        console.error('Failed to send fallback interaction response:', replyError);
      }
    }
  }
});

if (require.main === module) {
  if (!TOKEN) {
    console.error('Missing DISCORD_TOKEN. Add it to .env or your environment and restart the bot.');
    process.exit(1);
  }

  if (!CLIENT_ID) {
    console.error('Missing DISCORD_CLIENT_ID. Add it to .env or your environment and restart the bot.');
    process.exit(1);
  }

  client.login(TOKEN).catch((error) => {
    console.error('Failed to log in to Discord:', error.message);
    process.exit(1);
  });
}

module.exports = {
  formatAlertMessage,
  resolveGuildId,
  getAnnouncementChannel,
  checkAndNotify,
};
