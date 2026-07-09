const ITEM_ALIASES = {
  'umber key': 'UMBER_KEY',
  'umber': 'UMBER_KEY',
  'amber key': 'UMBER_KEY',
  'enchanted golden apple': 'ENCHANTED_GOLDEN_APPLE',
  'enchanted gold apple': 'ENCHANTED_GOLDEN_APPLE',
  'golden apple': 'ENCHANTED_GOLDEN_APPLE',
  'diamond': 'DIAMOND',
  'dirt': 'DIRT',
  'ice': 'ICE',
  'magma cream': 'MAGMA_CREAM',
  'sugar cane': 'SUGAR_CANE',
  'sugarcane': 'SUGAR_CANE',
  'lantern': 'LANTERN',
  'melon': 'MELON',
  'pumpkin': 'PUMPKIN',
  'wheat': 'WHEAT',
  'carrot': 'CARROT',
  'potato': 'POTATO',
  'cactus': 'CACTUS',
  'red mushroom': 'RED_MUSHROOM',
  'red mushroom block': 'RED_MUSHROOM',
  'brown mushroom': 'BROWN_MUSHROOM',
  'brown mushroom block': 'BROWN_MUSHROOM',
  'cobblestone': 'COBBLESTONE',
  'sand': 'SAND',
  'gravel': 'GRAVEL',
  'oak wood': 'OAK_WOOD',
  'spruce wood': 'SPRUCE_WOOD',
  'birch wood': 'BIRCH_WOOD',
  'jungle wood': 'JUNGLE_WOOD',
  'acacia wood': 'ACACIA_WOOD',
  'dark oak wood': 'DARK_OAK_WOOD',
  'oak log': 'OAK_LOG',
  'spruce log': 'SPRUCE_LOG',
  'birch log': 'BIRCH_LOG',
  'jungle log': 'JUNGLE_LOG',
  'acacia log': 'ACACIA_LOG',
  'dark oak log': 'DARK_OAK_LOG',
  'raw fish': 'RAW_FISH',
  'fish': 'RAW_FISH',
  'raw salmon': 'RAW_SALMON',
  'salmon': 'RAW_SALMON',
  'clownfish': 'CLOWNFISH',
  'pufferfish': 'PUFFERFISH',
  'ink sack': 'INK_SACK',
  'ink': 'INK_SACK',
  'coal': 'COAL',
  'iron ingot': 'IRON_INGOT',
  'iron': 'IRON_INGOT',
  'gold ingot': 'GOLD_INGOT',
  'gold': 'GOLD_INGOT',
  'redstone': 'REDSTONE',
  'lapis': 'LAPIS_LAZULI',
  'lapis lazuli': 'LAPIS_LAZULI',
  'emerald': 'EMERALD',
  'obsidian': 'OBSIDIAN',
  'ender pearl': 'ENDER_PEARL',
  'blaze rod': 'BLAZE_ROD',
  'blaze': 'BLAZE_ROD',
  'ghast tear': 'GHAST_TEAR',
  'spider eye': 'SPIDER_EYE',
  'string': 'STRING',
  'feather': 'FEATHER',
  'bone': 'BONE',
  'gunpowder': 'GUNPOWDER',
  'rotten flesh': 'ROTTEN_FLESH',
  'slimeball': 'SLIME_BALL',
  'slime ball': 'SLIME_BALL',
  'slime': 'SLIME_BALL',
  'nether wart': 'NETHER_WART',
  'wart': 'NETHER_WART',
  'sugar': 'SUGAR',
  'egg': 'EGG',
  'snowball': 'SNOW_BALL',
  'snow ball': 'SNOW_BALL',
  'mushroom stew': 'MUSHROOM_STEW',
  'stew': 'MUSHROOM_STEW',
  'sponge': 'SPONGE',
  'glass': 'GLASS',
  'brick': 'BRICK',
  'nether brick': 'NETHER_BRICK',
  'bookshelf': 'BOOKSHELF',
  'book shelf': 'BOOKSHELF',
  'tnt': 'TNT',
  'cookie': 'COOKIE',
  'pumpkin pie': 'PUMPKIN_PIE',
  'cake': 'CAKE',
  'bread': 'BREAD',
};

function normalizeToken(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getItemInfo(products, itemName) {
  const normalizedInput = normalizeToken(itemName);
  const aliasKey = ITEM_ALIASES[normalizedInput] || ITEM_ALIASES[normalizeToken(normalizedInput.replace(/_/g, ' '))] || ITEM_ALIASES[normalizeToken(normalizedInput.replace(/ /g, '_'))];
  const candidates = [
    normalizedInput,
    normalizedInput.replace(/ /g, ''),
    normalizedInput.replace(/ /g, '_'),
    normalizedInput.replace(/_/g, ' '),
    normalizedInput.replace(/_/g, ''),
  ];

  if (aliasKey) {
    candidates.unshift(normalizeToken(aliasKey));
  }

  const key = Object.keys(products).find((productKey) => {
    const normalizedKey = normalizeToken(productKey);
    return candidates.some((candidate) => normalizedKey === candidate || normalizedKey.replace(/ /g, '') === candidate.replace(/ /g, '') || normalizedKey.replace(/_/g, '') === candidate.replace(/_/g, ''));
  });

  if (!key) return null;
  return products[key];
}

module.exports = { ITEM_ALIASES, getItemInfo, normalizeToken };
