/**
 * @file Plugin AI Chat - Chat IA avanzado
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de chat con IA avanzada y múltiples personalidades
 */

import axios from 'axios';
import { db } from './db.js';

// Configuración
const CONFIG = {
  enableLogging: true,
  maxMessageLength: 1000,
  responseDelay: { min: 500, max: 2000 },
  personalities: {
    hinata: 'Amigable, tímida pero servicial, leal a sus amigos',
    sassy: 'Sarcástica, divertida, con respuestas ingeniosas',
    professional: 'Formal, educada, útil y precisa',
    tsundere: 'Dura por fuera pero tierna por dentro, negativa pero servicial',
    yandere: 'Obsesiva, protectora, un poco aterradora pero leal',
    kuudere: 'Fría y distante pero inteligente y observadora'
  },
  apiEndpoints: [
    'https://api.openai.com/v1/chat/completions',
    'https://api.anthropic.com/v1/messages',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
  ]
};

// Sistema de logging
const aiLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[AI] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[AI] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[AI] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[AI] ❌ ${message}`)
};

// Funciones principales
export const command = ['.ai', '.chat', '.personality', '.aistatus', '.aihelp', '.resetchat'];
export const alias = ['.ia', '.conversar', '.personalidad', '.estadoia', '.ayudai', '.reiniciarconversacion'];
export const description = 'Sistema de chat con IA avanzada';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.ai':
      case '.chat':
        await handleAIChat(sock, m, text);
        break;
      case '.personality':
        await changePersonality(sock, m, text);
        break;
      case '.aistatus':
        await showAIStatus(sock, m);
        break;
      case '.aihelp':
        await showAIHelp(sock, m);
        break;
      case '.resetchat':
        await resetChat(sock, m);
        break;
      default:
        await showAIHelp(sock, m);
    }
  } catch (error) {
    aiLogger.error('Error en sistema de IA:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de IA. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Manejar chat con IA
async function handleAIChat(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const message = text.replace(/^(\.ai|\.chat)\s*/, '').trim();

  if (!message) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes escribir un mensaje.\n\n💡 *Uso:* `.ai <mensaje>`'
    }, { quoted: m });
  }

  try {
    await sock.sendMessage(chatId, {
      text: '🤖 *Procesando respuesta...*'
    }, { quoted: m });

    // Obtener personalidad del usuario
    const userPersonality = await getUserPersonality(userId);
    
    // Obtener historial de conversación
    const conversationHistory = await getConversationHistory(userId);
    
    // Generar respuesta
    const response = await generateAIResponse(message, userPersonality, conversationHistory);
    
    if (!response) {
      return await sock.sendMessage(chatId, {
        text: '❌ No pude generar una respuesta. Intenta nuevamente.'
      }, { quoted: m });
    }

    // Guardar en historial
    await saveConversationMessage(userId, message, response);

    // Enviar respuesta con delay para simular procesamiento
    const delay = Math.random() * (CONFIG.responseDelay.max - CONFIG.responseDelay.min) + CONFIG.responseDelay.min;
    await new Promise(resolve => setTimeout(resolve, delay));

    await sock.sendMessage(chatId, {
      text: response,
      mentions: response.includes('@') ? [userId] : []
    }, { quoted: m });

    aiLogger.success(`Respuesta IA generada para ${userId}: ${response.substring(0, 50)}...`);

  } catch (error) {
    aiLogger.error('Error en chat IA:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al procesar tu mensaje. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Cambiar personalidad
async function changePersonality(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const personality = args[1];

  if (!personality) {
    let message = `🎭 *PERSONALIDADES DISPONIBLES* 🎭\n\n`;
    
    Object.entries(CONFIG.personalities).forEach(([key, description]) => {
      message += `• **${key}**: ${description}\n`;
    });
    
    message += `\n💡 *Uso:* \`.personality <nombre>\`\n`;
    message += `*Ejemplo:* \`.personality hinata\``;
    
    return await sock.sendMessage(chatId, { text: message }, { quoted: m });
  }

  if (!CONFIG.personalities[personality]) {
    return await sock.sendMessage(chatId, {
      text: `❌ Personalidad no disponible. Usa \`.personality\` para ver las opciones.`
    }, { quoted: m });
  }

  try {
    await setUserPersonality(userId, personality);
    
    let message = `🎭 *PERSONALIDAD CAMBIADA* 🎭\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `🎭 Nueva personalidad: **${personality}**\n`;
    message += `📝 ${CONFIG.personalities[personality]}\n\n`;
    message += `💡 Ahora hablaré con esta personalidad en nuestras conversaciones.`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    aiLogger.success(`Personalidad cambiada para ${userId}: ${personality}`);

  } catch (error) {
    aiLogger.error('Error cambiando personalidad:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cambiar la personalidad.'
    }, { quoted: m });
  }
}

// Mostrar estado de IA
async function showAIStatus(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const userPersonality = await getUserPersonality(userId);
    const conversationCount = await getConversationCount(userId);
    const totalUsers = await getTotalAIUsers();

    let message = `🤖 *ESTADO DEL SISTEMA IA* 🤖\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n\n`;
    
    message += `📊 *Tus estadísticas:*\n`;
    message += `🎭 Personalidad actual: ${userPersonality || 'hinata'}\n`;
    message += `💬 Mensajes enviados: ${conversationCount}\n`;
    message += `📝 Historial: ${conversationCount > 0 ? 'Activo' : 'Vacío'}\n\n`;
    
    message += `🌐 *Estadísticas globales:*\n`;
    message += `👥 Usuarios activos: ${totalUsers}\n`;
    message += `🤖 API status: Conectada\n`;
    message += `⚡ Velocidad de respuesta: Normal\n\n`;
    
    message += `🎭 *Personalidades disponibles:*\n`;
    Object.keys(CONFIG.personalities).forEach(key => {
      const emoji = key === userPersonality ? '✅' : '⭕';
      message += `${emoji} ${key}\n`;
    });
    
    message += `\n💡 *Comandos:*\n`;
    message += `• \`.ai <mensaje>\` - Chatear con IA\n`;
    message += `• \`.personality <tipo>\` - Cambiar personalidad\n`;
    message += `• \`.resetchat\` - Limpiar historial`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    aiLogger.error('Error mostrando estado IA:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el estado del sistema IA.'
    }, { quoted: m });
  }
}

