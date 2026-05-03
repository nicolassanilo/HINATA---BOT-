/**
 * @file Plugin Group Manager - Gestión de grupos
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema completo de gestión y administración de grupos
 */

import { db } from './db.js';

// Configuración
const CONFIG = {
  enableLogging: true,
  maxGroupDescription: 512,
  maxGroupName: 25,
  welcomeEnabled: true,
  goodbyeEnabled: true,
  antiSpamEnabled: true,
  minParticipants: 2,
  maxAdmins: 10,
  autoPromoteThreshold: 100, // mensajes para auto-promoción
  activityCheckInterval: 3600000 // 1 hora
};

// Sistema de logging
const groupLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[GROUP] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[GROUP] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[GROUP] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[GROUP] ❌ ${message}`)
};

// Funciones principales
export const command = ['.groupinfo', '.groupsettings', '.welcome', '.goodbye', '.promote', '.demote', '.admins', '.members', '.grouprules', '.antispam', '.groupstats'];
export const alias = ['.infogrupo', '.configgrupo', '.bienvenida', '.despedida', '.ascender', '.degradar', '.administradores', '.miembros', '.reglasgrupo', '.antispam', '.estadisticasgrupo'];
export const description = 'Sistema completo de gestión y administración de grupos';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.groupinfo':
        await showGroupInfo(sock, m);
        break;
      case '.groupsettings':
        await manageGroupSettings(sock, m, text);
        break;
      case '.welcome':
        await manageWelcomeMessage(sock, m, text);
        break;
      case '.goodbye':
        await manageGoodbyeMessage(sock, m, text);
        break;
      case '.promote':
        await promoteMember(sock, m);
        break;
      case '.demote':
        await demoteMember(sock, m);
        break;
      case '.admins':
        await showAdmins(sock, m);
        break;
      case '.members':
        await showMembers(sock, m);
        break;
      case '.grouprules':
        await manageGroupRules(sock, m, text);
        break;
      case '.antispam':
        await manageAntiSpam(sock, m, text);
        break;
      case '.groupstats':
        await showGroupStats(sock, m);
        break;
      default:
        await showGroupHelp(sock, m);
    }
  } catch (error) {
    groupLogger.error('Error en sistema de gestión de grupos:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de gestión de grupos. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Función before para eventos de grupo
export async function before(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    // Eventos de bienvenida/despedida
    if (m.messageStubType === 32 || m.messageStubType === 28) {
      await handleMemberJoin(sock, m);
    } else if (m.messageStubType === 33 || m.messageStubType === 29) {
      await handleMemberLeave(sock, m);
    }

    // Actualizar actividad de miembros
    await updateMemberActivity(chatId, userId);

  } catch (error) {
    groupLogger.error('Error en eventos de grupo:', error);
  }
}

// Mostrar información del grupo
async function showGroupInfo(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const groupMetadata = await sock.groupMetadata(chatId);
    const groupSettings = await getGroupSettings(chatId);

    let message = `📊 *INFORMACIÓN DEL GRUPO* 📊\n\n`;
    message += `👥 **${groupMetadata.subject}**\n`;
    message += `📝 ${groupMetadata.desc || 'Sin descripción'}\n\n`;
    
    message += `📈 *Estadísticas:*\n`;
    message += `👥 Miembros: ${groupMetadata.participants.length}\n`;
    message += `👑 Administradores: ${groupMetadata.participants.filter(p => p.admin).length}\n`;
    message += `🆔 ID: ${groupMetadata.id}\n`;
    message += `👤 Creado por: @${groupMetadata.owner?.split('@')[0] || 'Desconocido'}\n`;
    message += `📅 Creado: ${groupMetadata.creation ? new Date(groupMetadata.creation * 1000).toLocaleDateString() : 'Desconocido'}\n\n`;
    
    message += `⚙️ *Configuración:*\n`;
    message += `🔒 Tipo: ${groupMetadata.announce ? 'Solo admins' : 'Todos pueden escribir'}\n`;
    message += `👥 Añadir: ${groupMetadata.restrict ? 'Solo admins' : 'Todos pueden añadir'}\n`;
    message += `🎉 Bienvenida: ${groupSettings.welcome_enabled ? '✅ Activada' : '❌ Desactivada'}\n`;
    message += `👋 Despedida: ${groupSettings.goodbye_enabled ? '✅ Activada' : '❌ Desactivada'}\n`;
    message += `🛡️ Anti-spam: ${groupSettings.antispam_enabled ? '✅ Activado' : '❌ Desactivada'}\n\n`;
    
    message += `📊 *Activity reciente:*\n`;
    message += `📈 Mensajes hoy: ${await getMessagesCount(chatId, 'today')}\n`;
    message += `📈 Mensajes esta semana: ${await getMessagesCount(chatId, 'week')}\n`;
    message += `👥 Miembros activos hoy: ${await getActiveMembersCount(chatId, 'today')}`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: groupMetadata.owner ? [groupMetadata.owner] : []
    }, { quoted: m });

  } catch (error) {
    groupLogger.error('Error mostrando información del grupo:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al obtener la información del grupo.'
    }, { quoted: m });
  }
}

// Gestionar configuración del grupo
async function manageGroupSettings(sock, m, text) {
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
    return await showGroupSettings(sock, m, chatId);
  }

  try {
    switch (setting) {
      case 'announce':
        await toggleAnnounce(sock, m, chatId, value);
        break;
      case 'restrict':
        await toggleRestrict(sock, m, chatId, value);
        break;
      case 'name':
        await changeGroupName(sock, m, chatId, args.slice(2).join(' '));
        break;
      case 'desc':
        await changeGroupDesc(sock, m, chatId, args.slice(2).join(' '));
        break;
      case 'lock':
        await lockGroup(sock, m, chatId);
        break;
      case 'unlock':
        await unlockGroup(sock, m, chatId);
        break;
      default:
        await showGroupSettings(sock, m, chatId);
    }
  } catch (error) {
    groupLogger.error('Error gestionando configuración:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cambiar la configuración del grupo.'
    }, { quoted: m });
  }
}

// Gestionar mensaje de bienvenida
async function manageWelcomeMessage(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const action = args[1];

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  try {
    switch (action) {
      case 'on':
        await setWelcomeEnabled(sock, m, chatId, true);
        break;
      case 'off':
        await setWelcomeEnabled(sock, m, chatId, false);
        break;
      case 'set':
        await setWelcomeMessage(sock, m, chatId, args.slice(2).join(' '));
        break;
      case 'preview':
        await previewWelcomeMessage(sock, m, chatId);
        break;
      default:
        await showWelcomeHelp(sock, m);
    }
  } catch (error) {
    groupLogger.error('Error gestionando bienvenida:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al gestionar el mensaje de bienvenida.'
    }, { quoted: m });
  }
}

// Gestionar mensaje de despedida
async function manageGoodbyeMessage(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const action = args[1];

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  try {
    switch (action) {
      case 'on':
        await setGoodbyeEnabled(sock, m, chatId, true);
        break;
      case 'off':
        await setGoodbyeEnabled(sock, m, chatId, false);
        break;
      case 'set':
        await setGoodbyeMessage(sock, m, chatId, args.slice(2).join(' '));
        break;
      case 'preview':
        await previewGoodbyeMessage(sock, m, chatId);
        break;
      default:
        await showGoodbyeHelp(sock, m);
    }
  } catch (error) {
    groupLogger.error('Error gestionando despedida:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al gestionar el mensaje de despedida.'
    }, { quoted: m });
  }
}

// Promover miembro
async function promoteMember(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  try {
    const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentionedJid.length === 0) {
      return await sock.sendMessage(chatId, {
        text: '❌ Debes mencionar a los usuarios que quieres promover.'
      }, { quoted: m });
    }

    const groupMetadata = await sock.groupMetadata(chatId);
    const currentAdmins = groupMetadata.participants.filter(p => p.admin).length;

    if (currentAdmins + mentionedJid.length > CONFIG.maxAdmins) {
      return await sock.sendMessage(chatId, {
        text: `❌ No se pueden promover más de ${CONFIG.maxAdmins} administradores.`
      }, { quoted: m });
    }

    await sock.groupParticipantsUpdate(chatId, mentionedJid, 'promote');

    let message = `🎉 *MIEMBROS PROMOVIDOS* 🎉\n\n`;
    message += `👤 Promovidos por: @${userId.split('@')[0]}\n\n`;
    mentionedJid.forEach(jid => {
      message += `👑 @${jid.split('@')[0]}\n`;
    });
    message += `\n✅ Ahora son administradores del grupo.`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId, ...mentionedJid]
    }, { quoted: m });

    groupLogger.success(`${mentionedJid.length} miembros promovidos en ${chatId}`);

  } catch (error) {
    groupLogger.error('Error promoviendo miembros:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al promover los miembros.'
    }, { quoted: m });
  }
}

// Degradar miembro
async function demoteMember(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  try {
    const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentionedJid.length === 0) {
      return await sock.sendMessage(chatId, {
        text: '❌ Debes mencionar a los usuarios que quieres degradar.'
      }, { quoted: m });
    }

    await sock.groupParticipantsUpdate(chatId, mentionedJid, 'demote');

    let message = `📉 *MIEMBROS DEGRADADOS* 📉\n\n`;
    message += `👤 Degradados por: @${userId.split('@')[0]}\n\n`;
    mentionedJid.forEach(jid => {
      message += `👤 @${jid.split('@')[0]}\n`;
    });
    message += `\n✅ Ya no son administradores del grupo.`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId, ...mentionedJid]
    }, { quoted: m });

    groupLogger.success(`${mentionedJid.length} miembros degradados en ${chatId}`);

  } catch (error) {
    groupLogger.error('Error degradando miembros:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al degradar los miembros.'
    }, { quoted: m });
  }
}

// Mostrar administradores
async function showAdmins(sock, m) {
  const chatId = m.key.remoteJid;

  try {
    const groupMetadata = await sock.groupMetadata(chatId);
    const admins = groupMetadata.participants.filter(p => p.admin);

    let message = `👑 *ADMINISTRADORES* 👑\n\n`;
    message += `📊 Total: ${admins.length} administradores\n\n`;

    admins.forEach((admin, index) => {
      const role = admin.admin === 'superadmin' ? '👑 Super Admin' : '👤 Admin';
      message += `${index + 1}. ${role} - @${admin.id.split('@')[0]}\n`;
    });

    await sock.sendMessage(chatId, {
      text: message,
      mentions: admins.map(a => a.id)
    }, { quoted: m });

  } catch (error) {
    groupLogger.error('Error mostrando administradores:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar los administradores.'
    }, { quoted: m });
  }
}

// Mostrar miembros
async function showMembers(sock, m) {
  const chatId = m.key.remoteJid;

  try {
    const groupMetadata = await sock.groupMetadata(chatId);
    const members = groupMetadata.participants.filter(p => !p.admin);

    let message = `👥 *MIEMBROS DEL GRUPO* 👥\n\n`;
    message += `📊 Total: ${members.length} miembros\n\n`;

    // Mostrar primeros 20 miembros
    const displayMembers = members.slice(0, 20);
    displayMembers.forEach((member, index) => {
      message += `${index + 1}. @${member.id.split('@')[0]}\n`;
    });

    if (members.length > 20) {
      message += `\n📊 Y ${members.length - 20} miembros más...`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: displayMembers.map(m => m.id)
    }, { quoted: m });

  } catch (error) {
    groupLogger.error('Error mostrando miembros:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar los miembros.'
    }, { quoted: m });
  }
}

// Gestionar reglas del grupo
async function manageGroupRules(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const action = args[1];

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  try {
    switch (action) {
      case 'set':
        await setGroupRules(sock, m, chatId, args.slice(2).join(' '));
        break;
      case 'show':
        await showGroupRules(sock, m, chatId);
        break;
      case 'clear':
        await clearGroupRules(sock, m, chatId);
        break;
      default:
        await showRulesHelp(sock, m);
    }
  } catch (error) {
    groupLogger.error('Error gestionando reglas:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al gestionar las reglas del grupo.'
    }, { quoted: m });
  }
}

// Gestionar anti-spam
async function manageAntiSpam(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const action = args[1];

  if (!await isAdmin(sock, chatId, userId)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: m });
  }

  try {
    switch (action) {
      case 'on':
        await setAntiSpamEnabled(sock, m, chatId, true);
        break;
      case 'off':
        await setAntiSpamEnabled(sock, m, chatId, false);
        break;
      case 'settings':
        await showAntiSpamSettings(sock, m, chatId);
        break;
      default:
        await showAntiSpamHelp(sock, m);
    }
  } catch (error) {
    groupLogger.error('Error gestionando anti-spam:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al gestionar el anti-spam.'
    }, { quoted: m });
  }
}

// Mostrar estadísticas del grupo
async function showGroupStats(sock, m) {
  const chatId = m.key.remoteJid;

  try {
    const groupMetadata = await sock.groupMetadata(chatId);
    const stats = await getGroupStatistics(chatId);

    let message = `📊 *ESTADÍSTICAS DEL GRUPO* 📊\n\n`;
    message += `👥 **${groupMetadata.subject}**\n\n`;
    
    message += `📈 *Activity:*\n`;
    message += `• Mensajes hoy: ${stats.messages_today}\n`;
    message += `• Mensajes esta semana: ${stats.messages_week}\n`;
    message += `• Mensajes este mes: ${stats.messages_month}\n`;
    message += `• Total mensajes: ${stats.messages_total}\n\n`;
    
    message += `👥 *Miembros:*\n`;
    message += `• Total: ${groupMetadata.participants.length}\n`;
    message += `• Activos hoy: ${stats.active_today}\n`;
    message += `• Activos esta semana: ${stats.active_week}\n`;
    message += `• Nuevos este mes: ${stats.new_members_month}\n\n`;
    
    message += `📊 *Top activity:*\n`;
    stats.top_members.forEach((member, index) => {
      message += `${index + 1}. @${member.user_id.split('@')[0]} - ${member.messages} mensajes\n`;
    });
    
    message += `\n📅 *Fecha de creación:*\n`;
    message += `${groupMetadata.creation ? new Date(groupMetadata.creation * 1000).toLocaleDateString() : 'Desconocida'}`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: stats.top_members.map(m => m.user_id)
    }, { quoted: m });

  } catch (error) {
    groupLogger.error('Error mostrando estadísticas:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las estadísticas del grupo.'
    }, { quoted: m });
  }
}

// Mostrar ayuda
async function showGroupHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `👥 *SISTEMA DE GESTIÓN DE GRUPOS* 👥\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `📊 *Información:*\n`;
  message += `• \`.groupinfo\` - Ver información del grupo\n`;
  message += `• \`.groupstats\` - Ver estadísticas\n`;
  message += `• \`.admins\` - Ver administradores\n`;
  message += `• \`.members\` - Ver miembros\n\n`;
  
  message += `⚙️ *Configuración:*\n`;
  message += `• \`.groupsettings <setting> <value>\` - Configurar grupo\n`;
  message += `• \`.groupsettings announce on/off\` - Solo admins pueden escribir\n`;
  message += `• \`.groupsettings restrict on/off\` - Solo admins pueden añadir\n`;
  message += `• \`.groupsettings name <nombre>\` - Cambiar nombre\n`;
  message += `• \`.groupsettings desc <descripción>\` - Cambiar descripción\n\n`;
  
  message += `🎉 *Bienvenida/Despedida:*\n`;
  message += `• \`.welcome on/off\` - Activar/desactivar bienvenida\n`;
  message += `• \`.welcome set <mensaje>\` - Establecer mensaje\n`;
  message += `• \`.welcome preview\` - Previsualizar mensaje\n`;
  message += `• \`.goodbye on/off\` - Activar/desactivar despedida\n`;
  message += `• \`.goodbye set <mensaje>\` - Establecer mensaje\n\n`;
  
  message += `👑 *Administración:*\n`;
  message += `• \`.promote @usuario\` - Promover a admin\n`;
  message += `• \`.demote @usuario\` - Degradar de admin\n`;
  message += `• \`.grouprules set <reglas>\` - Establecer reglas\n`;
  message += `• \`.grouprules show\` - Mostrar reglas\n\n`;
  
  message += `🛡️ *Seguridad:*\n`;
  message += `• \`.antispam on/off\` - Activar anti-spam\n`;
  message += `• \`.antispam settings\` - Ver configuración`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones de eventos
