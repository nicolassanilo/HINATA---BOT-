/**
 * @file Auto Level Up v2.0 - Sistema mejorado de niveles automáticos
 * @description Sistema de niveles automáticos con recompensas, notificaciones y mejor manejo de errores
 * @version 2.0.0
 * @author Mejorado para HINATA-BOT
 */

// Importaciones necesarias
import fs from 'fs';
import path from 'path';

// Configuración del plugin
const CONFIG = {
  enableLogging: true,
  enableRewards: true,
  enableNotifications: true,
  enableChannelNotifications: true,
  rewardMultiplier: 1.0,
  minLevelForRewards: 5,
  rewardInterval: 5, // Cada cuántos niveles dar recompensa
  minCoinsReward: 6,
  maxCoinsReward: 9,
  minExpReward: 6,
  maxExpReward: 10,
  defaultProfileImage: 'https://files.catbox.moe/xr2m6u.jpg',
  timezone: 'America/Bogota'
};

// Sistema de logging
const logger = {
  info: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[AUTOLEVELUP] ℹ️ ${message}`);
    }
  },
  error: (message, error = null) => {
    console.error(`[AUTOLEVELUP] ❌ ${message}`);
    if (error) console.error('Error:', error);
  },
  success: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[AUTOLEVELUP] ✅ ${message}`);
    }
  },
  debug: (message, data = null) => {
    if (CONFIG.enableLogging) {
      console.log(`[AUTOLEVELUP] 🔍 ${message}`);
      if (data) console.log('Data:', data);
    }
  }
};

// Función para obtener fecha formateada
function getFormattedDate() {
  try {
    const now = new Date();
    return now.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  } catch (error) {
    logger.error('Error formateando fecha:', error);
    return new Date().toLocaleDateString();
  }
}

// Función para verificar si el usuario puede subir de nivel
function canLevelUp(level, exp, multiplier = 1) {
  try {
    if (!level || !exp || typeof level !== 'number' || typeof exp !== 'number') {
      return false;
    }
    
    const requiredExp = level * 100 * multiplier;
    return exp >= requiredExp;
  } catch (error) {
    logger.error('Error verificando si puede subir de nivel:', error);
    return false;
  }
}

// Función para calcular experiencia necesaria para el siguiente nivel
function getRequiredExp(level, multiplier = 1) {
  try {
    return Math.floor(level * 100 * multiplier);
  } catch (error) {
    logger.error('Error calculando experiencia requerida:', error);
    return 100;
  }
}

// Función para generar recompensas aleatorias
function generateRewards(level) {
  try {
    if (!CONFIG.enableRewards || level < CONFIG.minLevelForRewards) {
      return { coins: 0, exp: 0 };
    }
    
    const coinsReward = Math.floor(
      Math.random() * (CONFIG.maxCoinsReward - CONFIG.minCoinsReward + 1) + CONFIG.minCoinsReward
    ) * CONFIG.rewardMultiplier;
    
    const expReward = Math.floor(
      Math.random() * (CONFIG.maxExpReward - CONFIG.minExpReward + 1) + CONFIG.minExpReward
    ) * CONFIG.rewardMultiplier;
    
    return {
      coins: Math.floor(coinsReward),
      exp: Math.floor(expReward)
    };
  } catch (error) {
    logger.error('Error generando recompensas:', error);
    return { coins: 0, exp: 0 };
  }
}

// Función para obtener URL de perfil del usuario
async function getProfilePictureUrl(conn, userId) {
  try {
    const url = await conn.profilePictureUrl(userId, 'image');
    return url || CONFIG.defaultProfileImage;
  } catch (error) {
    logger.debug(`No se pudo obtener foto de perfil para ${userId}, usando imagen por defecto`);
    return CONFIG.defaultProfileImage;
  }
}

// Función para enviar notificación de nivel
async function sendLevelUpNotification(conn, chatId, user, oldLevel, newLevel, profileUrl) {
  try {
    if (!CONFIG.enableNotifications) return;
    
    const userName = user.name || user.pushName || 'Usuario';
    const date = getFormattedDate();
    
    const message = `*✿ ¡F E L I C I D A D E S! ✿*\n\n` +
                   `✰ Nivel Anterior » *${oldLevel}*\n` +
                   `✰ Nivel Actual » *${newLevel}*\n` +
                   `✦ Fecha » *${date}*\n\n` +
                   `> *\`¡Has alcanzado un Nuevo Nivel!\`*`;
    
    await conn.sendMessage(chatId, { text: message });
    logger.success(`Notificación de nivel enviada a ${userName} (${chatId})`);
  } catch (error) {
    logger.error('Error enviando notificación de nivel:', error);
  }
}

