/**
 * @file Plugin Waifu Events - Sistema de eventos temporales y especiales
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de eventos temporales, festivales y actividades especiales
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
  getUserBalance,
  updateUserBalance,
  getUserWaifus,
  validateUserWaifu,
  logger
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  eventDuration: 7 * 24 * 60 * 60 * 1000, // 7 días por evento
  eventCooldown: 24 * 60 * 60 * 1000, // 24 horas entre eventos
  maxParticipants: 50,
  bonusMultiplier: 2.0 // 2x EXP durante eventos
};

// Sistema de logging
const eventsLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[EVENTS] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[EVENTS] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[EVENTS] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[EVENTS] ❌ ${message}`)
};

// Tipos de eventos disponibles
const EVENT_TYPES = {
  FESTIVAL: 'festival',
  TOURNAMENT: 'tournament',
  SEASONAL: 'seasonal',
  SPECIAL: 'special',
  BONUS: 'bonus'
};

// Definiciones de eventos
const EVENT_DEFINITIONS = {
  [EVENT_TYPES.FESTIVAL]: {
    name: 'Festival de Waifus',
    description: 'Un festival especial donde todas las waifus celebran',
    duration: CONFIG.eventDuration,
    bonus: { exp: 2.0, affection: 1.5, happiness: 1.5 },
    color: '#FF69B4',
    emoji: '🎉'
  },
  [EVENT_TYPES.TOURNAMENT]: {
    name: 'Torneo de Batalla',
    description: 'Competencia masiva de batallas entre waifus',
    duration: CONFIG.eventDuration,
    bonus: { exp: 3.0, battleReward: 2.0 },
    color: '#FF4500',
    emoji: '⚔️'
  },
  [EVENT_TYPES.SEASONAL]: {
    name: 'Evento de Temporada',
    description: 'Celebración especial según la temporada actual',
    duration: CONFIG.eventDuration,
    bonus: { exp: 1.8, seasonal: true },
    color: '#32CD32',
    emoji: '🌸'
  },
  [EVENT_TYPES.SPECIAL]: {
    name: 'Evento Especial',
    description: 'Evento único con recompensas exclusivas',
    duration: CONFIG.eventDuration / 2,
    bonus: { exp: 2.5, special: true },
    color: '#9400D3',
    emoji: '✨'
  },
  [EVENT_TYPES.BONUS]: {
    name: 'Bonificación Global',
    description: 'Bonificaciones temporales para todas las actividades',
    duration: 24 * 60 * 60 * 1000, // 24 horas
    bonus: { exp: 1.5, allActivities: true },
    color: '#FFD700',
    emoji: '💰'
  }
};

/**
 * Sistema de eventos temporales
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.evento':
        await showCurrentEvent(sock, m, userId);
        break;
      case '.eventos':
        await showEventList(sock, m, userId);
        break;
      case '.participar':
        await participateInEvent(sock, m, userId, text);
        break;
      case '.premios_evento':
        await showEventRewards(sock, m, userId);
        break;
      default:
        eventsLogger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    eventsLogger.error('Error en el sistema de eventos:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de eventos. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Muestra el evento actual
 */
