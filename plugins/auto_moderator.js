/**
 * @file Plugin Auto Moderator - Moderación automática
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema completo de moderación automática para grupos
 */

import { db } from './db.js';

// Configuración
const CONFIG = {
  enableLogging: true,
  maxWarnings: 3,
  muteDuration: 300000, // 5 minutos
  banDuration: 86400000, // 24 horas
  floodThreshold: 5, // mensajes en 30 segundos
  floodWindow: 30000, // 30 segundos
  capsThreshold: 70, // porcentaje de mayúsculas
  minMessageLength: 3,
  maxMessageLength: 1000,
  spamKeywords: [
    'spam', 'scam', 'hack', 'virus', 'malware', 'phishing',
    'bitcoin', 'cryptocurrency', 'investment', 'profit',
    'click here', 'free money', 'earn money', 'make money'
  ],
  linkPatterns: [
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
    /www\.[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
    /discord\.gg\/[a-zA-Z0-9]+/g,
    /t\.me\/[a-zA-Z0-9_]+/g
  ]
};

// Sistema de logging
const modLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[MOD] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[MOD] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[MOD] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[MOD] ❌ ${message}`)
};

// Funciones principales
export const command = ['.automod', '.modconfig', '.warnings', '.clearwarnings', '.modlogs', '.whitelist', '.blacklist'];
export const alias = ['.modauto', '.configmod', '.advertencias', '.limpiaradvertencias', '.logsmod', '.lista blanca', '.lista negra'];
export const description = 'Sistema completo de moderación automática';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.automod':
        await toggleAutoMod(sock, m);
        break;
      case '.modconfig':
        await configureMod(sock, m, text);
        break;
      case '.warnings':
        await showWarnings(sock, m, text);
        break;
      case '.clearwarnings':
        await clearWarnings(sock, m, text);
        break;
      case '.modlogs':
        await showModLogs(sock, m);
        break;
      case '.whitelist':
        await manageWhitelist(sock, m, text);
        break;
      case '.blacklist':
        await manageBlacklist(sock, m, text);
        break;
      default:
        await showModHelp(sock, m);
    }
  } catch (error) {
    modLogger.error('Error en sistema de moderación:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de moderación. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Función before para moderación automática
export async function before(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const messageText = m.message?.conversation || m.message?.extendedTextMessage?.text || '';

  try {
    // Verificar si la moderación automática está activada
    if (!await isAutoModEnabled(chatId)) {
      return;
    }

    // Verificar si el usuario está exento
    if (await isUserExempt(chatId, userId)) {
      return;
    }

    // Verificar diferentes tipos de infracciones
    const violations = await checkViolations(chatId, userId, messageText);
    
    if (violations.length > 0) {
      await handleViolations(sock, m, violations);
    }

  } catch (error) {
    modLogger.error('Error en moderación automática:', error);
  }
}

// Activar/desactivar moderación automática
async function toggleAutoMod(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    // Verificar si es admin
    if (!await isAdmin(sock, chatId, userId)) {
      return await sock.sendMessage(chatId, {
        text: '❌ Solo los administradores pueden usar este comando.'
      }, { quoted: m });
    }

    const currentStatus = await isAutoModEnabled(chatId);
    await setAutoModStatus(chatId, !currentStatus);

    let message = `🛡️ *MODERACIÓN AUTOMÁTICA* 🛡️\n\n`;
    message += `👤 Cambiada por: @${userId.split('@')[0]}\n`;
    message += `📊 Estado: ${!currentStatus ? '✅ Activada' : '❌ Desactivada'}\n\n`;
    
    if (!currentStatus) {
      message += `🔍 *Ahora monitoreando:*\n`;
      message += `• Spam y flood\n`;
      message += `• Mensajes inapropiados\n`;
      message += `• Enlaces no permitidos\n`;
      message += `• Exceso de mayúsculas\n`;
      message += `• Palabras prohibidas`;
    } else {
      message += `⚠️ *La moderación automática está desactivada.*`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    modLogger.success(`Auto-mod ${!currentStatus ? 'activada' : 'desactivada'} en ${chatId}`);

  } catch (error) {
    modLogger.error('Error cambiando estado auto-mod:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cambiar el estado de la moderación automática.'
    }, { quoted: m });
  }
}

// Configurar moderación
async function configureMod(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  const setting = args[1];
  const value = args[2];

  if (!setting) {
    return await showModConfig(sock, m, chatId);
  }

  try {
    switch (setting) {
      case 'flood':
        await configureFlood(sock, m, chatId, value);
        break;
      case 'caps':
        await configureCaps(sock, m, chatId, value);
        break;
      case 'links':
        await configureLinks(sock, m, chatId, value);
        break;
      case 'spam':
        await configureSpam(sock, m, chatId, value);
        break;
      case 'warnings':
        await configureWarnings(sock, m, chatId, value);
        break;
      default:
        await showModConfig(sock, m, chatId);
    }
  } catch (error) {
    modLogger.error('Error configurando moderación:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al configurar la moderación.'
    }, { quoted: m });
  }
}

// Mostrar advertencias
async function showWarnings(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const targetUser = args[1];

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  try {
    let targetId;
    if (targetUser && targetUser.includes('@')) {
      targetId = targetUser.replace('@', '') + '@s.whatsapp.net';
    } else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
      targetId = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else {
      return await sock.sendMessage(chatId, {
        text: '❌ Debes mencionar a un usuario o responder a su mensaje.'
      }, { quoted: m });
    }

    const warnings = await getUserWarnings(chatId, targetId);
    
    let message = `⚠️ *ADVERTENCIAS DE USUARIO* ⚠️\n\n`;
    message += `👤 Usuario: @${targetId.split('@')[0]}\n`;
    message += `📊 Total: ${warnings.length}/${CONFIG.maxWarnings}\n\n`;

    if (warnings.length === 0) {
      message += `✅ Este usuario no tiene advertencias.`;
    } else {
      message += `📋 *Historial de advertencias:*\n\n`;
      warnings.forEach((warning, index) => {
        message += `${index + 1}. ${warning.reason}\n`;
        message += `   📅 ${new Date(warning.timestamp).toLocaleString()}\n`;
        message += `   👤 Por: @${warning.moderator.split('@')[0]}\n\n`;
      });
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId, targetId]
    }, { quoted: m });

  } catch (error) {
    modLogger.error('Error mostrando advertencias:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las advertencias.'
    }, { quoted: m });
  }
}

// Limpiar advertencias
async function clearWarnings(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const targetUser = args[1];

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  try {
    let targetId;
    if (targetUser && targetUser.includes('@')) {
      targetId = targetUser.replace('@', '') + '@s.whatsapp.net';
    } else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
      targetId = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else {
      return await sock.sendMessage(chatId, {
        text: '❌ Debes mencionar a un usuario o responder a su mensaje.'
      }, { quoted: m });
    }

    await clearUserWarnings(chatId, targetId);

    let message = `✅ *ADVERTENCIAS LIMPIADAS* ✅\n\n`;
    message += `👤 Usuario: @${targetId.split('@')[0]}\n`;
    message += `👤 Limpiadas por: @${userId.split('@')[0]}\n`;
    message += `📊 Todas las advertencias han sido eliminadas.`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId, targetId]
    }, { quoted: m });

    modLogger.success(`Advertencias limpiadas para ${targetId} por ${userId}`);

  } catch (error) {
    modLogger.error('Error limpiando advertencias:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al limpiar las advertencias.'
    }, { quoted: m });
  }
}

// Mostrar logs de moderación
async function showModLogs(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  try {
    const logs = await getModLogs(chatId, 20);
    
    let message = `📋 *LOGS DE MODERACIÓN* 📋\n\n`;
    message += `👤 Solicitado por: @${userId.split('@')[0]}\n\n`;

    if (logs.length === 0) {
      message += `📭 No hay activity de moderación reciente.`;
    } else {
      message += `📝 *Activity reciente:*\n\n`;
      logs.forEach((log, index) => {
        message += `${index + 1}. ${log.action}\n`;
        message += `   👤 Usuario: @${log.user_id.split('@')[0]}\n`;
        message += `   📅 ${new Date(log.timestamp).toLocaleString()}\n`;
        message += `   📄 Razón: ${log.reason}\n\n`;
      });
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    modLogger.error('Error mostrando logs:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar los logs de moderación.'
    }, { quoted: m });
  }
}

// Gestionar lista blanca
async function manageWhitelist(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const action = args[1];
  const targetUser = args[2];

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  try {
    switch (action) {
      case 'add':
        await addToWhitelist(sock, m, chatId, targetUser);
        break;
      case 'remove':
        await removeFromWhitelist(sock, m, chatId, targetUser);
        break;
      case 'list':
        await showWhitelist(sock, m, chatId);
        break;
      default:
        await showWhitelistHelp(sock, m);
    }
  } catch (error) {
    modLogger.error('Error gestionando lista blanca:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al gestionar la lista blanca.'
    }, { quoted: m });
  }
}

// Gestionar lista negra
async function manageBlacklist(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const action = args[1];
  const targetUser = args[2];

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  try {
    switch (action) {
      case 'add':
        await addToBlacklist(sock, m, chatId, targetUser);
        break;
      case 'remove':
        await removeFromBlacklist(sock, m, chatId, targetUser);
        break;
      case 'list':
        await showBlacklist(sock, m, chatId);
        break;
      default:
        await showBlacklistHelp(sock, m);
    }
  } catch (error) {
    modLogger.error('Error gestionando lista negra:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al gestionar la lista negra.'
    }, { quoted: m });
  }
}

// Mostrar ayuda
async function showModHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `🛡️ *SISTEMA DE MODERACIÓN AUTOMÁTICA* 🛡️\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `⚙️ *Configuración:*\n`;
  message += `• \`.automod\` - Activar/desactivar moderación automática\n`;
  message += `• \`.modconfig <setting> <value>\` - Configurar parámetros\n`;
  message += `• \`.modconfig\` - Ver configuración actual\n\n`;
  
  message += `⚠️ *Advertencias:*\n`;
  message += `• \`.warnings @usuario\` - Ver advertencias de usuario\n`;
  message += `• \`.clearwarnings @usuario\` - Limpiar advertencias\n\n`;
  
  message += `📋 *Logs y listas:*\n`;
  message += `• \`.modlogs\` - Ver logs de moderación\n`;
  message += `• \`.whitelist add/remove/list @usuario\` - Gestionar lista blanca\n`;
  message += `• \`.blacklist add/remove/list @usuario\` - Gestionar lista negra\n\n`;
  
  message += `🔍 *Detección automática:*\n`;
  message += `• Spam y flood de mensajes\n`;
  message += `• Enlaces no permitidos\n`;
  message += `• Exceso de mayúsculas\n`;
  message += `• Palabras prohibidas\n`;
  message += `• Mensajes inapropiados\n\n`;
  
  message += `⚙️ *Configuraciones disponibles:*\n`;
  message += `• flood <umbral> - Límite de mensajes por ventana\n`;
  message += `• caps <porcentaje> - Máximo de mayúsculas\n`;
  message += `• links <on/off> - Permitir/enlaces\n`;
  message += `• spam <on/off> - Detección de spam\n`;
  message += `• warnings <número> - Máximo de advertencias`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones de detección
async function checkViolations(chatId, userId, messageText) {
  const violations = [];

  try {
    // Verificar flood
    if (await isFloodDetected(chatId, userId)) {
      violations.push({ type: 'flood', reason: 'Flood de mensajes' });
    }

    // Verificar mayúsculas
    if (await isCapsAbuse(messageText, chatId)) {
      violations.push({ type: 'caps', reason: 'Exceso de mayúsculas' });
    }

    // Verificar enlaces
    if (await isLinkViolation(messageText, chatId)) {
      violations.push({ type: 'links', reason: 'Enlaces no permitidos' });
    }

    // Verificar spam
    if (await isSpamMessage(messageText, chatId)) {
      violations.push({ type: 'spam', reason: 'Contenido de spam' });
    }

    // Verificar longitud
    if (messageText.length > CONFIG.maxMessageLength) {
      violations.push({ type: 'length', reason: 'Mensaje demasiado largo' });
    }

    return violations;

  } catch (error) {
    modLogger.error('Error verificando violaciones:', error);
    return [];
  }
}

async function handleViolations(sock, m, violations) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    for (const violation of violations) {
      // Registrar violación
      await logViolation(chatId, userId, violation.type, violation.reason);

      // Agregar advertencia
      await addWarning(chatId, userId, violation.reason);

      // Obtener número de advertencias
      const warnings = await getUserWarnings(chatId, userId);

      // Acción según número de advertencias
      if (warnings.length >= CONFIG.maxWarnings) {
        // Ban temporal
        await banUser(sock, chatId, userId, CONFIG.banDuration);
        await sock.sendMessage(chatId, {
          text: `🚫 @${userId.split('@')[0]} ha sido baneado temporalmente por acumular ${CONFIG.maxWarnings} advertencias.\n\n📄 Razón: ${violation.reason}`,
          mentions: [userId]
        }, { quoted: m });
      } else if (warnings.length >= 2) {
        // Mute temporal
        await muteUser(sock, chatId, userId, CONFIG.muteDuration);
        await sock.sendMessage(chatId, {
          text: `🔇 @${userId.split('@')[0]} ha sido silenciado por ${warnings.length} advertencias.\n\n📄 Razón: ${violation.reason}`,
          mentions: [userId]
        }, { quoted: m });
      } else {
        // Advertencia
        await sock.sendMessage(chatId, {
          text: `⚠️ @${userId.split('@')[0]} ha recibido una advertencia (${warnings.length}/${CONFIG.maxWarnings}).\n\n📄 Razón: ${violation.reason}`,
          mentions: [userId]
        }, { quoted: m });
      }

      // Eliminar mensaje si es violación grave
      if (['spam', 'links'].includes(violation.type)) {
        await sock.sendMessage(chatId, { delete: m.key });
      }
    }

  } catch (error) {
    modLogger.error('Error manejando violaciones:', error);
  }
}

