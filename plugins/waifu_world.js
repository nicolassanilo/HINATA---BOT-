/**
 * @file Plugin Waifu World - Sistema de mundo y exploración
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de mundo interactivo, lugares, misiones y exploración
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
  logger,
  getUserBalance,
  getUserWaifus,
  validateUserWaifu,
  formatNumber,
  getRandomInt,
  calculateChance
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  maxExplorationsPerDay: 5,
  explorationCooldown: 2 * 60 * 60 * 1000, // 2 horas
  maxActiveMissions: 3,
  missionCooldown: 30 * 60 * 1000, // 30 minutos
  dungeonCooldown: 24 * 60 * 60 * 1000, // 24 horas
  maxPartySize: 4
};

// Usar el logger centralizado
const worldLogger = logger;

// Tipos de lugares
const LOCATION_TYPES = {
  CITY: 'city',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  BEACH: 'beach',
  DUNGEON: 'dungeon',
  CASTLE: 'castle',
  TEMPLE: 'temple',
  VILLAGE: 'village',
  RUINS: 'ruins',
  CAVE: 'cave'
};

// Definiciones de lugares
const LOCATION_DEFINITIONS = {
  [LOCATION_TYPES.CITY]: {
    name: 'Ciudad Principal',
    emoji: '🏙️',
    description: 'El corazón del mundo de waifus',
    activities: ['comprar', 'vender', 'socializar', 'misiones'],
    requirements: { level: 1 },
    rewards: { exp: 10, coins: 50 }
  },
  [LOCATION_TYPES.FOREST]: {
    name: 'Bosque Misterioso',
    emoji: '🌲',
    description: 'Un bosque lleno de secretos y tesoros',
    activities: ['explorar', 'cazar', 'recoger', 'encontrar_waifus'],
    requirements: { level: 5 },
    rewards: { exp: 25, coins: 100 }
  },
  [LOCATION_TYPES.MOUNTAIN]: {
    name: 'Montaña Sagrada',
    emoji: '⛰️',
    description: 'Una montaña con poderes místicos',
    activities: ['escalar', 'meditar', 'encontrar_artefactos'],
    requirements: { level: 10 },
    rewards: { exp: 40, coins: 200 }
  },
  [LOCATION_TYPES.BEACH]: {
    name: 'Playa Tropical',
    emoji: '🏖️',
    description: 'Una playa relajante con vistas espectaculares',
    activities: ['relajarse', 'nadar', 'encontrar_conchas'],
    requirements: { level: 3 },
    rewards: { exp: 20, coins: 80 }
  },
  [LOCATION_TYPES.DUNGEON]: {
    name: 'Mazmorra Oscura',
    emoji: '🏰',
    description: 'Una mazmorra peligrosa con grandes recompensas',
    activities: ['combate', 'explorar', 'encontrar_tesoros'],
    requirements: { level: 15 },
    rewards: { exp: 100, coins: 500 }
  },
  [LOCATION_TYPES.CASTLE]: {
    name: 'Castillo Real',
    emoji: '🏰',
    description: 'El castillo donde vive la realeza',
    activities: ['visitar', 'misiones_reales', 'audiencia'],
    requirements: { level: 20 },
    rewards: { exp: 60, coins: 300 }
  },
  [LOCATION_TYPES.TEMPLE]: {
    name: 'Templo Antiguo',
    emoji: '⛩️',
    description: 'Un templo con sabiduría ancestral',
    activities: ['orar', 'aprender', 'purificarse'],
    requirements: { level: 12 },
    rewards: { exp: 50, coins: 250 }
  },
  [LOCATION_TYPES.VILLAGE]: {
    name: 'Aldea Pacífica',
    emoji: '🏘️',
    description: 'Una pequeña aldea con gente amigable',
    activities: ['comerciar', 'descansar', 'rumores'],
    requirements: { level: 2 },
    rewards: { exp: 15, coins: 60 }
  },
  [LOCATION_TYPES.RUINS]: {
    name: 'Ruinas Antiguas',
    emoji: '🏛️',
    description: 'Ruinas de una civilización perdida',
    activities: ['investigar', 'excavar', 'descubrir_secrets'],
    requirements: { level: 18 },
    rewards: { exp: 80, coins: 400 }
  },
  [LOCATION_TYPES.CAVE]: {
    name: 'Cueva Profunda',
    emoji: '🕳️',
    description: 'Una cueva oscura con misterios',
    activities: ['explorar', 'minar', 'encontrar_gemas'],
    requirements: { level: 8 },
    rewards: { exp: 35, coins: 150 }
  }
};

// Tipos de misiones
const MISSION_TYPES = {
  MAIN: 'main',
  SIDE: 'side',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  SPECIAL: 'special',
  EXPLORATION: 'exploration',
  COMBAT: 'combat',
  COLLECTION: 'collection',
  SOCIAL: 'social'
};

// Definiciones de misiones
const MISSION_DEFINITIONS = {
  first_steps: {
    id: 'first_steps',
    name: 'Primeros Pasos',
    type: MISSION_TYPES.MAIN,
    description: 'Explora el mundo por primera vez',
    location: LOCATION_TYPES.CITY,
    requirements: { level: 1 },
    objectives: [
      { type: 'visit_location', target: LOCATION_TYPES.CITY, count: 1 },
      { type: 'talk_npc', target: 'guide', count: 1 }
    ],
    rewards: { exp: 100, coins: 500, item: 'map' },
    difficulty: 'fácil'
  },
  forest_explorer: {
    id: 'forest_explorer',
    name: 'Explorador del Bosque',
    type: MISSION_TYPES.SIDE,
    description: 'Explora el bosque misterioso',
    location: LOCATION_TYPES.FOREST,
    requirements: { level: 5 },
    objectives: [
      { type: 'visit_location', target: LOCATION_TYPES.FOREST, count: 1 },
      { type: 'collect_item', target: 'herb', count: 5 },
      { type: 'defeat_monster', target: 'wolf', count: 3 }
    ],
    rewards: { exp: 200, coins: 1000 },
    difficulty: 'medio'
  },
  mountain_pilgrim: {
    id: 'mountain_pilgrim',
    name: 'Peregrino de la Montaña',
    type: MISSION_TYPES.SIDE,
    description: 'Realiza un peregrinaje a la montaña sagrada',
    location: LOCATION_TYPES.MOUNTAIN,
    requirements: { level: 10 },
    objectives: [
      { type: 'visit_location', target: LOCATION_TYPES.MOUNTAIN, count: 1 },
      { type: 'meditate', count: 3 },
      { type: 'offer_item', target: 'crystal', count: 1 }
    ],
    rewards: { exp: 300, coins: 1500, ability: 'meditation' },
    difficulty: 'medio'
  },
  dungeon_raider: {
    id: 'dungeon_raider',
    name: 'Aventurero de Mazmorras',
    type: MISSION_TYPES.MAIN,
    description: 'Explora una mazmorra peligrosa',
    location: LOCATION_TYPES.DUNGEON,
    requirements: { level: 15 },
    objectives: [
      { type: 'visit_location', target: LOCATION_TYPES.DUNGEON, count: 1 },
      { type: 'defeat_boss', target: 'demon_lord', count: 1 },
      { type: 'collect_treasure', count: 3 }
    ],
    rewards: { exp: 500, coins: 3000, badge: 'dungeon_explorer' },
    difficulty: 'difícil'
  }
};

/**
 * Sistema de mundo y exploración
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.mundo':
        await showWorldMap(sock, m, userId);
        break;
      case '.explorar':
        await exploreLocation(sock, m, userId, text);
        break;
      case '.viajar':
        await travelToLocation(sock, m, userId, text);
        break;
      case '.lugares':
        await showLocations(sock, m, userId);
        break;
      case '.misiones':
        await showMissions(sock, m, userId);
        break;
      case '.aceptar_mision':
        await acceptMission(sock, m, userId, text);
        break;
      case '.progreso_mision':
        await showMissionProgress(sock, m, userId, text);
        break;
      case '.mazmorra':
        await enterDungeon(sock, m, userId, text);
        break;
      case '.mapa':
        await showPersonalMap(sock, m, userId);
        break;
      default:
        worldLogger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    worldLogger.error('Error en el sistema de mundo:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de mundo. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Muestra el mapa del mundo
 */
