/**
 * @file Plugin Waifu Customization - Sistema de personalización de waifus
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de vestuario, accesorios, decoración y personalización visual
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Importar funciones compartidas desde el core
import { 
  characters, 
  loadCharacters, 
  getWaifuLevel, 
  getWaifuStats,
  getRarezaEmoji,
  logger
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  maxOutfitsPerWaifu: 10,
  maxAccessoriesPerWaifu: 5,
  maxRoomItems: 20,
  customizationCooldown: 30 * 60 * 1000, // 30 minutos
  photoCooldown: 60 * 60 * 1000, // 1 hora
  maxGalleryPhotos: 15
};

// Sistema de logging
const customizationLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[CUSTOMIZATION] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[CUSTOMIZATION] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[CUSTOMIZATION] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[CUSTOMIZATION] ❌ ${message}`)
};

// Categorías de personalización
const CUSTOMIZATION_CATEGORIES = {
  OUTFITS: 'outfits',
  ACCESSORIES: 'accessories',
  ROOM: 'room',
  GALLERY: 'gallery',
  FRAMES: 'frames',
  BADGES: 'badges',
  EFFECTS: 'effects'
};

// Tipos de outfits
const OUTFIT_TYPES = {
  CASUAL: 'casual',
  FORMAL: 'formal',
  SPORTS: 'sports',
  TRADITIONAL: 'traditional',
  FANTASY: 'fantasy',
  SWIMWEAR: 'swimwear',
  WINTER: 'winter',
  SUMMER: 'summer',
  PARTY: 'party',
  SCHOOL: 'school'
};

// Definiciones de outfits
const OUTFIT_DEFINITIONS = {
  [OUTFIT_TYPES.CASUAL]: {
    name: 'Ropa Casual',
    emoji: '👕',
    description: 'Ropa cómoda para el día a día',
    price: 500,
    rarity: 'common',
    effects: { happiness: 5 }
  },
  [OUTFIT_TYPES.FORMAL]: {
    name: 'Ropa Formal',
    emoji: '🤵',
    description: 'Elegante para ocasiones especiales',
    price: 1500,
    rarity: 'uncommon',
    effects: { affection: 10 }
  },
  [OUTFIT_TYPES.SPORTS]: {
    name: 'Ropa Deportiva',
    emoji: '🏃',
    description: 'Perfecta para actividades físicas',
    price: 800,
    rarity: 'common',
    effects: { happiness: 8, affection: 3 }
  },
  [OUTFIT_TYPES.TRADITIONAL]: {
    name: 'Ropa Tradicional',
    emoji: '👘',
    description: 'Vestimenta tradicional cultural',
    price: 2000,
    rarity: 'rare',
    effects: { affection: 15, happiness: 10 }
  },
  [OUTFIT_TYPES.FANTASY]: {
    name: 'Ropa de Fantasía',
    emoji: '🧚',
    description: 'Atuendo mágico y fantástico',
    price: 3000,
    rarity: 'epic',
    effects: { affection: 20, happiness: 15 }
  },
  [OUTFIT_TYPES.SWIMWEAR]: {
    name: 'Traje de Baño',
    emoji: '👙',
    description: 'Ideal para la playa o piscina',
    price: 1200,
    rarity: 'uncommon',
    effects: { happiness: 12 }
  },
  [OUTFIT_TYPES.WINTER]: {
    name: 'Ropa de Invierno',
    emoji: '🧣',
    description: 'Abrigada para climas fríos',
    price: 1800,
    rarity: 'uncommon',
    effects: { affection: 8, happiness: 8 }
  },
  [OUTFIT_TYPES.SUMMER]: {
    name: 'Ropa de Verano',
    emoji: '🌻',
    description: 'Ligera y fresca para el calor',
    price: 1000,
    rarity: 'common',
    effects: { happiness: 10 }
  },
  [OUTFIT_TYPES.PARTY]: {
    name: 'Ropa de Fiesta',
    emoji: '🎊',
    description: 'Brillante para celebraciones',
    price: 2500,
    rarity: 'rare',
    effects: { happiness: 18, affection: 12 }
  },
  [OUTFIT_TYPES.SCHOOL]: {
    name: 'Uniforme Escolar',
    emoji: '🎒',
    description: 'Uniforme para ir a clases',
    price: 600,
    rarity: 'common',
    effects: { affection: 5, happiness: 5 }
  }
};

// Tipos de accesorios
const ACCESSORY_TYPES = {
  NECKLACE: 'necklace',
  EARRINGS: 'earrings',
  BRACELET: 'bracelet',
  RING: 'ring',
  HAT: 'hat',
  GLASSES: 'glasses',
  WATCH: 'watch',
  BAG: 'bag',
  SCARF: 'scarf',
  BELT: 'belt'
};

// Definiciones de accesorios
const ACCESSORY_DEFINITIONS = {
  [ACCESSORY_TYPES.NECKLACE]: {
    name: 'Collar',
    emoji: '📿',
    description: 'Elegante collar decorativo',
    price: 800,
    rarity: 'common',
    effects: { affection: 8 }
  },
  [ACCESSORY_TYPES.EARRINGS]: {
    name: 'Aretes',
    emoji: '💎',
    description: 'Brillantes aretes',
    price: 600,
    rarity: 'common',
    effects: { affection: 6 }
  },
  [ACCESSORY_TYPES.BRACELET]: {
    name: 'Pulsera',
    emoji: '⌚',
    description: 'Hermosa pulsera',
    price: 500,
    rarity: 'common',
    effects: { affection: 5 }
  },
  [ACCESSORY_TYPES.RING]: {
    name: 'Anillo',
    emoji: '💍',
    description: 'Anillo especial',
    price: 1000,
    rarity: 'uncommon',
    effects: { affection: 12 }
  },
  [ACCESSORY_TYPES.HAT]: {
    name: 'Sombrero',
    emoji: '🎩',
    description: 'Sombrero elegante',
    price: 700,
    rarity: 'common',
    effects: { happiness: 7 }
  },
  [ACCESSORY_TYPES.GLASSES]: {
    name: 'Gafas',
    emoji: '👓',
    description: 'Gafas modernas',
    price: 400,
    rarity: 'common',
    effects: { happiness: 5 }
  },
  [ACCESSORY_TYPES.WATCH]: {
    name: 'Reloj',
    emoji: '⌚',
    description: 'Reloj elegante',
    price: 900,
    rarity: 'uncommon',
    effects: { affection: 7, happiness: 3 }
  },
  [ACCESSORY_TYPES.BAG]: {
    name: 'Bolso',
    emoji: '👜',
    description: 'Bolso práctico',
    price: 600,
    rarity: 'common',
    effects: { happiness: 6 }
  },
  [ACCESSORY_TYPES.SCARF]: {
    name: 'Bufanda',
    emoji: '🧣',
    description: 'Bufanda cálida',
    price: 500,
    rarity: 'common',
    effects: { affection: 6, happiness: 4 }
  },
  [ACCESSORY_TYPES.BELT]: {
    name: 'Cinturón',
    emoji: '👔',
    description: 'Cinturón elegante',
    price: 400,
    rarity: 'common',
    effects: { affection: 4, happiness: 3 }
  }
};

// Items de decoración de cuarto
const ROOM_ITEMS = {
  BED: 'bed',
  DESK: 'desk',
  CHAIR: 'chair',
  LAMP: 'lamp',
  PLANT: 'plant',
  POSTER: 'poster',
  BOOKSHELF: 'bookshelf',
  MIRROR: 'mirror',
  CUSHION: 'cushion',
  CURTAIN: 'curtain'
};

// Definiciones de items de cuarto
const ROOM_ITEM_DEFINITIONS = {
  [ROOM_ITEMS.BED]: {
    name: 'Cama',
    emoji: '🛏️',
    description: 'Cama cómoda y elegante',
    price: 2000,
    rarity: 'uncommon',
    effects: { happiness: 15, affection: 10 }
  },
  [ROOM_ITEMS.DESK]: {
    name: 'Escritorio',
    emoji: '🪑',
    description: 'Escritorio para estudiar',
    price: 1200,
    rarity: 'common',
    effects: { affection: 8, happiness: 5 }
  },
  [ROOM_ITEMS.CHAIR]: {
    name: 'Silla',
    emoji: '🪑',
    description: 'Silla cómoda',
    price: 800,
    rarity: 'common',
    effects: { happiness: 7 }
  },
  [ROOM_ITEMS.LAMP]: {
    name: 'Lámpara',
    emoji: '🏮',
    description: 'Lámpara decorativa',
    price: 600,
    rarity: 'common',
    effects: { happiness: 6 }
  },
  [ROOM_ITEMS.PLANT]: {
    name: 'Planta',
    emoji: '🪴',
    description: 'Planta decorativa',
    price: 400,
    rarity: 'common',
    effects: { happiness: 8, affection: 5 }
  },
  [ROOM_ITEMS.POSTER]: {
    name: 'Póster',
    emoji: '🖼️',
    description: 'Póster decorativo',
    price: 300,
    rarity: 'common',
    effects: { happiness: 5 }
  },
  [ROOM_ITEMS.BOOKSHELF]: {
    name: 'Estantería',
    emoji: '📚',
    description: 'Estantería para libros',
    price: 1500,
    rarity: 'uncommon',
    effects: { affection: 12, happiness: 8 }
  },
  [ROOM_ITEMS.MIRROR]: {
    name: 'Espejo',
    emoji: '🪞',
    description: 'Espejo elegante',
    price: 800,
    rarity: 'common',
    effects: { affection: 10, happiness: 7 }
  },
  [ROOM_ITEMS.CUSHION]: {
    name: 'Cojín',
    emoji: '🟦',
    description: 'Cojín decorativo',
    price: 200,
    rarity: 'common',
    effects: { happiness: 4 }
  },
  [ROOM_ITEMS.CURTAIN]: {
    name: 'Cortina',
    emoji: '🪟',
    description: 'Cortina elegante',
    price: 1000,
    rarity: 'common',
    effects: { happiness: 8, affection: 5 }
  }
};

/**
 * Sistema de personalización de waifus
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.personalizar':
        await showCustomizationMenu(sock, m, userId);
        break;
      case '.vestuario':
        await showWardrobe(sock, m, userId, text);
        break;
      case '.equipar_outfit':
        await equipOutfit(sock, m, userId, text);
        break;
      case '.accesorios':
        await showAccessories(sock, m, userId, text);
        break;
      case '.equipar_accesorio':
        await equipAccessory(sock, m, userId, text);
        break;
      case '.cuarto':
        await showRoom(sock, m, userId, text);
        break;
      case '.decorar_cuarto':
        await decorateRoom(sock, m, userId, text);
        break;
      case '.galeria':
        await showGallery(sock, m, userId, text);
        break;
      case '.foto':
        await takePhoto(sock, m, userId, text);
        break;
      case '.marcos':
        await showFrames(sock, m, userId, text);
        break;
      case '.equipar_marco':
        await equipFrame(sock, m, userId, text);
        break;
      case '.comprar_outfit':
        await buyOutfit(sock, m, userId, text);
        break;
      case '.comprar_accesorio':
        await buyAccessory(sock, m, userId, text);
        break;
      case '.comprar_item':
        await buyRoomItem(sock, m, userId, text);
        break;
      default:
        customizationLogger.warning(`Comando no reconocido: ${command}`);
        await sock.sendMessage(m.key.remoteJid, {
          text: `❌ Comando no reconocido: ${command}\n\n💡 *Usa \`.personalizar\` para ver los comandos disponibles*`
        }, { quoted: m });
    }
  } catch (error) {
    customizationLogger.error('Error en el sistema de personalización:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de personalización. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Muestra el menú principal de personalización
 */
