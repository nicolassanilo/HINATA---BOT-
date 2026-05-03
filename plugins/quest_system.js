/**
 * @file Plugin Quest System - Sistema de misiones avanzado
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema completo de misiones y recompensas
 */

import { db } from './db.js';

// Configuración
const CONFIG = {
  enableLogging: true,
  maxActiveQuests: 5,
  dailyQuestReset: 86400000, // 24 horas
  weeklyQuestReset: 604800000, // 7 días
  questCooldown: 3600000, // 1 hora
  baseRewards: {
    common: { exp: 50, coins: 100 },
    uncommon: { exp: 100, coins: 250 },
    rare: { exp: 200, coins: 500 },
    epic: { exp: 500, coins: 1000 },
    legendary: { exp: 1000, coins: 2500 }
  }
};

// Sistema de logging
const questLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[QUEST] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[QUEST] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[QUEST] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[QUEST] ❌ ${message}`)
};

// Funciones principales
export const command = ['.quests', '.quest', '.accept', '.complete', '.progress', '.rewards', '.leaderboard', '.daily', '.weekly'];
export const alias = ['.misiones', '.mision', '.aceptar', '.completar', '.progreso', '.recompensas', '.tabla', '.diario', '.semanal'];
export const description = 'Sistema completo de misiones y recompensas';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.quests':
      case '.misiones':
        await showAvailableQuests(sock, m);
        break;
      case '.quest':
      case '.mision':
        await showQuestDetails(sock, m, text);
        break;
      case '.accept':
      case '.aceptar':
        await acceptQuest(sock, m, text);
        break;
      case '.complete':
      case '.completar':
        await completeQuest(sock, m, text);
        break;
      case '.progress':
      case '.progreso':
        await showQuestProgress(sock, m);
        break;
      case '.rewards':
      case '.recompensas':
        await claimRewards(sock, m, text);
        break;
      case '.leaderboard':
      case '.tabla':
        await showLeaderboard(sock, m);
        break;
      case '.daily':
      case '.diario':
        await showDailyQuests(sock, m);
        break;
      case '.weekly':
      case '.semanal':
        await showWeeklyQuests(sock, m);
        break;
      default:
        await showQuestHelp(sock, m);
    }
  } catch (error) {
    questLogger.error('Error en sistema de misiones:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de misiones. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Mostrar misiones disponibles
async function showAvailableQuests(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const availableQuests = await getAvailableQuests(userId);
    const activeQuests = await getActiveQuests(userId);

    let message = `⚔️ *MISIONES DISPONIBLES* ⚔️\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `📊 Activas: ${activeQuests.length}/${CONFIG.maxActiveQuests}\n\n`;

    if (availableQuests.length === 0) {
      message += `📭 No hay misiones disponibles en este momento.\n\n`;
      message += `💡 Vuelve más tarde para nuevas misiones o completa las activas.`;
    } else {
      message += `🎯 *Misiones disponibles:*\n\n`;
      availableQuests.forEach((quest, index) => {
        const canAccept = activeQuests.length < CONFIG.maxActiveQuests;
        message += `${index + 1}. **${quest.title}**\n`;
        message += `   📝 ${quest.description}\n`;
        message += `   ⭐ Dificultad: ${getDifficultyEmoji(quest.difficulty)} ${quest.difficulty}\n`;
        message += `   🎁 Recompensa: ${quest.exp_reward} EXP, ${quest.coin_reward} monedas\n`;
        message += `   ⏰ Tiempo límite: ${formatTimeLimit(quest.time_limit)}\n`;
        message += `   ${canAccept ? '✅ Disponible' : '❌ No puedes aceptar más misiones'}\n\n`;
      });
    }

    message += `💡 *Comandos:*\n`;
    message += `• \`.quest <número>\` - Ver detalles\n`;
    message += `• \`.accept <número>\` - Aceptar misión\n`;
    message += `• \`.progress\` - Ver progreso actual`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    questLogger.error('Error mostrando misiones:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las misiones disponibles.'
    }, { quoted: m });
  }
}

