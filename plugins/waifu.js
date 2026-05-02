/**
 * @file Plugin Waifu Clean - Sistema básico y funcional
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema esencial de waifus con funciones básicas
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Variables globales
let characters = [];
let charactersCache = new Map();
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Configuración básica
const CONFIG = {
  enableLogging: true,
  maxLevel: 100,
  basePrice: 100,
  maxDailyPurchases: 10
};

// Sistema de logging
const logger = {
  info: (message) => CONFIG.enableLogging && console.log(`[WAIFU] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[WAIFU] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[WAIFU] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[WAIFU] ❌ ${message}`)
};

// Cargar personajes desde el archivo JSON
async function loadCharacters() {
  try {
    const data = await fs.readFile('./characters.json', 'utf8');
    characters = JSON.parse(data);
    updateCharactersCache();
    lastCacheUpdate = Date.now();
    logger.success(`${characters.length} personajes cargados correctamente`);
  } catch (error) {
    logger.error('Error al cargar characters.json:', error);
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

// Funciones de rareza
function getRarezaEmoji(price) {
  if (price >= 100000) return '👑';
  if (price >= 50000) return '💠';
  if (price >= 30000) return '💎';
  if (price >= 20000) return '🔥';
  if (price >= 15000) return '⚡';
  if (price >= 10000) return '🌟';
  if (price >= 5000) return '✨';
  if (price >= 2000) return '🟢';
  return '⚪';
}

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

// Funciones de usuario
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
    logger.error('Error al obtener saldo:', error);
    return { saldo: 0, banco: 0, total: 0 };
  }
}

async function updateUserBalance(userId, newBalance) {
  try {
    await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
    return true;
  } catch (error) {
    logger.error('Error al actualizar saldo:', error);
    return false;
  }
}

async function getUserWaifus(userId) {
  try {
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    return characters.filter(c => claimedIds.includes(c.id));
  } catch (error) {
    logger.error('Error al obtener waifus de usuario:', error);
    return [];
  }
}

async function validateUserWaifu(userId, waifuName) {
  try {
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) && 
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    return character;
  } catch (error) {
    logger.error('Error al validar waifu de usuario:', error);
    return null;
  }
}

// Funciones principales
export const command = ['.waifus', '.claim', '.mywaifus', '.waifuinfo', '.vender', '.coleccion'];
export const alias = ['.personajes', '.reclamar', '.miswaifus', '.info', '.venderwaifu', '.colección'];
export const description = 'Sistema básico de colección de waifus';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.waifus':
        await showWaifus(sock, m, text);
        break;
      case '.claim':
        await claimWaifu(sock, m, text);
        break;
      case '.mywaifus':
        await showMyWaifus(sock, m);
        break;
      case '.waifuinfo':
        await showWaifuInfo(sock, m, text);
        break;
      case '.vender':
        await sellWaifu(sock, m, text);
        break;
      case '.coleccion':
        await showCollection(sock, m);
        break;
      default:
        await showHelp(sock, m);
    }
  } catch (error) {
    logger.error('Error en el sistema waifu:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de waifus. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

async function showWaifus(sock, m, text) {
  const chatId = m.key.remoteJid;
  
  try {
    let page = 1;
    const args = text.split(' ');
    
    // Parsear página si se especifica
    if (args.includes('--page=')) {
      const pageArg = args.find(arg => arg.startsWith('--page='));
      page = parseInt(pageArg.split('=')[1]) || 1;
    }
    
    const itemsPerPage = 10;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(characters.length / itemsPerPage);
    
    const paginatedCharacters = characters.slice(startIndex, endIndex);
    
    let message = `🌟 *WAIFUS DISPONIBLES* 🌟\n\n`;
    message += `📖 Página: ${page}/${totalPages}\n`;
    message += `👥 Total: ${characters.length} personajes\n\n`;
    
    paginatedCharacters.forEach((character, index) => {
      const globalIndex = startIndex + index + 1;
      const emoji = getRarezaEmoji(character.price);
      const rarity = getRarezaTexto(character.price);
      
      message += `${globalIndex}. ${emoji} ${character.name}\n`;
      message += `   📺 ${character.anime}\n`;
      message += `   💎 ${rarity} - ${character.price.toLocaleString()} pts\n`;
      message += `   📝 ${character.description.substring(0, 50)}...\n\n`;
    });
    
    message += `💡 *Comandos:*\n`;
    message += `• \`.claim <nombre>\` - Reclamar waifu\n`;
    message += `• \`.waifus --page=${page + 1}\` - Siguiente página\n`;
    message += `• \`.mywaifus\` - Tu colección`;
    
    await sock.sendMessage(chatId, { text: message }, { quoted: m });
    
  } catch (error) {
    logger.error('Error mostrando waifus:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la lista de waifus.'
    }, { quoted: m });
  }
}

async function claimWaifu(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  const waifuName = text.split(' ').slice(1).join(' ').trim();
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n💡 *Uso:* `.claim <nombre>\n*Ejemplo:* `.claim Hinata Hyuga`'
    }, { quoted: m });
  }
  
  try {
    // Buscar la waifu
    const character = getCharacterByName(waifuName);
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No encontré la waifu "${waifuName}".\n\n💡 Usa \`.waifus\` para ver la lista completa.`
      }, { quoted: m });
    }
    
    // Verificar si ya está reclamada
    const existing = await db.get(
      'SELECT * FROM claimed_characters WHERE character_id = ?',
      [character.id]
    );
    
    if (existing) {
      return await sock.sendMessage(chatId, {
        text: `❌ La waifu "${character.name}" ya ha sido reclamada por @${existing.user_id.split('@')[0]}.`
      }, { quoted: m });
    }
    
    // Verificar saldo del usuario
    const userBalance = await getUserBalance(userId);
    
    if (userBalance.total < character.price) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes suficientes puntos.\n\n` +
              `💰 Necesitas: ${character.price.toLocaleString()} pts\n` +
              `💸 Tu saldo: ${userBalance.total.toLocaleString()} pts\n\n` +
              `💡 Trabaja más para reclamar esta waifu.`
      }, { quoted: m });
    }
    
    // Realizar el claim
    await db.run(
      'INSERT INTO claimed_characters (user_id, character_id, claimed_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [userId, character.id]
    );
    
    // Actualizar saldo
    const newBalance = userBalance.saldo - character.price;
    await updateUserBalance(userId, newBalance);
    
    const emoji = getRarezaEmoji(character.price);
    const rarity = getRarezaTexto(character.price);
    
    let message = `🎉 *WAIFU RECLAMADA* 🎉\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `${emoji} *${character.name}*\n`;
    message += `📺 ${character.anime}\n`;
    message += `💎 ${rarity}\n`;
    message += `💰 Costo: ${character.price.toLocaleString()} pts\n`;
    message += `💸 Saldo restante: ${newBalance.toLocaleString()} pts\n\n`;
    message += `✨ ¡Ahora es parte de tu colección!`;
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });
    
    logger.success(`Waifu reclamada - usuario: ${userId} - waifu: ${character.name}`);
    
  } catch (error) {
    logger.error('Error reclamando waifu:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al reclamar la waifu. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

async function showMyWaifus(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  try {
    const userWaifus = await getUserWaifus(userId);
    
    if (userWaifus.length === 0) {
      return await sock.sendMessage(chatId, {
        text: `📦 *Tu Colección*\n\n` +
              `❌ Aún no tienes waifus.\n\n` +
              `💡 Usa \`.waifus\` para ver las disponibles\n` +
              `💰 Usa \`.claim <nombre>\` para reclamar`
      }, { quoted: m });
    }
    
    let message = `📦 *Tu Colección* 📦\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `📊 Total: ${userWaifus.length} waifus\n\n`;
    
    let totalValue = 0;
    
    userWaifus.forEach((waifu, index) => {
      const emoji = getRarezaEmoji(waifu.price);
      const rarity = getRarezaTexto(waifu.price);
      totalValue += waifu.price;
      
      message += `${index + 1}. ${emoji} ${waifu.name}\n`;
      message += `   📺 ${waifu.anime}\n`;
      message += `   💎 ${rarity} - ${waifu.price.toLocaleString()} pts\n\n`;
    });
    
    message += `💰 *Valor total de la colección:*\n`;
    message += `${totalValue.toLocaleString()} pts\n\n`;
    message += `💡 *Comandos:*\n`;
    message += `• \`.waifuinfo <nombre>\` - Ver detalles\n`;
    message += `• \`.vender <nombre>\` - Vender waifu`;
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });
    
  } catch (error) {
    logger.error('Error mostrando waifus del usuario:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar tu colección.'
    }, { quoted: m });
  }
}

async function showWaifuInfo(sock, m, text) {
  const chatId = m.key.remoteJid;
  
  const waifuName = text.split(' ').slice(1).join(' ').trim();
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n💡 *Uso:* `.waifuinfo <nombre>\n*Ejemplo:* `.waifuinfo Hinata Hyuga`'
    }, { quoted: m });
  }
  
  try {
    const character = getCharacterByName(waifuName);
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No encontré la waifu "${waifuName}".\n\n💡 Usa \`.waifus\` para ver la lista completa.`
      }, { quoted: m });
    }
    
    // Verificar si está reclamada
    const claimed = await db.get(
      'SELECT * FROM claimed_characters WHERE character_id = ?',
      [character.id]
    );
    
    const emoji = getRarezaEmoji(character.price);
    const rarity = getRarezaTexto(character.price);
    const status = claimed ? `🔒 Reclamada por @${claimed.user_id.split('@')[0]}` : '✅ Disponible';
    
    let message = `📋 *INFORMACIÓN DE WAIFU* 📋\n\n`;
    message += `${emoji} *${character.name}*\n`;
    message += `📺 ${character.anime}\n`;
    message += `💎 ${rarity}\n`;
    message += `💰 Precio: ${character.price.toLocaleString()} pts\n`;
    message += `📊 Estado: ${status}\n\n`;
    message += `📝 *Descripción:*\n`;
    message += `${character.description}\n\n`;
    
    if (character.personality) {
      message += `🎭 *Personalidad:*\n`;
      message += `${character.personality}\n\n`;
    }
    
    if (character.abilities && character.abilities.length > 0) {
      message += `⚡ *Habilidades:*\n`;
      character.abilities.forEach((ability, index) => {
        message += `${index + 1}. ${ability}\n`;
      });
      message += `\n`;
    }
    
    if (!claimed) {
      message += `💡 *Para reclamar:*\n`;
      message += `• \`.claim ${character.name}\`\n`;
      message += `• Necesitas ${character.price.toLocaleString()} pts`;
    }
    
    await sock.sendMessage(chatId, { text: message }, { quoted: m });
    
  } catch (error) {
    logger.error('Error mostrando información de waifu:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la información de la waifu.'
    }, { quoted: m });
  }
}

async function sellWaifu(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  const waifuName = text.split(' ').slice(1).join(' ').trim();
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n💡 *Uso:* `.vender <nombre>\n*Ejemplo:* `.vender Hinata Hyuga`'
    }, { quoted: m });
  }
  
  try {
    // Validar que el usuario tenga la waifu
    const character = await validateUserWaifu(userId, waifuName);
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes la waifu "${waifuName}" en tu colección.\n\n💡 Usa \`.mywaifus\` para ver tus waifus.`
      }, { quoted: m });
    }
    
    // Calcular valor de venta (50% del precio original)
    const sellPrice = Math.floor(character.price * 0.5);
    const userBalance = await getUserBalance(userId);
    const newBalance = userBalance.saldo + sellPrice;
    
    // Eliminar la waifu de la colección
    await db.run(
      'DELETE FROM claimed_characters WHERE user_id = ? AND character_id = ?',
      [userId, character.id]
    );
    
    // Actualizar saldo
    await updateUserBalance(userId, newBalance);
    
    const emoji = getRarezaEmoji(character.price);
    const rarity = getRarezaTexto(character.price);
    
    let message = `💰 *WAIFU VENDIDA* 💰\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `${emoji} *${character.name}*\n`;
    message += `📺 ${character.anime}\n`;
    message += `💎 ${rarity}\n`;
    message += `💰 Precio original: ${character.price.toLocaleString()} pts\n`;
    message += `💸 Valor de venta: ${sellPrice.toLocaleString()} pts (50%)\n`;
    message += `💳 Nuevo saldo: ${newBalance.toLocaleString()} pts\n\n`;
    message += `👋 ¡Adiós, ${character.name}!`;
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });
    
    logger.success(`Waifu vendida - usuario: ${userId} - waifu: ${character.name} - precio: ${sellPrice}`);
    
  } catch (error) {
    logger.error('Error vendiendo waifu:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al vender la waifu. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

async function showCollection(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  try {
    const userWaifus = await getUserWaifus(userId);
    
    if (userWaifus.length === 0) {
      return await sock.sendMessage(chatId, {
        text: `📊 *ESTADÍSTICAS DE COLECCIÓN*\n\n` +
              `❌ Aún no tienes waifus.\n\n` +
              `💡 Usa \`.waifus\` para ver las disponibles\n` +
              `💰 Usa \`.claim <nombre>\` para empezar tu colección`
      }, { quoted: m });
    }
    
    // Calcular estadísticas
    const stats = {
      total: userWaifus.length,
      totalValue: userWaifus.reduce((sum, waifu) => sum + waifu.price, 0),
      byRarity: {},
      byAnime: {}
    };
    
    userWaifus.forEach(waifu => {
      const rarity = getRarezaTexto(waifu.price);
      stats.byRarity[rarity] = (stats.byRarity[rarity] || 0) + 1;
      stats.byAnime[waifu.anime] = (stats.byAnime[waifu.anime] || 0) + 1;
    });
    
    let message = `📊 *ESTADÍSTICAS DE COLECCIÓN* 📊\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `📊 Total de waifus: ${stats.total}\n`;
    message += `💰 Valor total: ${stats.totalValue.toLocaleString()} pts\n`;
    message += `💰 Valor promedio: ${Math.floor(stats.totalValue / stats.total).toLocaleString()} pts\n\n`;
    
    message += `💎 *Por Rareza:*\n`;
    Object.entries(stats.byRarity).forEach(([rarity, count]) => {
      const emoji = getRarezaEmoji(
        rarity === 'Mítico' ? 100000 :
        rarity === 'Legendario' ? 50000 :
        rarity === 'Épico Legendario' ? 30000 :
        rarity === 'Épico' ? 20000 :
        rarity === 'Super Raro' ? 15000 :
        rarity === 'Raro' ? 10000 :
        rarity === 'Poco Común' ? 5000 : 2000
      );
      message += `${emoji} ${rarity}: ${count}\n`;
    });
    
    message += `\n📺 *Top 5 Animes:*\n`;
    const sortedAnimes = Object.entries(stats.byAnime)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    sortedAnimes.forEach(([anime, count], index) => {
      message += `${index + 1}. ${anime}: ${count} waifus\n`;
    });
    
    if (userWaifus.length > 0) {
      message += `\n🏆 *Waifus más valiosas:*\n`;
      const topWaifus = userWaifus
        .sort((a, b) => b.price - a.price)
        .slice(0, 3);
      
      topWaifus.forEach((waifu, index) => {
        const emoji = getRarezaEmoji(waifu.price);
        message += `${index + 1}. ${emoji} ${waifu.name} - ${waifu.price.toLocaleString()} pts\n`;
      });
    }
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });
    
  } catch (error) {
    logger.error('Error mostrando estadísticas:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las estadísticas de tu colección.'
    }, { quoted: m });
  }
}

async function showHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `🌟 *SISTEMA DE WAIFUS* 🌟\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `📋 *Colección:*\n`;
  message += `• \`.waifus\` - Ver waifus disponibles\n`;
  message += `• \`.claim <nombre>\` - Reclamar waifu\n`;
  message += `• \`.mywaifus\` - Tu colección\n`;
  message += `• \`.waifuinfo <nombre>\` - Información de waifu\n`;
  message += `• \`.vender <nombre>\` - Vender waifu\n`;
  message += `• \`.coleccion\` - Estadísticas\n\n`;
  
  message += `💎 *Sistema de Rareza:*\n`;
  message += `👑 Mítico (100k+ pts)\n`;
  message += `💠 Legendario (50k+ pts)\n`;
  message += `💎 Épico Legendario (30k+ pts)\n`;
  message += `🔥 Épico (20k+ pts)\n`;
  message += `⚡ Super Raro (15k+ pts)\n`;
  message += `🌟 Raro (10k+ pts)\n`;
  message += `✨ Poco Común (5k+ pts)\n`;
  message += `⚪ Común (<5k pts)\n\n`;
  
  message += `💡 *Para obtener puntos:*\n`;
  message += `• Trabaja en el bot\n`;
  message += `• Participa en juegos\n`;
  message += `• Completa misiones`;
  
  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Inicializar tablas
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS claimed_characters (
        user_id TEXT,
        character_id INTEGER,
        claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, character_id)
      )
    `);
    
    logger.success('Tablas de waifu inicializadas');
  } catch (error) {
    logger.error('Error inicializando tablas:', error);
  }
}

// Inicializar sistema
initializeTables();
loadCharacters();

// Exportar funciones para compatibilidad
export { 
  characters, 
  loadCharacters, 
  getCharacterById, 
  getCharacterByName,
  getUserWaifus,
  validateUserWaifu,
  getRarezaEmoji,
  getRarezaTexto,
  CONFIG,
  logger
};
