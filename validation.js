function normalizeItem(item) {
  return item.toLowerCase().trim();
}

function formatItemName(item) {
  return item.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseNotifyTarget(value) {
  if (!value) return null;
  return value.replace(/[<@!>]/g, '').trim();
}

function validateFollowInput(item, price, notify, target) {
  if (!item || !item.trim()) {
    return { ok: false, error: 'Please provide a non-empty item name.' };
  }

  if (item.trim().toLowerCase() === 'all') {
    return {
      ok: true,
      normalizedItem: 'all',
      price,
      notify: 'user',
      target: null,
      clearExisting: true,
    };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: 'Price must be a positive number.' };
  }

  const normalizedNotify = ['everyone', 'here', 'user'].includes(notify) ? notify : 'user';

  if (normalizedNotify === 'user' && target) {
    const parsedTarget = parseNotifyTarget(target);
    if (!parsedTarget) {
      return { ok: false, error: 'Please provide a valid user mention or user ID for user notifications.' };
    }

    return {
      ok: true,
      normalizedItem: normalizeItem(item),
      price,
      notify: 'user',
      target: parsedTarget,
    };
  }

  return {
    ok: true,
    normalizedItem: normalizeItem(item),
    price,
    notify: 'user',
    target: null,
  };
}

module.exports = {
  normalizeItem,
  formatItemName,
  parseNotifyTarget,
  validateFollowInput,
};
