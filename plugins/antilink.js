/**
 * @file Plugin AntiLink - Sistema de protección contra enlaces
 * @version 2.0.0
 * @author HINATA-BOT
 * @description Sistema avanzado de detección y eliminación de enlaces
 */

import axios from 'axios';

export const command = ['.antilink', '.enableantilink', '.disableantilink'];
export const alias = ['.antienlaces', '.activarantilink', '.desactivarantilink'];
export const description = 'Sistema de protección contra enlaces';

// Configuración
const CONFIG = {
  enableLogging: true,
  deleteMessage: true,
  warnBeforeDelete: false,
  deleteDelay: 1000,
  maxWarnings: 3,
  allowedDomains: ['chat.whatsapp.com', 'whatsapp.com'],
  exemptRoles: ['admin', 'owner', 'moderator']
};

// Sistema de logging
const antilinkLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[ANTILINK] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[ANTILINK] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[ANTILINK] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[ANTILINK] ❌ ${message}`)
};

// Patrones de detección de enlaces
const LINK_PATTERNS = {
  whatsapp: {
    group: /(?:https?:\/\/)?chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/gi,
    channel: /(?:https?:\/\/)?whatsapp\.com\/channel\/([0-9A-Za-z]{20,24})/gi,
    invite: /(?:https?:\/\/)?wa\.me\/([0-9]+)/gi
  },
  general: {
    url: /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)/gi,
    domain: /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi
  },
  suspicious: {
    shorteners: /(?:https?:\/\/)?(?:bit\.ly|goo\.gl|t\.co|tinyurl\.com|ow\.ly)\/[a-zA-Z0-9]+/gi,
    ip: /\b(?:https?:\/\/)?(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:\/[^\s]*)?\b/gi
  }
};

// Base de datos de advertencias (en memoria, debería moverse a base de datos real)
const warningsDatabase = new Map();

/**
 * Función principal del plugin
 */
export async function run(sock, m, { text }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.toLowerCase().split(' ').slice(1);

  try {
    // Verificar si es un grupo
    if (!m.isGroup) {
      return await sock.sendMessage(chatId, {
        text: '❌ Este comando solo funciona en grupos.'
      }, { quoted: m });
    }

    // Verificar si el usuario es admin
    const isAdmin = await isUserAdmin(sock, m, userId);
    if (!isAdmin) {
      return await sock.sendMessage(chatId, {
        text: '❌ Solo los administradores pueden usar este comando.'
      }, { quoted: m });
    }

    // Manejar comandos específicos
    switch (args[0]) {
      case 'on':
      case 'enable':
      case 'activar':
        await enableAntiLink(sock, m, chatId);
        break;
        
      case 'off':
      case 'disable':
      case 'desactivar':
        await disableAntiLink(sock, m, chatId);
        break;
        
      case 'status':
      case 'estado':
        await showAntiLinkStatus(sock, m, chatId);
        break;
        
      case 'config':
      case 'configurar':
        await showAntiLinkConfig(sock, m, chatId);
        break;
        
      default:
        await showAntiLinkHelp(sock, m, chatId);
        break;
    }

  } catch (error) {
    antilinkLogger.error('Error en el sistema AntiLink:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema AntiLink. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Función que se ejecuta antes de procesar mensajes (middleware)
 */
export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isROOwner, participants }) {
  try {
    // Verificar si es un grupo
    if (!m.isGroup) return true;

    // Obtener configuración del chat
    const chatConfig = await getChatConfig(m.chat);
    if (!chatConfig.antiLink) return true;

    // Verificar si el usuario está exento
    const user = m.sender;
    const isExempt = await isUserExempt(m, { isAdmin, isOwner, isROOwner });
    if (isExempt) return true;

    // Detectar enlaces en el mensaje
    const detectedLinks = detectLinks(m.text);
    if (detectedLinks.length === 0) return true;

    // Verificar si el enlace es permitido (del propio grupo)
    const isAllowedLink = await isOwnGroupLink(m, conn, detectedLinks);
    if (isAllowedLink) return true;

    // Procesar la detección de enlaces
    await handleLinkDetection(m, conn, detectedLinks, participants);
    
    return false; // Prevenir que el mensaje se procese normalmente

  } catch (error) {
    antilinkLogger.error('Error en middleware AntiLink:', error);
    return true; // Permitir el mensaje si hay error
  }
}

/**
 * Detecta enlaces en un texto
 */
function detectLinks(text) {
  const detectedLinks = [];
  
  // Buscar diferentes tipos de enlaces
  Object.entries(LINK_PATTERNS).forEach(([category, patterns]) => {
    Object.entries(patterns).forEach(([type, regex]) => {
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(link => {
          detectedLinks.push({
            url: link,
            type: `${category}_${type}`,
            category,
            detectedType: type
          });
        });
      }
    });
  });
  
  return detectedLinks;
}

/**
 * Verifica si un enlace es del propio grupo
 */
async function isOwnGroupLink(m, conn, links) {
  try {
    if (!isBotAdmin) return false;
    
    const groupInviteCode = await conn.groupInviteCode(m.chat);
    const groupLink = `https://chat.whatsapp.com/${groupInviteCode}`;
    
    return links.some(link => 
      link.url.includes(groupInviteCode) || 
      link.url === groupLink
    );
  } catch (error) {
    antilinkLogger.error('Error verificando enlace del grupo:', error);
    return false;
  }
}

