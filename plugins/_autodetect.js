/**
 * @file Plugin Autodetect v2.0 - Sistema mejorado de detección de eventos de grupo
 * @description Detecta y notifica cambios en grupos de WhatsApp con manejo de errores mejorado
 * @version 2.0.0
 * @author Mejorado para HINATA-BOT
 */

let WAMessageStubType = (await import('@whiskeysockets/baileys')).default;

// Configuración del plugin
const CONFIG = {
  enableLogging: false,
  retryAttempts: 3,
  retryDelay: 1000,
  defaultProfileImage: 'https://files.catbox.moe/xr2m6u.jpg',
  cooldownPeriod: 5000 // 5 segundos entre mensajes
};

// Cache para evitar spam de notificaciones
const notificationCache = new Map();
const lastNotification = new Map();

// Sistema de logging
const logger = {
  info: (message, data = null) => {
    if (CONFIG.enableLogging) {
      console.log(`[AUTODETECT] ℹ️ ${message}`);
      if (data) console.log('Data:', data);
    }
  },
  error: (message, error = null) => {
    console.error(`[AUTODETECT] ❌ ${message}`);
    if (error) console.error('Error:', error);
  },
  debug: (message, data = null) => {
    if (CONFIG.enableLogging) {
      console.log(`[AUTODETECT] 🔍 ${message}`);
      if (data) console.log('Data:', data);
    }
  }
};

// Función para crear contacto falso mejorado
function createFakeContact(sender) {
  return {
    "key": {
      "participants": "0@s.whatsapp.net",
      "remoteJid": "status@broadcast",
      "fromMe": false,
      "id": "Halo"
    },
    "message": {
      "contactMessage": {
        "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${sender.split('@')[0]}:${sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
      }
    },
    "participant": "0@s.whatsapp.net"
  };
}

// Función para obtener imagen de perfil con cache
async function getProfilePicture(conn, chatId) {
  try {
    const cacheKey = `profile_${chatId}`;
    const cached = notificationCache.get(cacheKey);
    
    // Usar cache si tiene menos de 5 minutos
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.url;
    }
    
    const url = await conn.profilePictureUrl(chatId, 'image').catch(_ => null);
    const finalUrl = url || CONFIG.defaultProfileImage;
    
    // Guardar en cache
    notificationCache.set(cacheKey, {
      url: finalUrl,
      timestamp: Date.now()
    });
    
    return finalUrl;
  } catch (error) {
    logger.error('Error obteniendo imagen de perfil:', error);
    return CONFIG.defaultProfileImage;
  }
}

// Función para verificar cooldown y evitar spam
function checkCooldown(chatId, eventType) {
  const key = `${chatId}_${eventType}`;
  const now = Date.now();
  const lastTime = lastNotification.get(key);
  
  if (lastTime && (now - lastTime) < CONFIG.cooldownPeriod) {
    return false; // En cooldown
  }
  
  lastNotification.set(key, now);
  return true; // Puede enviar
}

// Función para enviar mensaje con reintentos
async function sendMessageWithRetry(conn, chatId, content, quoted, retries = CONFIG.retryAttempts) {
  for (let i = 0; i < retries; i++) {
    try {
      await conn.sendMessage(chatId, content, { quoted });
      return true;
    } catch (error) {
      logger.error(`Intento ${i + 1} fallido:`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      }
    }
  }
  return false;
}

// Función para formatear menciones de manera segura
function formatMention(jid) {
  if (!jid || typeof jid !== 'string') return '@usuario';
  return `@${jid.split('@')[0]}`;
}