async function showCustomizationMenu(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userBalance = await getUserBalance(userId);
    const userStats = await getCustomizationStats(userId);
    
    let menuMessage = `🎨 *MENÚ DE PERSONALIZACIÓN* 🎨\n\n`;
    menuMessage += `👤 *@${userId.split('@')[0]}*\n`;
    menuMessage += `💰 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n`;
    menuMessage += `👗 *Outfits:* ${userStats.outfits || 0}\n`;
    menuMessage += `💎 *Accesorios:* ${userStats.accessories || 0}\n`;
    menuMessage += `🏠 *Items de cuarto:* ${userStats.roomItems || 0}\n`;
    menuMessage += `📸 *Fotos:* ${userStats.photos || 0}\n\n`;
    
    menuMessage += `🎯 *Categorías de Personalización:*\n\n`;
    
    menuMessage += `👗 *Vestuario:*\n`;
    menuMessage += `• \`.vestuario <waifu>\` - Ver armario\n`;
    menuMessage += `• \`.equipar_outfit <waifu> <tipo>\` - Cambiar ropa\n\n`;
    
    menuMessage += `💎 *Accesorios:*\n`;
    menuMessage += `• \`.accesorios <waifu>\` - Ver accesorios\n`;
    menuMessage += `• \`.equipar_accesorio <waifu> <tipo>\` - Añadir accesorio\n\n`;
    
    menuMessage += `🏠 *Cuarto:*\n`;
    menuMessage += `• \`.cuarto <waifu>\` - Ver cuarto\n`;
    menuMessage += `• \`.decorar_cuarto <waifu> <item>\` - Añadir decoración\n\n`;
    
    menuMessage += `📸 *Galería:*\n`;
    menuMessage += `• \`.galeria <waifu>\` - Ver fotos\n`;
    menuMessage += `• \`.foto <waifu>\` - Tomar foto\n\n`;
    
    menuMessage += `🖼️ *Marcos:*\n`;
    menuMessage += `• \`.marcos <waifu>\` - Ver marcos disponibles\n`;
    menuMessage += `• \`.equipar_marco <waifu> <marco>\` - Cambiar marco\n\n`;
    
    menuMessage += `💡 *Tipos de outfits:* ${Object.keys(OUTFIT_DEFINITIONS).join(', ')}\n`;
    menuMessage += `💎 *Tipos de accesorios:* ${Object.keys(ACCESSORY_DEFINITIONS).join(', ')}\n`;
    menuMessage += `🏠 *Items de cuarto:* ${Object.keys(ROOM_ITEM_DEFINITIONS).join(', ')}`;
    
    await sock.sendMessage(chatId, { 
      text: menuMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    customizationLogger.error('Error al mostrar menú de personalización:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el menú de personalización.'
    }, { quoted: m });
  }
}

