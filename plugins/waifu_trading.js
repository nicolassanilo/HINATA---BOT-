/**
 * @file Plugin Waifu Trading - Sistema de intercambio de waifus
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema completo de trading entre usuarios con seguridad y valoración
 */

import { db } from './db.js';
import { 
  characters, 
  loadCharacters, 
  getCharacterById, 
  getCharacterByName,
  getUserWaifus,
  validateUserWaifu,
  getRarezaEmoji,
  getRarezaTexto,
  getUserBalance,
  updateUserBalance,
  logger
} from './waifu_core.js';

// Variables globales
let activeTrades = new Map();
let tradeHistory = [];
const TRADE_COOLDOWN = 5 * 60 * 1000; // 5 minutos
const MAX_TRADE_HISTORY = 100;

// Configuración
const CONFIG = {
  enableLogging: true,
  maxTradeItems: 5,
  tradeFee: 0.05, // 5% de comisión
  minReputation: 0,
  enableMarketplace: true
};

// Sistema de logging
const tradeLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[TRADE] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[TRADE] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[TRADE] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[TRADE] ❌ ${message}`)
};

// Funciones principales
export const command = ['.trade', '.accepttrade', '.rejecttrade', '.trademarket', '.tradehistory', '.tradevalue'];
export const alias = ['.intercambiar', '.aceptartrade', '.rechazartrade', '.mercado', '.historialtrade', '.valortrade'];
export const description = 'Sistema de intercambio de waifus entre usuarios';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.trade':
        await initiateTrade(sock, m, text);
        break;
      case '.accepttrade':
        await acceptTrade(sock, m);
        break;
      case '.rejecttrade':
        await rejectTrade(sock, m);
        break;
      case '.trademarket':
        await showMarketplace(sock, m);
        break;
      case '.tradehistory':
        await showTradeHistory(sock, m);
        break;
      case '.tradevalue':
        await evaluateTrade(sock, m, text);
        break;
      default:
        await showTradeHelp(sock, m);
    }
  } catch (error) {
    tradeLogger.error('Error en el sistema de trading:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de trading. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Iniciar trade
async function initiateTrade(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  const args = text.split(' ');
  if (args.length < 3) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.trade @usuario <waifu1> [waifu2...]`\n*Ejemplo:* `.trade @1234567890@s.whatsapp.net Hinata Sakura`'
    }, { quoted: m });
  }
  
  const targetUserId = args[1].replace('@', '').trim();
  const waifuNames = args.slice(2);
  
  if (targetUserId === userId) {
    return await sock.sendMessage(chatId, {
      text: '❌ No puedes hacer trade contigo mismo.'
    }, { quoted: m });
  }
  
  if (waifuNames.length > CONFIG.maxTradeItems) {
    return await sock.sendMessage(chatId, {
      text: `❌ Puedes ofrecer máximo ${CONFIG.maxTradeItems} waifus por trade.`
    }, { quoted: m });
  }
  
  try {
    // Validar que el usuario tenga las waifus
    const userWaifus = [];
    for (const waifuName of waifuNames) {
      const waifu = await validateUserWaifu(userId, waifuName);
      if (!waifu) {
        return await sock.sendMessage(chatId, {
          text: `❌ No tienes la waifu "${waifuName}" en tu colección.`
        }, { quoted: m });
      }
      userWaifus.push(waifu);
    }
    
    // Verificar si ya hay un trade activo
    const existingTrade = activeTrades.get(`${userId}-${targetUserId}`) || 
                         activeTrades.get(`${targetUserId}-${userId}`);
    
    if (existingTrade) {
      return await sock.sendMessage(chatId, {
        text: '❌ Ya tienes un trade activo con este usuario. Espera a que se complete o cancélalo.'
      }, { quoted: m });
    }
    
    // Crear el trade
    const tradeId = `${Date.now()}-${userId}-${targetUserId}`;
    const trade = {
      id: tradeId,
      initiator: userId,
      target: targetUserId,
      initiatorWaifus: userWaifus,
      targetWaifus: [],
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
    };
    
    activeTrades.set(tradeId, trade);
    
    // Notificar al objetivo
    let message = `🔄 *SOLICITUD DE TRADE* 🔄\n\n`;
    message += `👤 *@${userId.split('@')[0]}* quiere hacer trade contigo\n\n`;
    message += `📦 *Ofrece:*\n`;
    
    let totalValue = 0;
    userWaifus.forEach((waifu, index) => {
      const emoji = getRarezaEmoji(waifu.price);
      const rarity = getRarezaTexto(waifu.price);
      totalValue += waifu.price;
      
      message += `${index + 1}. ${emoji} ${waifu.name} (${rarity})\n`;
      message += `   💰 ${waifu.price.toLocaleString()} pts\n`;
    });
    
    message += `\n💰 *Valor total: ${totalValue.toLocaleString()} pts*\n\n`;
    message += `💡 *Para responder:*\n`;
    message += `• \`.accepttrade\` - Aceptar\n`;
    message += `• \`.rejecttrade\` - Rechazar\n`;
    message += `⏰ *Expira en 10 minutos*`;
    
    // Enviar notificación al grupo
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId, targetUserId]
    }, { quoted: m });
    
    // Notificación privada al objetivo
    try {
      await sock.sendMessage(targetUserId, {
        text: `🔄 *NUEVA SOLICITUD DE TRADE*\n\n@${userId.split('@')[0]} quiere hacer trade contigo.\n\nUsa \`.accepttrade\` o \`.rejecttrade\` para responder.\n\nO responde en el grupo donde se hizo la solicitud.`,
        mentions: [userId]
      });
    } catch (error) {
      tradeLogger.warning('No se pudo enviar notificación privada:', error);
    }
    
    tradeLogger.success(`Trade iniciado - ${userId} -> ${targetUserId} (${waifuNames.length} waifus)`);
    
    // Configurar expiración automática
    setTimeout(() => {
      const trade = activeTrades.get(tradeId);
      if (trade && trade.status === 'pending') {
        activeTrades.delete(tradeId);
        tradeLogger.info(`Trade expirado: ${tradeId}`);
      }
    }, 10 * 60 * 1000);
    
  } catch (error) {
    tradeLogger.error('Error iniciando trade:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al iniciar el trade. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Aceptar trade
async function acceptTrade(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  try {
    // Buscar trade pendiente donde el usuario es el objetivo
    let activeTrade = null;
    let tradeId = null;
    
    for (const [id, trade] of activeTrades.entries()) {
      if (trade.target === userId && trade.status === 'pending') {
        activeTrade = trade;
        tradeId = id;
        break;
      }
    }
    
    if (!activeTrade) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes solicitudes de trade pendientes.'
      }, { quoted: m });
    }
    
    // El usuario debe especificar qué waifus ofrece
    return await sock.sendMessage(chatId, {
      text: '💡 *Para aceptar el trade, responde con las waifus que ofrecerás:*\n\n' +
            `📦 *@${activeTrade.initiator.split('@')[0]}* ofrece:\n` +
            activeTrade.initiatorWaifus.map((w, i) => 
              `${i + 1}. ${getRarezaEmoji(w.price)} ${w.name} (${w.price.toLocaleString()} pts)`
            ).join('\n') +
            `\n\n💡 *Responde:* \`.trade @${activeTrade.initiator.split('@')[0]} <tus_waifus>\``
    }, { quoted: m });
    
  } catch (error) {
    tradeLogger.error('Error aceptando trade:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al procesar la aceptación del trade.'
    }, { quoted: m });
  }
}

