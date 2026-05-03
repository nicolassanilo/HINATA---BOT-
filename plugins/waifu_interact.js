/**
 * @file Plugin Waifu Interact - Sistema de interacción con waifus
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de interacción con waifus separado del plugin principal
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Importar funciones compartidas desde el core
import { 
  characters, 
  loadCharacters, 
  getWaifuLevel, 
  addWaifuExp, 
  getWaifuStats,
  getRarezaEmoji,
  getRarezaBonus
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  interactionCooldown: 30 * 60 * 1000, // 30 minutos
  maxInteractionsPerDay: 20,
  expBonus: {
    afectar: 15,
    alimentar: 20,
    jugar: 25,
    abrazar: 18,
    dormir: 12,
    entrenar: 30,
    meditar: 10,
    celebrar: 22,
    consolar: 16,
    explorar: 20,
    estudiar: 14,
    bailar: 26,
    cantar: 24,
    pintar: 28,
    leer: 12,
    cocinar: 20,
    viajar: 35,
    comprar: 15,
    descansar: 8,
    jugar_videojuegos: 20,
    hacer_ejercicio: 32,
    ver_pelicula: 18,
    tomar_te: 14,
    escribir_diario: 16,
    jardineria: 22,
    nadar: 28,
    patinar: 25,
    hacer_picnic: 20,
    ver_estrellas: 15,
    hacer_postre: 18,
    practicar_magia: 40,
    tocar_instrumento: 30
  }
};

// Sistema de logging
const logger = {
  info: (message) => CONFIG.enableLogging && console.log(`[INTERACT] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[INTERACT] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[INTERACT] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[INTERACT] ❌ ${message}`),
  debug: (message) => CONFIG.enableLogging && console.log(`[INTERACT] 🔍 ${message}`)
};

/**
 * Sistema de interacción con waifus
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.interact':
        await interactWithWaifu(sock, m, userId, text);
        break;
      case '.interactstats':
        await showInteractionStats(sock, m, userId);
        break;
      default:
        logger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    logger.error('Error en el sistema de interacción:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de interacción. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Función principal de interacción con waifus
 */
async function interactWithWaifu(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    const validActions = Object.keys(CONFIG.expBonus);
    const categories = {
      '💖 Emocionales': ['afectar', 'abrazar', 'consolar', 'celebrar'],
      '🍖 Cuidado': ['alimentar', 'dormir', 'descansar', 'tomar_te'],
      '🎮 Entretenimiento': ['jugar', 'jugar_videojuegos', 'ver_pelicula', 'leer'],
      '🎨 Creativos': ['pintar', 'cantar', 'tocar_instrumento', 'escribir_diario'],
      '🏃 Actividades': ['entrenar', 'hacer_ejercicio', 'bailar', 'nadar'],
      '🧘 Espirituales': ['meditar', 'practicar_magia', 'ver_estrellas'],
      '🌍 Aventura': ['explorar', 'viajar', 'hacer_picnic'],
      '🏠 Hogar': ['cocinar', 'comprar', 'jardineria', 'hacer_postre'],
      '📚 Intelectuales': ['estudiar', 'leer', 'escribir_diario']
    };

    let helpText = '❌ Uso incorrecto del comando.\n\n' +
                   '💡 *Formato:* `.interact <nombre> <acción>\n\n' +
                   '🎯 *Acciones Disponibles:*\n\n';

    Object.entries(categories).forEach(([category, actions]) => {
      helpText += `${category}:\n`;
      helpText += `• ${actions.join(', ')}\n\n`;
    });

    helpText += `📋 *Total de acciones:* ${validActions.length}\n\n` +
                '💡 *Ejemplos:*\n' +
                '• `.interact Hinata Hyuga abrazar`\n' +
                '• `.interact Asuna Yuuki cocinar`\n' +
                '• `.interact Mikasa Ackerman entrenar`\n' +
                '• `.interact Zero Two practicar_magia`';

    return await sock.sendMessage(chatId, { text: helpText }, { quoted: m });
  }
  
  const characterName = args.slice(0, -1).join(' ');
  const action = args[args.length - 1].toLowerCase();
  
  // Validar acción
  const validActions = Object.keys(CONFIG.expBonus);
  if (!validActions.includes(action)) {
    return await sock.sendMessage(chatId, {
      text: `❌ Acción "${action}" no válida.\n\n` +
            `📋 *Acciones disponibles:* ${validActions.length} acciones\n` +
            `💡 *Usa \`.interact\` sin parámetros para ver la lista completa*`
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
    // Sistema de imágenes dinámicas según la acción
    const imageUrl = getActionImageUrl(character, action);
    
    await sock.sendMessage(chatId, {
      image: { url: imageUrl },
      caption: response,
      mentions: [userId]
    }, { quoted: m });
  } catch (imageError) {
    logger.error('Error al enviar imagen:', imageError);
    // Fallback a imagen aleatoria si falla la específica
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: response,
        mentions: [userId]
      }, { quoted: m });
    } catch (fallbackError) {
      logger.error('Error en fallback de imagen:', fallbackError);
      await sock.sendMessage(chatId, { text: response, mentions: [userId] }, { quoted: m });
    }
  }
}

