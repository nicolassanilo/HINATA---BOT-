/**
 * @file Plugin Eventos Temporales - Sistema de eventos de temporada y especiales
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de eventos temporales con misiones especiales, recompensas únicas e integración con waifus
 */

import { db } from './db.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  eventDuration: 7 * 24 * 60 * 60 * 1000, // 7 días por evento
  eventCooldown: 24 * 60 * 60 * 1000, // 24 horas entre eventos
  maxParticipants: 100,
  bonusMultiplier: 2.0, // 2x EXP durante eventos
  specialRewards: true,
  notificationInterval: 6 * 60 * 60 * 1000 // 6 horas para notificaciones
};

// Sistema de logging
const eventsLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[EVENTS] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[EVENTS] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[EVENTS] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[EVENTS] ❌ ${message}`)
};

// Tipos de eventos de temporada
const EVENT_TYPES = {
  SEASONAL: 'seasonal',
  SPECIAL: 'special',
  LIMITED: 'limited',
  COMMUNITY: 'community'
};

// Definiciones de eventos de temporada
const SEASONAL_EVENTS = {
  CHRISTMAS: {
    id: 'christmas',
    name: 'Navidad',
    emoji: '🎄',
    type: EVENT_TYPES.SEASONAL,
    startDate: { month: 12, day: 20 },
    endDate: { month: 12, day: 31 },
    description: 'Celebración navideña con waifus especiales y recompensas festivas',
    theme: {
      colors: ['🔴', '🟢', '⚪'],
      background: '❄️',
      music: '🎵'
    },
    bonuses: {
      expMultiplier: 2.0,
      dropRate: 1.5,
      specialCurrency: '🎁'
    },
    specialWaifus: ['Santa Claus Girl', 'Reindeer Girl', 'Snow Princess'],
    missions: [
      {
        id: 'christmas_1',
        name: 'Espíritu Navideño',
        description: 'Interactúa con 5 waifus diferentes',
        reward: { exp: 100, currency: 50, specialItem: 'Calcetín Navideño' },
        requirement: { type: 'interactions', count: 5 }
      },
      {
        id: 'christmas_2',
        name: 'Regalos para Todos',
        description: 'Envía 3 regalos a amigos',
        reward: { exp: 150, currency: 75, specialItem: 'Caja de Regalos' },
        requirement: { type: 'gifts', count: 3 }
      },
      {
        id: 'christmas_3',
        name: 'Árbol de Navidad',
        description: 'Decora tu cuarto con temática navideña',
        reward: { exp: 200, currency: 100, specialWaifu: 'Santa Claus Girl' },
        requirement: { type: 'decoration', theme: 'christmas' }
      }
    ]
  },
  HALLOWEEN: {
    id: 'halloween',
    name: 'Halloween',
    emoji: '🎃',
    type: EVENT_TYPES.SEASONAL,
    startDate: { month: 10, day: 25 },
    endDate: { month: 10, day: 31 },
    description: 'Terror y misterio con waifus espeluznantes',
    theme: {
      colors: ['🟠', '⚫', '🟣'],
      background: '🌙',
      music: '🎃'
    },
    bonuses: {
      expMultiplier: 1.8,
      dropRate: 2.0,
      specialCurrency: '🍬'
    },
    specialWaifus: ['Vampire Girl', 'Witch Girl', 'Ghost Girl'],
    missions: [
      {
        id: 'halloween_1',
        name: 'Noche de Brujas',
        description: 'Completa 3 misiones del mundo',
        reward: { exp: 120, currency: 60, specialItem: 'Calabaza de Dulces' },
        requirement: { type: 'missions', count: 3 }
      },
      {
        id: 'halloween_2',
        name: 'Truco o Trato',
        description: 'Visita 5 amigos diferentes',
        reward: { exp: 180, currency: 90, specialItem: 'Disfraz de Vampiro' },
        requirement: { type: 'visits', count: 5 }
      },
      {
        id: 'halloween_3',
        name: 'Casa Embrujada',
        description: 'Explora una mazmorra de dificultad alta',
        reward: { exp: 250, currency: 125, specialWaifu: 'Vampire Girl' },
        requirement: { type: 'dungeon', difficulty: 'hard' }
      }
    ]
  },
  VALENTINES: {
    id: 'valentines',
    name: 'San Valentín',
    emoji: '💕',
    type: EVENT_TYPES.SEASONAL,
    startDate: { month: 2, day: 10 },
    endDate: { month: 2, day: 15 },
    description: 'Celebración del amor con waifus románticas',
    theme: {
      colors: ['🌸', '❤️', '💗'],
      background: '💕',
      music: '🎵'
    },
    bonuses: {
      expMultiplier: 2.5,
      dropRate: 1.8,
      specialCurrency: '💝'
    },
    specialWaifus: ['Cupid Girl', 'Love Goddess', 'Romantic Princess'],
    missions: [
      {
        id: 'valentines_1',
        name: 'Amor Eterno',
        description: 'Aumenta el afecto de tu waifu favorita al máximo',
        reward: { exp: 150, currency: 75, specialItem: 'Corazón de Cristal' },
        requirement: { type: 'affection', value: 100 }
      },
      {
        id: 'valentines_2',
        name: 'Cita Romántica',
        description: 'Realiza una interacción romántica con tu waifu',
        reward: { exp: 100, currency: 50, specialItem: 'Rosa Eterna' },
        requirement: { type: 'interaction', type: 'romantic' }
      },
      {
        id: 'valentines_3',
        name: 'Pareja Perfecta',
        description: 'Equipa un outfit romántico a tu waifu',
        reward: { exp: 200, currency: 100, specialWaifu: 'Cupid Girl' },
        requirement: { type: 'outfit', category: 'romantic' }
      }
    ]
  },
  NEW_YEAR: {
    id: 'new_year',
    name: 'Año Nuevo',
    emoji: '🎆',
    type: EVENT_TYPES.SEASONAL,
    startDate: { month: 12, day: 30 },
    endDate: { month: 1, day: 2 },
    description: 'Bienvenida al nuevo año con celebraciones especiales',
    theme: {
      colors: ['🎆', '✨', '🎇'],
      background: '🌟',
      music: '🎉'
    },
    bonuses: {
      expMultiplier: 3.0,
      dropRate: 2.5,
      specialCurrency: '🎊'
    },
    specialWaifus: ['Firework Girl', 'New Year Princess', 'Fortune Teller'],
    missions: [
      {
        id: 'new_year_1',
        name: 'Años Nuevos',
        description: 'Sube de nivel 3 waifus diferentes',
        reward: { exp: 200, currency: 100, specialItem: 'Fuegos Artificiales' },
        requirement: { type: 'level_up', count: 3 }
      },
      {
        id: 'new_year_2',
        name: 'Propósitos',
        description: 'Completa 5 misiones del mundo',
        reward: { exp: 250, currency: 125, specialItem: 'Calendario del Año Nuevo' },
        requirement: { type: 'missions', count: 5 }
      },
      {
        id: 'new_year_3',
        name: 'Celebración',
        description: 'Participa en una fiesta con amigos',
        reward: { exp: 300, currency: 150, specialWaifu: 'Firework Girl' },
        requirement: { type: 'party', participants: 5 }
      }
    ]
  },
  SUMMER: {
    id: 'summer',
    name: 'Verano',
    emoji: '☀️',
    type: EVENT_TYPES.SEASONAL,
    startDate: { month: 6, day: 20 },
    endDate: { month: 9, day: 23 },
    description: 'Días de sol y playa con waifus veraniegas',
    theme: {
      colors: ['☀️', '🌊', '🏖️'],
      background: '🏝️',
      music: '🎵'
    },
    bonuses: {
      expMultiplier: 1.5,
      dropRate: 1.3,
      specialCurrency: '🍦'
    },
    specialWaifus: ['Beach Girl', 'Surfer Girl', 'Ice Cream Girl'],
    missions: [
      {
        id: 'summer_1',
        name: 'Días de Playa',
        description: 'Decora tu cuarto con temática de playa',
        reward: { exp: 100, currency: 50, specialItem: 'Sombrero de Playa' },
        requirement: { type: 'decoration', theme: 'beach' }
      },
      {
        id: 'summer_2',
        name: 'Refrescante',
        description: 'Realiza 5 interacciones de verano',
        reward: { exp: 150, currency: 75, specialItem: 'Helado' },
        requirement: { type: 'interactions', category: 'summer', count: 5 }
      },
      {
        id: 'summer_3',
        name: 'Vacaciones',
        description: 'Viaja a 3 lugares diferentes del mundo',
        reward: { exp: 200, currency: 100, specialWaifu: 'Beach Girl' },
        requirement: { type: 'travel', locations: 3 }
      }
    ]
  }
};

// Eventos especiales limitados
const SPECIAL_EVENTS = {
  ANNIVERSARY: {
    id: 'anniversary',
    name: 'Aniversario del Bot',
    emoji: '🎉',
    type: EVENT_TYPES.SPECIAL,
    duration: 3 * 24 * 60 * 60 * 1000, // 3 días
    description: 'Celebración del aniversario con recompensas exclusivas',
    bonuses: {
      expMultiplier: 5.0,
      dropRate: 3.0,
      specialCurrency: '🎂'
    },
    specialWaifus: ['Anniversary Girl', 'Special Edition Waifu'],
    missions: [
      {
        id: 'anniversary_1',
        name: 'Celebración',
        description: 'Participa en 10 partidas de trivia',
        reward: { exp: 500, currency: 250, specialItem: 'Pastel de Aniversario' },
        requirement: { type: 'trivia', count: 10 }
      },
      {
        id: 'anniversary_2',
        name: 'Veterano',
        description: 'Juega con el bot durante 7 días',
        reward: { exp: 1000, currency: 500, specialWaifu: 'Anniversary Girl' },
        requirement: { type: 'daily_login', days: 7 }
      }
    ]
  },
  COLLABORATION: {
    id: 'collaboration',
    name: 'Colaboración Especial',
    emoji: '🤝',
    type: EVENT_TYPES.SPECIAL,
    duration: 5 * 24 * 60 * 60 * 1000, // 5 días
    description: 'Colaboración con otros bots o comunidades',
    bonuses: {
      expMultiplier: 2.5,
      dropRate: 2.0,
      specialCurrency: '🌟'
    },
    specialWaifus: ['Collaboration Exclusive'],
    missions: [
      {
        id: 'collab_1',
        name: 'Trabajo en Equipo',
        description: 'Completa misiones con amigos',
        reward: { exp: 300, currency: 150, specialItem: 'Insignia de Colaboración' },
        requirement: { type: 'cooperative', count: 5 }
      }
    ]
  }
};

// Almacenamiento de eventos activos
const activeEvents = new Map();
const userProgress = new Map();
const eventNotifications = new Map();

// Funciones auxiliares
function getCurrentDate() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    timestamp: now.getTime()
  };
}

function isEventActive(event) {
  const current = getCurrentDate();
  const startDate = new Date(current.year, event.startDate.month - 1, event.startDate.day);
  const endDate = new Date(current.year, event.endDate.month - 1, event.endDate.day);
  
  // Ajustar año si el evento cruza el año nuevo
  if (event.startDate.month > event.endDate.month) {
    endDate.setFullYear(current.year + 1);
  }
  
  const now = new Date();
  return now >= startDate && now <= endDate;
}

function getActiveSeasonalEvents() {
  const active = [];
  Object.values(SEASONAL_EVENTS).forEach(event => {
    if (isEventActive(event)) {
      active.push(event);
    }
  });
  return active;
}

async function initializeEventTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS event_participants (
        user_id TEXT,
        event_id TEXT,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        missions_completed INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        special_currency INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, event_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS event_missions_progress (
        user_id TEXT,
        event_id TEXT,
        mission_id TEXT,
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        completed_at DATETIME,
        PRIMARY KEY (user_id, event_id, mission_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS event_rewards (
        user_id TEXT,
        event_id TEXT,
        reward_type TEXT,
        reward_value TEXT,
        claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, event_id, reward_type, reward_value)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS event_schedule (
        event_id TEXT PRIMARY KEY,
        event_name TEXT,
        start_date DATETIME,
        end_date DATETIME,
        is_active BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    eventsLogger.success('Tablas de eventos inicializadas');
  } catch (error) {
    eventsLogger.error('Error al inicializar tablas de eventos:', error);
  }
}

async function getUserEventProgress(userId, eventId) {
  try {
    const progress = await db.get(
      'SELECT * FROM event_participants WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );
    
    if (!progress) {
      return {
        user_id: userId,
        event_id: eventId,
        missions_completed: 0,
        total_points: 0,
        special_currency: 0
      };
    }
    
    return progress;
  } catch (error) {
    eventsLogger.error('Error al obtener progreso de evento:', error);
    return null;
  }
}

async function joinEvent(sock, m, userId, eventId) {
  const chatId = m.key.remoteJid;
  
  // Verificar si el evento existe y está activo
  const event = SEASONAL_EVENTS[eventId.toUpperCase()] || SPECIAL_EVENTS[eventId.toUpperCase()];
  if (!event) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Evento no encontrado*\n\n💡 Usa .eventos para ver los eventos disponibles'
    }, { quoted: m });
  }
  
  if (!isEventActive(event) && event.type !== EVENT_TYPES.SPECIAL) {
    return await sock.sendMessage(chatId, {
      text: `❌ *El evento ${event.emoji} ${event.name} no está activo actualmente*\n\n💡 Vuelve durante la fecha del evento`
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario ya está participando
    const existing = await db.get(
      'SELECT * FROM event_participants WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );
    
    if (existing) {
      return await sock.sendMessage(chatId, {
        text: `✅ *Ya estás participando en el evento ${event.emoji} ${event.name}*\n\n💡 Usa .evento_misiones para ver las misiones disponibles`
      }, { quoted: m });
    }
    
    // Registrar participación
    await db.run(
      'INSERT INTO event_participants (user_id, event_id, missions_completed, total_points, special_currency) VALUES (?, ?, 0, 0, 0)',
      [userId, eventId]
    );
    
    let joinMessage = `🎉 *¡Te has unido al evento!* 🎉\n\n`;
    joinMessage += `${event.emoji} *${event.name}*\n`;
    joinMessage += `📝 ${event.description}\n\n`;
    joinMessage += `🎁 *Bonuses del evento:*\n`;
    joinMessage += `   📈 EXP x${event.bonuses.expMultiplier}\n`;
    joinMessage += `   💎 Drop rate x${event.bonuses.dropRate}\n`;
    joinMessage += `   ${event.bonuses.specialCurrency} Moneda especial\n\n`;
    joinMessage += `💡 *Usa .evento_misiones para ver las misiones disponibles*`;
    
    await sock.sendMessage(chatId, { text: joinMessage }, { quoted: m });
    
    eventsLogger.success(`Usuario ${userId} se unió al evento ${eventId}`);
  } catch (error) {
    eventsLogger.error('Error al unirse al evento:', error);
    await sock.sendMessage(chatId, {
      text: '❌ *Error al unirse al evento*'
    }, { quoted: m });
  }
}

async function showEventMissions(sock, m, userId, eventId) {
  const chatId = m.key.remoteJid;
  
  const event = SEASONAL_EVENTS[eventId.toUpperCase()] || SPECIAL_EVENTS[eventId.toUpperCase()];
  if (!event) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Evento no encontrado*\n\n💡 Usa .eventos para ver los eventos disponibles'
    }, { quoted: m });
  }
  
  const progress = await getUserEventProgress(userId, eventId);
  if (!progress) {
    return await sock.sendMessage(chatId, {
      text: `❌ *No estás participando en este evento*\n\n💡 Usa .unir_evento ${eventId} para participar`
    }, { quoted: m });
  }
  
  let missionsText = `📋 *MISIONES DEL EVENTO* 📋\n\n`;
  missionsText += `${event.emoji} *${event.name}*\n`;
  missionsText += `📊 Progreso: ${progress.missions_completed}/${event.missions.length} completadas\n\n`;
  
  for (const mission of event.missions) {
    const missionProgress = await db.get(
      'SELECT * FROM event_missions_progress WHERE user_id = ? AND event_id = ? AND mission_id = ?',
      [userId, eventId, mission.id]
    );
    
    const completed = missionProgress?.completed || false;
    const status = completed ? '✅' : '⏳';
    
    missionsText += `${status} *${mission.name}*\n`;
    missionsText += `   📝 ${mission.description}\n`;
    missionsText += `   🎁 `;
    
    if (mission.reward.exp) missionsText += `EXP: ${mission.reward.exp} `;
    if (mission.reward.currency) missionsText += `Moneda: ${mission.reward.currency} `;
    if (mission.reward.specialItem) missionsText += `Item: ${mission.reward.specialItem} `;
    if (mission.reward.specialWaifu) missionsText += `Waifu: ${mission.reward.specialWaifu} `;
    
    missionsText += `\n\n`;
  }
  
  await sock.sendMessage(chatId, { text: missionsText }, { quoted: m });
}

async function completeMission(sock, m, userId, eventId, missionId) {
  const chatId = m.key.remoteJid;
  
  const event = SEASONAL_EVENTS[eventId.toUpperCase()] || SPECIAL_EVENTS[eventId.toUpperCase()];
  if (!event) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Evento no encontrado*'
    }, { quoted: m });
  }
  
  const mission = event.missions.find(m => m.id === missionId);
  if (!mission) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Misión no encontrada*'
    }, { quoted: m });
  }
  
  try {
    // Verificar si la misión ya está completada
    const existing = await db.get(
      'SELECT * FROM event_missions_progress WHERE user_id = ? AND event_id = ? AND mission_id = ?',
      [userId, eventId, missionId]
    );
    
    if (existing?.completed) {
      return await sock.sendMessage(chatId, {
        text: '✅ *Esta misión ya está completada*'
      }, { quoted: m });
    }
    
    // Marcar misión como completada
    await db.run(`
      INSERT INTO event_missions_progress (user_id, event_id, mission_id, progress, completed, completed_at)
      VALUES (?, ?, ?, 1, TRUE, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, event_id, mission_id) DO UPDATE SET
        completed = TRUE,
        completed_at = CURRENT_TIMESTAMP
    `, [userId, eventId, missionId]);
    
    // Actualizar progreso del usuario
    await db.run(`
      UPDATE event_participants
      SET missions_completed = missions_completed + 1
      WHERE user_id = ? AND event_id = ?
    `, [userId, eventId]);
    
    // Otorgar recompensas
    let rewardMessage = `🎉 *¡MISIÓN COMPLETADA!* 🎉\n\n`;
    rewardMessage += `✅ *${mission.name}*\n\n`;
    rewardMessage += `🎁 *Recompensas:*\n`;
    
    if (mission.reward.exp) {
      // Integrar con sistema de waifus para dar EXP
      rewardMessage += `   📈 EXP: ${mission.reward.exp}\n`;
    }
    
    if (mission.reward.currency) {
      await db.run('UPDATE usuarios SET saldo = saldo + ? WHERE chatId = ?', [mission.reward.currency, userId]);
      rewardMessage += `   💰 Moneda: ${mission.reward.currency}\n`;
    }
    
    if (mission.reward.specialItem) {
      rewardMessage += `   🎁 Item especial: ${mission.reward.specialItem}\n`;
    }
    
    if (mission.reward.specialWaifu) {
      rewardMessage += `   👑 Waifu especial: ${mission.reward.specialWaifu}\n`;
      // Aquí se integraría con el sistema de waifus para otorgar la waifu especial
    }
    
    await sock.sendMessage(chatId, { text: rewardMessage }, { quoted: m });
    
    eventsLogger.success(`Usuario ${userId} completó misión ${missionId} del evento ${eventId}`);
  } catch (error) {
    eventsLogger.error('Error al completar misión:', error);
    await sock.sendMessage(chatId, {
      text: '❌ *Error al completar la misión*'
    }, { quoted: m });
  }
}

async function showActiveEvents(sock, m) {
  const chatId = m.key.remoteJid;
  
  const activeSeasonal = getActiveSeasonalEvents();
  
  let eventsText = `🎉 *EVENTOS ACTIVOS* 🎉\n\n`;
  
  if (activeSeasonal.length === 0) {
    eventsText += `📅 *No hay eventos de temporada activos actualmente*\n\n`;
    eventsText += `💡 *Próximos eventos:*\n`;
    
    const current = getCurrentDate();
    Object.values(SEASONAL_EVENTS).forEach(event => {
      const startDate = new Date(current.year, event.startDate.month - 1, event.startDate.day);
      if (startDate > new Date()) {
        const daysUntil = Math.ceil((startDate - new Date()) / (1000 * 60 * 60 * 24));
        eventsText += `${event.emoji} ${event.name} - En ${daysUntil} días\n`;
      }
    });
  } else {
    eventsText += `📅 *Eventos de temporada:*\n\n`;
    
    activeSeasonal.forEach(event => {
      eventsText += `${event.emoji} *${event.name}*\n`;
      eventsText += `   📝 ${event.description}\n`;
      eventsText += `   🎁 Bonuses: EXP x${event.bonuses.expMultiplier}, Drop x${event.bonuses.dropRate}\n`;
      eventsText += `   👑 Waifus especiales: ${event.specialWaifus.join(', ')}\n\n`;
    });
  }
  
  eventsText += `💡 *Usa .unir_evento [id] para participar en un evento*`;
  eventsText += `\n💡 *Usa .evento_misiones [id] para ver las misiones de un evento*`;
  
  await sock.sendMessage(chatId, { text: eventsText }, { quoted: m });
}

async function showEventProgress(sock, m, userId, eventId) {
  const chatId = m.key.remoteJid;
  
  const progress = await getUserEventProgress(userId, eventId);
  if (!progress) {
    return await sock.sendMessage(chatId, {
      text: `❌ *No estás participando en este evento*\n\n💡 Usa .unir_evento ${eventId} para participar`
    }, { quoted: m });
  }
  
  const event = SEASONAL_EVENTS[eventId.toUpperCase()] || SPECIAL_EVENTS[eventId.toUpperCase()];
  
  let progressText = `📊 *TU PROGRESO EN EL EVENTO* 📊\n\n`;
  progressText += `${event.emoji} *${event.name}*\n\n`;
  progressText += `✅ *Misiones completadas:* ${progress.missions_completed}/${event.missions.length}\n`;
  progressText += `💰 *Puntos totales:* ${progress.total_points}\n`;
  progressText += `${event.bonuses.specialCurrency} *Moneda especial:* ${progress.special_currency}\n\n`;
  
  const percentage = Math.round((progress.missions_completed / event.missions.length) * 100);
  progressText += `📈 *Progreso general:* ${percentage}%\n`;
  
  if (percentage >= 100) {
    progressText += `\n🎉 *¡Has completado todas las misiones del evento!*`;
  } else if (percentage >= 50) {
    progressText += `\n👍 *¡Vas por buen camino!*`;
  } else {
    progressText += `\n💪 *¡Sigue esforzándote!*`;
  }
  
  await sock.sendMessage(chatId, { text: progressText }, { quoted: m });
}

async function claimEventRewards(sock, m, userId, eventId) {
  const chatId = m.key.remoteJid;
  
  const progress = await getUserEventProgress(userId, eventId);
  if (!progress) {
    return await sock.sendMessage(chatId, {
      text: `❌ *No estás participando en este evento*`
    }, { quoted: m });
  }
  
  const event = SEASONAL_EVENTS[eventId.toUpperCase()] || SPECIAL_EVENTS[eventId.toUpperCase()];
  
  if (progress.missions_completed < event.missions.length) {
    return await sock.sendMessage(chatId, {
      text: `❌ *Debes completar todas las misiones para reclamar las recompensas finales*\n\n💡 Progreso: ${progress.missions_completed}/${event.missions.length}`
    }, { quoted: m });
  }
  
  // Verificar si ya se reclamaron las recompensas
  const claimed = await db.get(
    'SELECT * FROM event_rewards WHERE user_id = ? AND event_id = ? AND reward_type = ?',
    [userId, eventId, 'final']
  );
  
  if (claimed) {
    return await sock.sendMessage(chatId, {
      text: '✅ *Ya has reclamado las recompensas finales de este evento*'
    }, { quoted: m });
  }
  
  // Otorgar recompensas finales
  let rewardsMessage = `🎁 *RECOMPENSAS FINALES DEL EVENTO* 🎁\n\n`;
  rewardsMessage += `${event.emoji} *${event.name}*\n\n`;
  rewardsMessage += `🎉 *¡Has completado todas las misiones!*\n\n`;
  rewardsMessage += `🎁 *Recompensas:*\n`;
  rewardsMessage += `   👑 Waifu especial aleatoria del evento\n`;
  rewardsMessage += `   💎 500 moneda especial\n`;
  rewardsMessage += `   📈 1000 EXP bonus\n`;
  
  // Registrar recompensa
  await db.run(
    'INSERT INTO event_rewards (user_id, event_id, reward_type, reward_value) VALUES (?, ?, ?, ?)',
    [userId, eventId, 'final', 'completed_all_missions']
  );
  
  await sock.sendMessage(chatId, { text: rewardsMessage }, { quoted: m });
  
  eventsLogger.success(`Usuario ${userId} reclamó recompensas finales del evento ${eventId}`);
}

// Función principal
export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  try {
    switch (command) {
      case '.eventos':
      case '.evento':
        await showActiveEvents(sock, m);
        break;
        
      case '.unir_evento':
      case '.join_event':
        const eventId = text.trim();
        await joinEvent(sock, m, userId, eventId);
        break;
        
      case '.evento_misiones':
      case '.event_missions':
        const missionEventId = text.trim();
        await showEventMissions(sock, m, userId, missionEventId);
        break;
        
      case '.completar_mision':
      case '.complete_mission':
        const args = text.trim().split(' ');
        if (args.length >= 2) {
          await completeMission(sock, m, userId, args[0], args[1]);
        } else {
          await sock.sendMessage(chatId, {
            text: '❌ *Uso incorrecto*\n\n💡 .completar_mision [evento] [mision]'
          }, { quoted: m });
        }
        break;
        
      case '.evento_progreso':
      case '.event_progress':
        const progressEventId = text.trim();
        await showEventProgress(sock, m, userId, progressEventId);
        break;
        
      case '.reclamar_premio':
      case '.claim_reward':
        const rewardEventId = text.trim();
        await claimEventRewards(sock, m, userId, rewardEventId);
        break;
        
      default:
        await sock.sendMessage(chatId, {
          text: '❌ *Comando no reconocido*\n\n💡 Usa .eventos para ver los comandos disponibles'
        }, { quoted: m });
    }
  } catch (error) {
    eventsLogger.error('Error en sistema de eventos:', error);
    await sock.sendMessage(chatId, {
      text: '❌ *Ocurrió un error en el sistema de eventos*'
    }, { quoted: m });
  }
}

// Exportar comandos
export const command = ['.eventos', '.unir_evento', '.evento_misiones', '.completar_mision', '.evento_progreso', '.reclamar_premio'];
export const alias = ['.evento', '.join_event', '.event_missions', '.complete_mission', '.event_progress', '.claim_reward'];
export const description = 'Sistema de eventos temporales con misiones especiales y recompensas únicas';

// Inicializar tablas al cargar
initializeEventTables();

// Verificar eventos activos automáticamente cada hora
setInterval(() => {
  const activeEvents = getActiveSeasonalEvents();
  if (activeEvents.length > 0) {
    eventsLogger.info(`Eventos activos: ${activeEvents.map(e => e.name).join(', ')}`);
  }
}, 60 * 60 * 1000); // Cada hora
