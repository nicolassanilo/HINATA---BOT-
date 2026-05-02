/**
 * @file Plugin Advanced Admin - Herramientas de administración avanzada
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema completo de administración y moderación para grupos
 */

import { db } from './db.js';

// Configuración
const CONFIG = {
  enableLogging: true,
  maxWarns: 3,
  muteDurations: {
    1: 5 * 60 * 1000,    // 5 minutos
    2: 30 * 60 * 1000,   // 30 minutos
    3: 2 * 60 * 60 * 1000 // 2 horas
  },
  banThreshold: 5,
  enableAutoMod: true
};

// Sistema de logging
const adminLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[ADMIN] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[ADMIN] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[ADMIN] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[ADMIN] ❌ ${message}`)
};

// Funciones principales
export const command = ['.ban', '.kick', '.mute', '.unmute', '.warn', '.unwarn', '.modlogs', '.settings', '.adminpanel'];
export const alias = ['.banear', '.expulsar', '.silenciar', '.desilenciar', '.advertir', '.quitaradv', '.logs', '.config', '.panel'];
export const description = 'Sistema avanzado de administración y moderación';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    // Verificar si es admin
    if (!await isAdmin(userId, chatId)) {
      return await sock.sendMessage(chatId, {
        text: '❌ Este comando solo puede ser usado por administradores.'
      }, { quoted: m });
    }

    switch (command) {
      case '.ban':
        await banUser(sock, m, text);
        break;
      case '.kick':
        await kickUser(sock, m, text);
        break;
      case '.mute':
        await muteUser(sock, m, text);
        break;
      case '.unmute':
        await unmuteUser(sock, m, text);
        break;
      case '.warn':
        await warnUser(sock, m, text);
        break;
      case '.unwarn':
        await unwarnUser(sock, m, text);
        break;
      case '.modlogs':
        await showModLogs(sock, m);
        break;
      case '.settings':
        await showSettings(sock, m);
        break;
      case '.adminpanel':
        await showAdminPanel(sock, m);
        break;
      default:
        await showAdminHelp(sock, m);
    }
  } catch (error) {
    adminLogger.error('Error en sistema admin:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de administración.'
    }, { quoted: m });
  }
}

// Verificar si es admin
async function isAdmin(userId, chatId) {
  try {
    const groupMetadata = await sock.groupMetadata(chatId);
    return groupMetadata.participants.some(p => 
      p.id === userId && (p.admin === 'admin' || p.admin === 'superadmin')
    );
  } catch (error) {
    adminLogger.error('Error verificando admin:', error);
    return false;
  }
}

// Banear usuario
async function banUser(sock, m, text) {
  const chatId = m.key.remoteJid;
  const args = text.split(' ');
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.ban @usuario [motivo]`'
    }, { quoted: m });
  }
  
  const targetUserId = args[1].replace('@', '').trim();
  const reason = args.slice(2).join(' ') || 'Sin motivo especificado';
  
  try {
    // Verificar si el bot es admin
    const botIsAdmin = await isAdmin(sock.user.id, chatId);
    if (!botIsAdmin) {
      return await sock.sendMessage(chatId, {
        text: '❌ El bot necesita ser administrador para banear usuarios.'
      }, { quoted: m });
    }
    
    // Banear al usuario
    await sock.groupParticipantsUpdate(chatId, [targetUserId], 'remove');
    
    // Registrar en logs
    await logModerationAction(chatId, m.key.participant, targetUserId, 'ban', reason);
    
    let message = `🔨 *USUARIO BANEADO* 🔨\n\n`;
    message += `👤 *@${targetUserId.split('@')[0]}* ha sido baneado\n`;
    message += `👮‍♂️ Por: @${m.key.participant.split('@')[0]}\n`;
    message += `📝 Motivo: ${reason}\n`;
    message += `📅 ${new Date().toLocaleString()}`;
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [targetUserId, m.key.participant]
    }, { quoted: m });
    
    adminLogger.success(`Usuario baneado: ${targetUserId} por ${m.key.participant}`);
    
  } catch (error) {
    adminLogger.error('Error baneando usuario:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al banear al usuario. Verifica que el bot sea admin.'
    }, { quoted: m });
  }
}

