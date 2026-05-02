/**
 * @file Plugin Waifu Mejorado v3.0 - Sistema completo de colección de personajes
 * @version 3.1.0
 * @author Mejorado para HINATA-BOT
 * @description Sistema avanzado de colección con niveles, interacciones, evolución y tienda
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Sistema de tienda y precios dinámicos
const SHOP_CONFIG = {
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
  workBonus: 0.2 // 20% de bonificación por trabajo
};

// Función para obtener saldo del usuario desde economía
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
    console.error('Error al obtener saldo del usuario:', error);
    return { saldo: 0, banco: 0, total: 0 };
  }
}

// Función para actualizar saldo del usuario
async function updateUserBalance(userId, newBalance) {
  try {
    await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
    return true;
  } catch (error) {
    console.error('Error al actualizar saldo del usuario:', error);
    return false;
  }
}

// Función para verificar si el usuario tiene trabajo reciente (bonificación)
async function hasRecentWork(userId) {
  try {
    // Verificar si el usuario ha trabajado en las últimas 24 horas
    const recentWork = await db.get(
      'SELECT timestamp FROM work_history WHERE user_id = ? AND timestamp > datetime("now", "-24 hours")',
      [userId]
    );
    return !!recentWork;
  } catch (error) {
    console.error('Error al verificar trabajo reciente:', error);
    return false;
  }
}

// Función para registrar compra de waifu
async function recordWaifuPurchase(userId, characterId, price) {
  try {
    await db.run(
      'INSERT INTO waifu_purchases (user_id, character_id, price, purchase_date) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [userId, characterId, price]
    );
    return true;
  } catch (error) {
    console.error('Error al registrar compra de waifu:', error);
    return false;
  }
}

// Función para obtener estadísticas de compras del usuario
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
    console.error('Error al obtener estadísticas de compras:', error);
    return { todayPurchases: 0, todaySpent: 0 };
  }
}

// Función para calcular precio dinámico basado en rareza y factores
function calculateDynamicPrice(character, userId) {
  const basePrice = character.price || SHOP_CONFIG.basePrice;
  const rarity = getRarityFromPrice(basePrice);
  const rarityMultiplier = SHOP_CONFIG.rarityMultiplier[rarity] || 1;
  
  // Precio base ajustado por rareza
  let finalPrice = basePrice * rarityMultiplier;
  
  // Aplicar bonificación si el usuario trabajó recientemente
  if (hasRecentWork(userId)) {
    finalPrice *= (1 - SHOP_CONFIG.workBonus); // 20% de descuento
  }
  
  // Redondear a múltiplos de 50
  return Math.round(finalPrice / 50) * 50;
}

// Función para determinar rareza desde precio
function getRarityFromPrice(price) {
  if (price < 500) return 'common';
  if (price < 1500) return 'uncommon';
  if (price < 3000) return 'rare';
  if (price < 5000) return 'epic';
  if (price < 10000) return 'legendary';
  return 'mythic';
}

// Función para mostrar tienda de waifus
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
    .slice(0, 15);
  
  let shopMessage = `🛍️ *TIENDA DE WAIFUS* 🛍️\n\n`;
  shopMessage += `👤 *@${userId.split('@')[0]}*\n`;
  shopMessage += `💰 *Tu saldo:* ${balance.total.toLocaleString()} 💎\n`;
  shopMessage += `📊 *Compras hoy:* ${purchaseStats.todayPurchases}/${SHOP_CONFIG.maxDailyPurchases}\n\n`;
  
  if (hasWorkBonus) {
    shopMessage += `✨ *¡Bonificación activa! 20% de descuento* ✨\n\n`;
  }
  
  shopMessage += `🎀 *WAIFUS DISPONIBLES:*\n\n`;
  
  shopWaifus.forEach((waifu, index) => {
    const rarity = getRarityFromPrice(waifu.price);
    const rarityEmoji = getRarezaEmoji(waifu.price);
    const dynamicPrice = calculateDynamicPrice(waifu, userId);
    const discount = hasWorkBonus ? (waifu.price - dynamicPrice) : 0;
    
    shopMessage += `${index + 1}. ${rarityEmoji} *${waifu.name}*\n`;
    shopMessage += `   📺 ${waifu.anime}\n`;
    shopMessage += `   💎 Precio: ${dynamicPrice.toLocaleString()} 💎`;
    
    if (discount > 0) {
      shopMessage += ` (-${discount.toLocaleString()} 💎)`;
    }
    
    shopMessage += `\n   🏷️ Rareza: ${rarity}\n\n`;
  });
  
  shopMessage += `💡 *Cómo comprar:*\n`;
  shopMessage += `• \`.comprar <nombre>\` - Comprar waifu\n`;
  shopMessage += `• \`.comprar <número>\` - Comprar por número\n\n`;
  shopMessage += `🎯 *Trabaja para obtener descuentos:*\n`;
  shopMessage += `• Usa \`.trabajar\` para obtener 20% de descuento\n`;
  shopMessage += `• La bonificación dura 24 horas\n\n`;
  shopMessage += `⚠️ *Límite de compras:* ${SHOP_CONFIG.maxDailyPurchases} por día`;
  
  await sock.sendMessage(chatId, { text: shopMessage, mentions: [userId] }, { quoted: m });
}

// Función para comprar waifu desde tienda
async function buyWaifu(sock, m, userId, query) {
  const chatId = m.key.remoteJid;
  
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
  if (purchaseStats.todayPurchases >= SHOP_CONFIG.maxDailyPurchases) {
    return await sock.sendMessage(chatId, {
      text: `❌ Has alcanzado el límite de compras diarias.\n\n` +
            `📊 *Compras hoy:* ${purchaseStats.todayPurchases}/${SHOP_CONFIG.maxDailyPurchases}\n` +
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
    const shopWaifus = availableWaifus.sort((a, b) => a.price - b.price).slice(0, 15);
    
    if (shopIndex >= 0 && shopIndex < shopWaifus.length) {
      character = shopWaifus[shopIndex];
    }
  } else {
    // Comprar por nombre
    character = getCharacterByName(query);
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
      text: `❌ No tienes suficientes 💎 para comprar a *${character.name}*.\n\n` +
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
  successMessage += `📊 *Compras hoy:* ${purchaseStats.todayPurchases + 1}/${SHOP_CONFIG.maxDailyPurchases}\n\n`;
  successMessage += `💖 ¡Disfruta de tu nueva waifu, @${userId.split('@')[0]}!`;
  
  try {
    await sock.sendMessage(chatId, {
      image: { url: character.image_url },
      caption: successMessage,
      mentions: [userId]
    }, { quoted: m });
  } catch (imageError) {
    console.error('Error al enviar imagen:', imageError);
    await sock.sendMessage(chatId, { text: successMessage, mentions: [userId] }, { quoted: m });
  }
}

// Cargar personajes desde el archivo JSON
let characters = [];
let charactersCache = new Map(); // Cache para optimizar rendimiento
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async function loadCharacters() {
  try {
    const data = await fs.readFile('./characters.json', 'utf8');
    characters = JSON.parse(data);
    updateCharactersCache();
    lastCacheUpdate = Date.now();
    console.log(`✅ ${characters.length} personajes cargados correctamente`);
  } catch (error) {
    console.error('❌ Error al cargar characters.json:', error);
    characters = [];
  }
}

function updateCharactersCache() {
  charactersCache.clear();
  characters.forEach(char => {
    charactersCache.set(char.id, char);
    charactersCache.set(char.name.toLowerCase(), char);
  });
}

function getCharacterById(id) {
  if (Date.now() - lastCacheUpdate > CACHE_DURATION) {
    loadCharacters();
  }
  return charactersCache.get(id);
}

function getCharacterByName(name) {
  if (Date.now() - lastCacheUpdate > CACHE_DURATION) {
    loadCharacters();
  }
  return charactersCache.get(name.toLowerCase());
}

// Sistema de niveles y experiencia
async function getWaifuLevel(characterId, userId) {
  const waifuData = await db.get(
    'SELECT level, experience FROM waifu_levels WHERE character_id = ? AND user_id = ?',
    [characterId, userId]
  );
  return waifuData ? waifuData.level : 1;
}

async function getWaifuExp(characterId, userId) {
  const waifuData = await db.get(
    'SELECT experience FROM waifu_levels WHERE character_id = ? AND user_id = ?',
    [characterId, userId]
  );
  return waifuData ? waifuData.experience : 0;
}

async function addWaifuExp(characterId, userId, exp) {
  const current = await db.get(
    'SELECT level, experience FROM waifu_levels WHERE character_id = ? AND user_id = ?',
    [characterId, userId]
  );
  
  if (!current) {
    await db.run(
      'INSERT INTO waifu_levels (character_id, user_id, level, experience) VALUES (?, ?, ?, ?)',
      [characterId, userId, 1, exp]
    );
    return { level: 1, exp, leveledUp: exp >= getExpForNextLevel(1) };
  }
  
  let newExp = current.experience + exp;
  let newLevel = current.level;
  let leveledUp = false;
  
  while (newExp >= getExpForNextLevel(newLevel) && newLevel < 100) {
    newExp -= getExpForNextLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }
  
  await db.run(
    'UPDATE waifu_levels SET level = ?, experience = ? WHERE character_id = ? AND user_id = ?',
    [newLevel, newExp, characterId, userId]
  );
  
  return { level: newLevel, exp: newExp, leveledUp };
}

function getExpForNextLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function getExpProgress(characterId, userId) {
  return db.get(
    'SELECT level, experience FROM waifu_levels WHERE character_id = ? AND user_id = ?',
    [characterId, userId]
  ).then(data => {
    if (!data) return { level: 1, current: 0, needed: getExpForNextLevel(1), progress: 0 };
    const needed = getExpForNextLevel(data.level);
    return {
      level: data.level,
      current: data.experience,
      needed,
      progress: Math.floor((data.experience / needed) * 100)
    };
  });
}

// Crear tabla de niveles si no existe
async function initializeWaifuLevels() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS waifu_levels (
        character_id INTEGER,
        user_id TEXT,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        affection INTEGER DEFAULT 0,
        hunger INTEGER DEFAULT 100,
        happiness INTEGER DEFAULT 100,
        last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (character_id, user_id)
      )
    `);
    console.log('✅ Tabla waifu_levels inicializada');
  } catch (error) {
    console.error('❌ Error al inicializar tabla waifu_levels:', error);
  }
}

// Sistema de logging mejorado
const logger = {
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ℹ️ [WAIFU] ${message}`;
    console.log(logMessage);
    if (data) console.log('Data:', data);
  },
  
  success: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ✅ [WAIFU] ${message}`;
    console.log(logMessage);
    if (data) console.log('Data:', data);
  },
  
  warning: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ⚠️ [WAIFU] ${message}`;
    console.warn(logMessage);
    if (data) console.log('Data:', data);
  },
  
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ❌ [WAIFU] ${message}`;
    console.error(logMessage);
    if (error) {
      console.error('Error:', error);
      if (error.stack) console.error('Stack:', error.stack);
    }
  },
  
  debug: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] 🔍 [WAIFU] ${message}`;
    console.log(logMessage);
    if (data) console.log('Data:', data);
  }
};

// Manejador de errores centralizado
class WaifuError extends Error {
  constructor(message, type = 'GENERAL', code = null, details = null) {
    super(message);
    this.name = 'WaifuError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Tipos de errores
const ErrorTypes = {
  VALIDATION: 'VALIDATION',
  DATABASE: 'DATABASE',
  NETWORK: 'NETWORK',
  PERMISSION: 'PERMISSION',
  NOT_FOUND: 'NOT_FOUND',
  COOLDOWN: 'COOLDOWN',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  GENERAL: 'GENERAL'
};

// Manejador centralizado de errores
async function handleWaifuError(error, sock, chatId, m = null) {
  let userMessage = '❌ Ocurrió un error inesperado. Por favor, intenta nuevamente más tarde.'
  
  if (error instanceof WaifuError) {
    logger.error(`WaifuError [${error.type}]: ${error.message}`, error.details);
    
    switch (error.type) {
      case ErrorTypes.VALIDATION:
        userMessage = `❌ ${error.message}`;
        break;
      case ErrorTypes.NOT_FOUND:
        userMessage = `🔍 ${error.message}`;
        break;
      case ErrorTypes.INSUFFICIENT_FUNDS:
        userMessage = `💰 ${error.message}`;
        break;
      case ErrorTypes.COOLDOWN:
        userMessage = `⏰ ${error.message}`;
        break;
      case ErrorTypes.PERMISSION:
        userMessage = `🚫 ${error.message}`;
        break;
      case ErrorTypes.DATABASE:
        userMessage = '🗄️ Error en la base de datos. Por favor, contacta al administrador.';
        break;
      case ErrorTypes.NETWORK:
        userMessage = '🌐 Error de conexión. Por favor, verifica tu internet e intenta nuevamente.';
        break;
      default:
        userMessage = `❌ ${error.message}`;
    }
  } else {
    logger.error('Error no manejado:', error);
  }
  
  try {
    await sock.sendMessage(chatId, { text: userMessage }, m ? { quoted: m } : {});
  } catch (sendError) {
    logger.error('Error al enviar mensaje de error:', sendError);
  }
}

// Función wrapper para manejo seguro de operaciones
async function safeExecute(operation, errorMessage = 'Error en la operación') {
  try {
    return await operation();
  } catch (error) {
    logger.error(errorMessage, error);
    throw new WaifuError(errorMessage, ErrorTypes.GENERAL, null, error);
  }
}

// Validación de datos de entrada
function validateInput(data, rules) {
  const errors = [];
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    
    if (rule.required && (!value || value.trim() === '')) {
      errors.push(`El campo '${field}' es requerido`);
      continue;
    }
    
    if (value && rule.type && typeof value !== rule.type) {
      errors.push(`El campo '${field}' debe ser de tipo ${rule.type}`);
    }
    
    if (value && rule.minLength && value.length < rule.minLength) {
      errors.push(`El campo '${field}' debe tener al menos ${rule.minLength} caracteres`);
    }
    
    if (value && rule.maxLength && value.length > rule.maxLength) {
      errors.push(`El campo '${field}' no puede exceder ${rule.maxLength} caracteres`);
    }
    
    if (value && rule.pattern && !rule.pattern.test(value)) {
      errors.push(`El campo '${field}' tiene un formato inválido`);
    }
  }
  
  if (errors.length > 0) {
    throw new WaifuError(errors.join(', '), ErrorTypes.VALIDATION, 'VALIDATION_ERROR', { errors });
  }
  
  return true;
}

// Sistema de métricas y monitoreo
const metrics = {
  commands: new Map(),
  errors: new Map(),
  performance: new Map(),
  
  recordCommand(command, duration, success = true) {
    if (!this.commands.has(command)) {
      this.commands.set(command, { count: 0, totalDuration: 0, errors: 0 });
    }
    
    const cmd = this.commands.get(command);
    cmd.count++;
    cmd.totalDuration += duration;
    
    if (!success) cmd.errors++;
    
    // Log cada 10 ejecuciones
    if (cmd.count % 10 === 0) {
      const avgDuration = cmd.totalDuration / cmd.count;
      logger.info(`Command ${command}: ${cmd.count} ejecuciones, ${avgDuration}ms avg, ${cmd.errors} errores`);
    }
  },
  
  recordError(errorType, message) {
    const count = this.errors.get(errorType) || 0;
    this.errors.set(errorType, count + 1);
    
    if (count % 5 === 0) {
      logger.warning(`Error type ${errorType}: ${count + 1} ocurrencias`);
    }
  },
  
  getStats() {
    const stats = {
      commands: Object.fromEntries(this.commands),
      errors: Object.fromEntries(this.errors),
      timestamp: new Date().toISOString()
    };
    
    return stats;
  }
};

// Sistema de caché avanzado para optimización de rendimiento
class WaifuCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.hitCount = new Map();
    this.missCount = 0;
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos
  }
  
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
    this.hitCount.set(key, 0);
  }
  
  get(key) {
    const timestamp = this.timestamps.get(key);
    
    if (!timestamp || Date.now() > timestamp) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      this.hitCount.delete(key);
      this.missCount++;
      return null;
    }
    
    const hits = this.hitCount.get(key) || 0;
    this.hitCount.set(key, hits + 1);
    
    return this.cache.get(key);
  }
  
  has(key) {
    return this.get(key) !== null;
  }
  
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
    this.hitCount.delete(key);
  }
  
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    this.hitCount.clear();
    this.missCount = 0;
  }
  
  // Limpieza automática de elementos expirados
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, timestamp] of this.timestamps) {
      if (now > timestamp) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.delete(key));
    
    if (expiredKeys.length > 0) {
      logger.debug(`Cache cleanup: eliminados ${expiredKeys.length} elementos expirados`);
    }
    
    return expiredKeys.length;
  }
  
  getStats() {
    const totalHits = Array.from(this.hitCount.values()).reduce((sum, hits) => sum + hits, 0);
    const totalRequests = totalHits + this.missCount;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      size: this.cache.size,
      hits: totalHits,
      misses: this.missCount,
      hitRate: `${hitRate}%`,
      topKeys: Array.from(this.hitCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }
}

// Instancia global de caché
const waifuCache = new WaifuCache();

// Limpieza automática cada 10 minutos
setInterval(() => {
  waifuCache.cleanup();
}, 10 * 60 * 1000);

// Funciones de caché para consultas frecuentes
async function getCachedUserWaifus(userId) {
  const cacheKey = `user_waifus_${userId}`;
  let waifus = waifuCache.get(cacheKey);
  
  if (!waifus) {
    waifus = await safeExecute(async () => {
      const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
      const claimedIds = claimed.map(c => c.character_id);
      return characters.filter(c => claimedIds.includes(c.id));
    }, 'Error al obtener waifus del usuario');
    
    waifuCache.set(cacheKey, waifus, 3 * 60 * 1000); // 3 minutos
  }
  
  return waifus;
}

async function getCachedWaifuStats(characterId, userId) {
  const cacheKey = `waifu_stats_${characterId}_${userId}`;
  let stats = waifuCache.get(cacheKey);
  
  if (!stats) {
    stats = await safeExecute(async () => {
      const level = await getWaifuLevel(characterId, userId);
      const expProgress = await getExpProgress(characterId, userId);
      const waifuStats = await getWaifuStats(characterId, userId);
      
      return { level, expProgress, waifuStats };
    }, 'Error al obtener estadísticas de waifu');
    
    waifuCache.set(cacheKey, stats, 2 * 60 * 1000); // 2 minutos
  }
  
  return stats;
}

async function getCachedBattleStats(characterId, userId) {
  const cacheKey = `battle_stats_${characterId}_${userId}`;
  let stats = waifuCache.get(cacheKey);
  
  if (!stats) {
    stats = await safeExecute(async () => {
      const level = await getWaifuLevel(characterId, userId);
      const baseStats = await getWaifuStats(characterId, userId);
      
      return {
        level,
        attack: Math.floor(10 + level * 2 + baseStats.affection * 0.1),
        defense: Math.floor(5 + level * 1.5 + baseStats.happiness * 0.05),
        speed: Math.floor(8 + level * 1.2 + (100 - baseStats.hunger) * 0.05),
        hp: 100 + level * 5
      };
    }, 'Error al obtener estadísticas de combate');
    
    waifuCache.set(cacheKey, stats, 5 * 60 * 1000); // 5 minutos
  }
  
  return stats;
}

// Invalidación de caché cuando hay cambios
function invalidateUserCache(userId) {
  const keysToDelete = [];
  
  for (const key of waifuCache.cache.keys()) {
    if (key.includes(userId)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => waifuCache.delete(key));
  
  if (keysToDelete.length > 0) {
    logger.debug(`Invalidados ${keysToDelete.length} elementos de caché para usuario ${userId}`);
  }
}

function invalidateWaifuCache(characterId, userId = null) {
  const keysToDelete = [];
  
  for (const key of waifuCache.cache.keys()) {
    if (key.includes(characterId) && (!userId || key.includes(userId))) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => waifuCache.delete(key));
  
  if (keysToDelete.length > 0) {
    logger.debug(`Invalidados ${keysToDelete.length} elementos de caché para waifu ${characterId}`);
  }
}

// Optimización de consultas a la base de datos
class DatabaseOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.batchOperations = [];
    this.batchTimeout = null;
  }
  
  // Consulta con caché
  async cachedQuery(query, params, ttl = 60000) {
    const cacheKey = `${query}_${JSON.stringify(params)}`;
    
    let result = this.queryCache.get(cacheKey);
    if (result) {
      return result;
    }
    
    result = await db.get(query, params);
    this.queryCache.set(cacheKey, result, ttl);
    
    return result;
  }
  
  // Operaciones por lotes
  batchQuery(query, params) {
    this.batchOperations.push({ query, params });
    
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.executeBatch();
      }, 100); // 100ms de acumulación
    }
  }
  
  async executeBatch() {
    if (this.batchOperations.length === 0) return;
    
    const operations = [...this.batchOperations];
    this.batchOperations = [];
    this.batchTimeout = null;
    
    try {
      await Promise.all(operations.map(op => db.run(op.query, op.params)));
      logger.debug(`Ejecutadas ${operations.length} operaciones en batch`);
    } catch (error) {
      logger.error('Error en operaciones batch:', error);
    }
  }
  
  clearCache() {
    this.queryCache.clear();
  }
}

const dbOptimizer = new DatabaseOptimizer();

// Inicializar tabla al cargar
initializeWaifuLevels();

loadCharacters();

export const command = [
  '.waifus', '.claim', '.mywaifus', '.vender', 
  '.waifuinfo', '.interactuar', '.evolucion', 
  '.batalla', '.estadisticas', '.tienda', '.comprar'
];
export const description = 'Sistema avanzado de colección de personajes de anime con niveles e interacciones.';

/**
 * Función principal que maneja todos los comandos de waifu
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.waifus':
        await listWaifus(sock, m, text);
        break;
      case '.claim':
        await claimWaifu(sock, m, userId, text);
        break;
      case '.mywaifus':
        await showMyWaifus(sock, m, userId);
        break;
      case '.vender':
        await sellWaifu(sock, m, userId, text);
        break;
      case '.waifuinfo':
        await showWaifuInfo(sock, m, text);
        break;
      case '.coleccion':
        await showCollectionStats(sock, m, userId);
        break;
      case '.waifu':
        await showWaifuDetails(sock, m, userId, text);
        break;
      case '.interact':
        await interactWithWaifu(sock, m, userId, text);
        break;
      case '.evolucion':
        await showEvolution(sock, m, userId, text);
        break;
      case '.batalla':
        await waifuBattle(sock, m, userId, text);
        break;
      case '.tienda':
        if (text?.split(' ')[1]?.toLowerCase() === 'waifu') {
          await showWaifuShop(sock, m, userId);
        } else {
          await sock.sendMessage(chatId, {
            text: '🛍️ *TIENDAS DISPONIBLES*\n\n' +
                  '• \`.tienda waifu\` - Tienda de waifus\n\n' +
                  '💡 *Próximamente más tiendas...*'
          }, { quoted: m });
        }
        break;
        
      case '.comprar':
        await buyWaifu(sock, m, userId, text?.split(' ').slice(1).join(' '));
        break;
        
      default:
        await sock.sendMessage(chatId, {
          text: '❌ Comando no reconocido. Usa \`.help waifu\` para ver la ayuda.'
        }, { quoted: m });
    }
  } catch (error) {
    console.error(`❌ Error en el comando ${command}:`, error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error al procesar tu solicitud de waifu. Por favor, intenta nuevamente.'
    }, { quoted: m });
  }
}

/**
 * Lista todos los personajes disponibles con paginación y filtros mejorados
 */
