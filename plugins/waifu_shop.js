/**
 * @file Plugin Waifu Shop - Sistema de tienda y compra de waifus
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de tienda y compra de waifus separado del plugin principal
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Importar funciones compartidas desde el core
import { 
  characters, 
  loadCharacters, 
  getRarezaEmoji,
  getRarezaFromPrice
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  basePrice: 100,
  rarityMultiplier: {
    common: 1,
    uncommon: 2.5,
    rare: 5,
    epic: 10,
    legendary: 25,
    mythic: 50
  },
  discountRate: 0.1, // 10% de descuento para usuarios VIP
  maxDailyPurchases: 10,
  workBonus: 0.2, // 20% de bonificación por trabajo
  shopDisplayLimit: 15
};

// Sistema de logging
const logger = {
  info: (message) => CONFIG.enableLogging && console.log(`[SHOP] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[SHOP] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[SHOP] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[SHOP] ❌ ${message}`),
  debug: (message) => CONFIG.enableLogging && console.log(`[SHOP] 🔍 ${message}`)
};

/**
 * Sistema de tienda de waifus
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.tienda':
        await handleShopCommand(sock, m, userId, text);
        break;
      case '.comprar':
        await buyWaifu(sock, m, userId, text);
        break;
      default:
        logger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    logger.error('Error en el sistema de tienda:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de tienda. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Maneja comandos de tienda
 */
async function handleShopCommand(sock, m, userId, text) {
  const args = (text || '').split(' ').slice(1);
  const shopType = args[0]?.toLowerCase();
  
  if (shopType === 'waifu') {
    await showWaifuShop(sock, m, userId);
  } else {
    await showAvailableShops(sock, m);
  }
}

/**
 * Muestra las tiendas disponibles
 */
async function showAvailableShops(sock, m) {
  const chatId = m.key.remoteJid;
  
  const shopMessage = `🛍️ *TIENDAS DISPONIBLES* 🛍️\n\n` +
    `• \`.tienda waifu\` - Tienda de waifus\n\n` +
    `💡 *Próximamente más tiendas...*\n\n` +
    `🎯 *Usa \`.comprar <nombre>\` para comprar desde cualquier tienda activa.`;
  
  await sock.sendMessage(chatId, { text: shopMessage }, { quoted: m });
}

/**
 * Función para obtener saldo del usuario desde economía
 */
async function getUserBalance(userId) {
  try {
    const user = await db.get('SELECT saldo, banco FROM usuarios WHERE chatId = ?', [userId]);
    if (!user) {
      // Crear usuario si no existe
      await db.run('INSERT INTO usuarios (chatId, saldo, banco) VALUES (?, 100, 0)', [userId]);
      return { saldo: 100, banco: 0, total: 100 };
    }
    return {
      saldo: user.saldo || 0,
      banco: user.banco || 0,
      total: (user.saldo || 0) + (user.banco || 0)
    };
  } catch (error) {
    logger.error('Error al obtener saldo del usuario:', error);
    return { saldo: 0, banco: 0, total: 0 };
  }
}

/**
 * Función para actualizar saldo del usuario
 */
async function updateUserBalance(userId, newBalance) {
  try {
    await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
    return true;
  } catch (error) {
    logger.error('Error al actualizar saldo del usuario:', error);
    return false;
  }
}

/**
 * Función para verificar si el usuario tiene trabajo reciente (bonificación)
 */
async function hasRecentWork(userId) {
  try {
    // Verificar si el usuario ha trabajado en las últimas 24 horas
    const recentWork = await db.get(
      'SELECT timestamp FROM work_history WHERE user_id = ? AND timestamp > datetime("now", "-24 hours")',
      [userId]
    );
    return !!recentWork;
  } catch (error) {
    logger.error('Error al verificar trabajo reciente:', error);
    return false;
  }
}

/**
 * Función para registrar compra de waifu
 */