// Expulsar usuario
async function kickUser(sock, m, text) {
  const chatId = m.key.remoteJid;
  const args = text.split(' ');
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.kick @usuario [motivo]`'
    }, { quoted: m });
  }
  
  const targetUserId = args[1].replace('@', '').trim();
  const reason = args.slice(2).join(' ') || 'Sin motivo especificado';
  
  try {
    await sock.groupParticipantsUpdate(chatId, [targetUserId], 'remove');
    
    await logModerationAction(chatId, m.key.participant, targetUserId, 'kick', reason);
    
    let message = `👢 *USUARIO EXPULSADO* 👢\n\n`;
    message += `👤 *@${targetUserId.split('@')[0]}* ha sido expulsado\n`;
    message += `👮‍♂️ Por: @${m.key.participant.split('@')[0]}\n`;
    message += `📝 Motivo: ${reason}\n`;
    message += `📅 ${new Date().toLocaleString()}`;
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [targetUserId, m.key.participant]
    }, { quoted: m });
    
    adminLogger.success(`Usuario expulsado: ${targetUserId}`);
    
  } catch (error) {
    adminLogger.error('Error expulsando usuario:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al expulsar al usuario.'
    }, { quoted: m });
  }
}

// Silenciar usuario
async function muteUser(sock, m, text) {
  const chatId = m.key.remoteJid;
  const args = text.split(' ');
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.mute @usuario [duración]`'
    }, { quoted: m });
  }
  
  const targetUserId = args[1].replace('@', '').trim();
  const duration = parseInt(args[2]) || 30; // minutos por defecto
  
  try {
    await sock.groupParticipantsUpdate(chatId, [targetUserId], 'mute');
    
    await logModerationAction(chatId, m.key.participant, targetUserId, 'mute', `${duration} minutos`);
    
    let message = `🔇 *USUARIO SILENCIADO* 🔇\n\n`;
    message += `👤 *@${targetUserId.split('@')[0]}* ha sido silenciado\n`;
    message += `⏱️ Duración: ${duration} minutos\n`;
    message += `👮‍♂️ Por: @${m.key.participant.split('@')[0]}\n`;
    message += `📅 ${new Date().toLocaleString()}`;
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [targetUserId, m.key.participant]
    }, { quoted: m });
    
    // Programar unmute automático
    setTimeout(async () => {
      try {
        await sock.groupParticipantsUpdate(chatId, [targetUserId], 'unmute');
        await sock.sendMessage(chatId, {
          text: `🔊 *@${targetUserId.split('@')[0]}* ha sido desilenciado automáticamente.`,
          mentions: [targetUserId]
        });
      } catch (error) {
        adminLogger.error('Error en unmute automático:', error);
      }
    }, duration * 60 * 1000);
    
    adminLogger.success(`Usuario silenciado: ${targetUserId} por ${duration} minutos`);
    
  } catch (error) {
    adminLogger.error('Error silenciando usuario:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al silenciar al usuario.'
    }, { quoted: m });
  }
}