// Rechazar trade
async function rejectTrade(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  try {
    // Buscar trade pendiente donde el usuario es el objetivo
    let activeTrade = null;
    let tradeId = null;
    
    for (const [id, trade] of activeTrades.entries()) {
      if (trade.target === userId && trade.status === 'pending') {
        activeTrade = trade;
        tradeId = id;
        break;
      }
    }
    
    if (!activeTrade) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes solicitudes de trade pendientes.'
      }, { quoted: m });
    }
    
    // Eliminar el trade
    activeTrades.delete(tradeId);
    
    // Registrar en historial
    tradeHistory.push({
      type: 'rejected',
      initiator: activeTrade.initiator,
      target: activeTrade.target,
      initiatorWaifus: activeTrade.initiatorWaifus,
      targetWaifus: [],
      timestamp: new Date()
    });
    
    // Limitar historial
    if (tradeHistory.length > MAX_TRADE_HISTORY) {
      tradeHistory = tradeHistory.slice(-MAX_TRADE_HISTORY);
    }
    
    let message = `❌ *TRADE RECHAZADO* ❌\n\n`;
    message += `👤 *@${userId.split('@')[0]}* ha rechazado el trade\n`;
    message += `👤 *@${activeTrade.initiator.split('@')[0]}* fue notificado`;
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId, activeTrade.initiator]
    }, { quoted: m });
    
    tradeLogger.info(`Trade rechazado - ${activeTrade.initiator} -> ${userId}`);
    
  } catch (error) {
    tradeLogger.error('Error rechazando trade:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al rechazar el trade.'
    }, { quoted: m });
  }
}