async function showWorldMap(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userStats = await getUserWorldStats(userId);
    const unlockedLocations = await getUnlockedLocations(userId);
    
    let mapMessage = `🗺️ *MAPA DEL MUNDO* 🗺️\n\n`;
    mapMessage += `👤 *@${userId.split('@')[0]}*\n`;
    mapMessage += `📍 *Lugares descubiertos:* ${unlockedLocations.length}/${Object.keys(LOCATION_DEFINITIONS).length}\n`;
    mapMessage += `🎯 *Nivel de exploración:* ${userStats.explorationLevel || 1}\n`;
    mapMessage += `⚡ *Puntos de exploración:* ${userStats.explorationPoints || 0}\n\n`;
    
    mapMessage += `🗺️ *LUGARES DISPONIBLES:*\n\n`;
    
    Object.entries(LOCATION_DEFINITIONS).forEach(([locationType, locationDef]) => {
      const isUnlocked = unlockedLocations.includes(locationType);
      const canUnlock = canUnlockLocation(userId, locationType);
      const currentLocation = userStats.currentLocation;
      
      let status = '🔒 Bloqueado';
      if (isUnlocked) {
        status = currentLocation === locationType ? '📍 Actual' : '✅ Disponible';
      } else if (canUnlock) {
        status = '🔓 Disponible';
      }
      
      mapMessage += `${locationDef.emoji} *${locationDef.name}*\n`;
      mapMessage += `   📝 ${locationDef.description}\n`;
      mapMessage += `   📊 Estado: ${status}\n`;
      mapMessage += `   📅 Requisito: Nivel ${locationDef.requirements.level}\n`;
      
      if (isUnlocked) {
        mapMessage += `   🎯 Actividades: ${locationDef.activities.join(', ')}\n`;
      }
      
      mapMessage += `\n`;
    });
    
    mapMessage += `💡 *Comandos disponibles:*\n`;
    mapMessage += `• \`.explorar <lugar>\` - Explorar un lugar\n`;
    mapMessage += `• \`.viajar <lugar>\` - Viajar a un lugar\n`;
    mapMessage += `• \`.lugares\` - Ver detalles de lugares\n`;
    mapMessage += `• \`.misiones\` - Ver misiones disponibles\n`;
    mapMessage += `• \`.mapa\` - Ver tu mapa personal`;
    
    await sock.sendMessage(chatId, { 
      text: mapMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    worldLogger.error('Error al mostrar mapa del mundo:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el mapa del mundo.'
    }, { quoted: m });
  }
}

