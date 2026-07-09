const { FollowStore } = require('./database');

async function fetchBazaarDataWithRetry(fetcher, options = {}) {
  const timeoutMs = options.timeoutMs || 10000;
  const maxRetries = options.maxRetries ?? 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await Promise.race([
        fetcher({}),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Bazaar request timed out after ${timeoutMs}ms`)), timeoutMs)),
      ]);

      if (!response.ok) {
        throw new Error(`Bazaar API returned ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Bazaar API reported failure');
      }

      return data.products || {};
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < maxRetries && (/ECONNRESET|ECONNABORTED|timed out|socket|network|fetch|reset|aborted/i.test(error.message) || error?.code === 'ECONNRESET' || error?.code === 'ECONNABORTED');
      if (!shouldRetry) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error(`Bazaar request failed after ${maxRetries} attempts: ${lastError?.message || 'unknown error'}`);
}

function buildAliasCandidates(displayName, itemKey) {
  const tokens = [displayName, itemKey];
  const aliases = new Set();

  for (const token of tokens) {
    if (!token) continue;
    const normalized = String(token).trim().toLowerCase();
    aliases.add(normalized);
    aliases.add(normalized.replace(/_/g, ' '));
    aliases.add(normalized.replace(/ /g, '_'));
    aliases.add(normalized.replace(/[^a-z0-9]+/g, ' '));
    aliases.add(normalized.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim());
  }

  return Array.from(aliases).filter(Boolean);
}

async function refreshBazaarCatalog(followStore, fetchBazaarData) {
  const products = await fetchBazaarData();
  const itemKeys = Object.keys(products || {});

  for (const itemKey of itemKeys) {
    const product = products[itemKey];
    const displayName = product?.product_id || itemKey;
    followStore.upsertBazaarItem(itemKey, displayName);

    const aliases = buildAliasCandidates(displayName, itemKey);
    for (const alias of aliases) {
      followStore.upsertAlias(alias, itemKey);
    }
  }

  followStore.pruneMissingItems(itemKeys);
  return itemKeys.length;
}

module.exports = { refreshBazaarCatalog, buildAliasCandidates, fetchBazaarDataWithRetry };