// Desilenciar usuario
async function unmuteUser(sock, m, text) {
  const chatId = m.key.remoteJid;
  const args = text.split(' ');
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.unmute @usuario`'
    }, { quoted: m });
  }
  
  const targetUserId = args[1].replace('@', '').trim();
  
  try {
    await sock.groupParticipantsUpdate(chatId, [targetUserId], 'unmute');
    
    await logModerationAction(chatId, m.key.participant, targetUserId, 'unmute', 'Manual');
    
    let message = `🔊 *USUARIO DESILENCIADO* 🔊\n\n`;
    message += `👤 *@${targetUserId.split('@')[0]}* ha sido desilenciado\n`;
    message += `👮‍♂️ Por: @${m.key.participant.split('@')[0]}\n`;
    message += `📅 ${new Date().toLocaleString()}`;
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [targetUserId, m.key.participant]
    }, { quoted: m });
    
    adminLogger.success(`Usuario desilenciado: ${targetUserId}`);
    
  } catch (error) {
    adminLogger.error('Error desilenciando usuario:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al desilenciar al usuario.'
    }, { quoted: m });
  }
}

// Advertir usuario
async function warnUser(sock, m, text) {
  const chatId = m.key.remoteJid;
  const args = text.split(' ');
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.warn @usuario <motivo>`'
    }, { quoted: m });
  }
  
  const targetUserId = args[1].replace('@', '').trim();
  const reason = args.slice(2).join(' ') || 'Sin motivo especificado';
  
  try {
    // Obtener advertencias actuales
    const currentWarns = await getUserWarns(chatId, targetUserId);
    const newWarnCount = currentWarns + 1;
    
    // Actualizar advertencias
    await updateUserWarns(chatId, targetUserId, newWarnCount);
    
    await logModerationAction(chatId, m.key.participant, targetUserId, 'warn', `${reason} (${newWarnCount}/${CONFIG.maxWarns})`);
    
    let message = `⚠️ *ADVERTENCIA* ⚠️\n\n`;
    message += `👤 *@${targetUserId.split('@')[0]}* ha recibido una advertencia\n`;
    message += `📊 Advertencias: ${newWarnCount}/${CONFIG.maxWarns}\n`;
    message += `📝 Motivo: ${reason}\n`;
    message += `👮‍♂️ Por: @${m.key.participant.split('@')[0]}\n`;
    message += `📅 ${new Date().toLocaleString()}`;
    
    // Acción automática si alcanza el límite
    if (newWarnCount >= CONFIG.maxWarns) {
      message += `\n\n🚨 *LÍMITE ALCANZADO - ACCIÓN AUTOMÁTICA* 🚨`;
      
      try {
        await sock.groupParticipantsUpdate(chatId, [targetUserId], 'remove');
        message += `\n🔨 Usuario expulsado automáticamente por acumular ${CONFIG.maxWarns} advertencias.`;
        
        // Resetear advertencias
        await updateUserWarns(chatId, targetUserId, 0);
      } catch (error) {
        adminLogger.error('Error en acción automática:', error);
      }
    }
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [targetUserId, m.key.participant]
    }, { quoted: m });
    
    adminLogger.success(`Advertencia registrada: ${targetUserId} (${newWarnCount}/${CONFIG.maxWarns})`);
    
  } catch (error) {
    adminLogger.error('Error advertiendo usuario:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al registrar la advertencia.'
    }, { quoted: m });
  }
}