/**
 * Ejecuta una interacción específica con una waifu
 */
async function performInteraction(characterId, userId, action) {
  const now = Date.now();
  
  // Verificar cooldown
  const lastInteraction = await db.get(
    'SELECT last_interaction FROM waifu_levels WHERE character_id = ? AND user_id = ?',
    [characterId, userId]
  );
  
  if (lastInteraction && (now - new Date(lastInteraction.last_interaction).getTime()) < CONFIG.interactionCooldown) {
    const remaining = Math.ceil((CONFIG.interactionCooldown - (now - new Date(lastInteraction.last_interaction).getTime())) / 60000);
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
      expGained = Math.floor(CONFIG.expBonus.afectar * bonus);
      updates.affection = 'affection + 5';
      updates.happiness = 'happiness + 3';
      message = '❤️ Le has mostrado afecto a tu waifu.\n💕 Afecto +5, Felicidad +3';
      break;
      
    case 'alimentar':
      expGained = Math.floor(CONFIG.expBonus.alimentar * bonus);
      updates.hunger = 'hunger + 20';
      updates.happiness = 'happiness + 2';
      message = '🍖 Has alimentado a tu waifu.\n🍕 Hambre +20, Felicidad +2';
      break;
      
    case 'jugar':
      expGained = Math.floor(CONFIG.expBonus.jugar * bonus);
      updates.happiness = 'happiness + 5';
      updates.affection = 'affection + 2';
      updates.hunger = 'hunger - 5';
      message = '🎮 Has jugado con tu waifu.\n😊 Felicidad +5, Afecto +2, Hambre -5';
      break;
      
    case 'abrazar':
      expGained = Math.floor(CONFIG.expBonus.abrazar * bonus);
      updates.affection = 'affection + 8';
      updates.happiness = 'happiness + 6';
      message = '🤗 Has abrazado fuertemente a tu waifu.\n💕 Afecto +8, Felicidad +6';
      break;
      
    case 'dormir':
      expGained = Math.floor(CONFIG.expBonus.dormir * bonus);
      updates.hunger = 'hunger - 10';
      updates.happiness = 'happiness + 4';
      message = '😴 Has dormido junto a tu waifu.\n😊 Felicidad +4, Hambre -10';
      break;
      
    case 'entrenar':
      expGained = Math.floor(CONFIG.expBonus.entrenar * bonus);
      updates.hunger = 'hunger - 15';
      updates.happiness = 'happiness + 2';
      message = '💪 Has entrenado con tu waifu.\n🏃 Fuerza +2, Hambre -15';
      break;
      
    case 'meditar':
      expGained = Math.floor(CONFIG.expBonus.meditar * bonus);
      updates.happiness = 'happiness + 8';
      updates.affection = 'affection + 3';
      message = '🧘 Has meditado con tu waifu.\n✨ Paz interior +8, Afecto +3';
      break;
      
    case 'celebrar':
      expGained = Math.floor(CONFIG.expBonus.celebrar * bonus);
      updates.happiness = 'happiness + 10';
      updates.affection = 'affection + 5';
      message = '🎉 Has celebrado con tu waifu.\n🎊 Felicidad +10, Afecto +5';
      break;
      
    case 'consolar':
      expGained = Math.floor(CONFIG.expBonus.consolar * bonus);
      updates.affection = 'affection + 6';
      updates.happiness = 'happiness + 4';
      message = '🤗 Has consolado a tu waifu.\n💕 Afecto +6, Felicidad +4';
      break;
      
    case 'explorar':
      expGained = Math.floor(CONFIG.expBonus.explorar * bonus);
      updates.happiness = 'happiness + 7';
      updates.hunger = 'hunger - 8';
      message = '🗺️ Has explorado con tu waifu.\n🌟 Felicidad +7, Hambre -8';
      break;
      
    case 'estudiar':
      expGained = Math.floor(CONFIG.expBonus.estudiar * bonus);
      updates.happiness = 'happiness + 3';
      updates.affection = 'affection + 2';
      message = '📚 Has estudiado con tu waifu.\n🎓 Conocimiento +3, Afecto +2';
      break;
      
    case 'bailar':
      expGained = Math.floor(CONFIG.expBonus.bailar * bonus);
      updates.happiness = 'happiness + 8';
      updates.hunger = 'hunger - 10';
      message = '💃 Has bailado con tu waifu.\n🎵 Felicidad +8, Hambre -10';
      break;
      
    case 'cantar':
      expGained = Math.floor(CONFIG.expBonus.cantar * bonus);
      updates.happiness = 'happiness + 7';
      updates.affection = 'affection + 4';
      message = '🎤 Has cantado con tu waifu.\n🎶 Felicidad +7, Afecto +4';
      break;
      
    case 'pintar':
      expGained = Math.floor(CONFIG.expBonus.pintar * bonus);
      updates.happiness = 'happiness + 6';
      updates.affection = 'affection + 3';
      message = '🎨 Has pintado con tu waifu.\n🖌️ Creatividad +6, Afecto +3';
      break;
      
    case 'leer':
      expGained = Math.floor(CONFIG.expBonus.leer * bonus);
      updates.happiness = 'happiness + 4';
      updates.affection = 'affection + 2';
      message = '📖 Has leído con tu waifu.\n📚 Conocimiento +4, Afecto +2';
      break;
      
    case 'cocinar':
      expGained = Math.floor(CONFIG.expBonus.cocinar * bonus);
      updates.hunger = 'hunger + 15';
      updates.happiness = 'happiness + 5';
      message = '👨‍🍳 Has cocinado con tu waifu.\n🍳 Hambre +15, Felicidad +5';
      break;
      
    case 'viajar':
      expGained = Math.floor(CONFIG.expBonus.viajar * bonus);
      updates.happiness = 'happiness + 12';
      updates.hunger = 'hunger - 12';
      message = '✈️ Has viajado con tu waifu.\n🌍 Felicidad +12, Hambre -12';
      break;
      
    case 'comprar':
      expGained = Math.floor(CONFIG.expBonus.comprar * bonus);
      updates.happiness = 'happiness + 3';
      updates.affection = 'affection + 2';
      message = '🛍️ Has ido de compras con tu waifu.\n💝 Felicidad +3, Afecto +2';
      break;
      
    case 'descansar':
      expGained = Math.floor(CONFIG.expBonus.descansar * bonus);
      updates.hunger = 'hunger - 5';
      updates.happiness = 'happiness + 2';
      message = '😌 Has descansado con tu waifu.\n⚡ Energía +2, Hambre -5';
      break;
      
    case 'jugar_videojuegos':
      expGained = Math.floor(CONFIG.expBonus.jugar_videojuegos * bonus);
      updates.happiness = 'happiness + 6';
      updates.hunger = 'hunger - 3';
      message = '🎮 Has jugado videojuegos con tu waifu.\n🕹️ Felicidad +6, Hambre -3';
      break;
      
    case 'hacer_ejercicio':
      expGained = Math.floor(CONFIG.expBonus.hacer_ejercicio * bonus);
      updates.hunger = 'hunger - 18';
      updates.happiness = 'happiness + 4';
      message = '🏋️ Has hecho ejercicio con tu waifu.\n💪 Salud +4, Hambre -18';
      break;
      
    case 'ver_pelicula':
      expGained = Math.floor(CONFIG.expBonus.ver_pelicula * bonus);
      updates.happiness = 'happiness + 7';
      updates.affection = 'affection + 3';
      message = '🎬 Has visto una película con tu waifu.\n🎭 Felicidad +7, Afecto +3';
      break;
      
    case 'tomar_te':
      expGained = Math.floor(CONFIG.expBonus.tomar_te * bonus);
      updates.happiness = 'happiness + 3';
      updates.affection = 'affection + 2';
      message = '🍵 Has tomado té con tu waifu.\n☕ Relajación +3, Afecto +2';
      break;
      
    case 'escribir_diario':
      expGained = Math.floor(CONFIG.expBonus.escribir_diario * bonus);
      updates.happiness = 'happiness + 4';
      updates.affection = 'affection + 2';
      message = '📝 Has escrito en tu diario con tu waifu.\n📓 Reflexión +4, Afecto +2';
      break;
      
    case 'jardineria':
      expGained = Math.floor(CONFIG.expBonus.jardineria * bonus);
      updates.happiness = 'happiness + 6';
      updates.hunger = 'hunger - 4';
      message = '🌱 Has hecho jardinería con tu waifu.\n🌿 Naturaleza +6, Hambre -4';
      break;
      
    case 'nadar':
      expGained = Math.floor(CONFIG.expBonus.nadar * bonus);
      updates.hunger = 'hunger - 15';
      updates.happiness = 'happiness + 8';
      message = '🏊 Has nadado con tu waifu.\n💧 Salud +8, Hambre -15';
      break;
      
    case 'patinar':
      expGained = Math.floor(CONFIG.expBonus.patinar * bonus);
      updates.hunger = 'hunger - 12';
      updates.happiness = 'happiness + 7';
      message = '🛹 Has patinado con tu waifu.\n⚡ Destreza +7, Hambre -12';
      break;
      
    case 'hacer_picnic':
      expGained = Math.floor(CONFIG.expBonus.hacer_picnic * bonus);
      updates.hunger = 'hunger + 10';
      updates.happiness = 'happiness + 8';
      updates.affection = 'affection + 4';
      message = '🧺 Has hecho un picnic con tu waifu.\n🍓 Hambre +10, Felicidad +8, Afecto +4';
      break;
      
    case 'ver_estrellas':
      expGained = Math.floor(CONFIG.expBonus.ver_estrellas * bonus);
      updates.happiness = 'happiness + 5';
      updates.affection = 'affection + 3';
      message = '⭐ Has visto las estrellas con tu waifu.\n🌟 Romance +5, Afecto +3';
      break;
      
    case 'hacer_postre':
      expGained = Math.floor(CONFIG.expBonus.hacer_postre * bonus);
      updates.hunger = 'hunger + 8';
      updates.happiness = 'happiness + 6';
      message = '🍰 Has hecho postres con tu waifu.\n🧁 Hambre +8, Felicidad +6';
      break;
      
    case 'practicar_magia':
      expGained = Math.floor(CONFIG.expBonus.practicar_magia * bonus);
      updates.happiness = 'happiness + 10';
      updates.affection = 'affection + 5';
      message = '✨ Has practicado magia con tu waifu.\n🔮 Poder mágico +10, Afecto +5';
      break;
      
    case 'tocar_instrumento':
      expGained = Math.floor(CONFIG.expBonus.tocar_instrumento * bonus);
      updates.happiness = 'happiness + 8';
      updates.affection = 'affection + 4';
      message = '🎵 Has tocado un instrumento con tu waifu.\n🎶 Talento +8, Afecto +4';
      break;
  }
  
  // Actualizar estadísticas y experiencia
  const setClause = Object.keys(updates).map(key => `${key} = ${updates[key]}`).join(', ');
  
  // Primero asegurar que el registro exista en waifu_levels
  await db.run(`
    INSERT OR IGNORE INTO waifu_levels (user_id, character_id, level, experience, affection, hunger, happiness)
    VALUES (?, ?, 1, 0, 50, 50, 50)
  `, [userId, characterId]);
  
  // Actualizar estadísticas
  await db.run(`
    UPDATE waifu_levels 
    SET ${setClause}, last_interaction = CURRENT_TIMESTAMP 
    WHERE character_id = ? AND user_id = ?
  `, [characterId, userId]);
  
  // Registrar la interacción
  await db.run(`
    INSERT INTO waifu_interactions (user_id, character_id, action, exp_gained)
    VALUES (?, ?, ?, ?)
  `, [userId, characterId, action, expGained]);
  
  const expResult = await addWaifuExp(characterId, userId, expGained);
  
  logger.success(`Interacción ${action} ejecutada para waifu ${characterId} por usuario ${userId}`);
  
  return {
    success: true,
    message,
    expGained,
    leveledUp: expResult.leveledUp,
    newLevel: expResult.level
  };
}