async function handleMemberJoin(sock, m) {
  const chatId = m.key.remoteJid;
  const participants = m.participants || [];

  try {
    const groupSettings = await getGroupSettings(chatId);
    if (!groupSettings.welcome_enabled) return;

    for (const participant of participants) {
      const welcomeMessage = await getWelcomeMessage(chatId);
      const personalizedMessage = welcomeMessage
        .replace(/@user/g, `@${participant.split('@')[0]}`)
        .replace(/@group/g, (await sock.groupMetadata(chatId)).subject);

      await sock.sendMessage(chatId, {
        text: personalizedMessage,
        mentions: [participant]
      });

      // Registrar nuevo miembro
      await registerNewMember(chatId, participant);
    }

  } catch (error) {
    groupLogger.error('Error en bienvenida:', error);
  }
}

async function handleMemberLeave(sock, m) {
  const chatId = m.key.remoteJid;
  const participants = m.participants || [];

  try {
    const groupSettings = await getGroupSettings(chatId);
    if (!groupSettings.goodbye_enabled) return;

    for (const participant of participants) {
      const goodbyeMessage = await getGoodbyeMessage(chatId);
      const personalizedMessage = goodbyeMessage
        .replace(/@user/g, `@${participant.split('@')[0]}`)
        .replace(/@group/g, (await sock.groupMetadata(chatId)).subject);

      await sock.sendMessage(chatId, {
        text: personalizedMessage,
        mentions: [participant]
      });
    }

  } catch (error) {
    groupLogger.error('Error en despedida:', error);
  }
}