// Función principal de detección
export async function before(m, { conn, participants, groupMetadata }) {
  try {
    // Validaciones iniciales
    if (!m.messageStubType || !m.isGroup) {
      return;
    }

    const chatId = m.chat;
    const chat = global.db.data.chats[chatId];
    
    // Verificar si la detección está activada
    if (!chat?.detect && !chat?.detect2) {
      return;
    }

    logger.debug(`Procesando evento ${m.messageStubType} en grupo ${chatId}`);

    // Crear contacto falso y obtener datos básicos
    const fkontak = createFakeContact(m.sender);
    const usuario = formatMention(m.sender);
    const pp = await getProfilePicture(conn, chatId);

    // Plantillas de mensajes mejoradas
    const messages = {
      21: { // Cambio de nombre del grupo
        text: `《✧》${usuario} Ha cambiado el nombre del grupo.\n\n> ✦ Nuevo nombre:\n> *${m.messageStubParameters[0] || 'Desconocido'}*`,
        type: 'detect',
        mentions: [m.sender]
      },
      
      22: { // Cambio de imagen del grupo
        text: `《✧》Se ha cambiado la imagen del grupo.\n\n> ✦ Acción realizada por:\n> » ${usuario}`,
        type: 'detect',
        mentions: [m.sender],
        image: pp
      },
      
      23: { // Restablecimiento de enlace
        text: `《✧》El enlace del grupo ha sido restablecido.\n\n> ✦ Acción realizada por:\n> » ${usuario}`,
        type: 'detect',
        mentions: [m.sender]
      },
      
      25: { // Cambio de configuración de grupo
        get text() {
          const setting = m.messageStubParameters[0] === 'on' ? 'solo admins' : 'todos';
          const action = m.messageStubParameters[1] === 'on' ? 'activada' : 'desactivada';
          return `《✧》${usuario} ha ${action} la opción de configuración.\n\n> ✦ Ahora ${setting} pueden modificar el grupo.`;
        },
        type: 'detect',
        mentions: [m.sender]
      },
      
      26: { // Cambio de estado del grupo (abierto/cerrado)
        get text() {
          const status = m.messageStubParameters[0] === 'on' ? 'cerrado 🔒' : 'abierto 🔓';
          const whoCan = m.messageStubParameters[0] === 'on' ? 'solo admins' : 'todos';
          return `《✧》El grupo ha sido ${status} por ${usuario}.\n\n> ✦ Ahora ${whoCan} pueden enviar mensajes.`;
        },
        type: 'detect',
        mentions: [m.sender]
      },
      
      27: { // Nuevo participante aceptado
        text: `《✧》¡Nuevo miembro en el grupo!\n\n> ◦ ✐ Grupo: *${groupMetadata?.subject || 'Desconocido'}*\n> ◦ ⚘ Bienvenido/a: ${formatMention(m.messageStubParameters[0])}\n> ◦ ✦ Aceptado por: ${usuario}`,
        type: 'detect2',
        mentions: [m.sender, m.messageStubParameters[0]]
      },
      
      29: { // Nuevo admin
        text: `《✧》${formatMention(m.messageStubParameters[0])} ahora es administrador del grupo.\n\n> ✦ Acción realizada por:\n> » ${usuario}`,
        type: 'detect',
        mentions: [m.sender, m.messageStubParameters[0]]
      },
      
      30: { // Admin removido
        text: `《✧》${formatMention(m.messageStubParameters[0])} deja de ser administrador del grupo.\n\n> ✦ Acción realizada por:\n> » ${usuario}`,
        type: 'detect',
        mentions: [m.sender, m.messageStubParameters[0]]
      }
    };

    // Obtener configuración para este evento
    const eventConfig = messages[m.messageStubType];
    
    if (!eventConfig) {
      logger.debug(`Evento ${m.messageStubType} no configurado`);
      return;
    }

    // Verificar si el tipo de detección está activado
    const detectionType = eventConfig.type;
    if (!chat[detectionType]) {
      logger.debug(`Detección ${detectionType} desactivada para este evento`);
      return;
    }

    // Verificar cooldown
    if (!checkCooldown(chatId, m.messageStubType)) {
      logger.debug(`Evento ${m.messageStubType} en cooldown`);
      return;
    }

    // Preparar contenido del mensaje
    const content = {
      text: eventConfig.text,
      mentions: eventConfig.mentions
    };

    // Agregar imagen si es necesario
    if (eventConfig.image) {
      content.image = { url: eventConfig.image };
      content.caption = eventConfig.text;
      delete content.text;
    }

    // Enviar mensaje con reintentos
    const success = await sendMessageWithRetry(conn, chatId, content, fkontak);
    
    if (success) {
      logger.info(`Notificación enviada: evento ${m.messageStubType}`);
    } else {
      logger.error(`No se pudo enviar notificación: evento ${m.messageStubType}`);
    }

  } catch (error) {
    logger.error('Error en autodetect:', error);
    
    // Intentar enviar mensaje de error crítico solo si es necesario
    try {
      const chat = global.db.data.chats[m.chat];
      if (chat?.detect) {
        await conn.sendMessage(m.chat, {
          text: `⚠️ Error en el sistema de detección de eventos. Por favor, contacta al administrador.`
        }, { quoted: createFakeContact(m.sender) });
      }
    } catch (fallbackError) {
      logger.error('Error crítico en fallback:', fallbackError);
    }
  }
}

// Función de limpieza periódica del cache
setInterval(() => {
  const now = Date.now();
  const keysToDelete = [];
  
  for (const [key, value] of notificationCache) {
    if (now - value.timestamp > 300000) { // 5 minutos
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => notificationCache.delete(key));
  
  if (keysToDelete.length > 0) {
    logger.debug(`Cache limpiado: ${keysToDelete.length} elementos eliminados`);
  }
}, 60000); // Cada minuto

// Exportar configuración para debugging
export const config = CONFIG;
export const getCacheStats = () => ({
  cacheSize: notificationCache.size,
  cooldownSize: lastNotification.size,
  activeEvents: Array.from(lastNotification.keys())
});
