const test = require('node:test');
const assert = require('node:assert/strict');
const { getItemInfo } = require('../itemMatcher');

test('getItemInfo resolves friendly item names to Bazaar keys', () => {
  const products = {
    UMBER_KEY: { id: 'UMBER_KEY' },
    ENCHANTED_GOLDEN_APPLE: { id: 'ENCHANTED_GOLDEN_APPLE' },
    DIAMOND: { id: 'DIAMOND' },
    RAW_FISH: { id: 'RAW_FISH' },
  };

  assert.equal(getItemInfo(products, 'umber key').id, 'UMBER_KEY');
  assert.equal(getItemInfo(products, 'enchanted golden apple').id, 'ENCHANTED_GOLDEN_APPLE');
  assert.equal(getItemInfo(products, 'diamond').id, 'DIAMOND');
  assert.equal(getItemInfo(products, 'raw fish').id, 'RAW_FISH');
});

test('getItemInfo tolerates spacing and punctuation differences', () => {
  const products = {
    ENCHANTED_GOLDEN_APPLE: { id: 'ENCHANTED_GOLDEN_APPLE' },
  };

  assert.equal(getItemInfo(products, 'enchanted-golden-apple').id, 'ENCHANTED_GOLDEN_APPLE');
  assert.equal(getItemInfo(products, 'enchanted_golden_apple').id, 'ENCHANTED_GOLDEN_APPLE');
});