async function listWaifus(sock, m, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  // Parsear página y filtros
  let page = 1;
  let filtro = '';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--page=') || arg.startsWith('-p=')) {
      page = parseInt(arg.split('=')[1]) || 1;
    } else if (!filtro) {
      filtro = arg.toLowerCase();
    }
  }

  // Obtener personajes reclamados
  const claimed = await db.all('SELECT character_id, user_id FROM claimed_characters');
  const claimedIds = claimed.map(c => c.character_id);
  const claimedMap = Object.fromEntries(claimed.map(c => [c.character_id, c.user_id]));

  // Filtrar personajes según argumentos
  let filteredCharacters = characters;
  let filtroTexto = '';

  if (filtro) {
    if (filtro === 'disponibles' || filtro === 'available') {
      filteredCharacters = characters.filter(c => !claimedIds.includes(c.id));
      filtroTexto = ' (Disponibles)';
    } else if (filtro === 'reclamados' || filtro === 'claimed') {
      filteredCharacters = characters.filter(c => claimedIds.includes(c.id));
      filtroTexto = ' (Reclamados)';
    } else {
      // Buscar por nombre o anime
      filteredCharacters = characters.filter(c =>
        c.name.toLowerCase().includes(filtro) ||
        c.anime.toLowerCase().includes(filtro)
      );
      filtroTexto = ` (Búsqueda: "${filtro}")`;
    }
  }

  // Ordenar por precio (más caros primero)
  filteredCharacters.sort((a, b) => b.price - a.price);

  // Sistema de paginación
  const personajesPorPagina = 10;
  const totalPaginas = Math.ceil(filteredCharacters.length / personajesPorPagina);
  page = Math.max(1, Math.min(page, totalPaginas));
  
  const startIndex = (page - 1) * personajesPorPagina;
  const endIndex = startIndex + personajesPorPagina;
  const personajesMostrar = filteredCharacters.slice(startIndex, endIndex);

  let list = `🌟 *LISTA DE PERSONAJES${filtroTexto}* 🌟\n\n`;
  list += `📊 *Página ${page} de ${totalPaginas}* (${filteredCharacters.length} totales)\n\n`;

  for (const char of personajesMostrar) {
    const isClaimed = claimedIds.includes(char.id);
    const status = isClaimed ? `❌ Reclamado` : '✅ Disponible';
    const rareza = getRarezaEmoji(char.price);
    let nivel = 1;
    
    if (isClaimed) {
      const ownerId = claimedMap[char.id];
      nivel = await getWaifuLevel(char.id, ownerId);
    }

    list += `${rareza} *${char.name}*\n`;
    list += `📺 ${char.anime}\n`;
    list += `💎 ${char.price.toLocaleString()} puntos\n`;
    list += `⭐ Nivel ${nivel}\n`;
    list += `📋 ${status}\n\n`;
  }

  list += `💡 *Comandos disponibles:*\n`;
  list += `• \`.waifus\` - Ver todos\n`;
  list += `• \`.waifus disponibles\` - Solo disponibles\n`;
  list += `• \`.waifus <nombre/anime>\` - Buscar\n`;
  list += `• \`.waifus --page=2\` - Cambiar página\n`;
  list += `• \`.claim <nombre>\` - Reclamar\n`;
  list += `• \`.waifuinfo <nombre>\` - Info detallada\n`;

  // Navegación de páginas
  if (totalPaginas > 1) {
    list += `\n📄 *Navegación:* \n`;
    if (page > 1) list += `• \`.waifus --page=${page - 1}\` ← Anterior\n`;
    if (page < totalPaginas) list += `• \`.waifus --page=${page + 1}\` Siguiente →\n`;
  }

  await sock.sendMessage(chatId, { text: list, mentions: Object.values(claimedMap) }, { quoted: m });
}

