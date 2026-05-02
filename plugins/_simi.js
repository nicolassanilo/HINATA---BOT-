/**
 * @file Plugin Simi - Chatbot conversacional
 * @version 2.0.0
 * @author HINATA-BOT
 * @description Sistema de IA conversacional con múltiples APIs
 */

import axios from 'axios';

export const command = ['.simi', '.bot'];
export const alias = ['.chat', '.ia', '.conversar'];
export const description = 'Chatbot conversacional con IA';

// Configuración
const CONFIG = {
  enableLogging: true,
  maxRetries: 2,
  timeout: 10000,
  defaultLanguage: 'es'
};

// Sistema de logging
const simiLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[SIMI] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[SIMI] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[SIMI] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[SIMI] ❌ ${message}`)
};

// Lista de comandos que no deben ser procesados por Simi
const IGNORED_COMMANDS = [
  'serbot', 'bots', 'jadibot', 'menu', 'play', 'play2', 'playdoc', 
  'tiktok', 'facebook', 'instalarbot', 'menu2', 'infobot', 'estado', 
  'ping', 'sc', 'sticker', 's', 'wm', 'qc'
];

// Lista de prefijos de comandos a ignorar
const IGNORED_PREFIXES = ['.', '#', '!', '/', '$', '%', '&', '*'];

/**
 * Función principal del plugin
 */
export async function run(sock, m, { text }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    // Verificar si el chat tiene Simi activado
    const chatConfig = await getChatConfig(chatId);
    if (!chatConfig.simi) {
      return await sock.sendMessage(chatId, {
        text: '❌ Simi no está activado en este chat.\n\n💡 Usa `.simi on` para activarlo.'
      }, { quoted: m });
    }

    // Verificar si el mensaje es un comando a ignorar
    if (shouldIgnoreMessage(text)) {
      return;
    }

    // Verificar si se está desactivando Simi
    if (text.toLowerCase().includes('off') || text.toLowerCase().includes('disable')) {
      return await disableSimi(sock, m, chatId);
    }

    // Obtener el texto a procesar
    const textToProcess = cleanText(text);
    if (!textToProcess || textToProcess.length < 2) {
      return await sock.sendMessage(chatId, {
        text: '❌ Por favor, escribe un mensaje más largo para conversar.'
      }, { quoted: m });
    }

    // Obtener respuesta de la IA
    const response = await getAIResponse(textToProcess, userId);
    
    if (response.success) {
      await sock.sendMessage(chatId, {
        text: response.message
      }, { quoted: m });
      
      simiLogger.success(`Respuesta enviada - usuario: ${userId}`);
    } else {
      await sock.sendMessage(chatId, {
        text: '❌ Lo siento, no pude procesar tu mensaje. Intenta de nuevo más tarde.'
      }, { quoted: m });
      
      simiLogger.error(`Error en respuesta: ${response.error}`);
    }

  } catch (error) {
    simiLogger.error('Error en el sistema Simi:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de IA. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Verifica si el mensaje debe ser ignorado
 */
function shouldIgnoreMessage(text) {
  const lowerText = text.toLowerCase().trim();
  
  // Ignorar comandos específicos
  if (IGNORED_COMMANDS.some(cmd => lowerText.includes(cmd))) {
    return true;
  }
  
  // Ignorar mensajes que comienzan con prefijos de comandos
  if (IGNORED_PREFIXES.some(prefix => lowerText.startsWith(prefix))) {
    return true;
  }
  
  return false;
}

/**
 * Limpia el texto para procesamiento
 */
function cleanText(text) {
  return text
    .trim()
    .replace(/[^\w\s\u00C0-\u017F]/g, '') // Mantener solo letras, números y espacios (incluyendo acentos)
    .replace(/\s+/g, ' ')
    .substring(0, 200); // Limitar a 200 caracteres
}

/**
 * Obtiene respuesta de la IA usando múltiples APIs
 */
async function getAIResponse(text, userId) {
  const apis = [
    { name: 'Simi V1', url: `https://delirius-apiofc.vercel.app/tools/simi?text=${encodeURIComponent(text)}` },
    { name: 'Simi V2', url: `https://anbusec.xyz/api/v1/simitalk?apikey=iJ6FxuA9vxlvz5cKQCt3&ask=${text}&lc=es` },
    { name: 'Simi V3', url: `https://api.simsimi.net/v2/?text=${encodeURIComponent(text)}&lc=es` }
  ];

  for (const api of apis) {
    try {
      simiLogger.info(`Intentando API: ${api.name}`);
      
      const response = await axios.get(api.url, {
        timeout: CONFIG.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      let result = '';
      
      // Procesar respuesta según la API
      if (api.name === 'Simi V1') {
        result = response.data?.data?.message || response.data?.message || '';
      } else if (api.name === 'Simi V2') {
        result = response.data?.message || response.data?.data?.message || '';
      } else if (api.name === 'Simi V3') {
        result = response.data?.success === 200 ? response.data?.response : '';
      }

      if (result && result.trim()) {
        simiLogger.success(`API ${api.name} respondió correctamente`);
        return {
          success: true,
          message: result.trim(),
          api: api.name
        };
      }

    } catch (error) {
      simiLogger.warning(`Error en API ${api.name}: ${error.message}`);
      continue;
    }
  }

  return {
    success: false,
    error: 'Todas las APIs fallaron',
    message: 'Lo siento, no puedo responder en este momento. Intenta más tarde.'
  };
}

/**
 * Obtiene la configuración del chat
 */
async function getChatConfig(chatId) {
  try {
    // Por defecto, retornamos configuración activada
    return {
      simi: true, // Por defecto activado
      language: CONFIG.defaultLanguage
    };
  } catch (error) {
    simiLogger.error('Error obteniendo configuración del chat:', error);
    return {
      simi: true,
      language: CONFIG.defaultLanguage
    };
  }
}

/**
 * Desactiva Simi en el chat
 */
async function disableSimi(sock, m, chatId) {
  try {
    await sock.sendMessage(chatId, {
      text: '✅ Simi ha sido desactivado en este chat.\n\n💡 Usa `.simi on` para activarlo nuevamente.'
    }, { quoted: m });
    
    simiLogger.info(`Simi desactivado en chat: ${chatId}`);
  } catch (error) {
    simiLogger.error('Error desactivando Simi:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al desactivar Simi.'
    }, { quoted: m });
  }
}