// Mostrar detalles de misión
async function showQuestDetails(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const questId = parseInt(text.split(' ')[1]);

  if (isNaN(questId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el número de la misión.\n\n💡 *Uso:* `.quest <número>`'
    }, { quoted: m });
  }

  try {
    const quest = await getQuestById(questId);
    if (!quest) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se encontró esa misión.'
      }, { quoted: m });
    }

    const userProgress = await getQuestProgress(userId, questId);
    const isActive = await isQuestActive(userId, questId);

    let message = `⚔️ *DETALLES DE MISIÓN* ⚔️\n\n`;
    message += `🎯 **${quest.title}**\n`;
    message += `📝 ${quest.description}\n\n`;
    
    message += `📊 *Información:*\n`;
    message += `⭐ Dificultad: ${getDifficultyEmoji(quest.difficulty)} ${quest.difficulty}\n`;
    message += `🎁 Recompensa: ${quest.exp_reward} EXP, ${quest.coin_reward} monedas\n`;
    message += `⏰ Tiempo límite: ${formatTimeLimit(quest.time_limit)}\n`;
    message += `📈 Progreso: ${userProgress?.current || 0}/${quest.requirement}\n\n`;
    
    message += `🎯 *Objetivos:*\n`;
    message += `${quest.objective}\n\n`;
    
    message += `💡 *Requisitos:*\n`;
    message += `• Nivel mínimo: ${quest.min_level || 1}\n`;
    message += `• Misiones completadas: ${quest.completed_quests || 0}\n\n`;
    
    if (isActive) {
      message += `✅ *Estado: Activa*\n`;
      message += `⏳ Tiempo restante: ${getTimeRemaining(userProgress.started_at, quest.time_limit)}\n\n`;
      message += `💡 *Comandos:*\n`;
      message += `• \`.complete ${questId}\` - Completar misión`;
    } else {
      const canAccept = await canAcceptQuest(userId, questId);
      message += `${canAccept ? '✅ Disponible' : '❌ No disponible'}*\n\n`;
      if (canAccept) {
        message += `💡 *Comandos:*\n`;
        message += `• \`.accept ${questId}\` - Aceptar misión`;
      }
    }

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    questLogger.error('Error mostrando detalles de misión:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar los detalles de la misión.'
    }, { quoted: m });
  }
}

// Aceptar misión
async function acceptQuest(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const questId = parseInt(text.split(' ')[1]);

  if (isNaN(questId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el número de la misión.\n\n💡 *Uso:* `.accept <número>`'
    }, { quoted: m });
  }

  try {
    const quest = await getQuestById(questId);
    if (!quest) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se encontró esa misión.'
      }, { quoted: m });
    }

    // Verificar si puede aceptar
    const canAccept = await canAcceptQuest(userId, questId);
    if (!canAccept.success) {
      return await sock.sendMessage(chatId, {
        text: `❌ ${canAccept.reason}`
      }, { quoted: m });
    }

    // Aceptar misión
    await acceptUserQuest(userId, questId);

    let message = `✅ *MISIÓN ACEPTADA* ✅\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `⚔️ **${quest.title}**\n`;
    message += `📝 ${quest.description}\n\n`;
    message += `🎯 *Objetivo:*\n`;
    message += `${quest.objective}\n\n`;
    message += `⏰ Tiempo límite: ${formatTimeLimit(quest.time_limit)}\n`;
    message += `🎁 Recompensa: ${quest.exp_reward} EXP, ${quest.coin_reward} monedas\n\n`;
    message += `💡 Usa \`.progress\` para ver tu progreso o \`.complete ${questId}\` cuando la completes.`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    questLogger.success(`Misión ${questId} aceptada por ${userId}`);

  } catch (error) {
    questLogger.error('Error aceptando misión:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al aceptar la misión.'
    }, { quoted: m });
  }
}