/**
 * Maneja la detección de enlaces
 */
async function handleLinkDetection(m, conn, detectedLinks, participants) {
  const chatId = m.chat;
  const userId = m.sender;
  const userTag = `@${userId.split('@')[0]}`;
  
  antilinkLogger.info(`Enlace detectado - usuario: ${userId} - enlaces: ${detectedLinks.length}`);
  
  // Registrar advertencia
  await addWarning(userId, chatId);
  
  // Enviar mensaje de advertencia
  await conn.sendMessage(chatId, {
    text: `*「 🔗 ENLACE DETECTADO 」*\n\n` +
          `👤 Usuario: ${userTag}\n` +
          `⚠️ Enlaces detectados: ${detectedLinks.length}\n` +
          `📋 Tipo: ${detectedLinks.map(l => l.detectedType).join(', ')}\n\n` +
          `⛔ Has violado las reglas del grupo.\n` +
          `🚀 Serás eliminado automáticamente...`,
    mentions: [userId]
  }, { quoted: m });

  // Eliminar el mensaje si el bot es admin
  if (isBotAdmin) {
    try {
      await conn.sendMessage(chatId, {
        delete: {
          remoteJid: chatId,
          fromMe: false,
          id: m.key.id,
          participant: userId
        }
      });
    } catch (error) {
      antilinkLogger.warning('No se pudo eliminar el mensaje:', error.message);
    }
  }

  // Eliminar al usuario si el bot es admin
  if (isBotAdmin) {
    try {
      const response = await conn.groupParticipantsUpdate(chatId, [userId], 'remove');
      if (response[0]?.status === "404") {
        antilinkLogger.warning(`Usuario ${userId} ya no está en el grupo`);
      } else {
        antilinkLogger.success(`Usuario ${userId} eliminado por enlaces`);
      }
    } catch (error) {
      antilinkLogger.error('Error eliminando usuario:', error);
      
      // Notificar que no se pudo eliminar
      await conn.sendMessage(chatId, {
        text: `⚠️ No se pudo eliminar al usuario ${userTag}.\n` +
              `📋 Razón: ${error.message}\n\n` +
              `👮‍♂️ Por favor, elimínelo manualmente.`,
        mentions: [userId, ...participants.filter(p => p.admin).map(p => p.id)]
      }, { quoted: m });
    }
  } else {
    // Notificar que el bot no es admin
    await conn.sendMessage(chatId, {
      text: `⚠️ AntiLink está activo pero no soy administrador.\n\n` +
            `👤 Usuario: ${userTag}\n` +
            `🔗 Enlaces: ${detectedLinks.length}\n\n` +
            `📋 Por favor, hazme administrador para poder eliminar automáticamente.`,
      mentions: [userId, ...participants.filter(p => p.admin).map(p => p.id)]
    }, { quoted: m });
  }
}