/**
 * Inicializa las tablas necesarias para el sistema de interacción
 */
async function initializeWaifuInteractionTables() {
  try {
    // Crear tabla de niveles y estadísticas de waifus si no existe
    await db.run(`
      CREATE TABLE IF NOT EXISTS waifu_levels (
        user_id TEXT,
        character_id INTEGER,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        affection INTEGER DEFAULT 50,
        hunger INTEGER DEFAULT 50,
        happiness INTEGER DEFAULT 50,
        last_interaction DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, character_id)
      )
    `);

    // Crear tabla de registro de interacciones si no existe
    await db.run(`
      CREATE TABLE IF NOT EXISTS waifu_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        character_id INTEGER,
        action TEXT,
        exp_gained INTEGER,
        interaction_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logger.success('Tablas de interacción waifu inicializadas correctamente');
  } catch (error) {
    logger.error('Error creando tablas de interacción:', error);
    throw error;
  }
}

/**
 * Selecciona la imagen apropiada según la acción de interacción
 */
function getActionImageUrl(character, action) {
  // Si el personaje tiene imágenes específicas para acciones (en el futuro)
  // Por ahora, usamos diferentes imágenes según el tipo de acción
  
  const actionCategories = {
    // Emocionales - usan la primera imagen (más expresiva)
    emocionales: ['afectar', 'abrazar', 'consolar', 'celebrar'],
    
    // Cuidado - usan la segunda imagen (más tierna)
    cuidado: ['alimentar', 'dormir', 'descansar', 'tomar_te'],
    
    // Entretenimiento - imagen aleatoria
    entretenimiento: ['jugar', 'jugar_videojuegos', 'ver_pelicula', 'leer'],
    
    // Creativos - imagen aleatoria
    creativos: ['pintar', 'cantar', 'tocar_instrumento', 'escribir_diario'],
    
    // Actividades - imagen aleatoria
    actividades: ['entrenar', 'hacer_ejercicio', 'bailar', 'nadar'],
    
    // Espirituales - primera imagen (más serena)
    espirituales: ['meditar', 'practicar_magia', 'ver_estrellas'],
    
    // Aventura - segunda imagen (más dinámica)
    aventura: ['explorar', 'viajar', 'hacer_picnic'],
    
    // Hogar - imagen aleatoria
    hogar: ['cocinar', 'comprar', 'jardineria', 'hacer_postre']
  };
  
  // Determinar la categoría de la acción
  let category = null;
  for (const [cat, actions] of Object.entries(actionCategories)) {
    if (actions.includes(action)) {
      category = cat;
      break;
    }
  }
  
  // Seleccionar imagen según la categoría
  if (category === 'emocionales' || category === 'espirituales') {
    return character.image_url[0]; // Primera imagen para acciones emocionales/espirituales
  } else if (category === 'cuidado' || category === 'aventura') {
    return character.image_url[1] || character.image_url[0]; // Segunda imagen para cuidado/aventura
  } else {
    // Para otras categorías, usar imagen aleatoria
    return character.image_url[Math.floor(Math.random() * character.image_url.length)];
  }
}

/**
 * Obtiene estadísticas de interacción del usuario
 */
async function getUserInteractionStats(userId) {
  try {
    const stats = await db.get(`
      SELECT COUNT(*) as total_interactions,
             SUM(CASE WHEN last_interaction > datetime('now', '-24 hours') THEN 1 ELSE 0 END) as today_interactions,
             MAX(last_interaction) as last_interaction
      FROM waifu_levels 
      WHERE user_id = ?
    `, [userId]);
    
    return {
      total: stats.total_interactions || 0,
      today: stats.today_interactions || 0,
      lastInteraction: stats.last_interaction
    };
  } catch (error) {
    logger.error('Error al obtener estadísticas de interacción:', error);
    return { total: 0, today: 0, lastInteraction: null };
  }
}

/**
 * Muestra estadísticas de interacción
 */
async function showInteractionStats(sock, m, userId) {
  const chatId = m.key.remoteJid;
  const stats = await getUserInteractionStats(userId);
  
  let statsMessage = `📊 *ESTADÍSTICAS DE INTERACCIÓN* 📊\n\n`;
  statsMessage += `👤 *@${userId.split('@')[0]}*\n\n`;
  statsMessage += `📈 *Total de interacciones:* ${stats.total}\n`;
  statsMessage += `🗓️ *Interacciones hoy:* ${stats.today}\n`;
  statsMessage += `⏰ *Última interacción:* ${stats.lastInteraction ? new Date(stats.lastInteraction).toLocaleString() : 'Nunca'}\n\n`;
  
  statsMessage += `💡 *Consejos:*\n`;
  statsMessage += `• Interactúa regularmente para mejorar el nivel\n`;
  statsMessage += `• Diferentes acciones dan diferentes beneficios\n`;
  statsMessage += `• El cooldown es de 30 minutos por waifu`;
  
  await sock.sendMessage(chatId, { text: statsMessage, mentions: [userId] }, { quoted: m });
}

// Exportar configuración y funciones necesarias
export const command = ['.interact', '.interactstats'];
export const alias = ['.interactuar', '.estadisticas_interaccion'];
export const description = 'Sistema de interacción con waifus - 33 acciones disponibles';

// Inicializar sistema al iniciar
(async () => {
  try {
    // Asegurar que las tablas existan
    await initializeWaifuInteractionTables();
    // Cargar personajes
    await loadCharacters();
    logger.success('Sistema de interacción waifu inicializado correctamente');
  } catch (error) {
    logger.error('Error inicializando sistema de interacción:', error);
  }
})();

export { CONFIG, logger, getUserInteractionStats, showInteractionStats, getActionImageUrl };