// Completar misión
async function completeQuest(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const questId = parseInt(text.split(' ')[1]);

  if (isNaN(questId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el número de la misión.\n\n💡 *Uso:* `.complete <número>`'
    }, { quoted: m });
  }

  try {
    const quest = await getQuestById(questId);
    if (!quest) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se encontró esa misión.'
      }, { quoted: m });
    }

    const userProgress = await getQuestProgress(userId, questId);
    if (!userProgress) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes esa misión activa.'
      }, { quoted: m });
    }

    // Verificar si está completada
    if (userProgress.current < quest.requirement) {
      return await sock.sendMessage(chatId, {
        text: `❌ Aún no has completado los requisitos de la misión.\n\n📈 Progreso: ${userProgress.current}/${quest.requirement}`
      }, { quoted: m });
    }

    // Completar misión
    await completeUserQuest(userId, questId);

    let message = `🎉 *MISIÓN COMPLETADA* 🎉\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `⚔️ **${quest.title}**\n`;
    message += `📝 ${quest.description}\n\n`;
    message += `✅ *Objetivo completado*\n`;
    message += `📈 Progreso final: ${userProgress.current}/${quest.requirement}\n\n`;
    message += `🎁 *Recompensas obtenidas:*\n`;
    message += `⭐ ${quest.exp_reward} EXP\n`;
    message += `💰 ${quest.coin_reward} monedas\n\n`;
    message += `💡 Usa \`.rewards ${questId}\` para reclamar tus recompensas.`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    questLogger.success(`Misión ${questId} completada por ${userId}`);

  } catch (error) {
    questLogger.error('Error completando misión:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al completar la misión.'
    }, { quoted: m });
  }
}

// Mostrar progreso
async function showQuestProgress(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const activeQuests = await getActiveQuests(userId);
    
    if (activeQuests.length === 0) {
      return await sock.sendMessage(chatId, {
        text: '📭 No tienes misiones activas.\n\n💡 Usa \`.quests\` para ver misiones disponibles.'
      }, { quoted: m });
    }

    let message = `📊 *PROGRESO DE MISIONES* 📊\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `📈 Activas: ${activeQuests.length}/${CONFIG.maxActiveQuests}\n\n`;

    activeQuests.forEach((progress, index) => {
      const quest = progress.quest;
      const percentage = Math.floor((progress.current / quest.requirement) * 100);
      const timeRemaining = getTimeRemaining(progress.started_at, quest.time_limit);
      
      message += `${index + 1}. **${quest.title}**\n`;
      message += `   📈 Progreso: ${progress.current}/${quest.requirement} (${percentage}%)\n`;
      message += `   ⏰ Tiempo restante: ${timeRemaining}\n`;
      message += `   ${progress.current >= quest.requirement ? '✅ Completada' : '🔄 En progreso'}\n\n`;
    });

    message += `💡 *Comandos:*\n`;
    message += `• \`.complete <número>\` - Completar misión\n`;
    message += `• \`.rewards <número>\` - Reclamar recompensas`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    questLogger.error('Error mostrando progreso:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el progreso de misiones.'
    }, { quoted: m });
  }
}