/**
 * Reclama un personaje con mejor validación y feedback
 */
async function claimWaifu(sock, m, userId, characterName) {
  const chatId = m.key.remoteJid;

  if (!characterName || characterName.trim().length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre del personaje que quieres reclamar.\n\n' +
            '💡 *Ejemplos:*\n' +
            '• `.claim Hinata Hyuga`\n' +
            '• `.claim Naruto Uzumaki`\n\n' +
            'Usa `.waifus` para ver personajes disponibles.'
    }, { quoted: m });
  }

  // Buscar personaje (búsqueda flexible)
  const character = characters.find(c =>
    c.name.toLowerCase().includes(characterName.toLowerCase()) ||
    characterName.toLowerCase().includes(c.name.toLowerCase())
  );

  if (!character) {
    // Sugerir personajes similares
    const sugerencias = characters
      .filter(c => c.name.toLowerCase().includes(characterName.toLowerCase().split(' ')[0]))
      .slice(0, 3);

    let mensajeError = `❌ El personaje "${characterName}" no existe en la lista.\n\n`;

    if (sugerencias.length > 0) {
      mensajeError += `💡 *Sugerencias:*\n`;
      sugerencias.forEach(c => {
        mensajeError += `• ${c.name} (${c.anime})\n`;
      });
    }

    mensajeError += `\nUsa \`.waifus\` para ver todos los personajes disponibles.`;
    return await sock.sendMessage(chatId, { text: mensajeError }, { quoted: m });
  }

  // Verificar si ya está reclamado
  const isClaimed = await db.get('SELECT * FROM claimed_characters WHERE character_id = ?', [character.id]);
  if (isClaimed) {
    const ownerId = isClaimed.user_id;
    return await sock.sendMessage(chatId, {
      text: `❌ Lo siento, *${character.name}* ya ha sido reclamada por @${ownerId.split('@')[0]}.\n\n` +
            `💡 Usa \`.waifus disponibles\` para ver personajes libres.`,
      mentions: [ownerId]
    }, { quoted: m });
  }

  // Verificar saldo del usuario
  let user = await db.get('SELECT saldo FROM usuarios WHERE chatId = ?', [userId]);
  if (!user) {
    await db.run('INSERT INTO usuarios (chatId, saldo) VALUES (?, ?)', [userId, 100]);
    user = { saldo: 100 };
  }

  if (user.saldo < character.price) {
    const faltante = character.price - user.saldo;
    return await sock.sendMessage(chatId, {
      text: `❌ No tienes suficientes 💎 para reclamar a *${character.name}*.\n\n` +
            `💰 *Necesitas:* ${character.price.toLocaleString()} puntos\n` +
            `💵 *Tienes:* ${user.saldo.toLocaleString()} puntos\n` +
            `⚠️ *Faltan:* ${faltante.toLocaleString()} puntos\n\n` +
            `💡 Gana puntos jugando (.juegos) o apostando (.apostar).`
    }, { quoted: m });
  }

  // Realizar la transacción
  const newBalance = user.saldo - character.price;
  await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
  await db.run('INSERT INTO claimed_characters (character_id, user_id) VALUES (?, ?)', [character.id, userId]);

  // Mensaje de éxito con imagen
  const rareza = getRarezaEmoji(character.price);
  const caption = `🎉 *¡WAIFU RECLAMADA!* 🎉\n\n` +
                  `${rareza} *${character.name}*\n` +
                  `📺 *Anime:* ${character.anime}\n` +
                  `💎 *Pagaste:* ${character.price.toLocaleString()} puntos\n` +
                  `💵 *Saldo restante:* ${newBalance.toLocaleString()} puntos\n\n` +
                  `💖 ¡Disfruta de tu nueva waifu, @${userId.split('@')[0]}!`;

  try {
    await sock.sendMessage(chatId, {
      image: { url: character.image_url },
      caption: caption,
      mentions: [userId]
    }, { quoted: m });
  } catch (imageError) {
    // Si falla la imagen, enviar solo texto
    console.error('Error al enviar imagen:', imageError);
    await sock.sendMessage(chatId, { text: caption, mentions: [userId] }, { quoted: m });
  }
}

