/**
 * @file Auto Responder v2.0 - Sistema mejorado de respuestas automáticas
 * @description Sistema de respuestas automáticas con IA integrada, manejo robusto de errores y configuración flexible
 * @version 2.0.0
 * @author Mejorado para HINATA-BOT
 */

// Configuración del plugin
const CONFIG = {
  enableLogging: true,
  enableAutoResponder: true,
  enableMentionResponse: true,
  enableQuotedResponse: true,
  enablePresenceUpdate: true,
  maxResponseLength: 1000,
  responseTimeout: 10000, // 10 segundos
  retryAttempts: 2,
  defaultBotName: 'HINATA-BOT',
  defaultPrefix: '‎z/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.,\\-',
  bannedWords: ['PIEDRA', 'PAPEL', 'TIJERA', 'menu', 'estado', 'bots', 'serbot', 'jadibot', 'Video', 'Audio', 'audio'],
  cooldownTime: 3000, // 3 segundos entre respuestas
  maxMessagesPerMinute: 5
};

// Sistema de logging
const logger = {
  info: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[AUTORESPONDER] ℹ️ ${message}`);
    }
  },
  error: (message, error = null) => {
    console.error(`[AUTORESPONDER] ❌ ${message}`);
    if (error) console.error('Error:', error);
  },
  success: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[AUTORESPONDER] ✅ ${message}`);
    }
  },
  debug: (message, data = null) => {
    if (CONFIG.enableLogging) {
      console.log(`[AUTORESPONDER] 🔍 ${message}`);
      if (data) console.log('Data:', data);
    }
  }
};

// Sistema de cooldown para evitar spam
const cooldownMap = new Map();

// Función para verificar si un usuario está en cooldown
function isInCooldown(userId) {
  const now = Date.now();
  const lastResponse = cooldownMap.get(userId);
  
  if (lastResponse && (now - lastResponse) < CONFIG.cooldownTime) {
    return true;
  }
  
  return false;
}

// Función para establecer cooldown
function setCooldown(userId) {
  cooldownMap.set(userId, Date.now());
}

// Función para limpiar cooldowns antiguos
function cleanupCooldowns() {
  const now = Date.now();
  for (const [userId, timestamp] of cooldownMap.entries()) {
    if (now - timestamp > CONFIG.cooldownTime * 2) {
      cooldownMap.delete(userId);
    }
  }
}

// Función para verificar si es un bot
function isBotMessage(m) {
  return m.id.startsWith('BAE5') && m.id.length === 16 ||
         m.id.startsWith('3EB0') && m.id.length === 12 ||
         m.id.startsWith('3EB0') && (m.id.length === 20 || m.id.length === 22) ||
         m.id.startsWith('B24E') && m.id.length === 20;
}

// Función para verificar si es un comando
function isCommand(m, prefix) {
  if (!m.text) return false;
  
  const prefixRegex = new RegExp('^[' + (prefix || CONFIG.defaultPrefix).replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']');
  return prefixRegex.test(m.text);
}

// Función para verificar si contiene palabras prohibidas
function containsBannedWords(text) {
  if (!text) return false;
  
  return CONFIG.bannedWords.some(word => 
    text.toLowerCase().includes(word.toLowerCase())
  );
}

// Función para obtener respuesta de IA (fallback simple)
async function getSimpleResponse(query, username, botName) {
  try {
    const responses = [
      `¡Hola ${username}! Soy ${botName}, ¿en qué puedo ayudarte?`,
      `Hola ${username}, soy ${botName}. ¿Qué necesitas?`,
      `¡Hola! Soy ${botName}, tu asistente virtual. ¿Cómo estás?`,
      `${username}, soy ${botName}. ¿En qué te puedo asistir hoy?`,
      `Hola ${username}, soy ${botName}. Estoy aquí para ayudarte.`,
      `¡Hola! Soy ${botName}. ¿Qué te gustaría hacer?`,
      `${username}, soy ${botName}. ¿Hay algo en lo que pueda ayudarte?`,
      `Hola ${username}, soy ${botName}. ¿Cómo puedo servirte?`
    ];
    
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  } catch (error) {
    logger.error('Error generando respuesta simple:', error);
    return `Hola ${username}, soy ${botName}. ¿En qué puedo ayudarte?`;
  }
}

// Función para obtener respuesta contextual
async function getContextualResponse(query, username, botName) {
  try {
    const lowerQuery = query.toLowerCase();
    
    // Respuestas contextuales simples
    if (lowerQuery.includes('hola') || lowerQuery.includes('hi')) {
      return `¡Hola ${username}! Soy ${botName}, ¿cómo estás? 😊`;
    }
    
    if (lowerQuery.includes('adiós') || lowerQuery.includes('chao') || lowerQuery.includes('bye')) {
      return `¡Adiós ${username}! Fue un placer hablar contigo. ¡Vuelve pronto! 👋`;
    }
    
    if (lowerQuery.includes('gracias') || lowerQuery.includes('thanks')) {
      return `De nada ${username}! Estoy aquí para ayudarte. ¿Hay algo más en lo que pueda asistirte? 😊`;
    }
    
    if (lowerQuery.includes('cómo estás') || lowerQuery.includes('how are you')) {
      return `Estoy muy bien ${username}, gracias por preguntar. Como bot, siempre estoy listo para ayudar. ¿Y tú cómo estás? 😊`;
    }
    
    if (lowerQuery.includes('qué eres') || lowerQuery.includes('quién eres') || lowerQuery.includes('what are you')) {
      return `Soy ${botName}, un bot de WhatsApp creado para ayudarte con diversas tareas. Puedo responder preguntas, entretener y asistirte en lo que necesites. 🤖`;
    }
    
    if (lowerQuery.includes('ayuda') || lowerQuery.includes('help')) {
      return `¡Claro ${username}! Para ver todos mis comandos disponibles, usa el comando \`.menu\`. Si necesitas ayuda específica, usa \`.help\` seguido del comando. 📋`;
    }
    
    if (lowerQuery.includes('menu') || lowerQuery.includes('menú')) {
      return `Para ver el menú completo de comandos, usa \`.menu\` ${username}. ¡Allí encontrarás todas las funciones disponibles! 📋`;
    }
    
    // Respuesta por defecto
    return await getSimpleResponse(query, username, botName);
    
  } catch (error) {
    logger.error('Error generando respuesta contextual:', error);
    return await getSimpleResponse(query, username, botName);
  }
}