// Funciones auxiliares
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

async function getGroupSettings(chatId) {
  try {
    return await db.get('SELECT * FROM group_settings WHERE chat_id = ?', [chatId]) || {
      welcome_enabled: CONFIG.welcomeEnabled,
      goodbye_enabled: CONFIG.goodbyeEnabled,
      antispam_enabled: CONFIG.antiSpamEnabled,
      welcome_message: '🎉 ¡Bienvenido @user a @group!',
      goodbye_message: '👋 Adiós @user, te extrañaremos en @group.'
    };
  } catch (error) {
    return {};
  }
}

async function getWelcomeMessage(chatId) {
  const settings = await getGroupSettings(chatId);
  return settings.welcome_message || '🎉 ¡Bienvenido @user a @group!';
}

async function getGoodbyeMessage(chatId) {
  const settings = await getGroupSettings(chatId);
  return settings.goodbye_message || '👋 Adiós @user, te extrañaremos en @group.';
}

async function getGroupStatistics(chatId) {
  try {
    const stats = {
      messages_today: await getMessagesCount(chatId, 'today'),
      messages_week: await getMessagesCount(chatId, 'week'),
      messages_month: await getMessagesCount(chatId, 'month'),
      messages_total: await getMessagesCount(chatId, 'total'),
      active_today: await getActiveMembersCount(chatId, 'today'),
      active_week: await getActiveMembersCount(chatId, 'week'),
      new_members_month: await getNewMembersCount(chatId, 'month'),
      top_members: await getTopMembers(chatId, 5)
    };
    return stats;
  } catch (error) {
    return {};
  }
}