/**
 * Muestra los personajes del usuario con estadísticas
 */
async function showMyWaifus(sock, m, userId) {
  const chatId = m.key.remoteJid;

  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);

  if (claimed.length === 0) {
    return await sock.sendMessage(chatId, {
      text: '😔 Aún no has reclamado ningún personaje.\n\n' +
            '💡 *Cómo empezar:*\n' +
            '1. Usa `.waifus` para ver personajes disponibles\n' +
            '2. Usa `.claim <nombre>` para reclamar uno\n' +
            '3. ¡Gana puntos jugando para poder comprar!'
    }, { quoted: m });
  }

  const claimedIds = claimed.map(c => c.character_id);
  const myCharacters = characters.filter(c => claimedIds.includes(c.id));

  // Ordenar por precio (más valiosos primero)
  myCharacters.sort((a, b) => b.price - a.price);

  let totalValue = 0;
  let list = `💖 *TU COLECCIÓN DE WAIFUS* 💖\n\n`;
  list += `👤 *@${userId.split('@')[0]}*\n`;
  list += `📊 *Total de waifus:* ${myCharacters.length}\n\n`;

  for (const char of myCharacters) {
    const rareza = getRarezaEmoji(char.price);
    list += `${rareza} *${char.name}*\n`;
    list += `   📺 ${char.anime}\n`;
    list += `   💎 ${char.price.toLocaleString()} puntos\n\n`;
    totalValue += char.price;
  }

  list += `💰 *Valor total de colección:* ${totalValue.toLocaleString()} 💎\n\n`;
  list += `💡 *Comandos útiles:*\n`;
  list += `• \`.vender <nombre>\` - Vender waifu\n`;
  list += `• \`.waifuinfo <nombre>\` - Ver detalles\n`;
  list += `• \`.coleccion\` - Estadísticas completas`;

  await sock.sendMessage(chatId, { text: list, mentions: [userId] }, { quoted: m });
}