// Reclamar recompensas
async function claimRewards(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const questId = parseInt(text.split(' ')[1]);

  if (isNaN(questId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el número de la misión.\n\n💡 *Uso:* `.rewards <número>`'
    }, { quoted: m });
  }

  try {
    const quest = await getQuestById(questId);
    if (!quest) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se encontró esa misión.'
      }, { quoted: m });
    }

    const completedQuest = await getCompletedQuest(userId, questId);
    if (!completedQuest) {
      return await sock.sendMessage(chatId, {
        text: '❌ No has completado esa misión.'
      }, { quoted: m });
    }

    if (completedQuest.rewards_claimed) {
      return await sock.sendMessage(chatId, {
        text: '❌ Ya has reclamado las recompensas de esa misión.'
      }, { quoted: m });
    }

    // Reclamar recompensas
    await claimQuestRewards(userId, questId, quest.exp_reward, quest.coin_reward);

    let message = `🎁 *RECOMPENSAS RECLAMADAS* 🎁\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `⚔️ Misión: ${quest.title}\n\n`;
    message += `✨ *Recompensas recibidas:*\n`;
    message += `⭐ +${quest.exp_reward} EXP\n`;
    message += `💰 +${quest.coin_reward} monedas\n\n`;
    message += `🎉 ¡Felicidades por completar la misión!`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    questLogger.success(`Recompensas reclamadas para misión ${questId} por ${userId}`);

  } catch (error) {
    questLogger.error('Error reclamando recompensas:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al reclamar las recompensas.'
    }, { quoted: m });
  }
}

// Mostrar tabla de líderes
async function showLeaderboard(sock, m) {
  const chatId = m.key.remoteJid;

  try {
    const topUsers = await getQuestLeaderboard(10);
    const userRank = await getUserQuestRank(m.key.participant || m.key.remoteJid);

    let message = `🏆 *TABLA DE LÍDERES* 🏆\n\n`;
    message += `⚔️ *Misiones completadas*\n\n`;

    topUsers.forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const isCurrentUser = user.user_id === (m.key.participant || m.key.remoteJid);
      message += `${medal} @${user.user_id.split('@')[0]}${isCurrentUser ? ' (Tú)' : ''}\n`;
      message += `   📊 ${user.completed_quests} misiones | ⭐ ${user.total_exp} EXP\n\n`;
    });

    if (userRank) {
      message += `📊 *Tu posición:*\n`;
      message += `🏅 Puesto #${userRank.rank} con ${userRank.completed_quests} misiones\n`;
      message += `⭐ ${userRank.total_exp} EXP totales`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: topUsers.slice(0, 10).map(u => u.user_id)
    }, { quoted: m });

  } catch (error) {
    questLogger.error('Error mostrando tabla de líderes:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la tabla de líderes.'
    }, { quoted: m });
  }
}

// Mostrar misiones diarias
async function showDailyQuests(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const dailyQuests = await getDailyQuests(userId);
    const completedToday = await getCompletedDailyQuests(userId);

    let message = `📅 *MISIONES DIARIAS* 📅\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `📊 Completadas hoy: ${completedToday.length}/${dailyQuests.length}\n\n`;

    if (dailyQuests.length === 0) {
      message += `📭 No hay misiones diarias disponibles.\n\n`;
      message += `💡 Vuelve mañana para nuevas misiones diarias.`;
    } else {
      message += `🎯 *Misiones de hoy:*\n\n`;
      dailyQuests.forEach((quest, index) => {
        const isCompleted = completedToday.some(cq => cq.quest_id === quest.id);
        message += `${index + 1}. **${quest.title}**\n`;
        message += `   📝 ${quest.description}\n`;
        message += `   🎁 ${quest.exp_reward} EXP, ${quest.coin_reward} monedas\n`;
        message += `   ${isCompleted ? '✅ Completada' : '🔄 Pendiente'}\n\n`;
      });
    }

    message += `⏰ *Se reinician a medianoche*\n\n`;
    message += `💡 *Comandos:*\n`;
    message += `• \`.accept daily <número>\` - Aceptar misión diaria\n`;
    message += `• \`.weekly\` - Ver misiones semanales`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    questLogger.error('Error mostrando misiones diarias:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las misiones diarias.'
    }, { quoted: m });
  }
}