async function getMessagesCount(chatId, period) {
  try {
    let query = 'SELECT COUNT(*) as count FROM message_stats WHERE chat_id = ?';
    let params = [chatId];

    switch (period) {
      case 'today':
        query += ' AND date(timestamp) = date("now")';
        break;
      case 'week':
        query += ' AND date(timestamp) >= date("now", "-7 days")';
        break;
      case 'month':
        query += ' AND date(timestamp) >= date("now", "-30 days")';
        break;
    }

    const result = await db.get(query, params);
    return result ? result.count : 0;
  } catch (error) {
    return 0;
  }
}

async function getActiveMembersCount(chatId, period) {
  try {
    let query = 'SELECT COUNT(DISTINCT user_id) as count FROM member_activity WHERE chat_id = ?';
    let params = [chatId];

    switch (period) {
      case 'today':
        query += ' AND date(last_activity) = date("now")';
        break;
      case 'week':
        query += ' AND date(last_activity) >= date("now", "-7 days")';
        break;
    }

    const result = await db.get(query, params);
    return result ? result.count : 0;
  } catch (error) {
    return 0;
  }
}

async function getNewMembersCount(chatId, period) {
  try {
    let query = 'SELECT COUNT(*) as count FROM new_members WHERE chat_id = ?';
    let params = [chatId];

    if (period === 'month') {
      query += ' AND date(joined_at) >= date("now", "-30 days")';
    }

    const result = await db.get(query, params);
    return result ? result.count : 0;
  } catch (error) {
    return 0;
  }
}