/**
 * Muestra el armario de una waifu
 */
async function showWardrobe(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Uso:* `.vestuario <nombre_waifu>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Obtener outfits de la waifu
    const outfits = await getWaifuOutfits(character.id, userId);
    const userBalance = await getUserBalance(userId);
    
    const rareza = getRarezaEmoji(character.price);
    
    let wardrobeMessage = `👗 *ARMARIO DE ${character.name.toUpperCase()}* 👗\n\n`;
    wardrobeMessage += `${rareza} *${character.name}*\n`;
    wardrobeMessage += `📺 ${character.anime}\n`;
    wardrobeMessage += `💰 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n`;
    wardrobeMessage += `👗 *Outfits:* ${outfits.length}/${CONFIG.maxOutfitsPerWaifu}\n\n`;
    
    if (outfits.length === 0) {
      wardrobeMessage += `📦 *No tienes outfits*\n\n`;
      wardrobeMessage += `💡 *Compra outfits con \`.comprar_outfit <tipo>\``;
    } else {
      wardrobeMessage += `👗 *OUTITS DISPONIBLES:*\n\n`;
      
      outfits.forEach((outfit, index) => {
        const outfitDef = OUTFIT_DEFINITIONS[outfit.outfit_type];
        const isEquipped = outfit.equipped;
        
        wardrobeMessage += `${index + 1}. ${outfitDef.emoji} *${outfitDef.name}* ${isEquipped ? '✅' : ''}\n`;
        wardrobeMessage += `   📝 ${outfitDef.description}\n`;
        wardrobeMessage += `   💎 Precio: ${outfitDef.price.toLocaleString()} 💎\n`;
        wardrobeMessage += `   🎟️ Rareza: ${outfitDef.rarity}\n\n`;
      });
    }
    
    wardrobeMessage += `💡 *Comandos disponibles:*\n`;
    wardrobeMessage += `• \`.equipar_outfit <waifu> <tipo>\` - Cambiar outfit\n`;
    wardrobeMessage += `• \`.comprar_outfit <tipo>\` - Comprar nuevo outfit\n\n`;
    wardrobeMessage += `🛍️ *Outfits disponibles en tienda:*`;
    
    Object.entries(OUTFIT_DEFINITIONS).forEach(([type, outfit]) => {
      wardrobeMessage += `\n• ${outfit.emoji} ${outfit.name} - ${outfit.price.toLocaleString()} 💎`;
    });
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: wardrobeMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: wardrobeMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
  } catch (error) {
    customizationLogger.error('Error al mostrar armario:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el armario.'
    }, { quoted: m });
  }
}

/**
 * Equipa un outfit a una waifu
 */
async function equipOutfit(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.equipar_outfit <nombre_waifu> <tipo_outfit>`\n' +
            '*Tipos:* ' + Object.keys(OUTFIT_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  const waifuName = args.slice(0, -1).join(' ');
  const outfitType = args[args.length - 1];
  
  if (!Object.values(OUTFIT_TYPES).includes(outfitType)) {
    return await sock.sendMessage(chatId, {
      text: `❌ Tipo de outfit no válido.\n\n` +
            '*Tipos disponibles:* ' + Object.keys(OUTFIT_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Verificar si tiene el outfit
    const ownedOutfit = await db.get(
      'SELECT * FROM waifu_outfits WHERE character_id = ? AND user_id = ? AND outfit_type = ?',
      [character.id, userId, outfitType]
    );
    
    if (!ownedOutfit) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes el outfit "${OUTFIT_DEFINITIONS[outfitType].name}".\n\n` +
              `💡 *Compra el outfit con \`.comprar_outfit ${outfitType}\``
      }, { quoted: m });
    }
    
    // Equipar el outfit
    await db.run(
      'UPDATE waifu_outfits SET equipped = 1 WHERE character_id = ? AND user_id = ? AND outfit_type = ?',
      [character.id, userId, outfitType]
    );
    
    // Desequipar otros outfits
    await db.run(
      'UPDATE waifu_outfits SET equipped = 0 WHERE character_id = ? AND user_id = ? AND outfit_type != ?',
      [character.id, userId, outfitType]
    );
    
    // Aplicar efectos del outfit
    await applyOutfitEffects(character.id, userId, OUTFIT_DEFINITIONS[outfitType].effects);
    
    const outfitDef = OUTFIT_DEFINITIONS[outfitType];
    const rareza = getRarezaEmoji(character.price);
    
    let equipMessage = `👗 *OUTFIT EQUIPADO* 👗\n\n`;
    equipMessage += `${rareza} *${character.name}* ahora viste:\n`;
    equipMessage += `${outfitDef.emoji} *${outfitDef.name}*\n`;
    equipMessage += `📝 ${outfitDef.description}\n\n`;
    
    equipMessage += `✨ *Efectos aplicados:*\n`;
    Object.entries(outfitDef.effects).forEach(([stat, value]) => {
      const statName = stat === 'affection' ? 'Afecto' : 'Felicidad';
      equipMessage += `• ${statName}: +${value}\n`;
    });
    
    equipMessage += `\n💖 *¡${character.name} se ve genial con su nuevo outfit!*`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: equipMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: equipMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
    customizationLogger.success(`Outfit equipado - waifu: ${character.name} - tipo: ${outfitType}`);
    
  } catch (error) {
    customizationLogger.error('Error al equipar outfit:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al equipar el outfit.'
    }, { quoted: m });
  }
}

/**
 * Muestra los accesorios de una waifu
 */
async function showAccessories(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Uso:* `.accesorios <nombre_waifu>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Obtener accesorios de la waifu
    const accessories = await getWaifuAccessories(character.id, userId);
    const userBalance = await getUserBalance(userId);
    
    const rareza = getRarezaEmoji(character.price);
    
    let accessoriesMessage = `💎 *ACCESORIOS DE ${character.name.toUpperCase()}* 💎\n\n`;
    accessoriesMessage += `${rareza} *${character.name}*\n`;
    accessoriesMessage += `📺 ${character.anime}\n`;
    accessoriesMessage += `💰 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n`;
    accessoriesMessage += `💎 *Accesorios:* ${accessories.length}/${CONFIG.maxAccessoriesPerWaifu}\n\n`;
    
    if (accessories.length === 0) {
      accessoriesMessage += `📦 *No tienes accesorios*\n\n`;
      accessoriesMessage += `💡 *Compra accesorios con \`.comprar_accesorio <tipo>\``;
    } else {
      accessoriesMessage += `💎 *ACCESORIOS EQUIPADOS:*\n\n`;
      
      accessories.forEach((accessory, index) => {
        const accessoryDef = ACCESSORY_DEFINITIONS[accessory.accessory_type];
        
        accessoriesMessage += `${index + 1}. ${accessoryDef.emoji} *${accessoryDef.name}*\n`;
        accessoriesMessage += `   📝 ${accessoryDef.description}\n`;
        accessoriesMessage += `   💎 Precio: ${accessoryDef.price.toLocaleString()} 💎\n`;
        accessoriesMessage += `   🎟️ Rareza: ${accessoryDef.rarity}\n\n`;
      });
    }
    
    accessoriesMessage += `💡 *Comandos disponibles:*\n`;
    accessoriesMessage += `• \`.equipar_accesorio <waifu> <tipo>\` - Añadir accesorio\n`;
    accessoriesMessage += `• \`.comprar_accesorio <tipo>\` - Comprar accesorio\n\n`;
    accessoriesMessage += `🛍️ *Accesorios disponibles en tienda:*`;
    
    Object.entries(ACCESSORY_DEFINITIONS).forEach(([type, accessory]) => {
      accessoriesMessage += `\n• ${accessory.emoji} ${accessory.name} - ${accessory.price.toLocaleString()} 💎`;
    });
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: accessoriesMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: accessoriesMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
  } catch (error) {
    customizationLogger.error('Error al mostrar accesorios:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar los accesorios.'
    }, { quoted: m });
  }
}