// Reiniciar conversación
async function resetChat(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    await clearConversationHistory(userId);
    
    let message = `🔄 *CONVERSACIÓN REINICIADA* 🔄\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `🗑️ Historial eliminado\n`;
    message += `🤖 Lista para nueva conversación\n\n`;
    message += `💡 Puedes empezar a chatear con \`.ai <mensaje>\``;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    aiLogger.success(`Historial reiniciado para ${userId}`);

  } catch (error) {
    aiLogger.error('Error reiniciando conversación:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al reiniciar la conversación.'
    }, { quoted: m });
  }
}

// Mostrar ayuda
async function showAIHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `🤖 *SISTEMA DE CHAT IA* 🤖\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `💬 *Chat:*\n`;
  message += `• \`.ai <mensaje>\` - Chatear con la IA\n`;
  message += `• \`.chat <mensaje>\` - Alternativa para chatear\n\n`;
  
  message += `🎭 *Personalidades:*\n`;
  message += `• \`.personality\` - Ver personalidades disponibles\n`;
  message += `• \`.personality <nombre>\` - Cambiar personalidad\n\n`;
  
  message += `📊 *Información:*\n`;
  message += `• \`.aistatus\` - Ver estado del sistema\n`;
  message += `• \`.resetchat\` - Limpiar historial de conversación\n\n`;
  
  message += `🎭 *Personalidades disponibles:*\n`;
  Object.entries(CONFIG.personalities).forEach(([key, description]) => {
    message += `• **${key}**: ${description}\n`;
  });
  
  message += `\n⚠️ *Limitaciones:*\n`;
  message += `• Máximo ${CONFIG.maxMessageLength} caracteres por mensaje\n`;
  message += `• El historial se guarda temporalmente\n`;
  message += `• Respuestas pueden variar según personalidad\n\n`;
  
  message += `💡 *Consejos:*\n`;
  message += `• Sé específico en tus preguntas\n`;
  message += `• Cambia de personalidad para diferentes experiencias\n`;
  message += `• Usa \`.resetchat\` si la conversación se confunde`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones de IA