/**
 * Vende un personaje por la mitad de su valor
 */
async function sellWaifu(sock, m, userId, characterName) {
  const chatId = m.key.remoteJid;

  if (!characterName || characterName.trim().length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre del personaje que quieres vender.\n\n' +
            '💡 *Ejemplo:* `.vender Hinata Hyuga`\n\n' +
            'Usa `.mywaifus` para ver tus personajes.'
    }, { quoted: m });
  }

  // Buscar personaje en la colección del usuario
  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
  const claimedIds = claimed.map(c => c.character_id);

  const character = characters.find(c =>
    claimedIds.includes(c.id) &&
    c.name.toLowerCase().includes(characterName.toLowerCase())
  );

  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No tienes a *${characterName}* en tu colección.\n\n` +
            'Usa `.mywaifus` para ver tus personajes disponibles para venta.'
    }, { quoted: m });
  }

  // Calcular precio de venta (50% del valor original)
  const precioVenta = Math.floor(character.price * 0.5);

  // Actualizar saldo y remover personaje
  let user = await db.get('SELECT saldo FROM usuarios WHERE chatId = ?', [userId]);
  const newBalance = (user?.saldo || 0) + precioVenta;

  await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
  await db.run('DELETE FROM claimed_characters WHERE character_id = ? AND user_id = ?', [character.id, userId]);

  const rareza = getRarezaEmoji(character.price);
  await sock.sendMessage(chatId, {
    text: `💸 *WAIFU VENDIDA* 💸\n\n` +
          `${rareza} *${character.name}* (${character.anime})\n` +
          `💰 *Valor de venta:* ${precioVenta.toLocaleString()} puntos\n` +
          `💵 *Nuevo saldo:* ${newBalance.toLocaleString()} puntos\n\n` +
          `😢 ¡Adiós ${character.name}!`
  }, { quoted: m });
}

/**
 * Muestra información detallada de un personaje
 */
async function showWaifuInfo(sock, m, characterName) {
  const chatId = m.key.remoteJid;

  if (!characterName || characterName.trim().length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre del personaje.\n\n' +
            '💡 *Ejemplo:* `.waifuinfo Hinata Hyuga`'
    }, { quoted: m });
  }

  const character = characters.find(c =>
    c.name.toLowerCase().includes(characterName.toLowerCase())
  );

  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No se encontró información sobre "${characterName}".\n\n` +
            'Usa `.waifus` para ver personajes disponibles.'
    }, { quoted: m });
  }

  // Verificar si está reclamado
  const isClaimed = await db.get('SELECT user_id FROM claimed_characters WHERE character_id = ?', [character.id]);

  const rareza = getRarezaEmoji(character.price);
  const rarezaTexto = getRarezaTexto(character.price);

  let info = `📋 *INFORMACIÓN DEL PERSONAJE* 📋\n\n`;
  info += `${rareza} *${character.name}*\n`;
  info += `📺 *Anime:* ${character.anime}\n`;
  info += `💎 *Valor:* ${character.price.toLocaleString()} puntos\n`;
  info += `⭐ *Rareza:* ${rarezaTexto}\n`;
  info += `📊 *Estado:* ${isClaimed ? '❌ Reclamado' : '✅ Disponible'}\n`;

  if (isClaimed) {
    info += `👤 *Dueño:* @${isClaimed.user_id.split('@')[0]}\n`;
  }

  info += `\n💡 *Comandos relacionados:*\n`;
  if (!isClaimed) {
    info += `• \`.claim ${character.name}\` - Reclamar\n`;
  }
  info += `• \`.waifus ${character.anime}\` - Más de este anime`;

  try {
    await sock.sendMessage(chatId, {
      image: { url: character.image_url },
      caption: info,
      mentions: isClaimed ? [isClaimed.user_id] : []
    }, { quoted: m });
  } catch (imageError) {
    // Si falla la imagen, enviar solo texto
    console.error('Error al enviar imagen:', imageError);
    await sock.sendMessage(chatId, { text: info, mentions: isClaimed ? [isClaimed.user_id] : [] }, { quoted: m });
  }
}

/**
 * Muestra estadísticas completas de la colección
 */
async function showCollectionStats(sock, m, userId) {
  const chatId = m.key.remoteJid;

  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);

  if (claimed.length === 0) {
    return await sock.sendMessage(chatId, {
      text: '📊 *ESTADÍSTICAS DE COLECCIÓN* 📊\n\n' +
            '😔 Aún no has reclamado ningún personaje.\n\n' +
            '💡 ¡Comienza tu colección con `.waifus`!'
    }, { quoted: m });
  }

  const claimedIds = claimed.map(c => c.character_id);
  const myCharacters = characters.filter(c => claimedIds.includes(c.id));

  // Calcular estadísticas
  const totalValue = myCharacters.reduce((sum, c) => sum + c.price, 0);
  const avgValue = Math.floor(totalValue / myCharacters.length);

  // Contar por rareza
  const rarezas = {
    comun: myCharacters.filter(c => c.price < 5000).length,
    raro: myCharacters.filter(c => c.price >= 5000 && c.price < 15000).length,
    epico: myCharacters.filter(c => c.price >= 15000 && c.price < 30000).length,
    legendario: myCharacters.filter(c => c.price >= 30000).length
  };

  // Top 3 personajes más valiosos
  const top3 = myCharacters.sort((a, b) => b.price - a.price).slice(0, 3);

  let stats = `📊 *ESTADÍSTICAS DE COLECCIÓN* 📊\n\n`;
  stats += `👤 *@${userId.split('@')[0]}*\n\n`;

  stats += `📈 *RESUMEN GENERAL*\n`;
  stats += `• Total de waifus: ${myCharacters.length}\n`;
  stats += `• Valor total: ${totalValue.toLocaleString()} 💎\n`;
  stats += `• Valor promedio: ${avgValue.toLocaleString()} 💎\n\n`;

  stats += `⭐ *DISTRIBUCIÓN POR RAREZA*\n`;
  stats += `• Común: ${rarezas.comun} waifus\n`;
  stats += `• Raro: ${rarezas.raro} waifus\n`;
  stats += `• Épico: ${rarezas.epico} waifus\n`;
  stats += `• Legendario: ${rarezas.legendario} waifus\n\n`;

  if (top3.length > 0) {
    stats += `🏆 *TOP 3 WAIFUS MÁS VALIOSAS*\n`;
    top3.forEach((char, index) => {
      const emoji = ['🥇', '🥈', '🥉'][index];
      const rareza = getRarezaEmoji(char.price);
      stats += `${emoji} ${rareza} ${char.name} (${char.price.toLocaleString()} 💎)\n`;
    });
  }

  await sock.sendMessage(chatId, { text: stats, mentions: [userId] }, { quoted: m });
}