/**
 * Equipa un accesorio a una waifu
 */
async function equipAccessory(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.equipar_accesorio <nombre_waifu> <tipo_accesorio>`\n' +
            '*Tipos:* ' + Object.keys(ACCESSORY_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  const waifuName = args.slice(0, -1).join(' ');
  const accessoryType = args[args.length - 1];
  
  if (!Object.values(ACCESSORY_TYPES).includes(accessoryType)) {
    return await sock.sendMessage(chatId, {
      text: `❌ Tipo de accesorio no válido.\n\n` +
            '*Tipos disponibles:* ' + Object.keys(ACCESSORY_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Verificar si ya tiene el accesorio
    const existingAccessory = await db.get(
      'SELECT * FROM waifu_accessories WHERE character_id = ? AND user_id = ? AND accessory_type = ?',
      [character.id, userId, accessoryType]
    );
    
    if (existingAccessory) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya tienes el accesorio "${ACCESSORY_DEFINITIONS[accessoryType].name}".`
      }, { quoted: m });
    }
    
    // Verificar límite de accesorios
    const currentAccessories = await getWaifuAccessories(character.id, userId);
    if (currentAccessories.length >= CONFIG.maxAccessoriesPerWaifu) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite de ${CONFIG.maxAccessoriesPerWaifu} accesorios para esta waifu.`
      }, { quoted: m });
    }
    
    // Comprar y equipar accesorio
    const accessoryDef = ACCESSORY_DEFINITIONS[accessoryType];
    const userBalance = await getUserBalance(userId);
    
    if (userBalance.total < accessoryDef.price) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes suficientes 💎.\n\n` +
              `💰 *Costo:* ${accessoryDef.price.toLocaleString()} 💎\n` +
              `💵 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎`
      }, { quoted: m });
    }
    
    // Realizar compra
    await updateUserBalance(userId, userBalance.saldo - accessoryDef.price);
    
    // Equipar accesorio
    await db.run(
      'INSERT INTO waifu_accessories (character_id, user_id, accessory_type, equipped_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [character.id, userId, accessoryType]
    );
    
    // Aplicar efectos del accesorio
    await applyAccessoryEffects(character.id, userId, accessoryDef.effects);
    
    const rareza = getRarezaEmoji(character.price);
    
    let equipMessage = `💎 *ACCESORIO EQUIPADO* 💎\n\n`;
    equipMessage += `${rareza} *${character.name}* ahora usa:\n`;
    equipMessage += `${accessoryDef.emoji} *${accessoryDef.name}*\n`;
    equipMessage += `📝 ${accessoryDef.description}\n\n`;
    
    equipMessage += `✨ *Efectos aplicados:*\n`;
    Object.entries(accessoryDef.effects).forEach(([stat, value]) => {
      const statName = stat === 'affection' ? 'Afecto' : 'Felicidad';
      equipMessage += `• ${statName}: +${value}\n`;
    });
    
    equipMessage += `\n💖 *¡${character.name} se ve aún más hermosa!*\n`;
    equipMessage += `💸 *Costo:* ${accessoryDef.price.toLocaleString()} 💎`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: equipMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: equipMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
    customizationLogger.success(`Accesorio equipado - waifu: ${character.name} - tipo: ${accessoryType}`);
    
  } catch (error) {
    customizationLogger.error('Error al equipar accesorio:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al equipar el accesorio.'
    }, { quoted: m });
  }
}

/**
 * Muestra el cuarto de una waifu
 */
async function showRoom(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Uso:* `.cuarto <nombre_waifu>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Obtener items del cuarto
    const roomItems = await getRoomItems(character.id, userId);
    const userBalance = await getUserBalance(userId);
    
    const rareza = getRarezaEmoji(character.price);
    
    let roomMessage = `🏠 *CUARTO DE ${character.name.toUpperCase()}* 🏠\n\n`;
    roomMessage += `${rareza} *${character.name}*\n`;
    roomMessage += `📺 ${character.anime}\n`;
    roomMessage += `💰 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n`;
    roomMessage += `🏠 *Items:* ${roomItems.length}/${CONFIG.maxRoomItems}\n\n`;
    
    if (roomItems.length === 0) {
      roomMessage += `📦 *El cuarto está vacío*\n\n`;
      roomMessage += `💡 *Decora con \`.decorar_cuarto <waifu> <item>\``;
    } else {
      roomMessage += `🏠 *DECORACIÓN ACTUAL:*\n\n`;
      
      roomItems.forEach((item, index) => {
        const itemDef = ROOM_ITEM_DEFINITIONS[item.item_type];
        
        roomMessage += `${index + 1}. ${itemDef.emoji} *${itemDef.name}*\n`;
        roomMessage += `   📝 ${itemDef.description}\n`;
        roomMessage += `   💎 Precio: ${itemDef.price.toLocaleString()} 💎\n`;
        roomMessage += `   🎟️ Rareza: ${itemDef.rarity}\n\n`;
      });
    }
    
    roomMessage += `💡 *Comandos disponibles:*\n`;
    roomMessage += `• \`.decorar_cuarto <waifu> <item>\` - Añadir decoración\n`;
    roomMessage += `• \`.comprar_item <item>\` - Comprar item\n\n`;
    roomMessage += `🛍️ *Items disponibles en tienda:*`;
    
    Object.entries(ROOM_ITEM_DEFINITIONS).forEach(([type, item]) => {
      roomMessage += `\n• ${item.emoji} ${item.name} - ${item.price.toLocaleString()} 💎`;
    });
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: roomMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: roomMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
  } catch (error) {
    customizationLogger.error('Error al mostrar cuarto:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el cuarto.'
    }, { quoted: m });
  }
}

/**
 * Decora el cuarto de una waifu
 */