async function getTopMembers(chatId, limit = 5) {
  try {
    return await db.all(`
      SELECT user_id, COUNT(*) as messages 
      FROM message_stats 
      WHERE chat_id = ? 
      GROUP BY user_id 
      ORDER BY messages DESC 
      LIMIT ?
    `, [chatId, limit]);
  } catch (error) {
    return [];
  }
}

async function updateMemberActivity(chatId, userId) {
  try {
    await db.run(`
      INSERT OR REPLACE INTO member_activity (chat_id, user_id, last_activity)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [chatId, userId]);

    await db.run(`
      INSERT OR REPLACE INTO message_stats (chat_id, user_id, message_count, last_message)
      VALUES (?, ?, COALESCE((SELECT message_count FROM message_stats WHERE chat_id = ? AND user_id = ?), 0) + 1, CURRENT_TIMESTAMP)
    `, [chatId, userId, chatId, userId]);
  } catch (error) {
    groupLogger.error('Error actualizando actividad:', error);
  }
}

async function registerNewMember(chatId, userId) {
  try {
    await db.run(`
      INSERT OR IGNORE INTO new_members (chat_id, user_id, joined_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [chatId, userId]);
  } catch (error) {
    groupLogger.error('Error registrando nuevo miembro:', error);
  }
}

// Funciones de configuración específicas
async function toggleAnnounce(sock, m, chatId, value) {
  const enabled = value === 'on';
  await sock.groupSettingUpdate(chatId, enabled ? 'announcement' : 'not_announcement');
  
  await sock.sendMessage(chatId, {
    text: `✅ Grupo configurado: ${enabled ? 'Solo admins pueden escribir' : 'Todos pueden escribir'}`
  }, { quoted: m });
}

async function toggleRestrict(sock, m, chatId, value) {
  const enabled = value === 'on';
  await sock.groupSettingUpdate(chatId, enabled ? 'locked' : 'unlocked');
  
  await sock.sendMessage(chatId, {
    text: `✅ Grupo configurado: ${enabled ? 'Solo admins pueden añadir' : 'Todos pueden añadir'}`
  }, { quoted: m });
}

async function changeGroupName(sock, m, chatId, newName) {
  if (!newName || newName.length > CONFIG.maxGroupName) {
    return await sock.sendMessage(chatId, {
      text: `❌ El nombre debe tener máximo ${CONFIG.maxGroupName} caracteres.`
    }, { quoted: m });
  }

  await sock.groupUpdateSubject(chatId, newName);
  
  await sock.sendMessage(chatId, {
    text: `✅ Nombre del grupo cambiado a: ${newName}`
  }, { quoted: m });
}

async function changeGroupDesc(sock, m, chatId, newDesc) {
  if (!newDesc || newDesc.length > CONFIG.maxGroupDescription) {
    return await sock.sendMessage(chatId, {
      text: `❌ La descripción debe tener máximo ${CONFIG.maxGroupDescription} caracteres.`
    }, { quoted: m });
  }

  await sock.groupUpdateDescription(chatId, newDesc);
  
  await sock.sendMessage(chatId, {
    text: `✅ Descripción del grupo actualizada.`
  }, { quoted: m });
}

async function lockGroup(sock, m, chatId) {
  await sock.groupSettingUpdate(chatId, 'locked');
  
  await sock.sendMessage(chatId, {
    text: '🔒 Grupo bloqueado. Solo los admins pueden añadir miembros.'
  }, { quoted: m });
}

async function unlockGroup(sock, m, chatId) {
  await sock.groupSettingUpdate(chatId, 'unlocked');
  
  await sock.sendMessage(chatId, {
    text: '🔓 Grupo desbloqueado. Todos pueden añadir miembros.'
  }, { quoted: m });
}

async function setWelcomeEnabled(sock, m, chatId, enabled) {
  await db.run(`
    UPDATE group_settings SET welcome_enabled = ? WHERE chat_id = ?
  `, [enabled ? 1 : 0, chatId]);

  await sock.sendMessage(chatId, {
    text: `✅ Bienvenida ${enabled ? 'activada' : 'desactivada'}.`
  }, { quoted: m });
}

async function setWelcomeMessage(sock, m, chatId, message) {
  if (!message) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar un mensaje.\n\n💡 Variables: @user, @group'
    }, { quoted: m });
  }

  await db.run(`
    UPDATE group_settings SET welcome_message = ? WHERE chat_id = ?
  `, [message, chatId]);

  await sock.sendMessage(chatId, {
    text: '✅ Mensaje de bienvenida actualizado.'
  }, { quoted: m });
}