/**
 * Función auxiliar para obtener emoji de rareza según precio (Sistema mejorado)
 */
function getRarezaEmoji(price) {
  if (price >= 100000) return '👑'; // Mítico
  if (price >= 50000) return '💠'; // Legendario
  if (price >= 30000) return '💎'; // Épico Legendario
  if (price >= 20000) return '🔥'; // Épico
  if (price >= 15000) return '⚡'; // Super Raro
  if (price >= 10000) return '🌟'; // Raro
  if (price >= 5000) return '✨';  // Poco Común
  if (price >= 2000) return '🟢';  // Común Plus
  return '⚪'; // Común
}

/**
 * Función auxiliar para obtener texto de rareza (Sistema mejorado)
 */
function getRarezaTexto(price) {
  if (price >= 100000) return 'Mítico';
  if (price >= 50000) return 'Legendario';
  if (price >= 30000) return 'Épico Legendario';
  if (price >= 20000) return 'Épico';
  if (price >= 15000) return 'Super Raro';
  if (price >= 10000) return 'Raro';
  if (price >= 5000) return 'Poco Común';
  if (price >= 2000) return 'Común Plus';
  return 'Común';
}

/**
 * Función auxiliar para obtener color de rareza para mensajes
 */
function getRarezaColor(price) {
  if (price >= 100000) return '#FFD700'; // Dorado (Mítico)
  if (price >= 50000) return '#9400D3'; // Violeta (Legendario)
  if (price >= 30000) return '#FF1493'; // Rosa intenso (Épico Legendario)
  if (price >= 20000) return '#FF4500'; // Naranja rojizo (Épico)
  if (price >= 15000) return '#4169E1'; // Azul real (Super Raro)
  if (price >= 10000) return '#32CD32'; // Verde lima (Raro)
  if (price >= 5000) return '#87CEEB';  // Azul cielo (Poco Común)
  if (price >= 2000) return '#90EE90';  // Verde claro (Común Plus)
  return '#808080'; // Gris (Común)
}

/**
 * Muestra detalles detallados de una waifu específica del usuario
 */
async function showWaifuDetails(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de tu waifu.\n\n' +
            '💡 *Ejemplo:* `.waifu Hinata Hyuga`\n' +
            'Usa `.mywaifus` para ver tus waifus.'
    }, { quoted: m });
  }
  
  const characterName = args.join(' ');
  
  // Buscar si el usuario tiene esta waifu
  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
  const claimedIds = claimed.map(c => c.character_id);
  
  const character = characters.find(c => 
    claimedIds.includes(c.id) &&
    c.name.toLowerCase().includes(characterName.toLowerCase())
  );
  
  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No tienes a *${characterName}* en tu colección.\n\n` +
            'Usa `.mywaifus` para ver tus waifus disponibles.'
    }, { quoted: m });
  }
  
  const level = await getWaifuLevel(character.id, userId);
  const expProgress = await getExpProgress(character.id, userId);
  const waifuStats = await getWaifuStats(character.id, userId);
  
  const rareza = getRarezaEmoji(character.price);
  const rarezaTexto = getRarezaTexto(character.price);
  
  let details = `💖 *DETALLES DE WAIFU* 💖\n\n`;
  details += `${rareza} *${character.name}*\n`;
  details += `📺 *Anime:* ${character.anime}\n`;
  details += `💎 *Valor:* ${character.price.toLocaleString()} puntos\n`;
  details += `⭐ *Rareza:* ${rarezaTexto}\n`;
  details += `📊 *Nivel:* ${level}\n`;
  details += `✨ *Experiencia:* ${expProgress.current}/${expProgress.needed} (${expProgress.progress}%)\n`;
  details += `❤️ *Afecto:* ${waifuStats.affection}/100\n`;
  details += `🍖 *Hambre:* ${waifuStats.hunger}/100\n`;
  details += `😊 *Felicidad:* ${waifuStats.happiness}/100\n\n`;
  
  details += `💡 *Comandos de interacción:*\n`;
  details += `• \`.interact ${character.name} afectar\` - Aumentar afecto\n`;
  details += `• \`.interact ${character.name} alimentar\` - Alimentar\n`;
  details += `• \`.interact ${character.name} jugar\` - Jugar\n`;
  details += `• \`.evolucion ${character.name}\` - Ver evolución\n`;
  
  try {
    await sock.sendMessage(chatId, {
      image: { url: character.image_url[0] },
      caption: details,
      mentions: [userId]
    }, { quoted: m });
  } catch (imageError) {
    console.error('Error al enviar imagen:', imageError);
    await sock.sendMessage(chatId, { text: details, mentions: [userId] }, { quoted: m });
  }
}

/**
 * Sistema de interacción con waifus
 */