// Funciones de verificación
async function isFloodDetected(chatId, userId) {
  try {
    const recentMessages = await db.all(`
      SELECT COUNT(*) as count FROM message_flood 
      WHERE chat_id = ? AND user_id = ? AND timestamp > datetime('now', '-${CONFIG.floodWindow} milliseconds')
    `, [chatId, userId]);

    return recentMessages[0]?.count >= CONFIG.floodThreshold;
  } catch (error) {
    return false;
  }
}

async function isCapsAbuse(messageText, chatId) {
  try {
    const config = await getModConfig(chatId);
    if (!config.caps_enabled) return false;

    if (messageText.length < CONFIG.minMessageLength) return false;

    const capsCount = (messageText.match(/[A-Z]/g) || []).length;
    const capsPercentage = (capsCount / messageText.length) * 100;

    return capsPercentage >= (config.caps_threshold || CONFIG.capsThreshold);
  } catch (error) {
    return false;
  }
}

async function isLinkViolation(messageText, chatId) {
  try {
    const config = await getModConfig(chatId);
    if (config.links_enabled) return false;

    return CONFIG.linkPatterns.some(pattern => pattern.test(messageText));
  } catch (error) {
    return false;
  }
}

async function isSpamMessage(messageText, chatId) {
  try {
    const config = await getModConfig(chatId);
    if (!config.spam_enabled) return false;

    const lowerText = messageText.toLowerCase();
    return CONFIG.spamKeywords.some(keyword => lowerText.includes(keyword));
  } catch (error) {
    return false;
  }
}