async function previewWelcomeMessage(sock, m, chatId) {
  const message = await getWelcomeMessage(chatId);
  const userId = m.key.participant || m.key.remoteJid;
  const groupMetadata = await sock.groupMetadata(chatId);
  
  const preview = message
    .replace(/@user/g, `@${userId.split('@')[0]}`)
    .replace(/@group/g, groupMetadata.subject);

  await sock.sendMessage(chatId, {
    text: `🎯 *Vista previa de bienvenida:*\n\n${preview}`,
    mentions: [userId]
  }, { quoted: m });
}

async function setGoodbyeEnabled(sock, m, chatId, enabled) {
  await db.run(`
    UPDATE group_settings SET goodbye_enabled = ? WHERE chat_id = ?
  `, [enabled ? 1 : 0, chatId]);

  await sock.sendMessage(chatId, {
    text: `✅ Despedida ${enabled ? 'activada' : 'desactivada'}.`
  }, { quoted: m });
}

async function setGoodbyeMessage(sock, m, chatId, message) {
  if (!message) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar un mensaje.\n\n💡 Variables: @user, @group'
    }, { quoted: m });
  }

  await db.run(`
    UPDATE group_settings SET goodbye_message = ? WHERE chat_id = ?
  `, [message, chatId]);

  await sock.sendMessage(chatId, {
    text: '✅ Mensaje de despedida actualizado.'
  }, { quoted: m });
}