// Mostrar misiones semanales
async function showWeeklyQuests(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const weeklyQuests = await getWeeklyQuests(userId);
    const completedThisWeek = await getCompletedWeeklyQuests(userId);

    let message = `📆 *MISIONES SEMANALES* 📆\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `📊 Completadas esta semana: ${completedThisWeek.length}/${weeklyQuests.length}\n\n`;

    if (weeklyQuests.length === 0) {
      message += `📭 No hay misiones semanales disponibles.\n\n`;
      message += `💡 Vuelve la próxima semana para nuevas misiones.`;
    } else {
      message += `🎯 *Misiones de la semana:*\n\n`;
      weeklyQuests.forEach((quest, index) => {
        const isCompleted = completedThisWeek.some(cq => cq.quest_id === quest.id);
        message += `${index + 1}. **${quest.title}**\n`;
        message += `   📝 ${quest.description}\n`;
        message += `   🎁 ${quest.exp_reward} EXP, ${quest.coin_reward} monedas\n`;
        message += `   ${isCompleted ? '✅ Completada' : '🔄 Pendiente'}\n\n`;
      });
    }

    message += `⏰ *Se reinician el lunes*\n\n`;
    message += `💡 *Comandos:*\n`;
    message += `• \`.accept weekly <número>\` - Aceptar misión semanal\n`;
    message += `• \`.daily\` - Ver misiones diarias`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    questLogger.error('Error mostrando misiones semanales:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las misiones semanales.'
    }, { quoted: m });
  }
}

// Mostrar ayuda
async function showQuestHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `⚔️ *SISTEMA DE MISIONES* ⚔️\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `📋 *Misiones:*\n`;
  message += `• \`.quests\` - Ver misiones disponibles\n`;
  message += `• \`.quest <número>\` - Ver detalles de misión\n`;
  message += `• \`.accept <número>\` - Aceptar misión\n`;
  message += `• \`.complete <número>\` - Completar misión\n`;
  message += `• \`.progress\` - Ver progreso actual\n`;
  message += `• \`.rewards <número>\` - Reclamar recompensas\n\n`;
  
  message += `📅 *Misiones temporales:*\n`;
  message += `• \`.daily\` - Misiones diarias\n`;
  message += `• \`.weekly\` - Misiones semanales\n\n`;
  
  message += `🏆 *Estadísticas:*\n`;
  message += `• \`.leaderboard\` - Tabla de líderes\n\n`;
  
  message += `📊 *Características:*\n`;
  message += `• Máximo ${CONFIG.maxActiveQuests} misiones activas\n`;
  message += `• Dificultades: Common, Uncommon, Rare, Epic, Legendary\n`;
  message += `• Recompensas: EXP y monedas\n`;
  message += `• Sistema de progreso en tiempo real\n\n`;
  
  message += `⚠️ *Importante:*\n`;
  message += `• Debes cumplir los requisitos para aceptar misiones\n`;
  message += `• Las misiones tienen tiempo límite\n`;
  message += `• Debes reclamar las recompensas manualmente\n`;
  message += `• Las misiones diarias/semanales se reinician automáticamente`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones auxiliares
function getDifficultyEmoji(difficulty) {
  const emojis = {
    common: '🟢',
    uncommon: '🔵',
    rare: '🟣',
    epic: '🟠',
    legendary: '🔴'
  };
  return emojis[difficulty] || '⚪';
}

function formatTimeLimit(minutes) {
  if (minutes < 60) {
    return `${minutes} minutos`;
  } else if (minutes < 1440) {
    return `${Math.floor(minutes / 60)} horas`;
  } else {
    return `${Math.floor(minutes / 1440)} días`;
  }
}

