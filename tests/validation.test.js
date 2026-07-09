const test = require('node:test');
const assert = require('node:assert/strict');
const { validateFollowInput, parseNotifyTarget, normalizeItem, formatItemName } = require('../validation');

test('validateFollowInput rejects invalid price and empty item names', () => {
  assert.deepEqual(validateFollowInput('', 0, 'everyone', null), {
    ok: false,
    error: 'Please provide a non-empty item name.'
  });

  assert.deepEqual(validateFollowInput('diamond', -10, 'everyone', null), {
    ok: false,
    error: 'Price must be a positive number.'
  });
});

test('validateFollowInput accepts a valid user-targeted follow', () => {
  const result = validateFollowInput('diamond', 100000, 'user', '<@123456>');
  assert.equal(result.ok, true);
  assert.equal(result.normalizedItem, 'diamond');
  assert.equal(result.target, '123456');
});

test('validateFollowInput defaults to a user notification when no notify mode is supplied', () => {
  const result = validateFollowInput('diamond', 100000, undefined, undefined);
  assert.equal(result.ok, true);
  assert.equal(result.notify, 'user');
  assert.equal(result.target, null);
});

test('parseNotifyTarget strips mention formatting', () => {
  assert.equal(parseNotifyTarget('<@123456>'), '123456');
  assert.equal(parseNotifyTarget('123456'), '123456');
});

test('normalizeItem and formatItemName format names predictably', () => {
  assert.equal(normalizeItem('  Enchanted_Golden_Apple  '), 'enchanted_golden_apple');
  assert.equal(formatItemName('enchanted_golden_apple'), 'Enchanted Golden Apple');
});