/**
 * Explora un lugar específico
 */
async function exploreLocation(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const locationType = args[0];
  
  if (!locationType) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar un lugar.\n\n' +
            '💡 *Uso:* `.explorar <lugar>`\n' +
            '*Lugares:* ' + Object.keys(LOCATION_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  if (!Object.values(LOCATION_TYPES).includes(locationType)) {
    return await sock.sendMessage(chatId, {
      text: `❌ Lugar no válido.\n\n` +
            '*Lugares disponibles:* ' + Object.keys(LOCATION_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  try {
    const locationDef = LOCATION_DEFINITIONS[locationType];
    const userStats = await getUserWorldStats(userId);
    const unlockedLocations = await getUnlockedLocations(userId);
    
    // Verificar si el lugar está desbloqueado
    if (!unlockedLocations.includes(locationType)) {
      return await sock.sendMessage(chatId, {
        text: `❌ No has desbloqueado ${locationDef.name}.\n\n` +
              `📊 *Requisito:* Nivel ${locationDef.requirements.level}\n` +
              `📍 *Tu nivel:* ${userStats.explorationLevel || 1}`
      }, { quoted: m });
    }
    
    // Verificar cooldown
    const lastExploration = await getLastExploration(userId, locationType);
    if (lastExploration && (Date.now() - new Date(lastExploration.exploration_time).getTime()) < CONFIG.explorationCooldown) {
      const remaining = Math.ceil((CONFIG.explorationCooldown - (Date.now() - new Date(lastExploration.exploration_time).getTime())) / 60000);
      return await sock.sendMessage(chatId, {
        text: `⏰ Debes esperar ${remaining} minutos antes de volver a explorar este lugar.`
      }, { quoted: m });
    }
    
    // Verificar límite diario
    const todayExplorations = await getTodayExplorations(userId);
    if (todayExplorations >= CONFIG.maxExplorationsPerDay) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite de exploraciones diarias (${CONFIG.maxExplorationsPerDay}).\n\n` +
              `⏰ *Vuelve mañana para explorar más*`
      }, { quoted: m });
    }
    
    // Realizar exploración
    const explorationResult = await performExploration(userId, locationType);
    
    // Registrar exploración
    await db.run(
      'INSERT INTO location_explorations (user_id, location_type, exploration_time, result) VALUES (?, ?, CURRENT_TIMESTAMP, ?)',
      [userId, locationType, JSON.stringify(explorationResult)]
    );
    
    let exploreMessage = `🗺️ *EXPLORACIÓN COMPLETADA* 🗺️\n\n`;
    exploreMessage += `👤 *@${userId.split('@')[0]}*\n`;
    exploreMessage += `${locationDef.emoji} *Lugar:* ${locationDef.name}\n`;
    exploreMessage += `📝 ${locationDef.description}\n\n`;
    
    exploreMessage += `🎯 *Resultado de la exploración:*\n`;
    exploreMessage += `• ✨ EXP ganada: ${explorationResult.exp}\n`;
    exploreMessage += `• 💰 Monedas: ${explorationResult.coins}\n`;
    
    if (explorationResult.items && explorationResult.items.length > 0) {
      exploreMessage += `• 🎁 Items encontrados: ${explorationResult.items.join(', ')}\n`;
    }
    
    if (explorationResult.encounter) {
      exploreMessage += `• 👥 Encuentro: ${explorationResult.encounter}\n`;
    }
    
    if (explorationResult.discovery) {
      exploreMessage += `• 🔍 Descubrimiento: ${explorationResult.discovery}\n`;
    }
    
    exploreMessage += `\n💡 *Recompensas base:* ${locationDef.rewards.exp} EXP, ${locationDef.rewards.coins} 💎`;
    
    await sock.sendMessage(chatId, { 
      text: exploreMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    worldLogger.success(`Exploración completada - usuario: ${userId} - lugar: ${locationType}`);
    
  } catch (error) {
    worldLogger.error('Error al explorar lugar:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al explorar el lugar.'
    }, { quoted: m });
  }
}

/**
 * Viaja a un lugar específico
 */
async function travelToLocation(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const locationType = args[0];
  
  if (!locationType) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar un lugar.\n\n' +
            '💡 *Uso:* `.viajar <lugar>`\n' +
            '*Lugares:* ' + Object.keys(LOCATION_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  try {
    const locationDef = LOCATION_DEFINITIONS[locationType];
    const userStats = await getUserWorldStats(userId);
    const unlockedLocations = await getUnlockedLocations(userId);
    
    // Verificar si el lugar está desbloqueado
    if (!unlockedLocations.includes(locationType)) {
      return await sock.sendMessage(chatId, {
        text: `❌ No has desbloqueado ${locationDef.name}.`
      }, { quoted: m });
    }
    
    // Actualizar ubicación actual
    await db.run(
      'UPDATE user_world_stats SET current_location = ? WHERE user_id = ?',
      [locationType, userId]
    );
    
    let travelMessage = `🗺️ *VIAJE COMPLETADO* 🗺️\n\n`;
    travelMessage += `👤 *@${userId.split('@')[0]}*\n`;
    travelMessage += `${locationDef.emoji} *Has viajado a:* ${locationDef.name}\n`;
    travelMessage += `📝 ${locationDef.description}\n\n`;
    
    travelMessage += `🎯 *Actividades disponibles:*\n`;
    locationDef.activities.forEach((activity, index) => {
      travelMessage += `${index + 1}. ${activity}\n`;
    });
    
    travelMessage += `\n💡 *Usa \`.explorar ${locationType}\` para explorar este lugar`;
    
    await sock.sendMessage(chatId, { 
      text: travelMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    worldLogger.success(`Viaje completado - usuario: ${userId} - lugar: ${locationType}`);
    
  } catch (error) {
    worldLogger.error('Error al viajar a lugar:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al viajar al lugar.'
    }, { quoted: m });
  }
}

/**
 * Muestra detalles de los lugares
 */
async function showLocations(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userStats = await getUserWorldStats(userId);
    const unlockedLocations = await getUnlockedLocations(userId);
    
    let locationsMessage = `🗺️ *GUIA DE LUGARES* 🗺️\n\n`;
    locationsMessage += `👤 *@${userId.split('@')[0]}*\n`;
    locationsMessage += `📍 *Ubicación actual:* ${LOCATION_DEFINITIONS[userStats.currentLocation]?.name || 'Ciudad Principal'}\n\n`;
    
    Object.entries(LOCATION_DEFINITIONS).forEach(([locationType, locationDef]) => {
      const isUnlocked = unlockedLocations.includes(locationType);
      const canUnlock = canUnlockLocation(userId, locationType);
      
      locationsMessage += `${locationDef.emoji} *${locationDef.name}*\n`;
      locationsMessage += `📝 ${locationDef.description}\n`;
      locationsMessage += `📊 Estado: ${isUnlocked ? '✅ Desbloqueado' : canUnlock ? '🔓 Disponible' : '🔒 Bloqueado'}\n`;
      locationsMessage += `📅 Requisito: Nivel ${locationDef.requirements.level}\n`;
      locationsMessage += `🎯 Actividades: ${locationDef.activities.join(', ')}\n`;
      locationsMessage += `💰 Recompensas: ${locationDef.rewards.exp} EXP, ${locationDef.rewards.coins} 💎\n\n`;
    });
    
    locationsMessage += `💡 *Comandos disponibles:*\n`;
    locationsMessage += `• \`.viajar <lugar>\` - Viajar a un lugar\n`;
    locationsMessage += `• \`.explorar <lugar>\` - Explorar un lugar\n`;
    locationsMessage += `• \`.mundo\` - Ver mapa del mundo`;
    
    await sock.sendMessage(chatId, { 
      text: locationsMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    worldLogger.error('Error al mostrar lugares:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar los lugares.'
    }, { quoted: m });
  }
}

/**
 * Muestra misiones disponibles
 */
async function showMissions(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userStats = await getUserWorldStats(userId);
    const activeMissions = await getActiveMissions(userId);
    const availableMissions = await getAvailableMissions(userId);
    
    let missionsMessage = `📋 *MISIONES DISPONIBLES* 📋\n\n`;
    missionsMessage += `👤 *@${userId.split('@')[0]}*\n`;
    missionsMessage += `🎯 *Misiones activas:* ${activeMissions.length}/${CONFIG.maxActiveMissions}\n`;
    missionsMessage += `⭐ *Nivel de exploración:* ${userStats.explorationLevel || 1}\n\n`;
    
    if (activeMissions.length > 0) {
      missionsMessage += `🔄 *MISIONES ACTIVAS:*\n\n`;
      
      activeMissions.forEach((mission, index) => {
        const missionDef = MISSION_DEFINITIONS[mission.mission_id];
        if (missionDef) {
          const progress = calculateMissionProgress(userId, mission);
          missionsMessage += `${index + 1}. ${missionDef.name}\n`;
          missionsMessage += `   📝 ${missionDef.description}\n`;
          missionsMessage += `   📊 Progreso: ${progress.completed}/${progress.total} (${Math.round(progress.percentage)}%)\n`;
          missionsMessage += `   🎯 Ubicación: ${LOCATION_DEFINITIONS[missionDef.location].name}\n\n`;
        }
      });
    }
    
    if (availableMissions.length > 0) {
      missionsMessage += `🎯 *MISIONES DISPONIBLES:*\n\n`;
      
      availableMissions.forEach((missionDef, index) => {
        missionsMessage += `${index + 1}. ${missionDef.name}\n`;
        missionsMessage += `   📝 ${missionDef.description}\n`;
        missionsMessage += `   📊 Dificultad: ${missionDef.difficulty}\n`;
        missionsMessage += `   🎯 Ubicación: ${LOCATION_DEFINITIONS[missionDef.location].name}\n`;
        missionsMessage += `   📅 Requisito: Nivel ${missionDef.requirements.level}\n`;
        missionsMessage += `   💰 Recompensa: ${missionDef.rewards.exp} EXP, ${missionDef.rewards.coins} 💎\n\n`;
      });
    }
    
    if (activeMissions.length === 0 && availableMissions.length === 0) {
      missionsMessage += `📦 *No hay misiones disponibles*\n\n`;
      missionsMessage += `💡 *Explora más lugares para desbloquear misiones*`;
    }
    
    missionsMessage += `💡 *Comandos disponibles:*\n`;
    missionsMessage += `• \`.aceptar_mision <id>\` - Aceptar misión\n`;
    missionsMessage += `• \`.progreso_mision <id>\` - Ver progreso\n`;
    missionsMessage += `• \`.mazmorra\` - Entrar en mazmorra`;
    
    await sock.sendMessage(chatId, { 
      text: missionsMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    worldLogger.error('Error al mostrar misiones:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las misiones.'
    }, { quoted: m });
  }
}

/**
 * Acepta una misión
 */
async function acceptMission(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const missionId = args[0];
  
  if (!missionId) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el ID de la misión.\n\n' +
            '💡 *Uso:* `.aceptar_mision <id_mision>`\n' +
            '*Misiones disponibles:* ' + Object.keys(MISSION_DEFINITIONS).map(m => `${m.id} - ${m.name}`).join(', ')
    }, { quoted: m });
  }
  
  try {
    const missionDef = MISSION_DEFINITIONS[missionId];
    
    if (!missionDef) {
      return await sock.sendMessage(chatId, {
        text: `❌ Misión no válida.\n\n` +
              '*Usa \`.misiones\` para ver misiones disponibles*'
      }, { quoted: m });
    }
    
    const userStats = await getUserWorldStats(userId);
    const activeMissions = await getActiveMissions(userId);
    
    // Verificar requisitos
    if (userStats.explorationLevel < missionDef.requirements.level) {
      return await sock.sendMessage(chatId, {
        text: `❌ No cumples los requisitos para esta misión.\n\n` +
              `📊 *Requisito:* Nivel ${missionDef.requirements.level}\n` +
              `📍 *Tu nivel:* ${userStats.explorationLevel || 1}`
      }, { quoted: m });
    }
    
    // Verificar límite de misiones activas
    if (activeMissions.length >= CONFIG.maxActiveMissions) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite de misiones activas (${CONFIG.maxActiveMissions}).`
      }, { quoted: m });
    }
    
    // Verificar si ya está activa
    const alreadyActive = activeMissions.find(m => m.mission_id === missionId);
    if (alreadyActive) {
      return await sock.sendMessage(chatId, {
        text: `❌ Esta misión ya está activa.`
      }, { quoted: m });
    }
    
    // Aceptar misión
    await db.run(
      'INSERT INTO user_missions (user_id, mission_id, accepted_at, status) VALUES (?, ?, CURRENT_TIMESTAMP, "active")',
      [userId, missionId]
    );
    
    let acceptMessage = `📋 *MISIÓN ACEPTADA* 📋\n\n`;
    acceptMessage += `👤 *@${userId.split('@')[0]}*\n`;
    acceptMessage += `🎯 *Misión:* ${missionDef.name}\n`;
    acceptMessage += `📝 ${missionDef.description}\n`;
    acceptMessage += `📊 Dificultad: ${missionDef.difficulty}\n`;
    acceptMessage += `🎯 Ubicación: ${LOCATION_DEFINITIONS[missionDef.location].name}\n\n`;
    
    acceptMessage += `🎯 *Objetivos:*\n`;
    missionDef.objectives.forEach((objective, index) => {
      const objectiveText = getObjectiveText(objective);
      acceptMessage += `${index + 1}. ${objectiveText}\n`;
    });
    
    acceptMessage += `\n💰 *Recompensas:*\n`;
    acceptMessage += `• ✨ ${missionDef.rewards.exp} EXP\n`;
    acceptMessage += `• 💎 ${missionDef.rewards.coins} monedas`;
    
    if (missionDef.rewards.item) {
      acceptMessage += `\n• 🎁 Item: ${missionDef.rewards.item}`;
    }
    
    if (missionDef.rewards.badge) {
      acceptMessage += `\n• 🏆 Insignia: ${missionDef.rewards.badge}`;
    }
    
    acceptMessage += `\n💡 *Usa \`.progreso_mision ${missionId}\` para ver tu progreso`;
    
    await sock.sendMessage(chatId, { 
      text: acceptMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    worldLogger.success(`Misión aceptada - usuario: ${userId} - misión: ${missionId}`);
    
  } catch (error) {
    worldLogger.error('Error al aceptar misión:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al aceptar la misión.'
    }, { quoted: m });
  }
}

/**
 * Muestra el progreso de una misión
 */
async function showMissionProgress(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const missionId = args[0];
  
  if (!missionId) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el ID de la misión.\n\n' +
            '💡 *Uso:* `.progreso_mision <id_mision>`'
    }, { quoted: m });
  }
  
  try {
    const missionDef = MISSION_DEFINITIONS[missionId];
    
    if (!missionDef) {
      return await sock.sendMessage(chatId, {
        text: `❌ Misión no válida.`
      }, { quoted: m });
    }
    
    const userMission = await db.get(
      'SELECT * FROM user_missions WHERE user_id = ? AND mission_id = ?',
      [userId, missionId]
    );
    
    if (!userMission) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes esta misión activa.\n\n` +
              `💡 *Usa \`.aceptar_mision ${missionId}\` para aceptarla`
      }, { quoted: m });
    }
    
    const progress = calculateMissionProgress(userId, userMission);
    
    let progressMessage = `📊 *PROGRESO DE MISIÓN* 📊\n\n`;
    progressMessage += `👤 *@${userId.split('@')[0]}*\n`;
    progressMessage += `🎯 *Misión:* ${missionDef.name}\n`;
    progressMessage += `📝 ${missionDef.description}\n`;
    progressMessage += `📊 Progreso: ${progress.completed}/${progress.total} (${Math.round(progress.percentage)}%)\n\n`;
    
    progressMessage += `🎯 *ESTADO DE OBJETIVOS:*\n`;
    missionDef.objectives.forEach((objective, index) => {
      const objectiveText = getObjectiveText(objective);
      const isCompleted = progress.completedObjectives[index] || false;
      const status = isCompleted ? '✅' : '⏳';
      progressMessage += `${status} ${index + 1}. ${objectiveText}\n`;
    });
    
    if (progress.completed >= progress.total) {
      progressMessage += `\n🎉 *¡MISIÓN COMPLETADA!*\n`;
      progressMessage += `💡 *Usa \`.reclamar_premio_mision ${missionId}\` para reclamar tu premio`;
    } else {
      progressMessage += `\n💡 *Sigue trabajando en los objetivos pendientes*`;
    }
    
    await sock.sendMessage(chatId, { 
      text: progressMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    worldLogger.error('Error al mostrar progreso de misión:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el progreso de la misión.'
    }, { quoted: m });
  }
}