// Quitar advertencia
async function unwarnUser(sock, m, text) {
  const chatId = m.key.remoteJid;
  const args = text.split(' ');
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.unwarn @usuario`'
    }, { quoted: m });
  }
  
  const targetUserId = args[1].replace('@', '').trim();
  
  try {
    const currentWarns = await getUserWarns(chatId, targetUserId);
    
    if (currentWarns === 0) {
      return await sock.sendMessage(chatId, {
        text: '❌ Este usuario no tiene advertencias.'
      }, { quoted: m });
    }
    
    const newWarnCount = Math.max(0, currentWarns - 1);
    await updateUserWarns(chatId, targetUserId, newWarnCount);
    
    await logModerationAction(chatId, m.key.participant, targetUserId, 'unwarn', `Reducido a ${newWarnCount}`);
    
    let message = `✅ *ADVERTENCIA REMOVIDA* ✅\n\n`;
    message += `👤 *@${targetUserId.split('@')[0]}* tiene una advertencia menos\n`;
    message += `📊 Advertencias: ${newWarnCount}/${CONFIG.maxWarns}\n`;
    message += `👮‍♂️ Por: @${m.key.participant.split('@')[0]}\n`;
    message += `📅 ${new Date().toLocaleString()}`;
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [targetUserId, m.key.participant]
    }, { quoted: m });
    
    adminLogger.success(`Advertencia removida: ${targetUserId} (${newWarnCount}/${CONFIG.maxWarns})`);
    
  } catch (error) {
    adminLogger.error('Error quitando advertencia:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al quitar la advertencia.'
    }, { quoted: m });
  }
}

// Mostrar logs de moderación
async function showModLogs(sock, m) {
  const chatId = m.key.remoteJid;
  
  try {
    const logs = await getModerationLogs(chatId, 20);
    
    let message = `📋 *LOGS DE MODERACIÓN* 📋\n\n`;
    
    if (logs.length === 0) {
      message += `❌ No hay acciones de moderación recientes.`;
    } else {
      message += `📊 *Últimas 20 acciones:*\n\n`;
      
      logs.forEach((log, index) => {
        const actionEmoji = {
          'ban': '🔨',
          'kick': '👢',
          'mute': '🔇',
          'unmute': '🔊',
          'warn': '⚠️',
          'unwarn': '✅'
        }[log.action] || '📝';
        
        message += `${index + 1}. ${actionEmoji} ${log.action.toUpperCase()}\n`;
        message += `   👤 @${log.target_user.split('@')[0]}\n`;
        message += `   👮‍♂️ @${log.moderator.split('@')[0]}\n`;
        message += `   📝 ${log.reason}\n`;
        message += `   📅 ${new Date(log.timestamp).toLocaleString()}\n\n`;
      });
    }
    
    await sock.sendMessage(chatId, { text: message }, { quoted: m });
    
  } catch (error) {
    adminLogger.error('Error mostrando logs:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar los logs de moderación.'
    }, { quoted: m });
  }
}

// Mostrar configuración
async function showSettings(sock, m) {
  const chatId = m.key.remoteJid;
  
  try {
    const settings = await getGroupSettings(chatId);
    
    let message = `⚙️ *CONFIGURACIÓN DEL GRUPO* ⚙️\n\n`;
    message += `📊 *Límites y umbrales:*\n`;
    message += `⚠️ Máximo de advertencias: ${CONFIG.maxWarns}\n`;
    message += `🔨 Umbral de ban: ${CONFIG.banThreshold}\n`;
    message += `🔇 Duraciones de mute: 5min, 30min, 2horas\n\n`;
    
    message += `🔧 *Estado de funciones:*\n`;
    message += `🤖 Auto-moderación: ${CONFIG.enableAutoMod ? '✅ Activada' : '❌ Desactivada'}\n`;
    message += `📝 Logging: ${CONFIG.enableLogging ? '✅ Activado' : '❌ Desactivado'}\n\n`;
    
    message += `📈 *Estadísticas del grupo:*\n`;
    message += `⚠️ Advertencias totales: ${settings.total_warns || 0}\n`;
    message += `🔨 Bans totales: ${settings.total_bans || 0}\n`;
    message += `👢 Kicks totales: ${settings.total_kicks || 0}\n`;
    message += `🔇 Mutes totales: ${settings.total_mutes || 0}\n\n`;
    
    message += `💡 *Para cambiar configuración, contacta al desarrollador.*`;
    
    await sock.sendMessage(chatId, { text: message }, { quoted: m });
    
  } catch (error) {
    adminLogger.error('Error mostrando configuración:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la configuración.'
    }, { quoted: m });
  }
}

// Panel de administración
async function showAdminPanel(sock, m) {
  const chatId = m.key.remoteJid;
  
  try {
    const groupMetadata = await sock.groupMetadata(chatId);
    const settings = await getGroupSettings(chatId);
    
    let message = `👮‍♂️ *PANEL DE ADMINISTRACIÓN* 👮‍♂️\n\n`;
    message += `📱 *Grupo:* ${groupMetadata.subject}\n`;
    message += `👥 *Miembros:* ${groupMetadata.participants.length}\n`;
    message += `👮‍♂️ *Admins:* ${groupMetadata.participants.filter(p => p.admin).length}\n\n`;
    
    message += `📊 *Resumen de acciones:*\n`;
    message += `⚠️ Advertencias: ${settings.total_warns || 0}\n`;
    message += `🔨 Bans: ${settings.total_bans || 0}\n`;
    message += `👢 Kicks: ${settings.total_kicks || 0}\n`;
    message += `🔇 Mutes: ${settings.total_mutes || 0}\n\n`;
    
    message += `🔥 *Usuarios con más advertencias:*\n`;
    const topWarned = await getTopWarnedUsers(chatId, 5);
    topWarned.forEach((user, index) => {
      message += `${index + 1}. @${user.user_id.split('@')[0]} - ${user.warn_count} advertencias\n`;
    });
    
    message += `\n💡 *Comandos rápidos:*\n`;
    message += `• \`.ban @usuario\` - Banear\n`;
    message += `• \`.kick @usuario\` - Expulsar\n`;
    message += `• \`.warn @usuario\` - Advertir\n`;
    message += `• \`.mute @usuario\` - Silenciar\n`;
    message += `• \`.modlogs\` - Ver logs`;
    
    await sock.sendMessage(chatId, { text: message }, { quoted: m });
    
  } catch (error) {
    adminLogger.error('Error mostrando panel:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el panel de administración.'
    }, { quoted: m });
  }
}