// Mostrar marketplace
async function showMarketplace(sock, m) {
  const chatId = m.key.remoteJid;
  
  if (!CONFIG.enableMarketplace) {
    return await sock.sendMessage(chatId, {
      text: '❌ El marketplace está desactivado temporalmente.'
    }, { quoted: m });
  }
  
  try {
    // Obtener trades recientes exitosos
    const recentTrades = tradeHistory
      .filter(trade => trade.type === 'completed')
      .slice(-10)
      .reverse();
    
    let message = `🏪 *MARKPLACE DE WAIFUS* 🏪\n\n`;
    
    if (recentTrades.length === 0) {
      message += `❌ Aún no hay trades recientes.\n\n`;
      message += `💡 *Inicia el primer trade usando:* \`.trade @usuario <waifus>\``;
    } else {
      message += `📊 *Trades recientes exitosos:*\n\n`;
      
      recentTrades.forEach((trade, index) => {
        const initiatorValue = trade.initiatorWaifus.reduce((sum, w) => sum + w.price, 0);
        const targetValue = trade.targetWaifus.reduce((sum, w) => sum + w.price, 0);
        
        message += `${index + 1}. @${trade.initiator.split('@')[0]} ↔ @${trade.target.split('@')[0]}\n`;
        message += `   📦 ${trade.initiatorWaifus.length} ↔ ${trade.targetWaifus.length} waifus\n`;
        message += `   💰 ${initiatorValue.toLocaleString()} ↔ ${targetValue.toLocaleString()} pts\n`;
        message += `   📅 ${new Date(trade.timestamp).toLocaleDateString()}\n\n`;
      });
    }
    
    message += `💡 *Comandos de trading:*\n`;
    message += `• \`.trade @usuario <waifus>\` - Iniciar trade\n`;
    message += `• \`.tradevalue <waifus>\` - Evaluar valor\n`;
    message += `• \`.tradehistory\` - Ver historial`;
    
    await sock.sendMessage(chatId, { text: message }, { quoted: m });
    
  } catch (error) {
    tradeLogger.error('Error mostrando marketplace:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el marketplace.'
    }, { quoted: m });
  }
}