async function decorateRoom(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.decorar_cuarto <nombre_waifu> <tipo_item>`\n' +
            '*Items:* ' + Object.keys(ROOM_ITEM_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  const waifuName = args.slice(0, -1).join(' ');
  const itemType = args[args.length - 1];
  
  if (!Object.values(ROOM_ITEMS).includes(itemType)) {
    return await sock.sendMessage(chatId, {
      text: `❌ Tipo de item no válido.\n\n` +
            '*Items disponibles:* ' + Object.keys(ROOM_ITEM_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Verificar si ya tiene el item
    const existingItem = await db.get(
      'SELECT * FROM room_items WHERE character_id = ? AND user_id = ? AND item_type = ?',
      [character.id, userId, itemType]
    );
    
    if (existingItem) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya tienes el item "${ROOM_ITEM_DEFINITIONS[itemType].name}" en el cuarto.`
      }, { quoted: m });
    }
    
    // Verificar límite de items
    const currentItems = await getRoomItems(character.id, userId);
    if (currentItems.length >= CONFIG.maxRoomItems) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite de ${CONFIG.maxRoomItems} items en el cuarto.`
      }, { quoted: m });
    }
    
    // Comprar y decorar
    const itemDef = ROOM_ITEM_DEFINITIONS[itemType];
    const userBalance = await getUserBalance(userId);
    
    if (userBalance.total < itemDef.price) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes suficientes 💎.\n\n` +
              `💰 *Costo:* ${itemDef.price.toLocaleString()} 💎\n` +
              `💵 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎`
      }, { quoted: m });
    }
    
    // Realizar compra
    await updateUserBalance(userId, userBalance.saldo - itemDef.price);
    
    // Añadir item al cuarto
    await db.run(
      'INSERT INTO room_items (character_id, user_id, item_type, placed_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [character.id, userId, itemType]
    );
    
    // Aplicar efectos del item
    await applyRoomItemEffects(character.id, userId, itemDef.effects);
    
    const rareza = getRarezaEmoji(character.price);
    
    let decorateMessage = `🏠 *CUARTO DECORADO* 🏠\n\n`;
    decorateMessage += `${rareza} *${character.name}* ahora tiene en su cuarto:\n`;
    decorateMessage += `${itemDef.emoji} *${itemDef.name}*\n`;
    decorateMessage += `📝 ${itemDef.description}\n\n`;
    
    decorateMessage += `✨ *Efectos aplicados:*\n`;
    Object.entries(itemDef.effects).forEach(([stat, value]) => {
      const statName = stat === 'affection' ? 'Afecto' : 'Felicidad';
      decorateMessage += `• ${statName}: +${value}\n`;
    });
    
    decorateMessage += `\n🏠 *¡El cuarto de ${character.name} se ve mucho mejor!*\n`;
    decorateMessage += `💸 *Costo:* ${itemDef.price.toLocaleString()} 💎`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: decorateMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: decorateMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
    customizationLogger.success(`Cuarto decorado - waifu: ${character.name} - item: ${itemType}`);
    
  } catch (error) {
    customizationLogger.error('Error al decorar cuarto:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al decorar el cuarto.'
    }, { quoted: m });
  }
}

/**
 * Muestra la galería de fotos de una waifu
 */
async function showGallery(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Uso:* `.galeria <nombre_waifu>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Obtener fotos de la galería
    const photos = await getWaifuGallery(character.id, userId);
    
    const rareza = getRarezaEmoji(character.price);
    
    let galleryMessage = `📸 *GALERÍA DE ${character.name.toUpperCase()}* 📸\n\n`;
    galleryMessage += `${rareza} *${character.name}*\n`;
    galleryMessage += `📺 ${character.anime}\n`;
    galleryMessage += `📸 *Fotos:* ${photos.length}/${CONFIG.maxGalleryPhotos}\n\n`;
    
    if (photos.length === 0) {
      galleryMessage += `📦 *No hay fotos en la galería*\n\n`;
      galleryMessage += `💡 *Toma fotos con \`.foto <waifu>\``;
    } else {
      galleryMessage += `📸 *FOTOS EN LA GALERÍA:*\n\n`;
      
      photos.forEach((photo, index) => {
        galleryMessage += `${index + 1}. 📷 *Foto #${photo.id}*\n`;
        galleryMessage += `   📅 Tomada: ${new Date(photo.taken_at).toLocaleDateString()}\n`;
        galleryMessage += `   🎨 Estilo: ${photo.style}\n`;
        galleryMessage += `   🖼️ Marco: ${photo.frame || 'Ninguno'}\n\n`;
      });
    }
    
    galleryMessage += `💡 *Comandos disponibles:*\n`;
    galleryMessage += `• \`.foto <waifu>\` - Tomar nueva foto\n`;
    galleryMessage += `• \`.marcos <waifu>\` - Ver marcos disponibles\n`;
    galleryMessage += `• \`.equipar_marco <waifu> <marco>\` - Cambiar marco`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: galleryMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: galleryMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
  } catch (error) {
    customizationLogger.error('Error al mostrar galería:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la galería.'
    }, { quoted: m });
  }
}

/**
 * Toma una foto de una waifu
 */
async function takePhoto(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Uso:* `.foto <nombre_waifu>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar cooldown
    const lastPhoto = await getLastPhoto(userId);
    if (lastPhoto && (Date.now() - new Date(lastPhoto.taken_at).getTime()) < CONFIG.photoCooldown) {
      const remaining = Math.ceil((CONFIG.photoCooldown - (Date.now() - new Date(lastPhoto.taken_at).getTime())) / 60000);
      return await sock.sendMessage(chatId, {
        text: `⏰ Debes esperar ${remaining} minutos antes de tomar otra foto.`
      }, { quoted: m });
    }
    
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Verificar límite de fotos
    const currentPhotos = await getWaifuGallery(character.id, userId);
    if (currentPhotos.length >= CONFIG.maxGalleryPhotos) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite de ${CONFIG.maxGalleryPhotos} fotos en la galería.`
      }, { quoted: m });
    }
    
    // Generar estilo aleatorio
    const styles = ['Casual', 'Elegante', 'Divertido', 'Romántico', 'Misterioso', 'Energético'];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    
    // Tomar foto
    await db.run(
      'INSERT INTO waifu_gallery (character_id, user_id, style, taken_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [character.id, userId, randomStyle]
    );
    
    const rareza = getRarezaEmoji(character.price);
    
    let photoMessage = `📸 *FOTO CAPTURADA* 📸\n\n`;
    photoMessage += `${rareza} *${character.name}* ha sido capturada en:\n`;
    photoMessage += `🎨 *Estilo:* ${randomStyle}\n`;
    photoMessage += `📅 *Fecha:* ${new Date().toLocaleDateString()}\n`;
    photoMessage += `📸 *Foto #${currentPhotos.length + 1}*\n\n`;
    photoMessage += `💖 *¡Qué momento tan especial con ${character.name}!*`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: photoMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: photoMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
    customizationLogger.success(`Foto tomada - waifu: ${character.name} - estilo: ${randomStyle}`);
    
  } catch (error) {
    customizationLogger.error('Error al tomar foto:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al tomar la foto.'
    }, { quoted: m });
  }
}

/**
 * Funciones auxiliares
 */
async function getUserBalance(userId) {
  try {
    const user = await db.get('SELECT saldo, banco FROM usuarios WHERE chatId = ?', [userId]);
    if (!user) {
      await db.run('INSERT INTO usuarios (chatId, saldo, banco) VALUES (?, 100, 0)', [userId]);
      return { saldo: 100, banco: 0, total: 100 };
    }
    return {
      saldo: user.saldo || 0,
      banco: user.banco || 0,
      total: (user.saldo || 0) + (user.banco || 0)
    };
  } catch (error) {
    customizationLogger.error('Error al obtener saldo:', error);
    return { saldo: 0, banco: 0, total: 0 };
  }
}

async function updateUserBalance(userId, newBalance) {
  try {
    await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
    return true;
  } catch (error) {
    customizationLogger.error('Error al actualizar saldo:', error);
    return false;
  }
}