// Función para enviar notificación al canal
async function sendChannelNotification(conn, user, oldLevel, newLevel, rewards, profileUrl) {
  try {
    if (!CONFIG.enableChannelNotifications || !global.channelid) return;
    
    const userName = user.name || user.pushName || 'Usuario';
    
    let channelMessage = `♛ *Usuario:* ${userName}\n` +
                       `★ *Nivel anterior:* ${oldLevel}\n` +
                       `✰ *Nivel actual:* ${newLevel}`;
    
    if (rewards.coins > 0 || rewards.exp > 0) {
      channelMessage += `\n\n⛁ *Recompensa por alcanzar el nivel ${newLevel}:*\n` +
                      `- *${rewards.coins} ⛁ coins*\n` +
                      `- *${rewards.exp} ✰ exp*`;
    }
    
    await conn.sendMessage(global.channelid, {
      text: channelMessage,
      contextInfo: {
        externalAdReply: {
          title: "【 ✿ 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗖𝗜𝗢́𝗡 ✿ 】",
          body: '✎ ¡Un usuario ha alcanzado un nuevo nivel!',
          thumbnailUrl: profileUrl,
          mediaType: 1,
          showAdAttribution: false,
          renderLargerThumbnail: false
        }
      }
    }, { quoted: null });
    
    logger.success(`Notificación de canal enviada para ${userName}`);
  } catch (error) {
    logger.error('Error enviando notificación al canal:', error);
  }
}

// Función para aplicar recompensas al usuario
function applyRewards(user, rewards) {
  try {
    if (!CONFIG.enableRewards) return;
    
    if (rewards.coins > 0) {
      user.coin = (user.coin || 0) + rewards.coins;
    }
    
    if (rewards.exp > 0) {
      user.exp = (user.exp || 0) + rewards.exp;
    }
    
    logger.info(`Recompensas aplicadas: ${rewards.coins} coins, ${rewards.exp} exp`);
  } catch (error) {
    logger.error('Error aplicando recompensas:', error);
  }
}

// Función principal del handler
let handler = m => m;
handler.before = async function (m, { conn, usedPrefix }) {
  try {
    // Verificar si el autolevelup está activado en el chat
    const chatId = m.chat;
    const senderId = m.sender;
    
    if (!global.db || !global.db.data) {
      logger.error('Base de datos no disponible');
      return;
    }
    
    const chat = global.db.data.chats[chatId];
    const user = global.db.data.users[senderId];
    
    if (!chat || !user) {
      logger.debug('Chat o usuario no encontrado en la base de datos');
      return;
    }
    
    if (!chat.autolevelup) {
      logger.debug(`Auto level up desactivado en chat ${chatId}`);
      return;
    }
    
    // Verificar que el usuario tenga los datos necesarios
    if (!user.level) user.level = 0;
    if (!user.exp) user.exp = 0;
    if (!user.name) user.name = m.pushName || 'Usuario';
    
    const oldLevel = user.level;
    const multiplier = global.multiplier || 1;
    
    logger.debug(`Verificando nivel para ${user.name}: Nivel ${oldLevel}, EXP ${user.exp}`);
    
    // Verificar si puede subir de nivel
    let levelUpOccurred = false;
    while (canLevelUp(user.level, user.exp, multiplier)) {
      user.level++;
      levelUpOccurred = true;
      logger.info(`${user.name} subió al nivel ${user.level}`);
    }
    
    // Si ocurrió un cambio de nivel
    if (levelUpOccurred && oldLevel !== user.level) {
      const newLevel = user.level;
      
      // Obtener foto de perfil
      const profileUrl = await getProfilePictureUrl(conn, senderId);
      
      // Enviar notificación local
      await sendLevelUpNotification(conn, chatId, user, oldLevel, newLevel, profileUrl);
      
      // Generar y aplicar recompensas si corresponde
      if (newLevel % CONFIG.rewardInterval === 0) {
        const rewards = generateRewards(newLevel);
        applyRewards(user, rewards);
        
        // Enviar notificación al canal con recompensas
        await sendChannelNotification(conn, user, oldLevel, newLevel, rewards, profileUrl);
      } else {
        // Enviar notificación al canal sin recompensas
        await sendChannelNotification(conn, user, oldLevel, newLevel, { coins: 0, exp: 0 }, profileUrl);
      }
      
      logger.success(`Proceso de nivel completado para ${user.name}: ${oldLevel} → ${newLevel}`);
    }
    
  } catch (error) {
    logger.error('Error en el proceso de autolevelup:', error);
  }
};

// Función de ayuda
export const help = `
📈 *AUTO LEVEL UP v2.0*

Sistema automático de niveles que se activa cuando los usuarios ganan experiencia.

⚙️ *Configuración:*
• Activa/desactiva por chat
• Recompensas automáticas cada 5 niveles
• Notificaciones locales y al canal
• Sistema de experiencia progresivo

🎁 *Recompensas:*
• Coins aleatorias (6-9)
• Experiencia adicional (6-10)
• Cada 5 niveles alcanzados

📝 *Comandos relacionados:*
• \`.level\` - Ver tu nivel actual
• \`.profile\` - Ver tu perfil completo
• \`.leaderboard\` - Ranking de niveles

🔧 *Para administradores:*
• \`.on autolevelup\` - Activar en grupo
• \`.off autolevelup\` - Desactivar en grupo
`;

// Exportar configuración para debugging
export const config = CONFIG;
export default handler;