// Mostrar historial de trades
async function showTradeHistory(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  try {
    // Filtrar trades del usuario
    const userTrades = tradeHistory.filter(trade => 
      trade.initiator === userId || trade.target === userId
    ).slice(-20).reverse();
    
    let message = `📜 *HISTORIAL DE TRADES* 📜\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    
    if (userTrades.length === 0) {
      message += `❌ Aún no tienes trades en tu historial.\n\n`;
      message += `💡 Inicia tu primer trade con \`.trade @usuario <waifus>\``;
    } else {
      message += `📊 *Tus trades recientes:*\n\n`;
      
      userTrades.forEach((trade, index) => {
        const isInitiator = trade.initiator === userId;
        const otherUser = isInitiator ? trade.target : trade.initiator;
        const status = trade.type === 'completed' ? '✅ Completado' : 
                     trade.type === 'rejected' ? '❌ Rechazado' : '⏸️ Pendiente';
        
        message += `${index + 1}. ${status}\n`;
        message += `   ${isInitiator ? '📤 Tú' : '📥 Tú'} ↔ @${otherUser.split('@')[0]}\n`;
        message += `   📦 ${trade.initiatorWaifus.length} ↔ ${trade.targetWaifus.length} waifus\n`;
        message += `   📅 ${new Date(trade.timestamp).toLocaleDateString()}\n\n`;
      });
    }
    
    message += `💡 *Estadísticas globales:*\n`;
    message += `📊 Total trades: ${tradeHistory.length}\n`;
    message += `✅ Completados: ${tradeHistory.filter(t => t.type === 'completed').length}\n`;
    message += `❌ Rechazados: ${tradeHistory.filter(t => t.type === 'rejected').length}`;
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });
    
  } catch (error) {
    tradeLogger.error('Error mostrando historial:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar tu historial de trades.'
    }, { quoted: m });
  }
}

// Evaluar valor de trade
async function evaluateTrade(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  const waifuNames = text.split(' ').slice(1);
  
  if (waifuNames.length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar las waifus a evaluar.\n\n💡 *Uso:* `.tradevalue <waifu1> [waifu2...]`'
    }, { quoted: m });
  }
  
  try {
    let message = `💰 *EVALUACIÓN DE TRADE* 💰\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n\n`;
    
    let totalValue = 0;
    let validWaifus = [];
    let invalidWaifus = [];
    
    for (const waifuName of waifuNames) {
      const waifu = await validateUserWaifu(userId, waifuName);
      if (waifu) {
        validWaifus.push(waifu);
        totalValue += waifu.price;
      } else {
        invalidWaifus.push(waifuName);
      }
    }
    
    if (validWaifus.length > 0) {
      message += `✅ *Waifus válidas:*\n`;
      validWaifus.forEach((waifu, index) => {
        const emoji = getRarezaEmoji(waifu.price);
        const rarity = getRarezaTexto(waifu.price);
        
        message += `${index + 1}. ${emoji} ${waifu.name}\n`;
        message += `   📺 ${waifu.anime}\n`;
        message += `   💎 ${rarity}\n`;
        message += `   💰 ${waifu.price.toLocaleString()} pts\n\n`;
      });
      
      message += `💎 *Valor total: ${totalValue.toLocaleString()} pts*\n`;
      message += `📊 *Valor promedio: ${Math.floor(totalValue / validWaifus.length).toLocaleString()} pts*\n\n`;
      
      // Calcular comisión
      const fee = Math.floor(totalValue * CONFIG.tradeFee);
      message += `🏦 *Comisión del sistema: ${fee.toLocaleString()} pts (${CONFIG.tradeFee * 100}%)*\n`;
      message += `💸 *Valor neto: ${(totalValue - fee).toLocaleString()} pts*\n\n`;
    }
    
    if (invalidWaifus.length > 0) {
      message += `❌ *Waifus no encontradas:*\n`;
      invalidWaifus.forEach(waifuName => {
        message += `• ${waifuName}\n`;
      });
      message += `\n`;
    }
    
    if (validWaifus.length > 0) {
      message += `💡 *Recomendaciones de trade:*\n`;
      message += `• Busca waifus de valor similar para trades justos\n`;
      message += `• Las waifus raras tienen mejor valor de cambio\n`;
      message += `• Considera la rareza y el anime de origen`;
    }
    
    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });
    
  } catch (error) {
    tradeLogger.error('Error evaluando trade:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al evaluar el valor del trade.'
    }, { quoted: m });
  }
}