async function recordWaifuPurchase(userId, characterId, price) {
  try {
    await db.run(
      'INSERT INTO waifu_purchases (user_id, character_id, price, purchase_date) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [userId, characterId, price]
    );
    return true;
  } catch (error) {
    logger.error('Error al registrar compra de waifu:', error);
    return false;
  }
}

/**
 * Función para obtener estadísticas de compras del usuario
 */
async function getUserPurchaseStats(userId) {
  try {
    const stats = await db.get(
      'SELECT COUNT(*) as total_purchases, SUM(price) as total_spent FROM waifu_purchases WHERE user_id = ? AND purchase_date > date("now", "-1 day")',
      [userId]
    );
    return {
      todayPurchases: stats.total_purchases || 0,
      todaySpent: stats.total_spent || 0
    };
  } catch (error) {
    logger.error('Error al obtener estadísticas de compras:', error);
    return { todayPurchases: 0, todaySpent: 0 };
  }
}

/**
 * Inicializa las tablas necesarias para el sistema de tienda
 */
async function initializeShopTables() {
  try {
    // Crear tabla de compras de waifus si no existe
    await db.run(`
      CREATE TABLE IF NOT EXISTS waifu_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        character_id INTEGER,
        price INTEGER,
        purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de historial de trabajo si no existe
    await db.run(`
      CREATE TABLE IF NOT EXISTS work_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logger.success('Tablas de tienda inicializadas correctamente');
  } catch (error) {
    logger.error('Error al inicializar tablas de tienda:', error);
    throw error;
  }
}

/**
 * Función para calcular precio dinámico basado en rareza y factores
 */
async function calculateDynamicPrice(character, userId) {
  const basePrice = character.price || CONFIG.basePrice;
  const rarity = getRarezaFromPrice(basePrice);
  const rarityMultiplier = CONFIG.rarityMultiplier[rarity] || 1;
  
  // Precio base ajustado por rareza
  let finalPrice = basePrice * rarityMultiplier;
  
  // Aplicar bonificación si el usuario trabajó recientemente
  const hasWorkBonus = await hasRecentWork(userId);
  if (hasWorkBonus) {
    finalPrice *= (1 - CONFIG.workBonus); // 20% de descuento
  }
  
  // Redondear a múltiplos de 50
  return Math.round(finalPrice / 50) * 50;
}

/**
 * Función para mostrar tienda de waifus
 */
async function showWaifuShop(sock, m, userId) {
  const chatId = m.key.remoteJid;
  const balance = await getUserBalance(userId);
  const purchaseStats = await getUserPurchaseStats(userId);
  const hasWorkBonus = await hasRecentWork(userId);
  
  // Obtener waifus disponibles (no reclamadas por el usuario)
  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
  const claimedIds = claimed.map(c => c.character_id);
  const availableWaifus = characters.filter(c => !claimedIds.includes(c.id));
  
  // Ordenar por precio y tomar las primeras 15
  const shopWaifus = availableWaifus
    .sort((a, b) => a.price - b.price)
    .slice(0, CONFIG.shopDisplayLimit);
  
  let shopMessage = `🛍️ *TIENDA DE WAIFUS* 🛍️\n\n`;
  shopMessage += `👤 *@${userId.split('@')[0]}*\n`;
  shopMessage += `💰 *Tu saldo:* ${balance.total.toLocaleString()} 💎\n`;
  shopMessage += `📊 *Compras hoy:* ${purchaseStats.todayPurchases}/${CONFIG.maxDailyPurchases}\n\n`;
  
  if (hasWorkBonus) {
    shopMessage += `✨ *¡Bonificación activa! 20% de descuento* ✨\n\n`;
  }
  
  shopMessage += `🎀 *WAIFUS DISPONIBLES:*\n\n`;
  
  // Procesar waifus para mostrar precios dinámicos
  for (let i = 0; i < shopWaifus.length; i++) {
    const waifu = shopWaifus[i];
    const rarity = getRarezaFromPrice(waifu.price);
    const rarityEmoji = getRarezaEmoji(waifu.price);
    const dynamicPrice = await calculateDynamicPrice(waifu, userId);
    const discount = hasWorkBonus ? (waifu.price - dynamicPrice) : 0;
    
    shopMessage += `${i + 1}. ${rarityEmoji} *${waifu.name}*\n`;
    shopMessage += `   📺 ${waifu.anime}\n`;
    shopMessage += `   💎 Precio: ${dynamicPrice.toLocaleString()} 💎`;
    
    if (discount > 0) {
      shopMessage += ` (-${discount.toLocaleString()} 💎)`;
    }
    
    shopMessage += `\n   🏷️ Rareza: ${rarity}\n\n`;
  }
  
  shopMessage += `💡 *Cómo comprar:*\n`;
  shopMessage += `• \`.comprar <nombre>\` - Comprar waifu\n`;
  shopMessage += `• \`.comprar <número>\` - Comprar por número\n\n`;
  shopMessage += `🎯 *Trabaja para obtener descuentos:*\n`;
  shopMessage += `• Usa \`.trabajar\` para obtener 20% de descuento\n`;
  shopMessage += `• La bonificación dura 24 horas\n\n`;
  shopMessage += `⚠️ *Límite de compras:* ${CONFIG.maxDailyPurchases} por día`;
  
  await sock.sendMessage(chatId, { text: shopMessage, mentions: [userId] }, { quoted: m });
}

/**
 * Función para comprar waifu desde tienda
 */
async function buyWaifu(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const query = (text || '').split(' ').slice(1).join(' ');
  
  if (!query || query.trim().length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar qué waifu quieres comprar.\n\n' +
            '💡 *Ejemplos:*\n' +
            '• \`.comprar Hinata\` - Comprar por nombre\n' +
            '• \`.comprar 1\` - Comprar por número de tienda\n\n' +
            '🛍️ Usa \`.tienda waifu\` para ver disponibles.'
    }, { quoted: m });
  }
  
  const balance = await getUserBalance(userId);
  const purchaseStats = await getUserPurchaseStats(userId);
  
  // Verificar límite de compras diarias
  if (purchaseStats.todayPurchases >= CONFIG.maxDailyPurchases) {
    return await sock.sendMessage(chatId, {
      text: `❌ Has alcanzado el límite de compras diarias.\n\n` +
            `📊 *Compras hoy:* ${purchaseStats.todayPurchases}/${CONFIG.maxDailyPurchases}\n` +
            `⏰ *Vuelve mañana para más compras!*`
    }, { quoted: m });
  }
  
  // Buscar waifu por nombre o número
  let character = null;
  const isNumber = !isNaN(query);
  
  if (isNumber) {
    // Comprar por número de tienda
    const shopIndex = parseInt(query) - 1;
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    const availableWaifus = characters.filter(c => !claimedIds.includes(c.id));
    const shopWaifus = availableWaifus.sort((a, b) => a.price - b.price).slice(0, CONFIG.shopDisplayLimit);
    
    if (shopIndex >= 0 && shopIndex < shopWaifus.length) {
      character = shopWaifus[shopIndex];
    }
  } else {
    // Comprar por nombre
    character = characters.find(c => 
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.anime.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No se encontró la waifu "${query}"\n\n` +
            '💡 *Usa \`.tienda waifu\` para ver las disponibles o verifica el nombre.*'
    }, { quoted: m });
  }
  
  // Verificar si ya la tiene
  const alreadyOwned = await db.get(
    'SELECT character_id FROM claimed_characters WHERE user_id = ? AND character_id = ?',
    [userId, character.id]
  );
  
  if (alreadyOwned) {
    return await sock.sendMessage(chatId, {
      text: `❌ Ya tienes a *${character.name}* en tu colección.\n\n` +
            '💡 *Usa \`.mywaifus\` para ver tu colección.*'
    }, { quoted: m });
  }
  
  // Calcular precio dinámico
  const dynamicPrice = calculateDynamicPrice(character, userId);
  const hasWorkBonus = await hasRecentWork(userId);
  
  // Verificar si tiene suficiente saldo
  if (balance.total < dynamicPrice) {
    const faltante = dynamicPrice - balance.total;
    return await sock.sendMessage(chatId, {
      text: `❌ No tienes suficientes 💎 para comprar a *${character.name}*\n\n` +
            `💰 *Precio:* ${dynamicPrice.toLocaleString()} 💎\n` +
            `💵 *Tu saldo:* ${balance.total.toLocaleString()} 💎\n` +
            `⚠️ *Faltan:* ${faltante.toLocaleString()} 💎\n\n` +
            `💡 *Cómo conseguir más dinero:*\n` +
            `• \`.trabajar\` - Trabaja y gana dinero\n` +
            `• \`.apostar\` - Apuesta y duplica\n` +
            `• \`.depositar\` - Usa tu banco\n\n` +
            (hasWorkBonus ? '' : '✨ *Trabaja para obtener 20% de descuento!*')
    }, { quoted: m });
  }
  
  // Determinar de dónde sacar el dinero (banco primero)
  let newBalance = balance.saldo;
  let newBank = balance.banco;
  
  if (balance.banco >= dynamicPrice) {
    newBank = balance.banco - dynamicPrice;
  } else {
    const neededFromBank = balance.banco;
    const neededFromHand = dynamicPrice - balance.banco;
    newBank = 0;
    newBalance = balance.saldo - neededFromHand;
  }
  
  // Realizar la transacción
  const success = await updateUserBalance(userId, newBalance);
  if (!success) {
    return await sock.sendMessage(chatId, {
      text: '❌ Error al procesar el pago. Intenta nuevamente.'
    }, { quoted: m });
  }
  
  await db.run('UPDATE usuarios SET banco = ? WHERE chatId = ?', [newBank, userId]);
  await db.run('INSERT INTO claimed_characters (character_id, user_id) VALUES (?, ?)', [character.id, userId]);
  await recordWaifuPurchase(userId, character.id, dynamicPrice);
  
  // Mensaje de éxito
  const rarity = getRarezaEmoji(character.price);
  const discount = hasWorkBonus ? (character.price - dynamicPrice) : 0;
  
  let successMessage = `🎉 *¡WAIFU COMPRADA!* 🎉\n\n`;
  successMessage += `${rarity} *${character.name}*\n`;
  successMessage += `📺 *Anime:* ${character.anime}\n`;
  successMessage += `💎 *Precio pagado:* ${dynamicPrice.toLocaleString()} 💎\n`;
  
  if (discount > 0) {
    successMessage += `✨ *Descuento aplicado:* -${discount.toLocaleString()} 💎\n`;
  }
  
  successMessage += `💵 *Saldo restante:* ${(newBalance + newBank).toLocaleString()} 💎\n\n`;
  successMessage += `📊 *Compras hoy:* ${purchaseStats.todayPurchases + 1}/${CONFIG.maxDailyPurchases}\n\n`;
  successMessage += `💖 ¡Disfruta de tu nueva waifu, @${userId.split('@')[0]}!`;
  
  try {
    await sock.sendMessage(chatId, {
      image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
      caption: successMessage,
      mentions: [userId]
    }, { quoted: m });
  } catch (imageError) {
    logger.error('Error al enviar imagen:', imageError);
    await sock.sendMessage(chatId, { text: successMessage, mentions: [userId] }, { quoted: m });
  }
  
  logger.success(`Waifu ${character.name} comprada por usuario ${userId} por ${dynamicPrice} 💎`);
}

// Exportar configuración y funciones necesarias
export const command = ['.tienda', '.comprar'];
export const alias = ['.shop', '.buy'];
export const description = 'Sistema de tienda y compra de waifus';

// Inicializar sistema al iniciar
(async () => {
  try {
    // Asegurar que las tablas existan
    await initializeShopTables();
    // Cargar personajes
    await loadCharacters();
    logger.success('Sistema de tienda waifu inicializado correctamente');
  } catch (error) {
    logger.error('Error inicializando sistema de tienda waifu:', error);
  }
})();

export { CONFIG, logger, getUserBalance, calculateDynamicPrice };
