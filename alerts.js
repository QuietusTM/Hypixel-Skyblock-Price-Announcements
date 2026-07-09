const { formatItemName } = require('./validation');

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAlertMessage({ item, price, currentPrice, pingTarget }) {
  const itemName = formatItemName(item);
  const priceText = `**${formatNumber(price)}**`;
  const currentText = `**${formatNumber(currentPrice)}**`;
  const prefix = pingTarget ? `${pingTarget}\n` : '';
  return `${prefix}${itemName} is at or below ${priceText} coins (currently ${currentText} coins).`;
}

function evaluateAlertState({ currentPrice, threshold, alertSent }) {
  if (currentPrice > threshold) {
    return { shouldAlert: false, shouldResetAlertSent: alertSent };
  }

  return {
    shouldAlert: !alertSent,
    shouldResetAlertSent: false,
  };
}

module.exports = { formatNumber, formatAlertMessage, evaluateAlertState };