async function interactWithWaifu(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto del comando.\n\n' +
            '💡 *Formato:* `.interact <nombre> <acción>\n' +
            '*Acciones disponibles:* afectar, alimentar, jugar\n\n' +
            '*Ejemplos:*\n' +
            '• `.interact Hinata Hyuga afectar`\n' +
            '• `.interact Asuna Yuuki alimentar`\n' +
            '• `.interact Mikasa Ackerman jugar`'
    }, { quoted: m });
  }
  
  const characterName = args.slice(0, -1).join(' ');
  const action = args[args.length - 1].toLowerCase();
  
  // Validar acción
  const validActions = ['afectar', 'alimentar', 'jugar'];
  if (!validActions.includes(action)) {
    return await sock.sendMessage(chatId, {
      text: `❌ Acción "${action}" no válida.\n\n` +
            '*Acciones disponibles:* ' + validActions.join(', ')
    }, { quoted: m });
  }
  
  // Verificar si el usuario tiene esta waifu
  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
  const claimedIds = claimed.map(c => c.character_id);
  
  const character = characters.find(c => 
    claimedIds.includes(c.id) &&
    c.name.toLowerCase().includes(characterName.toLowerCase())
  );
  
  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No tienes a *${characterName}* en tu colección.\n\n` +
            'Usa `.mywaifus` para ver tus waifus.'
    }, { quoted: m });
  }
  
  // Ejecutar la interacción
  const result = await performInteraction(character.id, userId, action);
  
  if (!result.success) {
    return await sock.sendMessage(chatId, {
      text: `❌ ${result.message}`
    }, { quoted: m });
  }
  
  const rareza = getRarezaEmoji(character.price);
  let response = `${rareza} *${character.name}* - ${action.charAt(0).toUpperCase() + action.slice(1)}\n\n`;
  response += result.message;
  
  if (result.expGained > 0) {
    response += `\n✨ *+${result.expGained} EXP ganados*`;
  }
  
  if (result.leveledUp) {
    response += `\n🎉 *¡${character.name} ha subido al nivel ${result.newLevel}!*`;
  }
  
  try {
    await sock.sendMessage(chatId, {
      image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
      caption: response,
      mentions: [userId]
    }, { quoted: m });
  } catch (imageError) {
    console.error('Error al enviar imagen:', imageError);
    await sock.sendMessage(chatId, { text: response, mentions: [userId] }, { quoted: m });
  }
}

/**
 * Ejecuta una interacción específica con una waifu
 */
async function performInteraction(characterId, userId, action) {
  const now = Date.now();
  const cooldown = 30 * 60 * 1000; // 30 minutos de cooldown
  
  // Verificar cooldown
  const lastInteraction = await db.get(
    'SELECT last_interaction FROM waifu_levels WHERE character_id = ? AND user_id = ?',
    [characterId, userId]
  );
  
  if (lastInteraction && (now - new Date(lastInteraction.last_interaction).getTime()) < cooldown) {
    const remaining = Math.ceil((cooldown - (now - new Date(lastInteraction.last_interaction).getTime())) / 60000);
    return {
      success: false,
      message: `⏰ Debes esperar ${remaining} minutos antes de volver a interactuar.`
    };
  }
  
  let expGained = 0;
  let message = '';
  let updates = {};
  
  const bonus = getRarezaBonus((characters.find(c => c.id === characterId) || {}).price || 1000);
  
  switch (action) {
    case 'afectar':
      expGained = Math.floor(15 * bonus);
      updates.affection = 'affection + 5';
      updates.happiness = 'happiness + 3';
      message = '❤️ Le has mostrado afecto a tu waifu.\n💕 Afecto +5, Felicidad +3';
      break;
      
    case 'alimentar':
      expGained = Math.floor(20 * bonus);
      updates.hunger = 'hunger + 20';
      updates.happiness = 'happiness + 2';
      message = '🍖 Has alimentado a tu waifu.\n🍕 Hambre +20, Felicidad +2';
      break;
      
    case 'jugar':
      expGained = Math.floor(25 * bonus);
      updates.happiness = 'happiness + 5';
      updates.affection = 'affection + 2';
      updates.hunger = 'hunger - 5';
      message = '🎮 Has jugado con tu waifu.\n😊 Felicidad +5, Afecto +2, Hambre -5';
      break;
  }
  
  // Actualizar estadísticas y experiencia
  const setClause = Object.keys(updates).map(key => `${key} = ${updates[key]}`).join(', ');
  
  await db.run(`
    UPDATE waifu_levels 
    SET ${setClause}, last_interaction = CURRENT_TIMESTAMP 
    WHERE character_id = ? AND user_id = ?
  `, [characterId, userId]);
  
  const expResult = await addWaifuExp(characterId, userId, expGained);
  
  return {
    success: true,
    message,
    expGained,
    leveledUp: expResult.leveledUp,
    newLevel: expResult.level
  };
}

/**
 * Obtiene las estadísticas actuales de una waifu
 */
async function getWaifuStats(characterId, userId) {
  const stats = await db.get(
    'SELECT affection, hunger, happiness FROM waifu_levels WHERE character_id = ? AND user_id = ?',
    [characterId, userId]
  );
  
  return stats || {
    affection: 0,
    hunger: 100,
    happiness: 100
  };
}

/**
 * Muestra información de evolución de una waifu
 */
async function showEvolution(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de tu waifu.\n\n' +
            '💡 *Ejemplo:* `.evolucion Hinata Hyuga`'
    }, { quoted: m });
  }
  
  const characterName = args.join(' ');
  
  // Verificar si el usuario tiene esta waifu
  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
  const claimedIds = claimed.map(c => c.character_id);
  
  const character = characters.find(c => 
    claimedIds.includes(c.id) &&
    c.name.toLowerCase().includes(characterName.toLowerCase())
  );
  
  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No tienes a *${characterName}* en tu colección.`
    }, { quoted: m });
  }
  
  const level = await getWaifuLevel(character.id, userId);
  const expProgress = await getExpProgress(character.id, userId);
  const stats = await getWaifuStats(character.id, userId);
  
  const rareza = getRarezaEmoji(character.price);
  
  let evolution = `🌟 *Evolución de ${character.name}* 🌟\n\n`;
  evolution += `${rareza} *Nivel Actual:* ${level}\n`;
  evolution += `✨ *Experiencia:* ${expProgress.current}/${expProgress.needed} (${expProgress.progress}%)\n\n`;
  
  // Progreso de experiencia visual
  const progressBar = '█'.repeat(Math.floor(expProgress.progress / 5)) + '░'.repeat(20 - Math.floor(expProgress.progress / 5));
  evolution += `📊 *Progreso:* [${progressBar}] ${expProgress.progress}%\n\n`;
  
  evolution += `📈 *Estadísticas Actuales:*\n`;
  evolution += `❤️ *Afecto:* ${stats.affection}/100\n`;
  evolution += `🍖 *Hambre:* ${stats.hunger}/100\n`;
  evolution += `😊 *Felicidad:* ${stats.happiness}/100\n\n`;
  
  // Próximos niveles
  evolution += `🔮 *Próximos Niveles:*\n`;
  for (let i = 1; i <= 3; i++) {
    const nextLevel = level + i;
    if (nextLevel <= 100) {
      const neededExp = getExpForNextLevel(nextLevel - 1);
      evolution += `• Nivel ${nextLevel}: ${neededExp.toLocaleString()} EXP total\n`;
    }
  }
  
  await sock.sendMessage(chatId, { text: evolution, mentions: [userId] }, { quoted: m });
}

/**
 * Función auxiliar para obtener bonus de rareza
 */
function getRarezaBonus(price) {
  if (price >= 100000) return 5.0; // Mítico: 500% bonus
  if (price >= 50000) return 3.0; // Legendario: 300% bonus
  if (price >= 30000) return 2.5; // Épico Legendario: 250% bonus
  if (price >= 20000) return 2.0; // Épico: 200% bonus
  if (price >= 15000) return 1.5; // Super Raro: 150% bonus
  if (price >= 10000) return 1.3; // Raro: 130% bonus
  if (price >= 5000) return 1.1;  // Poco Común: 110% bonus
  return 1.0; // Común: 100% (sin bonus)
}
  
/**
 * Sistema de combate entre waifus
 */
async function waifuBattle(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto del comando.\n\n' +
            '💡 *Formato:* `.batalla <mi_waifu> <oponente>\n' +
            '*Ejemplo:* `.batalla Hinata Hyuga @usuario Mikasa Ackerman`\n\n' +
            '⚔️ Desafía a otro usuario a un combate de waifus'
    }, { quoted: m });
  }
  
  // Parsear argumentos (puede incluir mención)
  const opponentMention = args.find(arg => arg.startsWith('@'));
  const opponentId = opponentMention ? `${opponentMention.slice(1)}@s.whatsapp.net` : null;
  
  if (!opponentId || opponentId === userId) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes mencionar a otro usuario para desafiarlo.\n\n' +
            '*Ejemplo:* `.batalla Hinata Hyuga @usuario Mikasa Ackerman`'
    }, { quoted: m });
  }
  
  // Extraer nombres de waifus
  const myWaifuName = args.slice(0, args.indexOf(opponentMention)).join(' ');
  const opponentWaifuName = args.slice(args.indexOf(opponentMention) + 1).join(' ');
  
  if (!myWaifuName || !opponentWaifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar los nombres de ambas waifus.\n\n' +
            '*Formato:* `.batalla <mi_waifu> @oponente <waifu_oponente>`'
    }, { quoted: m });
  }
  
  // Verificar que ambos usuarios tienen las waifus
  const myWaifu = await validateUserWaifu(userId, myWaifuName);
  const opponentWaifu = await validateUserWaifu(opponentId, opponentWaifuName);
  
  if (!myWaifu.success) {
    return await sock.sendMessage(chatId, { text: `❌ ${myWaifu.message}` }, { quoted: m });
  }
  
  if (!opponentWaifu.success) {
    return await sock.sendMessage(chatId, { text: `❌ ${opponentWaifu.message}` }, { quoted: m });
  }
  
  // Verificar cooldown de combate
  const battleCooldown = await checkBattleCooldown(userId);
  if (!battleCooldown.canBattle) {
    return await sock.sendMessage(chatId, {
      text: `⏰ Debes esperar ${battleCooldown.remainingMinutes} minutos antes de volver a combatir.`
    }, { quoted: m });
  }
  
  // Ejecutar combate
  const battleResult = await executeBattle(myWaifu.character, opponentWaifu.character, userId, opponentId);
  
  // Mostrar resultado del combate
  await displayBattleResult(sock, chatId, m, battleResult, userId, opponentId);
}

