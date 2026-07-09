const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { FollowStore } = require('../database');

const dbPath = path.join(__dirname, 'tmp-follows.sqlite');

function resetDb() {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
}

test('FollowStore can create, update, list, and remove follows', () => {
  resetDb();
  const store = new FollowStore(dbPath);

  store.upsertFollow('user-1', { item: 'diamond', price: 100000, notify: 'everyone', target: null });
  store.upsertFollow('user-1', { item: 'diamond', price: 50000, notify: 'user', target: '123456' });
  store.upsertFollow('user-2', { item: 'enchanted_golden_apple', price: 250000, notify: 'here', target: null });

  const user1Follows = store.getUserFollows('user-1');
  assert.equal(user1Follows.length, 1);
  assert.equal(user1Follows[0].item, 'diamond');
  assert.equal(user1Follows[0].price, 50000);
  assert.equal(user1Follows[0].notify, 'user');
  assert.equal(user1Follows[0].target, '123456');

  const allFollows = store.getAllFollows();
  assert.equal(allFollows.length, 2);

  const removed = store.removeFollow('user-2', 'enchanted_golden_apple');
  assert.equal(removed, true);
  assert.equal(store.getUserFollows('user-2').length, 0);

  assert.equal(store.getAnnouncementChannelId('guild-a'), null);
  store.setAnnouncementChannelId('guild-a', 'channel-a');
  store.setAnnouncementChannelId('guild-b', 'channel-b');
  assert.equal(store.getAnnouncementChannelId('guild-a'), 'channel-a');
  assert.equal(store.getAnnouncementChannelId('guild-b'), 'channel-b');

  store.close();
  resetDb();
});

test('FollowStore scopes follow state by guild and updates alert state correctly', () => {
  resetDb();
  const store = new FollowStore(dbPath);

  store.upsertFollow('user-1', { item: 'diamond', price: 100000, notify: 'user', target: '123456' }, 'guild-a');
  store.upsertFollow('user-1', { item: 'diamond', price: 100000, notify: 'user', target: '123456' }, 'guild-b');

  const guildAFollows = store.getUserFollows('user-1', 'guild-a');
  assert.equal(guildAFollows.length, 1);
  assert.equal(guildAFollows[0].guildId, 'guild-a');

  store.setAlertSent('user-1', 'diamond', true, 'guild-a');
  assert.equal(store.getUserFollows('user-1', 'guild-a')[0].alertSent, true);
  assert.equal(store.getUserFollows('user-1', 'guild-b')[0].alertSent, false);

  store.close();
  resetDb();
});