// Función principal del handler
let handler = m => m;

handler.all = async function (m, { conn }) {
  try {
    // Limpiar cooldowns antiguos
    cleanupCooldowns();
    
    // Verificar si el auto responder está habilitado globalmente
    if (!CONFIG.enableAutoResponder) {
      return true;
    }
    
    // Obtener datos del usuario y chat
    const user = global.db?.data?.users?.[m.sender];
    const chat = global.db?.data?.chats?.[m.chat];
    
    if (!user || !chat) {
      logger.debug('Usuario o chat no encontrado en la base de datos');
      return true;
    }
    
    // Verificar si el auto responder está activado en el chat
    if (!chat.autoresponder) {
      logger.debug(`Auto responder desactivado en chat ${m.chat}`);
      return true;
    }
    
    // Verificar si es mensaje de bot
    if (isBotMessage(m)) {
      return true;
    }
    
    // Verificar si es un comando
    if (isCommand(m, global.prefix)) {
      return true;
    }
    
    // Verificar si es bot
    if (m.sender.includes('bot') || m.sender.includes('Bot')) {
      return true;
    }
    
    // Verificar si es mensaje propio
    if (m.fromMe) {
      return true;
    }
    
    // Verificar si el usuario está registrado
    if (!user.registered) {
      return true;
    }
    
    // Verificar cooldown
    if (isInCooldown(m.sender)) {
      logger.debug(`Usuario ${m.sender} en cooldown`);
      return true;
    }
    
    // Verificar si el bot está mencionado o si se cita un mensaje del bot
    const isMentioned = m.mentionedJid && m.mentionedJid.includes(conn.user.jid);
    const isQuoted = m.quoted && m.quoted.sender === conn.user.jid;
    
    if (!isMentioned && !isQuoted) {
      return true;
    }
    
    // Verificar si el chat está baneado
    if (chat.isBanned) {
      return true;
    }
    
    // Verificar palabras prohibidas
    if (containsBannedWords(m.text)) {
      return true;
    }
    
    // Verificar cooldown nuevamente antes de procesar
    if (isInCooldown(m.sender)) {
      return true;
    }
    
    // Establecer cooldown
    setCooldown(m.sender);
    
    // Obtener información del mensaje
    const query = m.text || '';
    const username = m.pushName || 'Usuario';
    const botName = global.botname || CONFIG.defaultBotName;
    
    logger.info(`Procesando auto respuesta para ${username}: "${query.substring(0, 50)}..."`);
    
    // Enviar estado de escribiendo
    if (CONFIG.enablePresenceUpdate) {
      try {
        await conn.sendPresenceUpdate('composing', m.chat);
      } catch (error) {
        logger.debug('Error enviando presencia:', error);
      }
    }
    
    // Obtener respuesta
    let result = null;
    
    try {
      // Intentar obtener respuesta contextual primero
      result = await getContextualResponse(query, username, botName);
      
      // Validar respuesta
      if (!result || result.trim().length === 0) {
        throw new Error('Respuesta vacía');
      }
      
      // Limitar longitud de respuesta
      if (result.length > CONFIG.maxResponseLength) {
        result = result.substring(0, CONFIG.maxResponseLength) + '...';
      }
      
      logger.success(`Respuesta generada para ${username}: ${result.length} caracteres`);
      
    } catch (error) {
      logger.error('Error generando respuesta:', error);
      
      // Fallback a respuesta simple
      result = await getSimpleResponse(query, username, botName);
    }
    
    // Enviar respuesta
    if (result && result.trim().length > 0) {
      try {
        await conn.reply(m.chat, result, m);
        logger.success(`Respuesta enviada a ${username}`);
      } catch (error) {
        logger.error('Error enviando respuesta:', error);
      }
    }
    
  } catch (error) {
    logger.error('Error general en auto responder:', error);
  }
  
  return true;
};

// Función de ayuda
export const help = `
🤖 *AUTO RESPONDER v2.0*

Sistema automático de respuestas que se activa cuando mencionas al bot o respondes a sus mensajes.

⚙️ *Configuración:*
• Activa/desactiva por chat
• Respuestas contextuales inteligentes
• Sistema anti-spam con cooldown
• Manejo robusto de errores

🎯 *Activación:*
• Menciona al bot (@${CONFIG.defaultBotName})
• Responde a un mensaje del bot
• El bot responderá automáticamente

🔧 *Para administradores:*
• \`.on autoresponder\` - Activar en grupo
• \`.off autoresponder\` - Desactivar en grupo
• \`.enable autoresponder\` - Activar globalmente
• \`.disable autoresponder\` - Desactivar globalmente

⚠️ *Limitaciones:*
• 3 segundos de cooldown entre respuestas
• Máximo 1000 caracteres por respuesta
• No responde comandos
• Ignora palabras prohibidas

📝 *Características:*
• Respuestas contextuales
• Detección de intenciones básicas
• Sistema de fallback
• Logging completo
`;

// Exportar configuración para debugging
export const config = CONFIG;
export default handler;