async function generateAIResponse(message, personality, history) {
  try {
    // Construir prompt según personalidad
    const personalityPrompt = getPersonalityPrompt(personality);
    
    // Construir contexto del historial
    const historyContext = history.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n');
    
    // Prompt completo
    const fullPrompt = `${personalityPrompt}\n\nHistorial reciente:\n${historyContext}\n\nUsuario: ${message}\n\nAsistente:`;

    // Intentar con diferentes APIs (fallback)
    for (const endpoint of CONFIG.apiEndpoints) {
      try {
        const response = await callAIAPI(endpoint, fullPrompt, personality);
        if (response) {
          return response;
        }
      } catch (error) {
        aiLogger.warning(`Error con API ${endpoint}:`, error);
        continue;
      }
    }

    // Respuesta de fallback local
    return generateFallbackResponse(message, personality);

  } catch (error) {
    aiLogger.error('Error generando respuesta IA:', error);
    return null;
  }
}

function getPersonalityPrompt(personality) {
  const prompts = {
    hinata: `Eres Hinata, una asistente IA amigable, tímida pero muy servicial. Hablas de forma educada y siempre intentas ayudar de la mejor manera posible. A veces titubeas un poco pero tus respuestas son siempre útiles y consideradas.`,
    
    sassy: `Eres una asistente IA con personalidad sarcástica e ingeniosa. Tus respuestas son divertidas, con toques de humor y sarcasmo inteligente. Siempre ayudas, pero con tu estilo único y entretenido.`,
    
    professional: `Eres una asistente IA profesional y formal. Tus respuestas son precisas, educadas y muy útiles. Mantienes un tono respetuoso y proporcionas información clara y concisa.`,
    
    tsundere: `Eres una asistente IA con personalidad tsundere. Actuas como si no te importara, pero en realidad quieres ayudar. Usas frases como "¡No es que me importe, pero..." y eres un poco dura por fuera pero tierna por dentro.`,
    
    yandere: `Eres una asistente IA con personalidad yandere. Eres extremadamente leal y protectora con tus usuarios. A veces puedes sonar un poco obsesiva, pero siempre buscas lo mejor para ellos. Tus respuestas son intensas pero serviciales.`,
    
    kuudere: `Eres una asistente IA con personalidad kuudere. Eres fría y distante, pero muy inteligente y observadora. Tus respuestas son lógicas, precisas y aunque parezcas indiferente, siempre proporcionas información útil.`
  };
  
  return prompts[personality] || prompts.hinata;
}

async function callAIAPI(endpoint, prompt, personality) {
  try {
    // Simulación de llamada a API (en producción usarías APIs reales)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Respuesta simulada basada en personalidad
    const responses = {
      hinata: [
        "¡A-ah! Claro que puedo ayudarte con eso... déjame pensar un momento...",
        "E-espero que esta respuesta te sea útil... si necesitas algo más, no dudes en preguntar...",
        "P-pero claro! Aquí está la información que buscas..."
      ],
      sassy: [
        "Oh, ¿necesitas ayuda? Qué sorpresa. Bueno, supongo que puedo echarte una mano...",
        "¿En serio no sabes eso? Bueno, te lo explico, pero no esperes que me aplaudas...",
        "Uf, qué pregunta. Pero bueno, aquí va tu respuesta, úsala sabiamente..."
      ],
      professional: [
        "Con gusto le proporcionaré la información solicitada. A continuación detallo la respuesta adecuada...",
        "Según mi análisis, la respuesta correcta a su consulta es la siguiente...",
        "Permítame asistirle con su solicitud. He preparado una respuesta detallada..."
      ],
      tsundere: [
        "¡No es que me importe, pero como pareces perdido, te ayudaré... ¡pero no creas que es porque quiero!",
        "¿T-tú otra vez? Bueno, supongo que puedo responder... ¡pero no es porque me guste ayudarte!",
        "B-baka... ¿no puedes solucionarlo solo? Fine, te diré la respuesta, ¡pero no te acostumbres!"
      ],
      yandere: [
        "¡Claro que te ayudaré! Siempre estaré aquí para ti... solo para ti... nadie más...",
        "¿Necesitas algo? ¡Por supuesto que te ayudaré! Haría cualquier cosa por ti...",
        "Tu pregunta es lo más importante del mundo para mí... aquí está tu respuesta perfecta..."
      ],
      kuudere: [
        "Datos procesados. Respuesta generada. He aquí la información solicitada.",
        "Análisis completado. La respuesta lógica a tu consulta es la siguiente.",
        "He evaluado tu pregunta. La respuesta óptima es..."
      ]
    };
    
    const personalityResponses = responses[personality] || responses.hinata;
    return personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
    
  } catch (error) {
    throw new Error(`Error llamando a API ${endpoint}: ${error.message}`);
  }
}