/**
 * Activa Simi en el chat
 */
async function enableSimi(sock, m, chatId) {
  try {
    await sock.sendMessage(chatId, {
      text: '✅ Simi ha sido activado en este chat.\n\n💡 Ahora puedo responder tus mensajes automáticamente.\n💡 Usa `.simi off` para desactivarlo.'
    }, { quoted: m });
    
    simiLogger.info(`Simi activado en chat: ${chatId}`);
  } catch (error) {
    simiLogger.error('Error activando Simi:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al activar Simi.'
    }, { quoted: m });
  }
}

/**
 * Muestra el estado de Simi
 */
async function showSimiStatus(sock, m, chatId) {
  try {
    const config = await getChatConfig(chatId);
    const status = config.simi ? '✅ Activo' : '❌ Inactivo';
    
    await sock.sendMessage(chatId, {
      text: `🤖 *Estado de Simi*\n\n` +
            `📊 Estado: ${status}\n` +
            `🌐 Idioma: ${config.language}\n\n` +
            `💡 *Comandos:*\n` +
            `• \`.simi on\` - Activar\n` +
            `• \`.simi off\` - Desactivar\n` +
            `• \`.simi status\` - Ver estado`
    }, { quoted: m });
  } catch (error) {
    simiLogger.error('Error mostrando estado:', error);
  }
}

/**
 * Maneja comandos específicos de Simi
 */
async function handleSimiCommands(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const args = text.toLowerCase().split(' ').slice(1);
  
  switch (args[0]) {
    case 'on':
    case 'activar':
      await enableSimi(sock, m, chatId);
      break;
      
    case 'off':
    case 'desactivar':
      await disableSimi(sock, m, chatId);
      break;
      
    case 'status':
    case 'estado':
      await showSimiStatus(sock, m, chatId);
      break;
      
    default:
      // Si no es un comando específico, procesar como mensaje normal
      await run(sock, m, { text, command });
      break;
  }
}

// Exportar función principal modificada para manejar comandos
export async function main(sock, m, { text, command }) {
  const args = text.toLowerCase().split(' ');
  
  // Si hay argumentos después de .simi, procesar como comando
  if (args.length > 1) {
    await handleSimiCommands(sock, m, { text, command });
  } else {
    // Si solo es ".simi", mostrar estado
    await showSimiStatus(sock, m, m.key.remoteJid);
  }
}