async function getCustomizationStats(userId) {
  try {
    const outfits = await db.get('SELECT COUNT(*) as count FROM waifu_outfits WHERE user_id = ?', [userId]);
    const accessories = await db.get('SELECT COUNT(*) as count FROM waifu_accessories WHERE user_id = ?', [userId]);
    const roomItems = await db.get('SELECT COUNT(*) as count FROM room_items WHERE user_id = ?', [userId]);
    const photos = await db.get('SELECT COUNT(*) as count FROM waifu_gallery WHERE user_id = ?', [userId]);
    
    return {
      outfits: outfits?.count || 0,
      accessories: accessories?.count || 0,
      roomItems: roomItems?.count || 0,
      photos: photos?.count || 0
    };
  } catch (error) {
    customizationLogger.error('Error al obtener estadísticas de personalización:', error);
    return { outfits: 0, accessories: 0, roomItems: 0, photos: 0 };
  }
}

async function getWaifuOutfits(characterId, userId) {
  try {
    const outfits = await db.all(
      'SELECT * FROM waifu_outfits WHERE character_id = ? AND user_id = ?',
      [characterId, userId]
    );
    return outfits;
  } catch (error) {
    customizationLogger.error('Error al obtener outfits de waifu:', error);
    return [];
  }
}

async function getWaifuAccessories(characterId, userId) {
  try {
    const accessories = await db.all(
      'SELECT * FROM waifu_accessories WHERE character_id = ? AND user_id = ?',
      [characterId, userId]
    );
    return accessories;
  } catch (error) {
    customizationLogger.error('Error al obtener accesorios de waifu:', error);
    return [];
  }
}

async function getRoomItems(characterId, userId) {
  try {
    const items = await db.all(
      'SELECT * FROM room_items WHERE character_id = ? AND user_id = ?',
      [characterId, userId]
    );
    return items;
  } catch (error) {
    customizationLogger.error('Error al obtener items de cuarto:', error);
    return [];
  }
}

async function getWaifuGallery(characterId, userId) {
  try {
    const photos = await db.all(
      'SELECT * FROM waifu_gallery WHERE character_id = ? AND user_id = ? ORDER BY taken_at DESC',
      [characterId, userId]
    );
    return photos;
  } catch (error) {
    customizationLogger.error('Error al obtener galería de waifu:', error);
    return [];
  }
}

async function getLastPhoto(userId) {
  try {
    const photo = await db.get(
      'SELECT * FROM waifu_gallery WHERE user_id = ? ORDER BY taken_at DESC LIMIT 1',
      [userId]
    );
    return photo;
  } catch (error) {
    customizationLogger.error('Error al obtener última foto:', error);
    return null;
  }
}

async function applyOutfitEffects(characterId, userId, effects) {
  try {
    const updates = [];
    Object.entries(effects).forEach(([stat, value]) => {
      if (stat === 'affection') {
        updates.push(`affection = MIN(100, affection + ${value})`);
      } else if (stat === 'happiness') {
        updates.push(`happiness = MIN(100, happiness + ${value})`);
      }
    });
    
    if (updates.length > 0) {
      await db.run(
        `UPDATE waifu_levels SET ${updates.join(', ')} WHERE character_id = ? AND user_id = ?`,
        [characterId, userId]
      );
    }
  } catch (error) {
    customizationLogger.error('Error al aplicar efectos de outfit:', error);
  }
}

async function applyAccessoryEffects(characterId, userId, effects) {
  try {
    const updates = [];
    Object.entries(effects).forEach(([stat, value]) => {
      if (stat === 'affection') {
        updates.push(`affection = MIN(100, affection + ${value})`);
      } else if (stat === 'happiness') {
        updates.push(`happiness = MIN(100, happiness + ${value})`);
      }
    });
    
    if (updates.length > 0) {
      await db.run(
        `UPDATE waifu_levels SET ${updates.join(', ')} WHERE character_id = ? AND user_id = ?`,
        [characterId, userId]
      );
    }
  } catch (error) {
    customizationLogger.error('Error al aplicar efectos de accesorio:', error);
  }
}

async function applyRoomItemEffects(characterId, userId, effects) {
  try {
    const updates = [];
    Object.entries(effects).forEach(([stat, value]) => {
      if (stat === 'affection') {
        updates.push(`affection = MIN(100, affection + ${value})`);
      } else if (stat === 'happiness') {
        updates.push(`happiness = MIN(100, happiness + ${value})`);
      }
    });
    
    if (updates.length > 0) {
      await db.run(
        `UPDATE waifu_levels SET ${updates.join(', ')} WHERE character_id = ? AND user_id = ?`,
        [characterId, userId]
      );
    }
  } catch (error) {
    customizationLogger.error('Error al aplicar efectos de item de cuarto:', error);
  }
}

// Inicializar tablas de personalización
async function initializeCustomizationTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS waifu_outfits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        user_id TEXT,
        outfit_type TEXT,
        equipped BOOLEAN DEFAULT 0,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(character_id, user_id, outfit_type)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS waifu_accessories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        user_id TEXT,
        accessory_type TEXT,
        equipped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(character_id, user_id, accessory_type)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS room_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        user_id TEXT,
        item_type TEXT,
        placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(character_id, user_id, item_type)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS waifu_gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        user_id TEXT,
        style TEXT,
        frame TEXT,
        taken_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    customizationLogger.success('Tablas de personalización inicializadas');
  } catch (error) {
    customizationLogger.error('Error al inicializar tablas de personalización:', error);
  }
}

// Exportar configuración y funciones necesarias
export const command = ['.personalizar', '.vestuario', '.equipar_outfit', '.accesorios', '.equipar_accesorio', '.cuarto', '.decorar_cuarto', '.galeria', '.foto', '.marcos', '.equipar_marco', '.comprar_outfit', '.comprar_accesorio', '.comprar_item'];
export const alias = ['.customize', '.wardrobe', '.equip_outfit', '.accessories', '.equip_accessory', '.room', '.decorate_room', '.gallery', '.photo', '.frames', '.equip_frame'];
export const description = 'Sistema de personalización de waifus con vestuario, accesorios y decoración';

// Inicializar sistema
initializeCustomizationTables();
loadCharacters();

/**
 * Compra un outfit para una waifu
 */
