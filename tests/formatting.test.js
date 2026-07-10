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

test('formatAlertMessage describes over-direction alerts correctly', () => {
  const message = formatAlertMessage({
    item: 'DIAMOND',
    price: 10,
    currentPrice: 12,
    direction: 'over',
  });

  assert.match(message, /at or above/);
});

test('evaluateAlertState resets after the price rises above the target again', () => {
  assert.deepEqual(evaluateAlertState({ currentPrice: 30, threshold: 20, alertSent: true }), { shouldAlert: false, shouldResetAlertSent: true });
  assert.deepEqual(evaluateAlertState({ currentPrice: 25, threshold: 20, alertSent: true }), { shouldAlert: false, shouldResetAlertSent: true });
  assert.deepEqual(evaluateAlertState({ currentPrice: 15, threshold: 20, alertSent: false }), { shouldAlert: true, shouldResetAlertSent: false });
  assert.deepEqual(evaluateAlertState({ currentPrice: 15, threshold: 20, alertSent: true }), { shouldAlert: false, shouldResetAlertSent: false });
});

test('evaluateAlertState supports over-target alerts and reset logic', () => {
  assert.deepEqual(evaluateAlertState({ currentPrice: 15, threshold: 20, alertSent: true, direction: 'over' }), { shouldAlert: false, shouldResetAlertSent: true });
  assert.deepEqual(evaluateAlertState({ currentPrice: 22, threshold: 20, alertSent: false, direction: 'over' }), { shouldAlert: true, shouldResetAlertSent: false });
  assert.deepEqual(evaluateAlertState({ currentPrice: 22, threshold: 20, alertSent: true, direction: 'over' }), { shouldAlert: false, shouldResetAlertSent: false });
});