/**
 * Entra en una mazmorra
 */
async function enterDungeon(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  
  try {
    const userStats = await getUserWorldStats(userId);
    const dungeonLocation = LOCATION_TYPES.DUNGEON;
    const unlockedLocations = await getUnlockedLocations(userId);
    
    // Verificar si la mazmorra está desbloqueada
    if (!unlockedLocations.includes(dungeonLocation)) {
      return await sock.sendMessage(chatId, {
        text: `❌ No has desbloqueado la Mazmorra Oscura.\n\n` +
              `📊 *Requisito:* Nivel ${LOCATION_DEFINITIONS[dungeonLocation].requirements.level}\n` +
              `📍 *Tu nivel:* ${userStats.explorationLevel || 1}`
      }, { quoted: m });
    }
    
    // Verificar cooldown
    const lastDungeon = await getLastDungeonRun(userId);
    if (lastDungeon && (Date.now() - new Date(lastDungeon.run_time).getTime()) < CONFIG.dungeonCooldown) {
      const remaining = Math.ceil((CONFIG.dungeonCooldown - (Date.now() - new Date(lastDungeon.run_time).getTime())) / (60 * 60 * 1000));
      return await sock.sendMessage(chatId, {
        text: `⏰ Debes esperar ${remaining} horas antes de volver a entrar en la mazmorra.`
      }, { quoted: m });
    }
    
    // Simular entrada a mazmorra
    const dungeonResult = await runDungeon(userId);
    
    // Registrar mazmorra
    await db.run(
      'INSERT INTO dungeon_runs (user_id, run_time, result, floors_completed) VALUES (?, ?, ?, ?)',
      [userId, new Date().toISOString(), JSON.stringify(dungeonResult), dungeonResult.floors]
    );
    
    let dungeonMessage = `🏰 *MAZMORRA COMPLETADA* 🏰\n\n`;
    dungeonMessage += `👤 *@${userId.split('@')[0]}*\n`;
    dungeonMessage += `🏰 *Mazmorra Oscura*\n`;
    dungeonMessage += `📊 *Pisos completados:* ${dungeonResult.floors}\n`;
    dungeonMessage += `✨ *EXP ganada:* ${dungeonResult.exp}\n`;
    dungeonMessage += `💰 *Monedas:* ${dungeonResult.coins}\n`;
    
    if (dungeonResult.items && dungeonResult.items.length > 0) {
      dungeonMessage += `🎁 *Items encontrados:* ${dungeonResult.items.join(', ')}\n`;
    }
    
    if (dungeonResult.bossDefeated) {
      dungeonMessage += `👹 *Jefe derrotado:* ${dungeonResult.bossDefeated}\n`;
    }
    
    if (dungeonResult.death) {
      dungeonMessage += `💀 *Resultado:* Fuiste derrotado en el piso ${dungeonResult.floors}\n`;
    } else {
      dungeonMessage += `🎉 *Resultado:* ¡Completaste la mazmorra!\n`;
    }
    
    await sock.sendMessage(chatId, { 
      text: dungeonMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    worldLogger.success(`Mazmorra completada - usuario: ${userId} - pisos: ${dungeonResult.floors}`);
    
  } catch (error) {
    worldLogger.error('Error al entrar en mazmorra:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al entrar en la mazmorra.'
    }, { quoted: m });
  }
}

/**
 * Muestra el mapa personal del usuario
 */
async function showPersonalMap(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userStats = await getUserWorldStats(userId);
    const unlockedLocations = await getUnlockedLocations(userId);
    const explorationHistory = await getExplorationHistory(userId);
    
    let mapMessage = `🗺️ *MAPA PERSONAL* 🗺️\n\n`;
    mapMessage += `👤 *@${userId.split('@')[0]}*\n`;
    mapMessage += `📍 *Ubicación actual:* ${LOCATION_DEFINITIONS[userStats.currentLocation]?.name || 'Ciudad Principal'}\n`;
    mapMessage += `🎯 *Nivel de exploración:* ${userStats.explorationLevel || 1}\n`;
    mapMessage += `⚡ *Puntos de exploración:* ${userStats.explorationPoints || 0}\n\n`;
    
    mapMessage += `🗺️ *LUGARES DESCUBIERTOS:*\n\n`;
    
    unlockedLocations.forEach((locationType, index) => {
      const locationDef = LOCATION_DEFINITIONS[locationType];
      const explorations = explorationHistory.filter(e => e.location_type === locationType);
      mapMessage += `${index + 1}. ${locationDef.emoji} *${locationDef.name}*\n`;
      mapMessage += `   📊 Explorado: ${explorations.length} veces\n`;
      mapMessage += `   🎯 Actividades: ${locationDef.activities.join(', ')}\n\n`;
    });
    
    mapMessage += `📈 *ESTADÍSTICAS DE EXPLORACIÓN:*\n`;
    mapMessage += `• Total de exploraciones: ${explorationHistory.length}\n`;
    mapMessage += `• Lugares visitados: ${unlockedLocations.length}\n`;
    mapMessage += `• Exploraciones hoy: ${explorationHistory.filter(e => new Date(e.exploration_time).toDateString() === new Date().toDateString()).length}\n\n`;
    
    mapMessage += `💡 *Comandos disponibles:*\n`;
    mapMessage += `• \`.viajar <lugar>\` - Viajar a un lugar\n`;
    mapMessage += `• \`.explorar <lugar>\` - Explorar un lugar\n`;
    mapMessage += `• \`.mundo\` - Ver mapa del mundo`;
    
    await sock.sendMessage(chatId, { 
      text: mapMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    worldLogger.error('Error al mostrar mapa personal:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el mapa personal.'
    }, { quoted: m });
  }
}

/**
 * Funciones auxiliares
 */
async function getUserWorldStats(userId) {
  try {
    const stats = await db.get(
      'SELECT * FROM user_world_stats WHERE user_id = ?',
      [userId]
    );
    
    if (!stats) {
      await db.run(
        'INSERT INTO user_world_stats (user_id, exploration_level, exploration_points, current_location) VALUES (?, 1, 0, ?)',
        [userId, LOCATION_TYPES.CITY]
      );
      return { explorationLevel: 1, explorationPoints: 0, currentLocation: LOCATION_TYPES.CITY };
    }
    
    return stats;
  } catch (error) {
    worldLogger.error('Error al obtener estadísticas de mundo:', error);
    return { explorationLevel: 1, explorationPoints: 0, currentLocation: LOCATION_TYPES.CITY };
  }
}

async function getUnlockedLocations(userId) {
  try {
    const unlocked = await db.all(
      'SELECT DISTINCT location_type FROM location_explorations WHERE user_id = ?',
      [userId]
    );
    return unlocked.map(u => u.location_type);
  } catch (error) {
    worldLogger.error('Error al obtener lugares desbloqueados:', error);
    return [LOCATION_TYPES.CITY]; // Por defecto, la ciudad está siempre desbloqueada
  }
}

async function canUnlockLocation(userId, locationType) {
  // Esta función debería verificar si el usuario cumple los requisitos
  // Por ahora, devuelve true si el nivel es suficiente
  const userStats = await getUserWorldStats(userId);
  const locationDef = LOCATION_DEFINITIONS[locationType];
  return (userStats.explorationLevel || 1) >= locationDef.requirements.level;
}

async function getLastExploration(userId, locationType) {
  try {
    const last = await db.get(
      'SELECT * FROM location_explorations WHERE user_id = ? AND location_type = ? ORDER BY exploration_time DESC LIMIT 1',
      [userId, locationType]
    );
    return last;
  } catch (error) {
    worldLogger.error('Error al obtener última exploración:', error);
    return null;
  }
}

async function getTodayExplorations(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const count = await db.get(
      'SELECT COUNT(*) as count FROM location_explorations WHERE user_id = ? AND DATE(exploration_time) = ?',
      [userId, today]
    );
    return count.count || 0;
  } catch (error) {
    worldLogger.error('Error al obtener exploraciones de hoy:', error);
    return 0;
  }
}