async function buyOutfit(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const outfitType = args[0];
  
  if (!outfitType) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el tipo de outfit.\n\n' +
            '💡 *Uso:* `.comprar_outfit <tipo_outfit>`\n' +
            '*Tipos:* ' + Object.keys(OUTFIT_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  if (!Object.values(OUTFIT_TYPES).includes(outfitType)) {
    return await sock.sendMessage(chatId, {
      text: `❌ Tipo de outfit no válido.\n\n` +
            '*Tipos disponibles:* ' + Object.keys(OUTFIT_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  try {
    const outfitDef = OUTFIT_DEFINITIONS[outfitType];
    const userBalance = await getUserBalance(userId);
    
    if (userBalance.total < outfitDef.price) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes suficientes 💎.\n\n` +
              `💰 *Costo:* ${outfitDef.price.toLocaleString()} 💎\n` +
              `💵 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎`
      }, { quoted: m });
    }
    
    // Verificar si ya tiene el outfit
    const existing = await db.get(
      'SELECT * FROM waifu_outfits WHERE user_id = ? AND outfit_type = ?',
      [userId, outfitType]
    );
    
    if (existing) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya tienes el outfit "${outfitDef.name}".`
      }, { quoted: m });
    }
    
    // Realizar compra
    await updateUserBalance(userId, userBalance.total - outfitDef.price);
    
    // Agregar outfit a la base de datos (sin waifu específica)
    await db.run(
      'INSERT INTO waifu_outfits (character_id, user_id, outfit_type, equipped) VALUES (?, ?, ?, 0)',
      [0, userId, outfitType]
    );
    
    let buyMessage = `🛍️ *OUTFIT COMPRADO* 🛍️\n\n`;
    buyMessage += `${outfitDef.emoji} *${outfitDef.name}*\n`;
    buyMessage += `📝 ${outfitDef.description}\n`;
    buyMessage += `💸 *Costo:* ${outfitDef.price.toLocaleString()} 💎\n\n`;
    buyMessage += `✅ *Outfit añadido a tu armario*\n`;
    buyMessage += `💡 *Usa \`.equipar_outfit <waifu> ${outfitType}\` para equiparlo`;
    
    await sock.sendMessage(chatId, { text: buyMessage }, { quoted: m });
    customizationLogger.success(`Outfit comprado - usuario: ${userId} - tipo: ${outfitType}`);
    
  } catch (error) {
    customizationLogger.error('Error al comprar outfit:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al comprar el outfit.'
    }, { quoted: m });
  }
}

/**
 * Compra un accesorio para una waifu
 */
async function buyAccessory(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const accessoryType = args[0];
  
  if (!accessoryType) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el tipo de accesorio.\n\n' +
            '💡 *Uso:* `.comprar_accesorio <tipo_accesorio>`\n' +
            '*Tipos:* ' + Object.keys(ACCESSORY_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  if (!Object.values(ACCESSORY_TYPES).includes(accessoryType)) {
    return await sock.sendMessage(chatId, {
      text: `❌ Tipo de accesorio no válido.\n\n` +
            '*Tipos disponibles:* ' + Object.keys(ACCESSORY_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  try {
    const accessoryDef = ACCESSORY_DEFINITIONS[accessoryType];
    const userBalance = await getUserBalance(userId);
    
    if (userBalance.total < accessoryDef.price) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes suficientes 💎.\n\n` +
              `💰 *Costo:* ${accessoryDef.price.toLocaleString()} 💎\n` +
              `💵 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎`
      }, { quoted: m });
    }
    
    // Verificar si ya tiene el accesorio
    const existing = await db.get(
      'SELECT * FROM waifu_accessories WHERE user_id = ? AND accessory_type = ?',
      [userId, accessoryType]
    );
    
    if (existing) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya tienes el accesorio "${accessoryDef.name}".`
      }, { quoted: m });
    }
    
    // Realizar compra
    await updateUserBalance(userId, userBalance.total - accessoryDef.price);
    
    // Agregar accesorio a la base de datos (sin waifu específica)
    await db.run(
      'INSERT INTO waifu_accessories (character_id, user_id, accessory_type) VALUES (?, ?, ?)',
      [0, userId, accessoryType]
    );
    
    let buyMessage = `💎 *ACCESORIO COMPRADO* 💎\n\n`;
    buyMessage += `${accessoryDef.emoji} *${accessoryDef.name}*\n`;
    buyMessage += `📝 ${accessoryDef.description}\n`;
    buyMessage += `💸 *Costo:* ${accessoryDef.price.toLocaleString()} 💎\n\n`;
    buyMessage += `✅ *Accesorio añadido a tu colección*\n`;
    buyMessage += `💡 *Usa \`.equipar_accesorio <waifu> ${accessoryType}\` para equiparlo`;
    
    await sock.sendMessage(chatId, { text: buyMessage }, { quoted: m });
    customizationLogger.success(`Accesorio comprado - usuario: ${userId} - tipo: ${accessoryType}`);
    
  } catch (error) {
    customizationLogger.error('Error al comprar accesorio:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al comprar el accesorio.'
    }, { quoted: m });
  }
}

/**
 * Compra un item de cuarto
 */
async function buyRoomItem(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const itemType = args[0];
  
  if (!itemType) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el tipo de item.\n\n' +
            '💡 *Uso:* `.comprar_item <tipo_item>`\n' +
            '*Items:* ' + Object.keys(ROOM_ITEM_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  if (!Object.values(ROOM_ITEMS).includes(itemType)) {
    return await sock.sendMessage(chatId, {
      text: `❌ Tipo de item no válido.\n\n` +
            '*Items disponibles:* ' + Object.keys(ROOM_ITEM_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  try {
    const itemDef = ROOM_ITEM_DEFINITIONS[itemType];
    const userBalance = await getUserBalance(userId);
    
    if (userBalance.total < itemDef.price) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes suficientes 💎.\n\n` +
              `💰 *Costo:* ${itemDef.price.toLocaleString()} 💎\n` +
              `💵 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎`
      }, { quoted: m });
    }
    
    // Verificar si ya tiene el item
    const existing = await db.get(
      'SELECT * FROM room_items WHERE user_id = ? AND item_type = ?',
      [userId, itemType]
    );
    
    if (existing) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya tienes el item "${itemDef.name}".`
      }, { quoted: m });
    }
    
    // Realizar compra
    await updateUserBalance(userId, userBalance.total - itemDef.price);
    
    // Agregar item a la base de datos (sin waifu específica)
    await db.run(
      'INSERT INTO room_items (character_id, user_id, item_type) VALUES (?, ?, ?)',
      [0, userId, itemType]
    );
    
    let buyMessage = `🏠 *ITEM DE CUARTO COMPRADO* 🏠\n\n`;
    buyMessage += `${itemDef.emoji} *${itemDef.name}*\n`;
    buyMessage += `📝 ${itemDef.description}\n`;
    buyMessage += `💸 *Costo:* ${itemDef.price.toLocaleString()} 💎\n\n`;
    buyMessage += `✅ *Item añadido a tu inventario*\n`;
    buyMessage += `💡 *Usa \`.decorar_cuarto <waifu> ${itemType}\` para colocarlo`;
    
    await sock.sendMessage(chatId, { text: buyMessage }, { quoted: m });
    customizationLogger.success(`Item comprado - usuario: ${userId} - tipo: ${itemType}`);
    
  } catch (error) {
    customizationLogger.error('Error al comprar item:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al comprar el item.'
    }, { quoted: m });
  }
}

/**
 * Muestra la galería de una waifu
 */
async function showGallery(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Uso:* `.galeria <nombre_waifu>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Obtener fotos de la galería
    const photos = await getWaifuGallery(character.id, userId);
    const userBalance = await getUserBalance(userId);
    const lastPhoto = await getLastPhoto(userId);
    
    const rareza = getRarezaEmoji(character.price);
    
    let galleryMessage = `📸 *GALERÍA DE ${character.name.toUpperCase()}* 📸\n\n`;
    galleryMessage += `${rareza} *${character.name}*\n`;
    galleryMessage += `📺 ${character.anime}\n`;
    galleryMessage += `💰 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n`;
    galleryMessage += `📸 *Fotos:* ${photos.length}/${CONFIG.maxGalleryPhotos}\n\n`;
    
    if (photos.length === 0) {
      galleryMessage += `📦 *No tienes fotos*\n\n`;
      galleryMessage += `💡 *Toma fotos con \`.foto <waifu>\``;
    } else {
      galleryMessage += `📸 *FOTOS RECIENTES:*\n\n`;
      
      photos.forEach((photo, index) => {
        galleryMessage += `${index + 1}. 📷 Foto #${photo.id}\n`;
        galleryMessage += `   🎨 Estilo: ${photo.style || 'Normal'}\n`;
        galleryMessage += `   🖼️ Marco: ${photo.frame || 'Ninguno'}\n`;
        galleryMessage += `   📅 Fecha: ${new Date(photo.taken_at).toLocaleDateString()}\n\n`;
      });
    }
    
    if (lastPhoto) {
      const cooldownTime = CONFIG.photoCooldown - (Date.now() - new Date(lastPhoto.taken_at).getTime());
      if (cooldownTime > 0) {
        galleryMessage += `⏰ *Cooldown:* ${Math.ceil(cooldownTime / 60000)} minutos\n\n`;
      }
    }
    
    galleryMessage += `💡 *Comandos disponibles:*\n`;
    galleryMessage += `• \`.foto <waifu>\` - Tomar foto\n`;
    galleryMessage += `• \`.marcos <waifu>\` - Ver marcos disponibles`;
    
    await sock.sendMessage(chatId, { 
      text: galleryMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    customizationLogger.error('Error al mostrar galería:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la galería.'
    }, { quoted: m });
  }
}

/**
 * Toma una foto de una waifu
 */
async function takePhoto(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Uso:* `.foto <nombre_waifu>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar cooldown
    const lastPhoto = await getLastPhoto(userId);
    if (lastPhoto) {
      const cooldownTime = CONFIG.photoCooldown - (Date.now() - new Date(lastPhoto.taken_at).getTime());
      if (cooldownTime > 0) {
        return await sock.sendMessage(chatId, {
          text: `⏰ Debes esperar ${Math.ceil(cooldownTime / 60000)} minutos para tomar otra foto.`
        }, { quoted: m });
      }
    }
    
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Verificar límite de fotos
    const photos = await getWaifuGallery(character.id, userId);
    if (photos.length >= CONFIG.maxGalleryPhotos) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite de ${CONFIG.maxGalleryPhotos} fotos.`
      }, { quoted: m });
    }
    
    // Tomar foto
    await db.run(
      'INSERT INTO waifu_gallery (character_id, user_id, style, frame) VALUES (?, ?, ?, ?)',
      [character.id, userId, 'Normal', 'Ninguno']
    );
    
    const rareza = getRarezaEmoji(character.price);
    
    let photoMessage = `📸 *FOTO CAPTURADA* 📸\n\n`;
    photoMessage += `${rareza} *${character.name}*\n`;
    photoMessage += `📺 ${character.anime}\n\n`;
    photoMessage += `✨ *¡Foto añadida a la galería!*\n`;
    photoMessage += `📸 Total: ${photos.length + 1}/${CONFIG.maxGalleryPhotos} fotos\n\n`;
    photoMessage += `💡 *Usa \`.galeria ${character.name}\` para ver todas las fotos`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: photoMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: photoMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
    customizationLogger.success(`Foto tomada - waifu: ${character.name} - usuario: ${userId}`);
    
  } catch (error) {
    customizationLogger.error('Error al tomar foto:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al tomar la foto.'
    }, { quoted: m });
  }
}