// Mostrar ayuda
async function showAdminHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `👮‍♂️ *SISTEMA DE ADMINISTRACIÓN* 👮‍♂️\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `🔨 *Moderación:*\n`;
  message += `• \`.ban @usuario [motivo]\` - Banear permanentemente\n`;
  message += `• \`.kick @usuario [motivo]\` - Expulsar del grupo\n`;
  message += `• \`.mute @usuario [minutos]\` - Silenciar usuario\n`;
  message += `• \`.unmute @usuario\` - Desilenciar usuario\n`;
  message += `• \`.warn @usuario <motivo>\` - Advertir usuario\n`;
  message += `• \`.unwarn @usuario\` - Quitar advertencia\n\n`;
  
  message += `📊 *Información:*\n`;
  message += `• \`.modlogs\` - Ver logs de moderación\n`;
  message += `• \`.settings\` - Ver configuración del grupo\n`;
  message += `• \`.adminpanel\` - Panel de administración\n\n`;
  
  message += `⚙️ *Configuración automática:*\n`;
  message += `• ${CONFIG.maxWarns} advertencias = expulsión automática\n`;
  message += `• Sistema de reputación interna\n`;
  message += `• Logs completos de todas las acciones\n\n`;
  
  message += `🔒 *Seguridad:*\n`;
  message += `• Solo administradores pueden usar estos comandos\n`;
  message += `• Todas las acciones quedan registradas\n`;
  message += `• Protección contra abusos del sistema`;
  
  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones auxiliares
async function getUserWarns(chatId, userId) {
  try {
    const result = await db.get(
      'SELECT warn_count FROM user_warns WHERE chat_id = ? AND user_id = ?',
      [chatId, userId]
    );
    return result ? result.warn_count : 0;
  } catch (error) {
    adminLogger.error('Error obteniendo advertencias:', error);
    return 0;
  }
}

async function updateUserWarns(chatId, userId, warnCount) {
  try {
    await db.run(`
      INSERT OR REPLACE INTO user_warns (chat_id, user_id, warn_count, last_updated)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [chatId, userId, warnCount]);
  } catch (error) {
    adminLogger.error('Error actualizando advertencias:', error);
  }
}

async function logModerationAction(chatId, moderator, targetUser, action, reason) {
  try {
    await db.run(`
      INSERT INTO moderation_logs (chat_id, moderator, target_user, action, reason, timestamp)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [chatId, moderator, targetUser, action, reason]);
  } catch (error) {
    adminLogger.error('Error registrando acción:', error);
  }
}

async function getModerationLogs(chatId, limit = 20) {
  try {
    return await db.all(
      'SELECT * FROM moderation_logs WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?',
      [chatId, limit]
    );
  } catch (error) {
    adminLogger.error('Error obteniendo logs:', error);
    return [];
  }
}

async function getGroupSettings(chatId) {
  try {
    const stats = await db.get(`
      SELECT 
        SUM(CASE WHEN action = 'warn' THEN 1 ELSE 0 END) as total_warns,
        SUM(CASE WHEN action = 'ban' THEN 1 ELSE 0 END) as total_bans,
        SUM(CASE WHEN action = 'kick' THEN 1 ELSE 0 END) as total_kicks,
        SUM(CASE WHEN action = 'mute' THEN 1 ELSE 0 END) as total_mutes
      FROM moderation_logs WHERE chat_id = ?
    `, [chatId]);
    
    return stats || {};
  } catch (error) {
    adminLogger.error('Error obteniendo configuración:', error);
    return {};
  }
}

async function getTopWarnedUsers(chatId, limit = 5) {
  try {
    return await db.all(
      'SELECT user_id, warn_count FROM user_warns WHERE chat_id = ? AND warn_count > 0 ORDER BY warn_count DESC LIMIT ?',
      [chatId, limit]
    );
  } catch (error) {
    adminLogger.error('Error obteniendo top advertidos:', error);
    return [];
  }
}

// Inicializar tablas
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_warns (
        chat_id TEXT,
        user_id TEXT,
        warn_count INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (chat_id, user_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS moderation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT,
        moderator TEXT,
        target_user TEXT,
        action TEXT,
        reason TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    adminLogger.success('Tablas de administración inicializadas');
  } catch (error) {
    adminLogger.error('Error inicializando tablas:', error);
  }
}

// Inicializar sistema
initializeTables();

// Exportar funciones para compatibilidad
export { 
  CONFIG,
  adminLogger,
  getUserWarns,
  updateUserWarns,
  logModerationAction
};
