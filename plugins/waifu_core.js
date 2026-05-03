/**
 * @file Plugin Waifu Core - Sistema central de waifus (funciones compartidas)
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema central con funciones compartidas para todos los plugins de waifus
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Variables globales compartidas
export let characters = [];
export let charactersCache = new Map();
export let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Sistema de configuración central
export const CONFIG = {
  enableLogging: true,
  maxLevel: 100,
  baseStats: {
    attack: 10,
    defense: 5,
    speed: 8,
    hp: 100
  }
};

// Sistema de logging central
export const logger = {
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ℹ️ [WAIFU_CORE] ${message}`;
    console.log(logMessage);
    if (data) console.log('Data:', data);
  },
  
  success: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ✅ [WAIFU_CORE] ${message}`;
    console.log(logMessage);
    if (data) console.log('Data:', data);
  },
  
  warning: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ⚠️ [WAIFU_CORE] ${message}`;
    console.warn(logMessage);
    if (data) console.log('Data:', data);
  },
  
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ❌ [WAIFU_CORE] ${message}`;
    console.error(logMessage);
    if (error) {
      console.error('Error:', error);
      if (error.stack) console.error('Stack:', error.stack);
    }
  },
  
  debug: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] 🔍 [WAIFU_CORE] ${message}`;
    console.log(logMessage);
    if (data) console.log('Data:', data);
  }
};

// Cargar personajes desde el archivo JSON
export async function loadCharacters() {
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

export function getCharacterById(id) {
  if (Date.now() - lastCacheUpdate > CACHE_DURATION) {
    loadCharacters().catch(err => logger.error('Error recargando cache:', err));
  }
  return charactersCache.get(id);
}

export function getCharacterByName(name) {
  if (Date.now() - lastCacheUpdate > CACHE_DURATION) {
    loadCharacters().catch(err => logger.error('Error recargando cache:', err));
  }
  return charactersCache.get(name.toLowerCase());
}

// Sistema de niveles y experiencia
export async function getWaifuLevel(characterId, userId) {
  const waifuData = await db.get(
    'SELECT level FROM waifu_levels WHERE character_id = ? AND user_id = ?',
    [characterId, userId]
  );
  return waifuData ? waifuData.level : 1;
}

export async function getWaifuExp(characterId, userId) {
  const waifuData = await db.get(
    'SELECT experience FROM waifu_levels WHERE character_id = ? AND user_id = ?',
    [characterId, userId]
  );
  return waifuData ? waifuData.experience : 0;
}

export async function addWaifuExp(characterId, userId, exp) {
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
  
  while (newExp >= getExpForNextLevel(newLevel) && newLevel < CONFIG.maxLevel) {
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

export function getExpForNextLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export async function getExpProgress(characterId, userId) {
  const data = await db.get(
    'SELECT level, experience FROM waifu_levels WHERE character_id = ? AND user_id = ?',
    [characterId, userId]
  );
  
  if (!data) return { level: 1, current: 0, needed: getExpForNextLevel(1), progress: 0 };
  
  const needed = getExpForNextLevel(data.level);
  return {
    level: data.level,
    current: data.experience,
    needed,
    progress: Math.floor((data.experience / needed) * 100)
  };
}

// Crear tabla de niveles si no existe
export async function initializeWaifuLevels() {
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
    logger.success('Tabla waifu_levels inicializada');
  } catch (error) {
    logger.error('Error al inicializar tabla waifu_levels:', error);
  }
}

// Funciones auxiliares de rareza
export function getRarezaEmoji(price) {
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

export function getRarezaTexto(price) {
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

export function getRarezaColor(price) {
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

export function getRarezaFromPrice(price) {
  if (price >= 100000) return 'mythic';
  if (price >= 50000) return 'legendary';
  if (price >= 30000) return 'epic_legendary';
  if (price >= 20000) return 'epic';
  if (price >= 15000) return 'super_rare';
  if (price >= 10000) return 'rare';
  if (price >= 5000) return 'uncommon';
  if (price >= 2000) return 'common_plus';
  return 'common';
}

export function getRarezaBonus(price) {
  if (price >= 100000) return 5.0; // Mítico: 500% bonus
  if (price >= 50000) return 3.0; // Legendario: 300% bonus
  if (price >= 30000) return 2.5; // Épico Legendario: 250% bonus
  if (price >= 20000) return 2.0; // Épico: 200% bonus
  if (price >= 15000) return 1.5; // Super Raro: 150% bonus
  if (price >= 10000) return 1.3; // Raro: 130% bonus
  if (price >= 5000) return 1.1;  // Poco Común: 110% bonus
  if (price >= 2000) return 1.05; // Común Plus: 105% bonus
  return 1.0; // Común: 100% (sin bonus)
}

// Obtener estadísticas de waifu
export async function getWaifuStats(characterId, userId) {
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

// Funciones de utilidad para nuevos plugins
export async function getUserBalance(userId) {
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

export async function updateUserBalance(userId, newBalance) {
  try {
    await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
    return true;
  } catch (error) {
    logger.error('Error al actualizar saldo:', error);
    return false;
  }
}

export async function getUserWaifus(userId) {
  try {
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    return characters.filter(c => claimedIds.includes(c.id));
  } catch (error) {
    logger.error('Error al obtener waifus de usuario:', error);
    return [];
  }
}

export async function validateUserWaifu(userId, waifuName) {
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

export function formatNumber(num) {
  return num.toLocaleString();
}

export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function getTimeRemaining(endTime) {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end - now;
  
  if (diff <= 0) return 'Finalizado';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateChance(percentage) {
  return Math.random() * 100 < percentage;
}

export async function sendWaifuImage(sock, chatId, character, caption, mentions = []) {
  try {
    // Verificar si el personaje tiene imágenes
    if (character.image_url && character.image_url.length > 0) {
      const imageUrl = character.image_url[getRandomInt(0, character.image_url.length - 1)];
      await sock.sendMessage(chatId, {
        image: { url: imageUrl },
        caption,
        mentions
      });
    } else {
      // Si no hay imágenes, enviar solo el texto
      await sock.sendMessage(chatId, { text: caption, mentions });
    }
  } catch (error) {
    logger.error('Error al enviar imagen de waifu:', error);
    await sock.sendMessage(chatId, { text: caption, mentions });
  }
}

// Inicializar sistema
initializeWaifuLevels();
loadCharacters();

// Exportar variables y funciones para uso en otros plugins
export { characters, charactersCache, lastCacheUpdate, CACHE_DURATION };