/**
 * Muestra marcos disponibles
 */
async function showFrames(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Uso:* `.marcos <nombre_waifu>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    const rareza = getRarezaEmoji(character.price);
    
    let framesMessage = `🖼️ *MARCOS DISPONIBLES* 🖼️\n\n`;
    framesMessage += `${rareza} *${character.name}*\n`;
    framesMessage += `📺 ${character.anime}\n\n`;
    
    framesMessage += `🖼️ *MARCOS GRATIS:*\n\n`;
    framesMessage += `1. 📜 *Marco Simple* - Gratis\n`;
    framesMessage += `   📝 Marco básico y elegante\n\n`;
    framesMessage += `2. 🌟 *Marco Estrella* - Gratis\n`;
    framesMessage += `   📝 Con detalles brillantes\n\n`;
    framesMessage += `3. 💖 *Marco Corazón* - Gratis\n`;
    framesMessage += `   📝 Romántico y tierno\n\n`;
    
    framesMessage += `💡 *Comando disponible:*\n`;
    framesMessage += `• \`.equipar_marco <waifu> <marco>\` - Cambiar marco\n\n`;
    framesMessage += `🎯 *Marcos disponibles:* simple, estrella, corazon`;
    
    await sock.sendMessage(chatId, { 
      text: framesMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    customizationLogger.error('Error al mostrar marcos:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar los marcos.'
    }, { quoted: m });
  }
}

/**
 * Equipa un marco a una foto
 */
async function equipFrame(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.equipar_marco <nombre_waifu> <tipo_marco>`\n' +
            '*Marcos:* simple, estrella, corazon'
    }, { quoted: m });
  }
  
  const waifuName = args.slice(0, -1).join(' ');
  const frameType = args[args.length - 1];
  
  const validFrames = ['simple', 'estrella', 'corazon'];
  if (!validFrames.includes(frameType.toLowerCase())) {
    return await sock.sendMessage(chatId, {
      text: `❌ Tipo de marco no válido.\n\n` +
            '*Marcos disponibles:* ' + validFrames.join(', ')
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Obtener última foto
    const lastPhoto = await db.get(
      'SELECT * FROM waifu_gallery WHERE character_id = ? AND user_id = ? ORDER BY taken_at DESC LIMIT 1',
      [character.id, userId]
    );
    
    if (!lastPhoto) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes fotos de *${character.name}*. Toma una primero con \`.foto ${character.name}\``
      }, { quoted: m });
    }
    
    // Actualizar marco
    await db.run(
      'UPDATE waifu_gallery SET frame = ? WHERE id = ?',
      [frameType, lastPhoto.id]
    );
    
    const frameNames = {
      'simple': 'Marco Simple',
      'estrella': 'Marco Estrella', 
      'corazon': 'Marco Corazón'
    };
    
    const frameEmojis = {
      'simple': '📜',
      'estrella': '🌟',
      'corazon': '💖'
    };
    
    const rareza = getRarezaEmoji(character.price);
    
    let frameMessage = `🖼️ *MARCO EQUIPADO* 🖼️\n\n`;
    frameMessage += `${rareza} *${character.name}*\n`;
    frameMessage += `📺 ${character.anime}\n\n`;
    frameMessage += `${frameEmojis[frameType]} *${frameNames[frameType]}* equipado\n\n`;
    frameMessage += `✨ *¡La foto se ve aún más hermosa!*\n`;
    frameMessage += `💡 *Usa \`.galeria ${character.name}\` para ver la foto con el nuevo marco`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: frameMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: frameMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
    customizationLogger.success(`Marco equipado - waifu: ${character.name} - marco: ${frameType}`);
    
  } catch (error) {
    customizationLogger.error('Error al equipar marco:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al equipar el marco.'
    }, { quoted: m });
  }
}

export { CONFIG, customizationLogger, CUSTOMIZATION_CATEGORIES, OUTFIT_TYPES, ACCESSORY_TYPES, ROOM_ITEMS };