async function showCurrentEvent(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    let currentEvent, nextEventTime;
    
    try {
      currentEvent = await getCurrentEvent();
    } catch (error) {
      eventsLogger.error('Error obteniendo evento actual:', error);
      currentEvent = null;
    }
    
    if (!currentEvent) {
      try {
        nextEventTime = await getNextEventTime();
      } catch (error) {
        eventsLogger.error('Error obteniendo próximo evento:', error);
        nextEventTime = 'Próximamente';
      }
      
      return await sock.sendMessage(chatId, {
        text: `📅 *NO HAY EVENTOS ACTIVOS*\n\n` +
              `⏰ *Próximo evento:* ${nextEventTime}\n\n` +
              `💡 *Usa \`.eventos\` para ver todos los eventos disponibles*\n` +
              `🎯 *Usa \`.participar\` cuando haya un evento activo`
      }, { quoted: m });
    }
    
    let eventDef, participants, timeRemaining;
    
    try {
      eventDef = EVENT_DEFINITIONS[currentEvent.type];
    } catch (error) {
      eventsLogger.error('Error obteniendo definición de evento:', error);
      eventDef = { name: 'Evento Desconocido', description: 'Descripción no disponible', emoji: '📅' };
    }
    
    try {
      participants = await getEventParticipants(currentEvent.id);
    } catch (error) {
      eventsLogger.error('Error obteniendo participantes:', error);
      participants = [];
    }
    
    try {
      timeRemaining = getTimeRemaining(currentEvent.end_time);
    } catch (error) {
      eventsLogger.error('Error calculando tiempo restante:', error);
      timeRemaining = 'Tiempo no disponible';
    }
    
    let eventMessage = `${eventDef.emoji} *${eventDef.name}* ${eventDef.emoji}\n\n`;
    eventMessage += `📝 *Descripción:* ${eventDef.description}\n`;
    eventMessage += `⏰ *Tiempo restante:* ${timeRemaining}\n`;
    eventMessage += `👥 *Participantes:* ${participants.length}/${CONFIG.maxParticipants}\n`;
    eventMessage += `🎁 *Bonificaciones activas:*\n`;
    
    Object.entries(eventDef.bonus).forEach(([key, value]) => {
      const bonusText = getBonusText(key, value);
      eventMessage += `• ${bonusText}\n`;
    });
    
    eventMessage += `\n💡 *Comandos del evento:*\n`;
    eventMessage += `• \`.participar\` - Unirse al evento\n`;
    eventMessage += `• \`.premios_evento\` - Ver recompensas\n`;
    eventMessage += `• \`.eventos\` - Ver todos los eventos`;
    
    await sock.sendMessage(chatId, { text: eventMessage }, { quoted: m });
    
  } catch (error) {
    eventsLogger.error('Error al mostrar evento actual:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar información del evento.'
    }, { quoted: m });
  }
}

/**
 * Muestra la lista de todos los eventos
 */
async function showEventList(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const currentEvent = await getCurrentEvent();
    let listMessage = `🎊 *LISTA DE EVENTOS* 🎊\n\n`;
    
    Object.entries(EVENT_DEFINITIONS).forEach(([type, eventDef]) => {
      const isActive = currentEvent && currentEvent.type === type;
      const status = isActive ? '🟢 ACTIVO' : '⏳ INACTIVO';
      
      listMessage += `${eventDef.emoji} *${eventDef.name}*\n`;
      listMessage += `📝 ${eventDef.description}\n`;
      listMessage += `🎯 ${status}\n`;
      listMessage += `⏰ Duración: ${formatDuration(eventDef.duration)}\n`;
      listMessage += `🎁 Bonificaciones: `;
      
      const bonuses = Object.keys(eventDef.bonus).map(key => getBonusText(key, eventDef.bonus[key])).join(', ');
      listMessage += `${bonuses}\n\n`;
    });
    
    listMessage += `💡 *Cómo participar:*\n`;
    listMessage += `• Espera a que un evento esté activo\n`;
    listMessage += `• Usa \`.participar\` para unirte\n`;
    listMessage += `• Disfruta de las bonificaciones especiales`;
    
    await sock.sendMessage(chatId, { text: listMessage }, { quoted: m });
    
  } catch (error) {
    eventsLogger.error('Error al mostrar lista de eventos:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la lista de eventos.'
    }, { quoted: m });
  }
}

/**
 * Permite participar en un evento activo
 */
