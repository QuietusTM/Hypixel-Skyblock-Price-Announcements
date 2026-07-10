const { formatItemName } = require('./validation');

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAlertMessage({ item, price, currentPrice, pingTarget, direction = 'under' }) {
  const itemName = formatItemName(item);
  const priceText = `**${formatNumber(price)}**`;
  const currentText = `**${formatNumber(currentPrice)}**`;
  const prefix = pingTarget ? `${pingTarget}\n` : '';
  if (direction === 'over') {
    return `${prefix}${itemName} is at or above ${priceText} coins (currently ${currentText} coins).`;
  }
  return `${prefix}${itemName} is at or below ${priceText} coins (currently ${currentText} coins).`;
}

function evaluateAlertState({ currentPrice, threshold, alertSent, direction = 'under' }) {
  if (direction === 'over') {
    if (currentPrice < threshold) {
      return { shouldAlert: false, shouldResetAlertSent: alertSent };
    }

    return {
      shouldAlert: !alertSent,
      shouldResetAlertSent: false,
    };
  }

  if (currentPrice > threshold) {
    return { shouldAlert: false, shouldResetAlertSent: alertSent };
  }

  return {
    shouldAlert: !alertSent,
    shouldResetAlertSent: false,
  };
}

module.exports = { formatNumber, formatAlertMessage, evaluateAlertState };