async function previewGoodbyeMessage(sock, m, chatId) {
  const message = await getGoodbyeMessage(chatId);
  const userId = m.key.participant || m.key.remoteJid;
  const groupMetadata = await sock.groupMetadata(chatId);
  
  const preview = message
    .replace(/@user/g, `@${userId.split('@')[0]}`)
    .replace(/@group/g, groupMetadata.subject);

  await sock.sendMessage(chatId, {
    text: `🎯 *Vista previa de despedida:*\n\n${preview}`,
    mentions: [userId]
  }, { quoted: m });
}

async function setGroupRules(sock, m, chatId, rules) {
  if (!rules) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar las reglas del grupo.'
    }, { quoted: m });
  }

  await db.run(`
    INSERT OR REPLACE INTO group_rules (chat_id, rules, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `, [chatId, rules]);

  await sock.sendMessage(chatId, {
    text: '✅ Reglas del grupo actualizadas.'
  }, { quoted: m });
}

async function showGroupRules(sock, m, chatId) {
  const rules = await db.get('SELECT rules FROM group_rules WHERE chat_id = ?', [chatId]);
  
  if (!rules) {
    return await sock.sendMessage(chatId, {
      text: '📋 Este grupo no tiene reglas establecidas.\n\n💡 Usa \`.grouprules set <reglas>\` para establecerlas.'
    }, { quoted: m });
  }

  let message = `📋 *REGLAS DEL GRUPO* 📋\n\n`;
  message += rules.rules;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

async function clearGroupRules(sock, m, chatId) {
  await db.run('DELETE FROM group_rules WHERE chat_id = ?', [chatId]);

  await sock.sendMessage(chatId, {
    text: '✅ Reglas del grupo eliminadas.'
  }, { quoted: m });
}

async function setAntiSpamEnabled(sock, m, chatId, enabled) {
  await db.run(`
    UPDATE group_settings SET antispam_enabled = ? WHERE chat_id = ?
  `, [enabled ? 1 : 0, chatId]);

  await sock.sendMessage(chatId, {
    text: `✅ Anti-spam ${enabled ? 'activado' : 'desactivado'}.`
  }, { quoted: m });
}

async function showGroupSettings(sock, m, chatId) {
  const settings = await getGroupSettings(chatId);
  
  let message = `⚙️ *CONFIGURACIÓN DEL GRUPO* ⚙️\n\n`;
  message += `🎉 Bienvenida: ${settings.welcome_enabled ? '✅ Activada' : '❌ Desactivada'}\n`;
  message += `👋 Despedida: ${settings.goodbye_enabled ? '✅ Activada' : '❌ Desactivada'}\n`;
  message += `🛡️ Anti-spam: ${settings.antispam_enabled ? '✅ Activado' : '❌ Desactivada'}\n\n`;
  
  message += `💬 *Mensajes:*\n`;
  message += `• Bienvenida: ${settings.welcome_message}\n`;
  message += `• Despedida: ${settings.goodbye_message}`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones de ayuda
async function showWelcomeHelp(sock, m) {
  const message = `🎉 *GESTIÓN DE BIENVENIDA* 🎉\n\n` +
    `• \`.welcome on/off\` - Activar/desactivar\n` +
    `• \`.welcome set <mensaje>\` - Establecer mensaje\n` +
    `• \`.welcome preview\` - Previsualizar\n\n` +
    `💡 Variables: @user, @group`;

  await sock.sendMessage(m.key.remoteJid, { text: message }, { quoted: m });
}

async function showGoodbyeHelp(sock, m) {
  const message = `👋 *GESTIÓN DE DESPEDIDA* 👋\n\n` +
    `• \`.goodbye on/off\` - Activar/desactivar\n` +
    `• \`.goodbye set <mensaje>\` - Establecer mensaje\n` +
    `• \`.goodbye preview\` - Previsualizar\n\n` +
    `💡 Variables: @user, @group`;

  await sock.sendMessage(m.key.remoteJid, { text: message }, { quoted: m });
}

async function showRulesHelp(sock, m) {
  const message = `📋 *GESTIÓN DE REGLAS* 📋\n\n` +
    `• \`.grouprules set <reglas>\` - Establecer reglas\n` +
    `• \`.grouprules show\` - Mostrar reglas\n` +
    `• \`.grouprules clear\` - Eliminar reglas`;

  await sock.sendMessage(m.key.remoteJid, { text: message }, { quoted: m });
}

async function showAntiSpamHelp(sock, m) {
  const message = `🛡️ *GESTIÓN DE ANTI-SPAM* 🛡️\n\n` +
    `• \`.antispam on/off\` - Activar/desactivar\n` +
    `• \`.antispam settings\` - Ver configuración`;

  await sock.sendMessage(m.key.remoteJid, { text: message }, { quoted: m });
}

// Inicializar tablas
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS group_settings (
        chat_id TEXT PRIMARY KEY,
        welcome_enabled INTEGER DEFAULT 1,
        goodbye_enabled INTEGER DEFAULT 1,
        antispam_enabled INTEGER DEFAULT 1,
        welcome_message TEXT DEFAULT '🎉 ¡Bienvenido @user a @group!',
        goodbye_message TEXT DEFAULT '👋 Adiós @user, te extrañaremos en @group.',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS group_rules (
        chat_id TEXT PRIMARY KEY,
        rules TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS member_activity (
        chat_id TEXT,
        user_id TEXT,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (chat_id, user_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS message_stats (
        chat_id TEXT,
        user_id TEXT,
        message_count INTEGER DEFAULT 1,
        last_message DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (chat_id, user_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS new_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT,
        user_id TEXT,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    groupLogger.success('Tablas de gestión de grupos inicializadas');
  } catch (error) {
    groupLogger.error('Error inicializando tablas:', error);
  }
}

// Inicializar sistema
initializeTables();

// Exportar funciones para compatibilidad
export { 
  CONFIG,
  groupLogger,
  isAdmin,
  getGroupSettings,
  handleMemberJoin,
  handleMemberLeave
};