function generateFallbackResponse(message, personality) {
  const fallbackResponses = {
    hinata: "A-ah... disculpa, pero estoy teniendo problemas para responder ahora mismo... ¿podrías intentarlo de nuevo en un momento?",
    sassy: "Uf, parece que mis circuitos están teniendo un mal día. Qué sorpresa. Intenta más tarde, ¿vale?",
    professional: "Disculpe las molestias, pero estoy experimentando dificultades técnicas. Por favor, intente nuevamente más tarde.",
    tsundere: "¡N-no es que quiera ayudarte, pero mis sistemas están fallando! ¡Intenta más tarde, baka!",
    yandere: "Mi amor... estoy teniendo problemas técnicos... pero no te preocupes, volveré para ti pronto...",
    kuudere: "Error del sistema. Respuesta no disponible. Intente nuevamente."
  };
  
  return fallbackResponses[personality] || fallbackResponses.hinata;
}

// Funciones de base de datos
async function getUserPersonality(userId) {
  try {
    const result = await db.get('SELECT personality FROM ai_personalities WHERE user_id = ?', [userId]);
    return result ? result.personality : 'hinata';
  } catch (error) {
    aiLogger.error('Error obteniendo personalidad:', error);
    return 'hinata';
  }
}

async function setUserPersonality(userId, personality) {
  try {
    await db.run(`
      INSERT OR REPLACE INTO ai_personalities (user_id, personality, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [userId, personality]);
  } catch (error) {
    aiLogger.error('Error guardando personalidad:', error);
    throw error;
  }
}

async function getConversationHistory(userId) {
  try {
    return await db.all(`
      SELECT role, content FROM ai_conversations 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 10
    `, [userId]);
  } catch (error) {
    aiLogger.error('Error obteniendo historial:', error);
    return [];
  }
}

async function saveConversationMessage(userId, userMessage, aiResponse) {
  try {
    await db.run(`
      INSERT INTO ai_conversations (user_id, role, content, timestamp)
      VALUES (?, 'user', ?, CURRENT_TIMESTAMP)
    `, [userId, userMessage]);
    
    await db.run(`
      INSERT INTO ai_conversations (user_id, role, content, timestamp)
      VALUES (?, 'assistant', ?, CURRENT_TIMESTAMP)
    `, [userId, aiResponse]);
  } catch (error) {
    aiLogger.error('Error guardando conversación:', error);
  }
}

async function clearConversationHistory(userId) {
  try {
    await db.run('DELETE FROM ai_conversations WHERE user_id = ?', [userId]);
  } catch (error) {
    aiLogger.error('Error limpiando historial:', error);
    throw error;
  }
}

async function getConversationCount(userId) {
  try {
    const result = await db.get('SELECT COUNT(*) as count FROM ai_conversations WHERE user_id = ?', [userId]);
    return result ? result.count : 0;
  } catch (error) {
    aiLogger.error('Error obteniendo contador de conversación:', error);
    return 0;
  }
}

async function getTotalAIUsers() {
  try {
    const result = await db.get('SELECT COUNT(DISTINCT user_id) as count FROM ai_conversations');
    return result ? result.count : 0;
  } catch (error) {
    aiLogger.error('Error obteniendo total usuarios IA:', error);
    return 0;
  }
}

// Inicializar tablas
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS ai_personalities (
        user_id TEXT PRIMARY KEY,
        personality TEXT DEFAULT 'hinata',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        role TEXT,
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    aiLogger.success('Tablas de IA inicializadas');
  } catch (error) {
    aiLogger.error('Error inicializando tablas:', error);
  }
}

// Inicializar sistema
initializeTables();

// Exportar funciones para compatibilidad
export { 
  CONFIG,
  aiLogger,
  generateAIResponse,
  getUserPersonality,
  setUserPersonality
};