/**
 * Valida que un usuario tenga una waifu específica
 */
async function validateUserWaifu(userId, waifuName) {
  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
  const claimedIds = claimed.map(c => c.character_id);
  
  const character = characters.find(c => 
    claimedIds.includes(c.id) &&
    c.name.toLowerCase().includes(waifuName.toLowerCase())
  );
  
  if (!character) {
    return {
      success: false,
      message: `No tienes la waifu "${waifuName}" en tu colección.`
    };
  }
  
  return {
    success: true,
    character
  };
}

/**
 * Verifica el cooldown de combate
 */
async function checkBattleCooldown(userId) {
  const cooldown = 60 * 60 * 1000; // 1 hora de cooldown
  const lastBattle = await db.get(
    'SELECT last_battle FROM user_battle_stats WHERE user_id = ?',
    [userId]
  );
  
  if (lastBattle) {
    const timeSince = Date.now() - new Date(lastBattle.last_battle).getTime();
    if (timeSince < cooldown) {
      const remaining = Math.ceil((cooldown - timeSince) / 60000);
      return {
        canBattle: false,
        remainingMinutes: remaining
      };
    }
  }
  
  return { canBattle: true };
}

/**
 * Ejecuta un combate entre dos waifus
 */
async function executeBattle(waifu1, waifu2, userId1, userId2) {
  // Obtener estadísticas de combate
  const stats1 = await getBattleStats(waifu1.id, userId1);
  const stats2 = await getBattleStats(waifu2.id, userId2);
  
  // Calcular poder de combate
  const power1 = calculateBattlePower(waifu1, stats1);
  const power2 = calculateBattlePower(waifu2, stats2);
  
  // Simulación de combate con elementos aleatorios
  const rounds = [];
  let hp1 = 100;
  let hp2 = 100;
  let currentRound = 1;
  
  while (hp1 > 0 && hp2 > 0 && currentRound <= 10) {
    const damage1 = Math.max(5, Math.floor(power1 * (0.8 + Math.random() * 0.4) - (stats2.defense * 0.1)));
    const damage2 = Math.max(5, Math.floor(power2 * (0.8 + Math.random() * 0.4) - (stats1.defense * 0.1)));
    
    hp2 -= damage1;
    hp1 -= damage2;
    
    rounds.push({
      round: currentRound,
      attacker1: damage1,
      attacker2: damage2,
      hp1: Math.max(0, hp1),
      hp2: Math.max(0, hp2)
    });
    
    currentRound++;
  }
  
  // Determinar ganador
  const winner = hp1 > hp2 ? 1 : (hp2 > hp1 ? 2 : 0); // 0 = empate
  
  // Actualizar estadísticas y dar recompensas
  const expReward1 = winner === 1 ? 50 : (winner === 0 ? 25 : 10);
  const expReward2 = winner === 2 ? 50 : (winner === 0 ? 25 : 10);
  
  await addWaifuExp(waifu1.id, userId1, expReward1);
  await addWaifuExp(waifu2.id, userId2, expReward2);
  
  // Actualizar cooldown
  await db.run(`
    INSERT OR REPLACE INTO user_battle_stats (user_id, last_battle, battles_won, battles_lost, battles_total)
    VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)
  `, [
    userId1,
    winner === 1 ? 1 : 0,
    winner === 1 ? 0 : 1,
    1
  ]);
  
  await db.run(`
    INSERT OR REPLACE INTO user_battle_stats (user_id, last_battle, battles_won, battles_lost, battles_total)
    VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)
  `, [
    userId2,
    winner === 2 ? 1 : 0,
    winner === 2 ? 0 : 1,
    1
  ]);
  
  return {
    waifu1,
    waifu2,
    userId1,
    userId2,
    rounds,
    winner,
    finalHp1: Math.max(0, hp1),
    finalHp2: Math.max(0, hp2),
    expReward1,
    expReward2
  };
}

/**
 * Obtiene estadísticas de combate de una waifu
 */
async function getBattleStats(characterId, userId) {
  const level = await getWaifuLevel(characterId, userId);
  const stats = await getWaifuStats(characterId, userId);
  
  return {
    level,
    attack: Math.floor(10 + level * 2 + stats.affection * 0.1),
    defense: Math.floor(5 + level * 1.5 + stats.happiness * 0.05),
    speed: Math.floor(8 + level * 1.2 + (100 - stats.hunger) * 0.05),
    hp: 100 + level * 5
  };
}

/**
 * Calcula el poder de combate total
 */
function calculateBattlePower(waifu, stats) {
  const rarityBonus = getRarezaBonus(waifu.price);
  const basePower = (stats.attack * 2) + stats.defense + (stats.speed * 0.5);
  return Math.floor(basePower * rarityBonus);
}

/**
 * Muestra el resultado del combate
 */
async function displayBattleResult(sock, chatId, m, result, userId1, userId2) {
  const { waifu1, waifu2, rounds, winner, finalHp1, finalHp2, expReward1, expReward2 } = result;
  
  let battleReport = `⚔️ *BATALLA DE WAIFUS* ⚔️\n\n`;
  battleReport += `${getRarezaEmoji(waifu1.price)} *${waifu1.name}* vs ${getRarezaEmoji(waifu2.price)} *${waifu2.name}*\n\n`;
  
  // Resumen de rondas
  battleReport += `📜 *Resumen del Combate:*\n`;
  rounds.forEach((round, index) => {
    if (index < 3 || index === rounds.length - 1) { // Mostrar primeras 3 y última ronda
      battleReport += `Ronda ${round.round}: ${waifu1.name} (-${round.attacker1}) HP: ${round.hp1} | ${waifu2.name} (-${round.attacker2}) HP: ${round.hp2}\n`;
    } else if (index === 3 && rounds.length > 4) {
      battleReport += `...\n`;
    }
  });
  
  battleReport += `\n🏆 *Resultado Final:*\n`;
  
  if (winner === 1) {
    battleReport += `🎉 *${waifu1.name} (@${userId1.split('@')[0]}) ha ganado!*\n`;
    battleReport += `💀 ${waifu2.name} ha sido derrotada\n`;
  } else if (winner === 2) {
    battleReport += `🎉 *${waifu2.name} (@${userId2.split('@')[0]}) ha ganado!*\n`;
    battleReport += `💀 ${waifu1.name} ha sido derrotada\n`;
  } else {
    battleReport += `🤝 *¡EMPATE!* Ambas waifus han caído\n`;
  }
  
  battleReport += `\n💰 *Recompensas:*\n`;
  battleReport += `${waifu1.name}: +${expReward1} EXP\n`;
  battleReport += `${waifu2.name}: +${expReward2} EXP\n`;
  
  battleReport += `\n⚠️ *Cooldown:* 1 hora hasta el próximo combate`;
  
  await sock.sendMessage(chatId, {
    text: battleReport,
    mentions: [userId1, userId2]
  }, { quoted: m });
}