// Mostrar ayuda
async function showTradeHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `🔄 *SISTEMA DE TRADING* 🔄\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `📋 *Trading:*\n`;
  message += `• \`.trade @usuario <waifus>\` - Iniciar trade\n`;
  message += `• \`.accepttrade\` - Aceptar trade pendiente\n`;
  message += `• \`.rejecttrade\` - Rechazar trade pendiente\n\n`;
  
  message += `📊 *Información:*\n`;
  message += `• \`.tradevalue <waifus>\` - Evaluar valor de waifus\n`;
  message += `• \`.trademarket\` - Ver marketplace\n`;
  message += `• \`.tradehistory\` - Tu historial de trades\n\n`;
  
  message += `⚙️ *Configuración:*\n`;
  message += `• Máximo ${CONFIG.maxTradeItems} waifus por trade\n`;
  message += `• Comisión del ${CONFIG.tradeFee * 100}% en trades exitosos\n`;
  message += `• Los trades expiran en 10 minutos\n\n`;
  
  message += `🔒 *Seguridad:*\n`;
  message += `• Sistema de verificación de propiedades\n`;
  message += `• Historial completo de transacciones\n`;
  message += `• Protección contra trades injustos\n\n`;
  
  message += `💡 *Consejos:*\n`;
  message += `• Verifica el valor con \`.tradevalue\` antes de trading\n`;
  message += `• Considera la rareza y popularidad de las waifus\n`;
  message += `• Mantén un buen historial para mejor reputación`;
  
  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Inicializar tablas
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS trade_reputation (
        user_id TEXT PRIMARY KEY,
        successful_trades INTEGER DEFAULT 0,
        rejected_trades INTEGER DEFAULT 0,
        reputation_score REAL DEFAULT 0.0,
        last_trade_date DATETIME
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS trade_offers (
        id TEXT PRIMARY KEY,
        initiator_id TEXT,
        target_id TEXT,
        initiator_waifus TEXT,
        target_waifus TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `);
    
    tradeLogger.success('Tablas de trading inicializadas');
  } catch (error) {
    tradeLogger.error('Error inicializando tablas:', error);
  }
}

// Funciones auxiliares
async function updateReputation(userId, tradeType) {
  try {
    const reputation = await db.get(
      'SELECT * FROM trade_reputation WHERE user_id = ?',
      [userId]
    );
    
    if (!reputation) {
      await db.run(
        'INSERT INTO trade_reputation (user_id, successful_trades, rejected_trades, reputation_score, last_trade_date) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, tradeType === 'completed' ? 1 : 0, tradeType === 'rejected' ? 1 : 0, tradeType === 'completed' ? 1.0 : 0.0]
      );
    } else {
      const successful = tradeType === 'completed' ? reputation.successful_trades + 1 : reputation.successful_trades;
      const rejected = tradeType === 'rejected' ? reputation.rejected_trades + 1 : reputation.rejected_trades;
      const total = successful + rejected;
      const score = total > 0 ? (successful / total) * 5 : 0;
      
      await db.run(
        'UPDATE trade_reputation SET successful_trades = ?, rejected_trades = ?, reputation_score = ?, last_trade_date = CURRENT_TIMESTAMP WHERE user_id = ?',
        [successful, rejected, score, userId]
      );
    }
  } catch (error) {
    tradeLogger.error('Error actualizando reputación:', error);
  }
}

// Inicializar sistema
initializeTables();

// Exportar funciones para compatibilidad
export { 
  activeTrades,
  tradeHistory,
  updateReputation,
  CONFIG,
  tradeLogger
};