// Funciones de acción
async function muteUser(sock, chatId, userId, duration) {
  try {
    await sock.groupParticipantsUpdate(chatId, [userId], 'mute');
    
    // Programar unmute
    setTimeout(async () => {
      try {
        await sock.groupParticipantsUpdate(chatId, [userId], 'unmute');
      } catch (error) {
        modLogger.error('Error desmutando usuario:', error);
      }
    }, duration);
  } catch (error) {
    modLogger.error('Error muteando usuario:', error);
  }
}

async function banUser(sock, chatId, userId, duration) {
  try {
    await sock.groupParticipantsUpdate(chatId, [userId], 'remove');
    
    // Guardar en lista de baneados temporales
    await db.run(`
      INSERT INTO temp_bans (chat_id, user_id, banned_until, banned_at)
      VALUES (?, ?, datetime('now', '+${duration} milliseconds'), CURRENT_TIMESTAMP)
    `, [chatId, userId]);
  } catch (error) {
    modLogger.error('Error baneando usuario:', error);
  }
}

// Funciones de base de datos
async function isAutoModEnabled(chatId) {
  try {
    const result = await db.get('SELECT enabled FROM mod_settings WHERE chat_id = ?', [chatId]);
    return result ? result.enabled : false;
  } catch (error) {
    return false;
  }
}