async function participateInEvent(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  
  try {
    const currentEvent = await getCurrentEvent();
    
    if (!currentEvent) {
      return await sock.sendMessage(chatId, {
        text: `❌ No hay eventos activos actualmente.\n\n` +
              `💡 *Usa \`.evento\` para ver cuándo será el próximo evento`
      }, { quoted: m });
    }
    
    // Verificar si ya está participando
    const alreadyParticipating = await db.get(
      'SELECT user_id FROM event_participants WHERE event_id = ? AND user_id = ?',
      [currentEvent.id, userId]
    );
    
    if (alreadyParticipating) {
      return await sock.sendMessage(chatId, {
        text: `✅ Ya estás participando en el evento actual.\n\n` +
              `🎯 *Usa \`.premios_evento\` para ver las recompensas disponibles`
      }, { quoted: m });
    }
    
    // Verificar límite de participantes
    const participants = await getEventParticipants(currentEvent.id);
    if (participants.length >= CONFIG.maxParticipants) {
      return await sock.sendMessage(chatId, {
        text: `❌ El evento ha alcanzado el límite de participantes.\n\n` +
              `👥 *Límite:* ${CONFIG.maxParticipants} participantes`
      }, { quoted: m });
    }
    
    // Registrar participación
    await db.run(
      'INSERT INTO event_participants (event_id, user_id, join_time) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [currentEvent.id, userId]
    );
    
    const eventDef = EVENT_DEFINITIONS[currentEvent.type];
    
    let successMessage = `🎉 *¡TE HAS UNIDO AL EVENTO!* 🎉\n\n`;
    successMessage += `${eventDef.emoji} *${eventDef.name}*\n`;
    successMessage += `👤 *@${userId.split('@')[0]}*\n`;
    successMessage += `⏰ *Tiempo de unión:* ${new Date().toLocaleString()}\n\n`;
    successMessage += `🎁 *Ahora disfrutarás de las bonificaciones especiales:*\n`;
    
    Object.entries(eventDef.bonus).forEach(([key, value]) => {
      const bonusText = getBonusText(key, value);
      successMessage += `• ${bonusText}\n`;
    });
    
    successMessage += `\n💡 *Usa \`.premios_evento\` para ver las recompensas`;
    
    await sock.sendMessage(chatId, { 
      text: successMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    eventsLogger.success(`Usuario ${userId} se unió al evento ${currentEvent.type}`);
    
  } catch (error) {
    eventsLogger.error('Error al participar en evento:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al unirse al evento. Intenta nuevamente.'
    }, { quoted: m });
  }
}

/**
 * Muestra las recompensas del evento actual
 */
async function showEventRewards(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const currentEvent = await getCurrentEvent();
    
    if (!currentEvent) {
      return await sock.sendMessage(chatId, {
        text: '❌ No hay eventos activos actualmente.'
      }, { quoted: m });
    }
    
    const isParticipating = await db.get(
      'SELECT user_id FROM event_participants WHERE event_id = ? AND user_id = ?',
      [currentEvent.id, userId]
    );
    
    if (!isParticipating) {
      return await sock.sendMessage(chatId, {
        text: `❌ No estás participando en el evento actual.\n\n` +
              `💡 *Usa \`.participar\` para unirte primero`
      }, { quoted: m });
    }
    
    const eventDef = EVENT_DEFINITIONS[currentEvent.type];
    const userStats = await getUserEventStats(userId, currentEvent.id);
    
    let rewardsMessage = `🎁 *PREMIOS DEL EVENTO* 🎁\n\n`;
    rewardsMessage += `${eventDef.emoji} *${eventDef.name}*\n`;
    rewardsMessage += `👤 *@${userId.split('@')[0]}*\n\n`;
    
    rewardsMessage += `📊 *Tus estadísticas en el evento:*\n`;
    rewardsMessage += `• Interacciones: ${userStats.interactions || 0}\n`;
    rewardsMessage += `• EXP ganada: ${(userStats.expGained || 0).toLocaleString()}\n`;
    rewardsMessage += `• Tiempo participando: ${formatDuration(userStats.participationTime || 0)}\n\n`;
    
    rewardsMessage += `🎯 *Recompensas disponibles:*\n`;
    
    // Recompensas basadas en el tipo de evento
    switch (currentEvent.type) {
      case EVENT_TYPES.FESTIVAL:
        rewardsMessage += `• 🎊 *Pack Festival* - 3 waifus aleatorias (rareza+)\n`;
        rewardsMessage += `• 💖 *Corazón Extra* - +50 afecto para tu waifu principal\n`;
        rewardsMessage += `• 🌟 *Estrella Festival* - Badge exclusivo del evento\n`;
        break;
        
      case EVENT_TYPES.TOURNAMENT:
        rewardsMessage += `⚔️ *Campeón de Batalla* - Waifu legendaria aleatoria\n`;
        rewardsMessage += `💰 *Premio Torneo* - 50000 💎\n`;
        rewardsMessage += `🏆 *Trofeo de Campeón* - Badge de campeón\n`;
        break;
        
      case EVENT_TYPES.SEASONAL:
        rewardsMessage += `🌸 *Regalo de Temporada* - Waifu temática de la temporada\n`;
        rewardsMessage += `🎁 *Caja Misteriosa* - Items aleatorios\n`;
        rewardsMessage += `✨ *Gema Estacional* - Item especial de temporada\n`;
        break;
        
      case EVENT_TYPES.SPECIAL:
        rewardsMessage += `✨ *Waifu Mítica* - Personaje ultra raro\n`;
        rewardsMessage += `🎭 *Máscara Especial* - Accesorio exclusivo\n`;
        rewardsMessage += `👑 *Corona Especial* - Badge de evento especial\n`;
        break;
        
      case EVENT_TYPES.BONUS:
        rewardsMessage += `💰 *Bono Extra* - +10000 💎\n`;
        rewardsMessage += `📈 *EXP Boost* - 2x EXP por 24 horas\n`;
        rewardsMessage += `🎯 *Suerte Extra* - Mayor probabilidad de waifus raras\n`;
        break;
    }
    
    rewardsMessage += `\n📋 *Cómo reclamar premios:*\n`;
    rewardsMessage += `• Completa actividades durante el evento\n`;
    rewardsMessage += `• Acumula puntos y estadísticas\n`;
    rewardsMessage += `• Los premios se entregan al final del evento\n\n`;
    rewardsMessage += `⏰ *Tiempo restante:* ${getTimeRemaining(currentEvent.end_time)}`;
    
    await sock.sendMessage(chatId, { 
      text: rewardsMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    eventsLogger.error('Error al mostrar premios de evento:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar los premios del evento.'
    }, { quoted: m });
  }
}

/**
 * Funciones auxiliares
 */
async function getCurrentEvent() {
  try {
    const now = new Date().toISOString();
    const event = await db.get(
      'SELECT * FROM active_events WHERE start_time <= ? AND end_time >= ?',
      [now, now]
    );
    return event;
  } catch (error) {
    eventsLogger.error('Error al obtener evento actual:', error);
    return null;
  }
}

async function getEventParticipants(eventId) {
  try {
    const participants = await db.all(
      'SELECT user_id FROM event_participants WHERE event_id = ?',
      [eventId]
    );
    return participants;
  } catch (error) {
    eventsLogger.error('Error al obtener participantes:', error);
    return [];
  }
}

async function getUserEventStats(userId, eventId) {
  try {
    const stats = await db.get(
      'SELECT COUNT(*) as interactions, SUM(exp_gained) as expGained, ' +
      '(julianday(CURRENT_TIMESTAMP) - julianday(join_time)) * 86400000 as participationTime ' +
      'FROM event_participants WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );
    return stats || { interactions: 0, expGained: 0, participationTime: 0 };
  } catch (error) {
    eventsLogger.error('Error al obtener estadísticas de usuario:', error);
    return { interactions: 0, expGained: 0, participationTime: 0 };
  }
}

function getTimeRemaining(endTime) {
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

function formatDuration(ms) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days} días`;
  if (hours > 0) return `${hours} horas`;
  return 'Menos de 1 hora';
}

function getBonusText(key, value) {
  const bonusTexts = {
    exp: `EXP ×${value}`,
    affection: `Afecto ×${value}`,
    happiness: `Felicidad ×${value}`,
    battleReward: `Recompensas de batalla ×${value}`,
    seasonal: 'Bonificaciones de temporada',
    special: 'Recompensas exclusivas',
    allActivities: 'Todas las actividades bonificadas'
  };
  
  return bonusTexts[key] || `${key}: ${value}`;
}

async function getNextEventTime() {
  // Lógica para calcular cuándo será el próximo evento
  // Por ahora, devuelve un valor genérico
  return 'Próximamente...';
}

// Inicializar tablas de eventos
async function initializeEventTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS active_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        user_id TEXT,
        join_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        interactions INTEGER DEFAULT 0,
        exp_gained INTEGER DEFAULT 0,
        FOREIGN KEY (event_id) REFERENCES active_events (id),
        UNIQUE(event_id, user_id)
      )
    `);
    
    eventsLogger.success('Tablas de eventos inicializadas');
  } catch (error) {
    eventsLogger.error('Error al inicializar tablas de eventos:', error);
  }
}

// Exportar configuración y funciones necesarias
export const command = ['.evento', '.eventos', '.participar', '.premios_evento'];
export const alias = ['.event', '.events', '.join_event', '.event_rewards'];
export const description = 'Sistema de eventos temporales y especiales para waifus';

// Inicializar sistema al iniciar
(async () => {
  try {
    // Asegurar que las tablas existan
    await initializeEventTables();
    // Cargar personajes
    await loadCharacters();
    eventsLogger.success('Sistema de eventos waifu inicializado correctamente');
  } catch (error) {
    eventsLogger.error('Error inicializando sistema de eventos waifu:', error);
  }
})();

export { CONFIG, eventsLogger, getCurrentEvent, EVENT_TYPES, EVENT_DEFINITIONS };