/**
 * Verifica si un usuario está exento de las reglas
 */
async function isUserExempt(m, { isAdmin, isOwner, isROOwner }) {
  const userId = m.sender;
  
  // Verificar roles
  if (isAdmin || isOwner || isROOwner || m.fromMe) {
    return true;
  }
  
  // Verificar si está en la lista de exentos
  const exemptUsers = await getExemptUsers(m.chat);
  return exemptUsers.includes(userId);
}

/**
 * Activa AntiLink en un grupo
 */
async function enableAntiLink(sock, m, chatId) {
  try {
    // Guardar configuración (aquí deberías usar tu base de datos)
    // await db.run('UPDATE chats SET antiLink = 1 WHERE chatId = ?', [chatId]);
    
    await sock.sendMessage(chatId, {
      text: `✅ *AntiLink Activado*\n\n` +
            `🔒 Sistema de protección activado\n` +
            `⚡ Detectaré y eliminaré enlaces automáticamente\n` +
            `👮‍♂️ Solo los administradores están exentos\n\n` +
            `💡 *Comandos:*\n` +
            `• \`.antilink off\` - Desactivar\n` +
            `• \`.antilink status\` - Ver estado\n` +
            `• \`.antilink config\` - Configurar`
    }, { quoted: m });
    
    antilinkLogger.success(`AntiLink activado en chat: ${chatId}`);
  } catch (error) {
    antilinkLogger.error('Error activando AntiLink:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al activar AntiLink.'
    }, { quoted: m });
  }
}

/**
 * Desactiva AntiLink en un grupo
 */
async function disableAntiLink(sock, m, chatId) {
  try {
    // Guardar configuración
    // await db.run('UPDATE chats SET antiLink = 0 WHERE chatId = ?', [chatId]);
    
    await sock.sendMessage(chatId, {
      text: `❌ *AntiLink Desactivado*\n\n` +
            `🔓 Sistema de protección desactivado\n` +
            `🔗 Los usuarios ahora pueden enviar enlaces\n\n` +
            `💡 *Comandos:*\n` +
            `• \`.antilink on\` - Activar\n` +
            `• \`.antilink status\` - Ver estado`
    }, { quoted: m });
    
    antilinkLogger.info(`AntiLink desactivado en chat: ${chatId}`);
  } catch (error) {
    antilinkLogger.error('Error desactivando AntiLink:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al desactivar AntiLink.'
    }, { quoted: m });
  }
}

/**
 * Muestra el estado de AntiLink
 */
async function showAntiLinkStatus(sock, m, chatId) {
  try {
    const config = await getChatConfig(chatId);
    const status = config.antiLink ? '✅ Activo' : '❌ Inactivo';
    const botAdminStatus = isBotAdmin ? '✅ Admin' : '❌ No Admin';
    
    await sock.sendMessage(chatId, {
      text: `🔗 *Estado de AntiLink*\n\n` +
            `📊 Estado: ${status}\n` +
            `🤖 Bot Admin: ${botAdminStatus}\n` +
            `🛡️ Protección: ${config.antiLink ? 'Activada' : 'Desactivada'}\n` +
            `⚡ Detección: ${config.detectionMode || 'Todos los enlaces'}\n\n` +
            `💡 *Comandos:*\n` +
            `• \`.antilink on\` - Activar\n` +
            `• \`.antilink off\` - Desactivar\n` +
            `• \`.antilink config\` - Configurar`
    }, { quoted: m });
  } catch (error) {
    antilinkLogger.error('Error mostrando estado:', error);
  }
}

/**
 * Muestra la configuración de AntiLink
 */