async function setAutoModStatus(chatId, enabled) {
  try {
    await db.run(`
      INSERT OR REPLACE INTO mod_settings (chat_id, enabled, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [chatId, enabled]);
  } catch (error) {
    modLogger.error('Error guardando estado auto-mod:', error);
  }
}

async function getModConfig(chatId) {
  try {
    return await db.get('SELECT * FROM mod_settings WHERE chat_id = ?', [chatId]) || {
      flood_threshold: CONFIG.floodThreshold,
      caps_threshold: CONFIG.capsThreshold,
      links_enabled: false,
      spam_enabled: true,
      max_warnings: CONFIG.maxWarnings
    };
  } catch (error) {
    return {};
  }
}

async function isUserExempt(chatId, userId) {
  try {
    const result = await db.get(
      'SELECT 1 FROM whitelist WHERE chat_id = ? AND user_id = ?',
      [chatId, userId]
    );
    return !!result;
  } catch (error) {
    return false;
  }
}

async function isAdmin(sock, chatId, userId) {
  try {
    const groupMetadata = await sock.groupMetadata(chatId);
    return groupMetadata.participants.some(p => 
      p.id === userId && (p.admin === 'admin' || p.admin === 'superadmin')
    );
  } catch (error) {
    return false;
  }
}

async function getUserWarnings(chatId, userId) {
  try {
    return await db.all(`
      SELECT * FROM warnings 
      WHERE chat_id = ? AND user_id = ? 
      ORDER BY timestamp DESC
    `, [chatId, userId]);
  } catch (error) {
    return [];
  }
}

async function addWarning(chatId, userId, reason) {
  try {
    await db.run(`
      INSERT INTO warnings (chat_id, user_id, reason, timestamp)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [chatId, userId, reason]);
  } catch (error) {
    modLogger.error('Error agregando advertencia:', error);
  }
}

