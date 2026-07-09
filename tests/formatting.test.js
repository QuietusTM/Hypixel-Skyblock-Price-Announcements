const test = require('node:test');
const assert = require('node:assert/strict');
const { formatAlertMessage, evaluateAlertState } = require('../alerts');

test('formatAlertMessage uses readable numbers and bold formatting', () => {
  const message = formatAlertMessage({
    item: 'ENCHANTED_GOLDEN_APPLE',
    price: 2000000.97,
    currentPrice: 1800000.5,
    pingTarget: '<@123456>',
  });

  assert.match(message, /\*\*2,000,000\.97\*\*/);
  assert.match(message, /\*\*1,800,000\.50\*\*/);
  assert.match(message, /<@123456>/);
});

test('evaluateAlertState resets after the price rises above the target again', () => {
  assert.deepEqual(evaluateAlertState({ currentPrice: 30, threshold: 20, alertSent: true }), { shouldAlert: false, shouldResetAlertSent: true });
  assert.deepEqual(evaluateAlertState({ currentPrice: 25, threshold: 20, alertSent: true }), { shouldAlert: false, shouldResetAlertSent: true });
  assert.deepEqual(evaluateAlertState({ currentPrice: 15, threshold: 20, alertSent: false }), { shouldAlert: true, shouldResetAlertSent: false });
  assert.deepEqual(evaluateAlertState({ currentPrice: 15, threshold: 20, alertSent: true }), { shouldAlert: false, shouldResetAlertSent: false });
});