async function performExploration(userId, locationType) {
  const locationDef = LOCATION_DEFINITIONS[locationType];
  const baseRewards = locationDef.rewards;
  
  // Calcular recompensas con bonus
  const userStats = await getUserWorldStats(userId);
  const levelBonus = 1 + (userStats.explorationLevel - 1) * 0.1;
  
  const result = {
    exp: Math.floor(baseRewards.exp * levelBonus),
    coins: Math.floor(baseRewards.coins * levelBonus),
    items: [],
    encounter: null,
    discovery: null
  };
  
  // Posibles encuentros
  const random = Math.random();
  if (random < 0.3) {
    result.encounter = 'NPC amigable';
    result.coins += Math.floor(100 * levelBonus);
  } else if (random < 0.5) {
    result.encounter = 'Criatura salvaje';
    result.exp += Math.floor(50 * levelBonus);
  } else if (random < 0.7) {
    result.items.push('Poción curativa');
  } else if (random < 0.9) {
    result.discovery = 'Tesoro escondido';
    result.coins += Math.floor(200 * levelBonus);
  }
  
  return result;
}

async function getActiveMissions(userId) {
  try {
    const missions = await db.all(
      'SELECT * FROM user_missions WHERE user_id = ? AND status = "active"',
      [userId]
    );
    return missions;
  } catch (error) {
    worldLogger.error('Error al obtener misiones activas:', error);
    return [];
  }
}