async function showAntiLinkConfig(sock, m, chatId) {
  try {
    const config = await getChatConfig(chatId);
    
    await sock.sendMessage(chatId, {
      text: `⚙️ *Configuración de AntiLink*\n\n` +
            `📊 Estado: ${config.antiLink ? '✅ Activo' : '❌ Inactivo'}\n` +
            `🔍 Modo de detección: ${config.detectionMode || 'Todos'}\n` +
            `⚠️ Advertencias: ${config.maxWarnings || 3} antes de eliminar\n` +
            `🗑️ Eliminar mensaje: ${config.deleteMessage ? '✅ Sí' : '❌ No'}\n` +
            `👥 Exentos: ${config.exemptRoles?.join(', ') || 'Admins y Owner'}\n\n` +
            `💡 *Modos de detección:*\n` +
            `• \`.antilink config whatsapp\` - Solo WhatsApp\n` +
            `• \`.antilink config general\` - Todos los enlaces\n` +
            `• \`.antilink config strict\` - Modo estricto`
    }, { quoted: m });
  } catch (error) {
    antilinkLogger.error('Error mostrando configuración:', error);
  }
}

/**
 * Muestra la ayuda de AntiLink
 */
async function showAntiLinkHelp(sock, m, chatId) {
  try {
    await sock.sendMessage(chatId, {
      text: `🔗 *Ayuda de AntiLink*\n\n` +
            `💡 *Comandos disponibles:*\n\n` +
            `🔧 *Control:*\n` +
            `• \`.antilink on\` - Activar protección\n` +
            `• \`.antilink off\` - Desactivar protección\n` +
            `• \`.antilink status\` - Ver estado actual\n` +
            `• \`.antilink config\` - Ver configuración\n\n` +
            `🔍 *Modos de detección:*\n` +
            `• WhatsApp: Enlaces de grupos y canales\n` +
            `• General: Todos los enlaces\n` +
            `• Estricto: Incluye acortadores\n\n` +
            `👥 *Usuarios exentos:*\n` +
            `• Administradores del grupo\n` +
            `• Owner del bot\n` +
            `• El propio bot\n\n` +
            `⚠️ *Acciones automáticas:*\n` +
            `• Eliminar mensaje con enlace\n` +
            `• Expulsar al usuario\n` +
            `• Notificar al grupo`
    }, { quoted: m });
  } catch (error) {
    antilinkLogger.error('Error mostrando ayuda:', error);
  }
}

/**
 * Funciones auxiliares
 */
async function isUserAdmin(sock, m, userId) {
  try {
    const groupMetadata = await sock.groupMetadata(m.chat);
    return groupMetadata.participants.some(p => 
      p.id === userId && (p.admin === 'admin' || p.admin === 'superadmin')
    );
  } catch (error) {
    antilinkLogger.error('Error verificando admin:', error);
    return false;
  }
}

async function getChatConfig(chatId) {
  try {
    // Aquí deberías obtener la configuración desde tu base de datos
    // Por ahora, retornamos configuración por defecto
    return {
      antiLink: true, // Por defecto activado para demostración
      detectionMode: 'general',
      maxWarnings: 3,
      deleteMessage: true,
      exemptRoles: ['admin', 'owner']
    };
  } catch (error) {
    antilinkLogger.error('Error obteniendo configuración:', error);
    return {
      antiLink: false,
      detectionMode: 'general',
      maxWarnings: 3,
      deleteMessage: true,
      exemptRoles: ['admin', 'owner']
    };
  }
}

async function getExemptUsers(chatId) {
  try {
    // Aquí deberías obtener usuarios exentos desde tu base de datos
    return [];
  } catch (error) {
    antilinkLogger.error('Error obteniendo usuarios exentos:', error);
    return [];
  }
}

async function addWarning(userId, chatId) {
  try {
    const key = `${chatId}_${userId}`;
    const currentWarnings = warningsDatabase.get(key) || 0;
    warningsDatabase.set(key, currentWarnings + 1);
    
    antilinkLogger.info(`Advertencia añadida - usuario: ${userId} - total: ${currentWarnings + 1}`);
  } catch (error) {
    antilinkLogger.error('Error añadiendo advertencia:', error);
  }
}

// Exportar configuración y funciones
export { CONFIG, LINK_PATTERNS, antilinkLogger };
