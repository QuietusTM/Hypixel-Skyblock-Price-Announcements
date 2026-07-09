const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchBazaarDataWithRetry } = require('../catalog');

test('fetchBazaarDataWithRetry retries transient failures', async () => {
  let attempts = 0;

  const fakeFetch = async () => {
    attempts += 1;
    if (attempts === 1) {
      const error = new Error('socket hang up');
      error.code = 'ECONNRESET';
      throw error;
    }

    return {
      ok: true,
      json: async () => ({ success: true, products: { foo: { product_id: 'foo' } } }),
    };
  };

  const data = await fetchBazaarDataWithRetry(fakeFetch, { timeoutMs: 50, maxRetries: 2 });

  assert.equal(attempts, 2);
  assert.deepEqual(data, { foo: { product_id: 'foo' } });
});

test('fetchBazaarDataWithRetry throws after exhausting retries', async () => {
  let attempts = 0;

  const fakeFetch = async () => {
    attempts += 1;
    const error = new Error('write ECONNABORTED');
    error.code = 'ECONNABORTED';
    throw error;
  };

  await assert.rejects(
    () => fetchBazaarDataWithRetry(fakeFetch, { timeoutMs: 50, maxRetries: 2 }),
    /Bazaar request failed after 2 attempts/i,
  );

  assert.equal(attempts, 2);
});