async function getAvailableMissions(userId) {
  try {
    const userStats = await getUserWorldStats(userId);
    const available = [];
    
    Object.values(MISSION_DEFINITIONS).forEach(missionDef => {
      if (userStats.explorationLevel >= missionDef.requirements.level) {
        available.push(missionDef);
      }
    });
    
    return available;
  } catch (error) {
    worldLogger.error('Error al obtener misiones disponibles:', error);
    return [];
  }
}

function calculateMissionProgress(userId, mission) {
  const missionDef = MISSION_DEFINITIONS[mission.mission_id];
  if (!missionDef) return { completed: 0, total: 0, percentage: 0, completedObjectives: [] };
  
  const completedObjectives = [];
  let completed = 0;
  
  missionDef.objectives.forEach((objective, index) => {
    const isCompleted = Math.random() > 0.5; // Simulación - debería verificarse en la base de datos
    completedObjectives[index] = isCompleted;
    if (isCompleted) completed++;
  });
  
  return {
    completed,
    total: missionDef.objectives.length,
    percentage: (completed / missionDef.objectives.length) * 100,
    completedObjectives
  };
}

function getObjectiveText(objective) {
  const texts = {
    visit_location: `Visitar ${objective.target}`,
    talk_npc: `Hablar con ${objective.target}`,
    collect_item: `Recoger ${objective.count} ${objective.target}`,
    defeat_monster: `Derrotar ${objective.count} ${objective.target}`,
    meditate: `Meditar ${objective.count} veces`,
    offer_item: `Ofrecer ${objective.target}`,
    defeat_boss: `Derrotar a ${objective.target}`,
    collect_treasure: `Recoger ${objective.count} tesoros`
  };
  
  const baseText = texts[objective.type] || objective.type;
  return objective.count > 1 ? `${baseText} (${objective.count})` : baseText;
}