function getTimeRemaining(startTime, timeLimit) {
  const elapsed = Date.now() - new Date(startTime).getTime();
  const remaining = (timeLimit * 60 * 1000) - elapsed;
  
  if (remaining <= 0) {
    return '⏰ Tiempo agotado';
  }
  
  const minutes = Math.floor(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

// Funciones de base de datos
async function getAvailableQuests(userId) {
  try {
    const userLevel = await getUserLevel(userId);
    const completedQuests = await getCompletedQuestsCount(userId);
    
    return await db.all(`
      SELECT * FROM quests 
      WHERE min_level <= ? AND completed_quests <= ? AND id NOT IN (
        SELECT quest_id FROM user_quests WHERE user_id = ? AND status = 'active'
      )
      ORDER BY difficulty ASC, id ASC
    `, [userLevel, completedQuests, userId]);
  } catch (error) {
    questLogger.error('Error obteniendo misiones disponibles:', error);
    return [];
  }
}

async function getActiveQuests(userId) {
  try {
    return await db.all(`
      SELECT uq.*, q.* FROM user_quests uq
      JOIN quests q ON uq.quest_id = q.id
      WHERE uq.user_id = ? AND uq.status = 'active'
      ORDER BY uq.started_at ASC
    `, [userId]);
  } catch (error) {
    questLogger.error('Error obteniendo misiones activas:', error);
    return [];
  }
}

async function getQuestById(questId) {
  try {
    return await db.get('SELECT * FROM quests WHERE id = ?', [questId]);
  } catch (error) {
    questLogger.error('Error obteniendo misión:', error);
    return null;
  }
}

async function getQuestProgress(userId, questId) {
  try {
    return await db.get(`
      SELECT * FROM user_quests 
      WHERE user_id = ? AND quest_id = ?
    `, [userId, questId]);
  } catch (error) {
    questLogger.error('Error obteniendo progreso:', error);
    return null;
  }
}

async function isQuestActive(userId, questId) {
  try {
    const result = await db.get(`
      SELECT 1 FROM user_quests 
      WHERE user_id = ? AND quest_id = ? AND status = 'active'
    `, [userId, questId]);
    return !!result;
  } catch (error) {
    return false;
  }
}

async function canAcceptQuest(userId, questId) {
  try {
    const activeQuests = await getActiveQuests(userId);
    if (activeQuests.length >= CONFIG.maxActiveQuests) {
      return { success: false, reason: `Ya tienes el máximo de misiones activas (${CONFIG.maxActiveQuests}).` };
    }

    const userLevel = await getUserLevel(userId);
    const completedQuests = await getCompletedQuestsCount(userId);
    const quest = await getQuestById(questId);

    if (!quest) {
      return { success: false, reason: 'No se encontró esa misión.' };
    }

    if (userLevel < (quest.min_level || 1)) {
      return { success: false, reason: `Nivel insuficiente. Necesitas nivel ${quest.min_level || 1}.` };
    }

    if (completedQuests < (quest.completed_quests || 0)) {
      return { success: false, reason: `Necesitas haber completado ${quest.completed_quests || 0} misiones.` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, reason: 'Error al verificar requisitos.' };
  }
}

async function acceptUserQuest(userId, questId) {
  try {
    await db.run(`
      INSERT OR REPLACE INTO user_quests (user_id, quest_id, status, current, started_at)
      VALUES (?, ?, 'active', 0, CURRENT_TIMESTAMP)
    `, [userId, questId]);
  } catch (error) {
    questLogger.error('Error aceptando misión:', error);
    throw error;
  }
}

async function completeUserQuest(userId, questId) {
  try {
    await db.run(`
      UPDATE user_quests 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND quest_id = ?
    `, [userId, questId]);
  } catch (error) {
    questLogger.error('Error completando misión:', error);
    throw error;
  }
}

async function getCompletedQuest(userId, questId) {
  try {
    return await db.get(`
      SELECT * FROM user_quests 
      WHERE user_id = ? AND quest_id = ? AND status = 'completed'
    `, [userId, questId]);
  } catch (error) {
    questLogger.error('Error obteniendo misión completada:', error);
    return null;
  }
}

async function claimQuestRewards(userId, questId, expReward, coinReward) {
  try {
    // Marcar recompensas como reclamadas
    await db.run(`
      UPDATE user_quests 
      SET rewards_claimed = 1, claimed_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND quest_id = ?
    `, [userId, questId]);

    // Actualizar estadísticas del usuario
    await updateUserStats(userId, expReward, coinReward);
  } catch (error) {
    questLogger.error('Error reclamando recompensas:', error);
    throw error;
  }
}

async function getQuestLeaderboard(limit = 10) {
  try {
    return await db.all(`
      SELECT user_id, COUNT(*) as completed_quests, SUM(exp_reward) as total_exp
      FROM user_quests uq
      JOIN quests q ON uq.quest_id = q.id
      WHERE uq.status = 'completed'
      GROUP BY user_id
      ORDER BY completed_quests DESC, total_exp DESC
      LIMIT ?
    `, [limit]);
  } catch (error) {
    questLogger.error('Error obteniendo tabla de líderes:', error);
    return [];
  }
}

async function getUserQuestRank(userId) {
  try {
    const rank = await db.get(`
      SELECT COUNT(*) + 1 as rank, completed_quests, total_exp
      FROM (
        SELECT user_id, COUNT(*) as completed_quests, SUM(exp_reward) as total_exp
        FROM user_quests uq
        JOIN quests q ON uq.quest_id = q.id
        WHERE uq.status = 'completed'
        GROUP BY user_id
        ORDER BY completed_quests DESC, total_exp DESC
      )
      WHERE completed_quests > (SELECT COUNT(*) FROM user_quests JOIN quests ON user_quests.quest_id = quests.id WHERE user_quests.user_id = ? AND user_quests.status = 'completed')
    `, [userId]);

    return rank;
  } catch (error) {
    return null;
  }
}

async function getDailyQuests(userId) {
  try {
    return await db.all(`
      SELECT * FROM quests 
      WHERE type = 'daily' AND id NOT IN (
        SELECT quest_id FROM user_quests 
        WHERE user_id = ? AND status = 'completed' 
        AND date(completed_at) = date('now')
      )
      ORDER BY difficulty ASC
    `, [userId]);
  } catch (error) {
    return [];
  }
}

async function getWeeklyQuests(userId) {
  try {
    return await db.all(`
      SELECT * FROM quests 
      WHERE type = 'weekly' AND id NOT IN (
        SELECT quest_id FROM user_quests 
        WHERE user_id = ? AND status = 'completed' 
        AND date(completed_at) >= date('now', '-7 days')
      )
      ORDER BY difficulty ASC
    `, [userId]);
  } catch (error) {
    return [];
  }
}

async function getCompletedDailyQuests(userId) {
  try {
    return await db.all(`
      SELECT uq.*, q.* FROM user_quests uq
      JOIN quests q ON uq.quest_id = q.id
      WHERE uq.user_id = ? AND uq.status = 'completed' 
      AND date(uq.completed_at) = date('now')
      AND q.type = 'daily'
    `, [userId]);
  } catch (error) {
    return [];
  }
}

async function getCompletedWeeklyQuests(userId) {
  try {
    return await db.all(`
      SELECT uq.*, q.* FROM user_quests uq
      JOIN quests q ON uq.quest_id = q.id
      WHERE uq.user_id = ? AND uq.status = 'completed' 
      AND date(uq.completed_at) >= date('now', '-7 days')
      AND q.type = 'weekly'
    `, [userId]);
  } catch (error) {
    return [];
  }
}

async function getUserLevel(userId) {
  try {
    const result = await db.get('SELECT level FROM user_stats WHERE user_id = ?', [userId]);
    return result ? result.level : 1;
  } catch (error) {
    return 1;
  }
}

async function getCompletedQuestsCount(userId) {
  try {
    const result = await db.get(`
      SELECT COUNT(*) as count FROM user_quests 
      WHERE user_id = ? AND status = 'completed'
    `, [userId]);
    return result ? result.count : 0;
  } catch (error) {
    return 0;
  }
}

async function updateUserStats(userId, expReward, coinReward) {
  try {
    await db.run(`
      INSERT OR REPLACE INTO user_stats (user_id, exp, coins, updated_at)
      VALUES (?, 
        COALESCE((SELECT exp FROM user_stats WHERE user_id = ?), 0) + ?,
        COALESCE((SELECT coins FROM user_stats WHERE user_id = ?), 0) + ?,
        CURRENT_TIMESTAMP)
    `, [userId, userId, expReward, userId, coinReward]);
  } catch (error) {
    questLogger.error('Error actualizando estadísticas:', error);
  }
}

// Inicializar tablas y datos
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        objective TEXT,
        requirement INTEGER,
        difficulty TEXT,
        type TEXT DEFAULT 'normal',
        min_level INTEGER DEFAULT 1,
        completed_quests INTEGER DEFAULT 0,
        exp_reward INTEGER,
        coin_reward INTEGER,
        time_limit INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        quest_id INTEGER,
        status TEXT DEFAULT 'active',
        current INTEGER DEFAULT 0,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        rewards_claimed INTEGER DEFAULT 0,
        claimed_at DATETIME,
        FOREIGN KEY (quest_id) REFERENCES quests (id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id TEXT PRIMARY KEY,
        level INTEGER DEFAULT 1,
        exp INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insertar misiones de ejemplo si no existen
    await insertSampleQuests();
    
    questLogger.success('Tablas de misiones inicializadas');
  } catch (error) {
    questLogger.error('Error inicializando tablas:', error);
  }
}

async function insertSampleQuests() {
  try {
    const existingQuests = await db.get('SELECT COUNT(*) as count FROM quests');
    if (existingQuests.count > 0) return;

    const sampleQuests = [
      {
        title: 'Primeros Pasos',
        description: 'Completa tu primera misión',
        objective: 'Envía 10 mensajes en cualquier grupo',
        requirement: 10,
        difficulty: 'common',
        type: 'daily',
        exp_reward: 50,
        coin_reward: 100,
        time_limit: 1440 // 24 horas
      },
      {
        title: 'Explorador Social',
        description: 'Interactúa con otros usuarios',
        objective: 'Menciona a 5 usuarios diferentes',
        requirement: 5,
        difficulty: 'common',
        type: 'daily',
        exp_reward: 75,
        coin_reward: 150,
        time_limit: 1440
      },
      {
        title: 'Coleccionista Dedicado',
        description: 'Expande tu colección',
        objective: 'Reclama 5 waifus diferentes',
        requirement: 5,
        difficulty: 'uncommon',
        type: 'weekly',
        exp_reward: 200,
        coin_reward: 400,
        time_limit: 10080 // 7 días
      },
      {
        title: 'Maestro del Casino',
        description: 'Demuestra tu suerte',
        objective: 'Gana 3 veces en el casino',
        requirement: 3,
        difficulty: 'rare',
        type: 'normal',
        exp_reward: 300,
        coin_reward: 600,
        time_limit: 2880 // 2 días
      },
      {
        title: 'Entrenador de Mascotas',
        description: 'Cuida de tus compañeros',
        objective: 'Alimenta tus mascotas 10 veces',
        requirement: 10,
        difficulty: 'uncommon',
        type: 'daily',
        exp_reward: 100,
        coin_reward: 200,
        time_limit: 1440
      }
    ];

    for (const quest of sampleQuests) {
      await db.run(`
        INSERT INTO quests (title, description, objective, requirement, difficulty, type, exp_reward, coin_reward, time_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        quest.title, quest.description, quest.objective, quest.requirement,
        quest.difficulty, quest.type, quest.exp_reward, quest.coin_reward, quest.time_limit
      ]);
    }

    questLogger.success(`${sampleQuests.length} misiones de ejemplo insertadas`);
  } catch (error) {
    questLogger.error('Error insertando misiones de ejemplo:', error);
  }
}

// Inicializar sistema
initializeTables();

// Exportar funciones para compatibilidad
export { 
  CONFIG,
  questLogger,
  getAvailableQuests,
  getActiveQuests,
  updateQuestProgress
};