async function clearUserWarnings(chatId, userId) {
  try {
    await db.run('DELETE FROM warnings WHERE chat_id = ? AND user_id = ?', [chatId, userId]);
  } catch (error) {
    modLogger.error('Error limpiando advertencias:', error);
  }
}

async function logViolation(chatId, userId, type, reason) {
  try {
    await db.run(`
      INSERT INTO mod_logs (chat_id, user_id, action, reason, timestamp)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [chatId, userId, `violation_${type}`, reason]);
  } catch (error) {
    modLogger.error('Error registrando violación:', error);
  }
}

async function getModLogs(chatId, limit = 20) {
  try {
    return await db.all(`
      SELECT * FROM mod_logs 
      WHERE chat_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `, [chatId, limit]);
  } catch (error) {
    return [];
  }
}

// Funciones de configuración específicas
async function configureFlood(sock, m, chatId, value) {
  const threshold = parseInt(value);
  if (isNaN(threshold) || threshold < 1 || threshold > 20) {
    return await sock.sendMessage(chatId, {
      text: '❌ El umbral de flood debe estar entre 1 y 20.'
    }, { quoted: m });
  }

  await db.run(`
    UPDATE mod_settings SET flood_threshold = ? WHERE chat_id = ?
  `, [threshold, chatId]);

  await sock.sendMessage(chatId, {
    text: `✅ Umbral de flood configurado a ${threshold} mensajes.`
  }, { quoted: m });
}

async function configureCaps(sock, m, chatId, value) {
  const threshold = parseInt(value);
  if (isNaN(threshold) || threshold < 10 || threshold > 100) {
    return await sock.sendMessage(chatId, {
      text: '❌ El umbral de mayúsculas debe estar entre 10 y 100.'
    }, { quoted: m });
  }

  await db.run(`
    UPDATE mod_settings SET caps_threshold = ? WHERE chat_id = ?
  `, [threshold, chatId]);

  await sock.sendMessage(chatId, {
    text: `✅ Umbral de mayúsculas configurado a ${threshold}%.`
  }, { quoted: m });
}

async function configureLinks(sock, m, chatId, value) {
  const enabled = value === 'on' ? 1 : 0;
  await db.run(`
    UPDATE mod_settings SET links_enabled = ? WHERE chat_id = ?
  `, [enabled, chatId]);

  await sock.sendMessage(chatId, {
    text: `✅ Detección de enlaces ${enabled ? 'activada' : 'desactivada'}.`
  }, { quoted: m });
}

async function configureSpam(sock, m, chatId, value) {
  const enabled = value === 'on' ? 1 : 0;
  await db.run(`
    UPDATE mod_settings SET spam_enabled = ? WHERE chat_id = ?
  `, [enabled, chatId]);

  await sock.sendMessage(chatId, {
    text: `✅ Detección de spam ${enabled ? 'activada' : 'desactivada'}.`
  }, { quoted: m });
}

async function configureWarnings(sock, m, chatId, value) {
  const maxWarnings = parseInt(value);
  if (isNaN(maxWarnings) || maxWarnings < 1 || maxWarnings > 10) {
    return await sock.sendMessage(chatId, {
      text: '❌ El máximo de advertencias debe estar entre 1 y 10.'
    }, { quoted: m });
  }

  await db.run(`
    UPDATE mod_settings SET max_warnings = ? WHERE chat_id = ?
  `, [maxWarnings, chatId]);

  await sock.sendMessage(chatId, {
    text: `✅ Máximo de advertencias configurado a ${maxWarnings}.`
  }, { quoted: m });
}

async function showModConfig(sock, m, chatId) {
  const config = await getModConfig(chatId);
  
  let message = `⚙️ *CONFIGURACIÓN DE MODERACIÓN* ⚙️\n\n`;
  message += `🛡️ Auto-mod: ${await isAutoModEnabled(chatId) ? '✅ Activado' : '❌ Desactivado'}\n\n`;
  
  message += `📊 *Parámetros:*\n`;
  message += `• Flood: ${config.flood_threshold} mensajes por ventana\n`;
  message += `• Mayúsculas: ${config.caps_threshold}%\n`;
  message += `• Enlaces: ${config.links_enabled ? '🟢 Permitidos' : '🔴 Bloqueados'}\n`;
  message += `• Spam: ${config.spam_enabled ? '🟢 Detectado' : '🔴 No detectado'}\n`;
  message += `• Máx. advertencias: ${config.max_warnings}`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones de lista blanca/negra
async function addToWhitelist(sock, m, chatId, targetUser) {
  if (!targetUser) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar un usuario.'
    }, { quoted: m });
  }

  const userId = targetUser.replace('@', '') + '@s.whatsapp.net';
  await db.run(`
    INSERT OR IGNORE INTO whitelist (chat_id, user_id, added_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `, [chatId, userId]);

  await sock.sendMessage(chatId, {
    text: `✅ @${userId.split('@')[0]} agregado a la lista blanca.`,
    mentions: [userId]
  }, { quoted: m });
}

async function removeFromWhitelist(sock, m, chatId, targetUser) {
  if (!targetUser) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar un usuario.'
    }, { quoted: m });
  }

  const userId = targetUser.replace('@', '') + '@s.whatsapp.net';
  await db.run('DELETE FROM whitelist WHERE chat_id = ? AND user_id = ?', [chatId, userId]);

  await sock.sendMessage(chatId, {
    text: `✅ @${userId.split('@')[0]} eliminado de la lista blanca.`,
    mentions: [userId]
  }, { quoted: m });
}

async function showWhitelist(sock, m, chatId) {
  const whitelist = await db.all('SELECT * FROM whitelist WHERE chat_id = ?', [chatId]);
  
  let message = `👥 *LISTA BLANCA* 👥\n\n`;
  if (whitelist.length === 0) {
    message += `📭 No hay usuarios en la lista blanca.`;
  } else {
    whitelist.forEach((user, index) => {
      message += `${index + 1}. @${user.user_id.split('@')[0]}\n`;
    });
  }

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

async function addToBlacklist(sock, m, chatId, targetUser) {
  if (!targetUser) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar un usuario.'
    }, { quoted: m });
  }

  const userId = targetUser.replace('@', '') + '@s.whatsapp.net';
  await db.run(`
    INSERT OR IGNORE INTO blacklist (chat_id, user_id, added_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `, [chatId, userId]);

  await sock.sendMessage(chatId, {
    text: `✅ @${userId.split('@')[0]} agregado a la lista negra.`,
    mentions: [userId]
  }, { quoted: m });
}

async function removeFromBlacklist(sock, m, chatId, targetUser) {
  if (!targetUser) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar un usuario.'
    }, { quoted: m });
  }

  const userId = targetUser.replace('@', '') + '@s.whatsapp.net';
  await db.run('DELETE FROM blacklist WHERE chat_id = ? AND user_id = ?', [chatId, userId]);

  await sock.sendMessage(chatId, {
    text: `✅ @${userId.split('@')[0]} eliminado de la lista negra.`,
    mentions: [userId]
  }, { quoted: m });
}

async function showBlacklist(sock, m, chatId) {
  const blacklist = await db.all('SELECT * FROM blacklist WHERE chat_id = ?', [chatId]);
  
  let message = `🚫 *LISTA NEGRA* 🚫\n\n`;
  if (blacklist.length === 0) {
    message += `📭 No hay usuarios en la lista negra.`;
  } else {
    blacklist.forEach((user, index) => {
      message += `${index + 1}. @${user.user_id.split('@')[0]}\n`;
    });
  }

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

async function showWhitelistHelp(sock, m) {
  const message = `👥 *GESTIÓN DE LISTA BLANCA* 👥\n\n` +
    `• \`.whitelist add @usuario\` - Agregar a lista blanca\n` +
    `• \`.whitelist remove @usuario\` - Eliminar de lista blanca\n` +
    `• \`.whitelist list\` - Ver lista blanca`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

async function showBlacklistHelp(sock, m) {
  const message = `🚫 *GESTIÓN DE LISTA NEGRA* 🚫\n\n` +
    `• \`.blacklist add @usuario\` - Agregar a lista negra\n` +
    `• \`.blacklist remove @usuario\` - Eliminar de lista negra\n` +
    `• \`.blacklist list\` - Ver lista negra`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Inicializar tablas
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS mod_settings (
        chat_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        flood_threshold INTEGER DEFAULT 5,
        caps_threshold INTEGER DEFAULT 70,
        links_enabled INTEGER DEFAULT 0,
        spam_enabled INTEGER DEFAULT 1,
        max_warnings INTEGER DEFAULT 3,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT,
        user_id TEXT,
        reason TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS mod_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT,
        user_id TEXT,
        action TEXT,
        reason TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS whitelist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT,
        user_id TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS blacklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT,
        user_id TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS message_flood (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT,
        user_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS temp_bans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT,
        user_id TEXT,
        banned_until DATETIME,
        banned_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    modLogger.success('Tablas de moderación inicializadas');
  } catch (error) {
    modLogger.error('Error inicializando tablas:', error);
  }
}

// Inicializar sistema
initializeTables();

// Exportar funciones para compatibilidad
export { 
  CONFIG,
  modLogger,
  checkViolations,
  handleViolations,
  isAutoModEnabled
};