async function getLastDungeonRun(userId) {
  try {
    const last = await db.get(
      'SELECT * FROM dungeon_runs WHERE user_id = ? ORDER BY run_time DESC LIMIT 1',
      [userId]
    );
    return last;
  } catch (error) {
    worldLogger.error('Error al obtener última mazmorra:', error);
    return null;
  }
}

async function runDungeon(userId) {
  const floors = Math.floor(Math.random() * 5) + 1; // 1-5 pisos
  const success = Math.random() > 0.3; // 70% de éxito
  
  const result = {
    floors,
    exp: floors * 100,
    coins: floors * 200,
    items: [],
    bossDefeated: success && floors >= 3 ? 'Demon Lord' : null,
    death: !success
  };
  
  if (success && floors >= 2) {
    result.items.push('Arma mágica');
  }
  
  if (success && floors >= 4) {
    result.items.push('Armadura legendaria');
  }
  
  return result;
}

async function getExplorationHistory(userId) {
  try {
    const history = await db.all(
      'SELECT * FROM location_explorations WHERE user_id = ? ORDER BY exploration_time DESC',
      [userId]
    );
    return history;
  } catch (error) {
    worldLogger.error('Error al obtener historial de exploración:', error);
    return [];
  }
}

// Inicializar tablas de mundo
async function initializeWorldTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_world_stats (
        user_id TEXT PRIMARY KEY,
        exploration_level INTEGER DEFAULT 1,
        exploration_points INTEGER DEFAULT 0,
        current_location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS location_explorations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        location_type TEXT,
        exploration_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        result TEXT
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_missions (
        user_id TEXT,
        mission_id TEXT,
        accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        status TEXT DEFAULT 'active',
        PRIMARY KEY (user_id, mission_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS dungeon_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        run_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        result TEXT,
        floors_completed INTEGER
      )
    `);
    
    worldLogger.success('Tablas de mundo inicializadas');
  } catch (error) {
    worldLogger.error('Error al inicializar tablas de mundo:', error);
  }
}

// Función duplicada eliminada - usar la definición anterior (líneas 898-917)

async function getUnlockedLocations(userId) {
  try {
    const unlocked = await db.all(
      'SELECT DISTINCT location_type FROM location_explorations WHERE user_id = ?',
      [userId]
    );
    const locations = unlocked.map(u => u.location_type);
    // Si no hay exploraciones, dar la ciudad por defecto
    return locations.length > 0 ? locations : [LOCATION_TYPES.CITY];
  } catch (error) {
    worldLogger.error('Error al obtener lugares desbloqueados:', error);
    return [LOCATION_TYPES.CITY]; // Por defecto, la ciudad está siempre desbloqueada
  }
}

// Función duplicada eliminada - usar la definición corregida anteriormente

// Exportar configuración y funciones necesarias
export const command = [
  '.mundo', '.explorar', '.viajar', '.lugares', '.misiones', '.aceptar_mision',
  '.progreso_mision', '.mazmorra', '.mapa'
];
export const alias = [
  '.world', '.explore', '.travel', '.locations', '.missions', '.accept_mission',
  '.mission_progress', '.dungeon', '.personal_map'
];
export const description = 'Sistema de mundo y exploración';

// Inicializar sistema
initializeWorldTables();
loadCharacters();

export { CONFIG, worldLogger, LOCATION_TYPES, MISSION_TYPES, LOCATION_DEFINITIONS, MISSION_DEFINITIONS };
