/**
 * @file Plugin Waifu Social - Sistema de relaciones sociales entre usuarios y waifus
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de relaciones sociales, visitas, regalos y eventos comunitarios
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Importar funciones compartidas desde el core
import { 
  characters, 
  loadCharacters, 
  getWaifuLevel, 
  getWaifuStats,
  getRarezaEmoji,
  getUserBalance,
  updateUserBalance,
  getUserWaifus,
  validateUserWaifu,
  logger
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  maxFriends: 50,
  visitCooldown: 2 * 60 * 60 * 1000, // 2 horas
  giftCooldown: 6 * 60 * 60 * 1000, // 6 horas
  partyCooldown: 24 * 60 * 60 * 1000, // 24 horas
  maxPartySize: 10,
  relationshipLevels: {
    stranger: 0,
    acquaintance: 10,
    friend: 50,
    close_friend: 100,
    best_friend: 250,
    soulmate: 500
  }
};

// Sistema de logging
const socialLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[SOCIAL] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[SOCIAL] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[SOCIAL] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[SOCIAL] ❌ ${message}`)
};

// Tipos de relaciones
const RELATIONSHIP_TYPES = {
  FRIEND: 'friend',
  RIVAL: 'rival',
  MENTOR: 'mentor',
  STUDENT: 'student',
  PARTNER: 'partner',
  FAMILY: 'family'
};

// Tipos de regalos
const GIFT_TYPES = {
  FLOWERS: 'flowers',
  CHOCOLATE: 'chocolate',
  JEWELRY: 'jewelry',
  BOOKS: 'books',
  GAMES: 'games',
  CLOTHES: 'clothes',
  FOOD: 'food',
  ACCESSORIES: 'accessories'
};

// Definiciones de regalos
const GIFT_DEFINITIONS = {
  [GIFT_TYPES.FLOWERS]: {
    name: 'Flores',
    emoji: '🌸',
    effect: { affection: 10, happiness: 15 },
    price: 500,
    rarity: 'common'
  },
  [GIFT_TYPES.CHOCOLATE]: {
    name: 'Chocolate',
    emoji: '🍫',
    effect: { affection: 15, happiness: 10 },
    price: 750,
    rarity: 'common'
  },
  [GIFT_TYPES.JEWELRY]: {
    name: 'Joyería',
    emoji: '💍',
    effect: { affection: 25, happiness: 20 },
    price: 2000,
    rarity: 'rare'
  },
  [GIFT_TYPES.BOOKS]: {
    name: 'Libros',
    emoji: '📚',
    effect: { affection: 8, happiness: 12 },
    price: 300,
    rarity: 'common'
  },
  [GIFT_TYPES.GAMES]: {
    name: 'Videojuegos',
    emoji: '🎮',
    effect: { affection: 20, happiness: 25 },
    price: 1500,
    rarity: 'uncommon'
  },
  [GIFT_TYPES.CLOTHES]: {
    name: 'Ropa',
    emoji: '👗',
    effect: { affection: 18, happiness: 15 },
    price: 1200,
    rarity: 'uncommon'
  },
  [GIFT_TYPES.FOOD]: {
    name: 'Comida',
    emoji: '🍱',
    effect: { affection: 12, happiness: 18 },
    price: 400,
    rarity: 'common'
  },
  [GIFT_TYPES.ACCESSORIES]: {
    name: 'Accesorios',
    emoji: '🎀',
    effect: { affection: 15, happiness: 12 },
    price: 800,
    rarity: 'uncommon'
  }
};

/**
 * Sistema de relaciones sociales
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.amigos':
        await showFriends(sock, m, userId);
        break;
      case '.agregar_amigo':
        await addFriend(sock, m, userId, text);
        break;
      case '.visitar':
        await visitFriend(sock, m, userId, text);
        break;
      case '.regalar':
        await sendGift(sock, m, userId, text);
        break;
      case '.fiesta':
        await createParty(sock, m, userId, text);
        break;
      case '.unirse_fiesta':
        await joinParty(sock, m, userId, text);
        break;
      case '.relaciones':
        await showRelationships(sock, m, userId);
        break;
      case '.social':
        await showSocialMenu(sock, m, userId);
        break;
      default:
        socialLogger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    socialLogger.error('Error en el sistema social:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema social. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Muestra el menú social principal
 */
async function showSocialMenu(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    // Obtener datos con manejo de errores seguro
    let friendsCount, pendingRequests, userStats;
    
    try {
      friendsCount = await getFriendsCount(userId);
    } catch (error) {
      socialLogger.error('Error obteniendo amigos:', error);
      friendsCount = 0;
    }
    
    try {
      pendingRequests = await getPendingRequests(userId);
    } catch (error) {
      socialLogger.error('Error obteniendo solicitudes pendientes:', error);
      pendingRequests = 0;
    }
    
    try {
      userStats = await getSocialStats(userId);
    } catch (error) {
      socialLogger.error('Error obteniendo estadísticas sociales:', error);
      userStats = { partiesHosted: 0, giftsSent: 0 };
    }
    
    let menuMessage = `💝 *MENÚ SOCIAL* 💝\n\n`;
    menuMessage += `👤 *@${userId.split('@')[0]}*\n`;
    menuMessage += `👥 *Amigos:* ${friendsCount}/${CONFIG.maxFriends}\n`;
    menuMessage += `📨 *Solicitudes pendientes:* ${pendingRequests}\n`;
    menuMessage += `🎉 *Fiestas organizadas:* ${userStats.partiesHosted || 0}\n`;
    menuMessage += `🎁 *Regalos enviados:* ${userStats.giftsSent || 0}\n\n`;
    
    menuMessage += `🎯 *Comandos Sociales:*\n\n`;
    
    menuMessage += `👥 *Amistad:*\n`;
    menuMessage += `• \`.amigos\` - Ver lista de amigos\n`;
    menuMessage += `• \`.agregar_amigo @usuario\` - Enviar solicitud\n`;
    menuMessage += `• \`.relaciones\` - Ver relaciones de waifus\n\n`;
    
    menuMessage += `🏠 *Visitas:*\n`;
    menuMessage += `• \`.visitar @usuario\` - Visitar a un amigo\n`;
    menuMessage += `• \`.visitar @usuario <waifu>\` - Visitar waifu específica\n\n`;
    
    menuMessage += `🎁 *Regalos:*\n`;
    menuMessage += `• \`.regalar @usuario <tipo>\` - Enviar regalo\n`;
    menuMessage += `• \`.regalar @usuario <tipo> <waifu>\` - Regalo específico\n\n`;
    
    menuMessage += `🎉 *Fiestas:*\n`;
    menuMessage += `• \`.fiesta <nombre>\` - Crear fiesta\n`;
    menuMessage += `• \`.unirse_fiesta <id>\` - Unirse a fiesta\n\n`;
    
    // Verificar que GIFT_DEFINITIONS exista
    const giftTypes = GIFT_DEFINITIONS ? Object.keys(GIFT_DEFINITIONS).join(', ') : 'flowers, chocolate, jewelry, books, games, clothes, food, accessories';
    
    menuMessage += `💡 *Tipos de regalos:* ${giftTypes}\n`;
    menuMessage += `⏰ *Cooldowns:* Visita 2h, Regalo 6h, Fiesta 24h`;
    
    await sock.sendMessage(chatId, { 
      text: menuMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    socialLogger.error('Error al mostrar menú social:', error);
    // Enviar mensaje de error simple pero informativo
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el menú social.\n\n💡 *Intenta recargar el bot con .reload*'
    }, { quoted: m });
  }
}

/**
 * Muestra la lista de amigos
 */
async function showFriends(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const friends = await getUserFriends(userId);
    
    if (friends.length === 0) {
      return await sock.sendMessage(chatId, {
        text: `👥 *NO TIENES AMIGOS*\n\n` +
              `💡 *Usa \`.agregar_amigo @usuario\` para hacer amigos\n` +
              `🎯 *Puedes tener hasta ${CONFIG.maxFriends} amigos`
      }, { quoted: m });
    }
    
    let friendsMessage = `👥 *LISTA DE AMIGOS* 👥\n\n`;
    friendsMessage += `📊 *Total:* ${friends.length}/${CONFIG.maxFriends}\n\n`;
    
    for (const friend of friends) {
      const relationshipLevel = getRelationshipLevel(friend.friendship_points);
      const lastInteraction = friend.last_interaction ? 
        new Date(friend.last_interaction).toLocaleDateString() : 'Nunca';
      
      friendsMessage += `👤 *@${friend.friend_id.split('@')[0]}*\n`;
      friendsMessage += `💝 *Nivel de amistad:* ${relationshipLevel}\n`;
      friendsMessage += `📅 *Última interacción:* ${lastInteraction}\n`;
      friendsMessage += `💬 *Mensajes:* ${friend.message_count || 0}\n\n`;
    }
    
    friendsMessage += `💡 *Comandos disponibles:*\n`;
    friendsMessage += `• \`.visitar @amigo\` - Visitar a un amigo\n`;
    friendsMessage += `• \`.regalar @amigo <tipo>\` - Enviar regalo\n`;
    friendsMessage += `• \`.agregar_amigo @usuario\` - Añadir nuevo amigo`;
    
    await sock.sendMessage(chatId, { 
      text: friendsMessage, 
      mentions: [userId, ...friends.map(f => f.friend_id)] 
    }, { quoted: m });
    
  } catch (error) {
    socialLogger.error('Error al mostrar amigos:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la lista de amigos.'
    }, { quoted: m });
  }
}

/**
 * Agrega un nuevo amigo
 */
async function addFriend(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes mencionar a un usuario.\n\n' +
            '💡 *Uso:* `.agregar_amigo @usuario`'
    }, { quoted: m });
  }
  
  const friendMention = args.find(arg => arg.startsWith('@'));
  if (!friendMention) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes mencionar a un usuario con @.\n\n' +
            '💡 *Ejemplo:* `.agregar_amigo @usuario123`'
    }, { quoted: m });
  }
  
  const friendId = `${friendMention.slice(1)}@s.whatsapp.net`;
  
  if (friendId === userId) {
    return await sock.sendMessage(chatId, {
      text: '❌ No puedes agregarte a ti mismo como amigo.'
    }, { quoted: m });
  }
  
  try {
    // Verificar si ya son amigos
    const existingFriend = await db.get(
      'SELECT * FROM friendships WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    
    if (existingFriend) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya eres amigo de @${friendId.split('@')[0]}.`,
        mentions: [friendId]
      }, { quoted: m });
    }
    
    // Verificar límite de amigos
    const friendsCount = await getFriendsCount(userId);
    if (friendsCount >= CONFIG.maxFriends) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite de amigos (${CONFIG.maxFriends}).`
      }, { quoted: m });
    }
    
    // Verificar si ya hay una solicitud pendiente
    const pendingRequest = await db.get(
      'SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = "pending"',
      [userId, friendId]
    );
    
    if (pendingRequest) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya tienes una solicitud pendiente para @${friendId.split('@')[0]}.`,
        mentions: [friendId]
      }, { quoted: m });
    }
    
    // Crear solicitud de amistad
    await db.run(
      'INSERT INTO friend_requests (sender_id, receiver_id, status, created_at) VALUES (?, ?, "pending", CURRENT_TIMESTAMP)',
      [userId, friendId]
    );
    
    let requestMessage = `📨 *SOLICITUD DE AMISTAD ENVIADA* 📨\n\n`;
    requestMessage += `👤 *@${userId.split('@')[0]}* ha enviado una solicitud de amistad a *@${friendId.split('@')[0]}*\n\n`;
    requestMessage += `⏳ *Estado:* Pendiente de respuesta\n`;
    requestMessage += `💡 *@${friendId.split('@')[0]}* puede usar \`.aceptar_amigo @${userId.split('@')[0]}\` para aceptar`;
    
    await sock.sendMessage(chatId, { 
      text: requestMessage, 
      mentions: [userId, friendId] 
    }, { quoted: m });
    
    socialLogger.success(`Solicitud de amistad enviada de ${userId} a ${friendId}`);
    
  } catch (error) {
    socialLogger.error('Error al enviar solicitud de amistad:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al enviar la solicitud de amistad.'
    }, { quoted: m });
  }
}

/**
 * Visita a un amigo
 */
async function visitFriend(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes mencionar a un usuario.\n\n' +
            '💡 *Uso:* `.visitar @usuario` o `.visitar @usuario <waifu>`'
    }, { quoted: m });
  }
  
  const friendMention = args.find(arg => arg.startsWith('@'));
  if (!friendMention) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes mencionar a un usuario con @.'
    }, { quoted: m });
  }
  
  const friendId = `${friendMention.slice(1)}@s.whatsapp.net`;
  const waifuName = args.filter(arg => !arg.startsWith('@')).join(' ');
  
  try {
    // Verificar si son amigos
    const friendship = await db.get(
      'SELECT * FROM friendships WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    
    if (!friendship) {
      return await sock.sendMessage(chatId, {
        text: `❌ No eres amigo de @${friendId.split('@')[0]}.`,
        mentions: [friendId]
      }, { quoted: m });
    }
    
    // Verificar cooldown
    const lastVisit = await db.get(
      'SELECT * FROM friend_visits WHERE visitor_id = ? AND visited_id = ? ORDER BY visit_time DESC LIMIT 1',
      [userId, friendId]
    );
    
    if (lastVisit) {
      const timeSince = Date.now() - new Date(lastVisit.visit_time).getTime();
      if (timeSince < CONFIG.visitCooldown) {
        const remaining = Math.ceil((CONFIG.visitCooldown - timeSince) / 60000);
        return await sock.sendMessage(chatId, {
          text: `⏰ Debes esperar ${remaining} minutos antes de volver a visitar a @${friendId.split('@')[0]}.`,
          mentions: [friendId]
        }, { quoted: m });
      }
    }
    
    // Obtener waifus del amigo
    const friendWaifus = await getFriendWaifus(friendId);
    
    if (friendWaifus.length === 0) {
      return await sock.sendMessage(chatId, {
        text: `❌ @${friendId.split('@')[0]} no tiene waifus para visitar.`,
        mentions: [friendId]
      }, { quoted: m });
    }
    
    // Seleccionar waifu para visitar
    let targetWaifu;
    if (waifuName) {
      targetWaifu = friendWaifus.find(w => 
        w.name.toLowerCase().includes(waifuName.toLowerCase())
      );
      if (!targetWaifu) {
        return await sock.sendMessage(chatId, {
          text: `❌ @${friendId.split('@')[0]} no tiene una waifu llamada "${waifuName}".`,
          mentions: [friendId]
        }, { quoted: m });
      }
    } else {
      targetWaifu = friendWaifus[Math.floor(Math.random() * friendWaifus.length)];
    }
    
    // Registrar visita
    await db.run(
      'INSERT INTO friend_visits (visitor_id, visited_id, waifu_id, visit_time) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [userId, friendId, targetWaifu.id]
    );
    
    // Actualizar puntos de amistad
    await updateFriendshipPoints(userId, friendId, 5);
    
    const waifuStats = await getWaifuStats(targetWaifu.id, friendId);
    const waifuLevel = await getWaifuLevel(targetWaifu.id, friendId);
    const rareza = getRarezaEmoji(targetWaifu.price);
    
    let visitMessage = `🏠 *VISITA A AMIGO* 🏠\n\n`;
    visitMessage += `👤 *@${userId.split('@')[0]}* ha visitado a *@${friendId.split('@')[0]}*\n\n`;
    visitMessage += `${rareza} *Waifu visitada:* ${targetWaifu.name}\n`;
    visitMessage += `📺 *Anime:* ${targetWaifu.anime}\n`;
    visitMessage += `⭐ *Nivel:* ${waifuLevel}\n`;
    visitMessage += `💕 *Afecto:* ${waifuStats.affection}/100\n`;
    visitMessage += `😊 *Felicidad:* ${waifuStats.happiness}/100\n\n`;
    visitMessage += `💝 *Puntos de amistad ganados:* +5\n`;
    visitMessage += `🎁 *La waifu se alegra de tu visita!*`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: targetWaifu.image_url[Math.floor(Math.random() * targetWaifu.image_url.length)] },
        caption: visitMessage,
        mentions: [userId, friendId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: visitMessage, 
        mentions: [userId, friendId] 
      }, { quoted: m });
    }
    
    socialLogger.success(`Visita de ${userId} a ${friendId} - waifu: ${targetWaifu.name}`);
    
  } catch (error) {
    socialLogger.error('Error al visitar amigo:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al visitar al amigo.'
    }, { quoted: m });
  }
}

/**
 * Envía un regalo a un amigo
 */
async function sendGift(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.regalar @usuario <tipo> [waifu]`\n' +
            '*Tipos:* ' + Object.keys(GIFT_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  const friendMention = args.find(arg => arg.startsWith('@'));
  if (!friendMention) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes mencionar a un usuario con @.'
    }, { quoted: m });
  }
  
  const friendId = `${friendMention.slice(1)}@s.whatsapp.net`;
  const giftType = args.find(arg => !arg.startsWith('@') && Object.keys(GIFT_DEFINITIONS).includes(arg));
  const waifuName = args.filter(arg => !arg.startsWith('@') && !Object.keys(GIFT_DEFINITIONS).includes(arg)).join(' ');
  
  if (!giftType) {
    return await sock.sendMessage(chatId, {
      text: `❌ Tipo de regalo no válido.\n\n` +
            '*Tipos disponibles:* ' + Object.keys(GIFT_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  try {
    // Verificar si son amigos
    const friendship = await db.get(
      'SELECT * FROM friendships WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    
    if (!friendship) {
      return await sock.sendMessage(chatId, {
        text: `❌ No eres amigo de @${friendId.split('@')[0]}.`,
        mentions: [friendId]
      }, { quoted: m });
    }
    
    // Verificar cooldown
    const lastGift = await db.get(
      'SELECT * FROM sent_gifts WHERE sender_id = ? AND receiver_id = ? ORDER BY sent_time DESC LIMIT 1',
      [userId, friendId]
    );
    
    if (lastGift) {
      const timeSince = Date.now() - new Date(lastGift.sent_time).getTime();
      if (timeSince < CONFIG.giftCooldown) {
        const remaining = Math.ceil((CONFIG.giftCooldown - timeSince) / 60000);
        return await sock.sendMessage(chatId, {
          text: `⏰ Debes esperar ${remaining} minutos antes de enviar otro regalo a @${friendId.split('@')[0]}.`,
          mentions: [friendId]
        }, { quoted: m });
      }
    }
    
    // Obtener waifus del amigo
    const friendWaifus = await getFriendWaifus(friendId);
    
    if (friendWaifus.length === 0) {
      return await sock.sendMessage(chatId, {
        text: `❌ @${friendId.split('@')[0]} no tiene waifus para recibir regalos.`,
        mentions: [friendId]
      }, { quoted: m });
    }
    
    // Seleccionar waifa para el regalo
    let targetWaifu;
    if (waifuName) {
      targetWaifu = friendWaifus.find(w => 
        w.name.toLowerCase().includes(waifuName.toLowerCase())
      );
      if (!targetWaifu) {
        return await sock.sendMessage(chatId, {
          text: `❌ @${friendId.split('@')[0]} no tiene una waifu llamada "${waifuName}".`,
          mentions: [friendId]
        }, { quoted: m });
      }
    } else {
      targetWaifu = friendWaifus[Math.floor(Math.random() * friendWaifus.length)];
    }
    
    const giftDef = GIFT_DEFINITIONS[giftType];
    
    // Aplicar efectos del regalo
    await applyGiftEffects(targetWaifu.id, friendId, giftDef.effect);
    
    // Registrar regalo
    await db.run(
      'INSERT INTO sent_gifts (sender_id, receiver_id, waifu_id, gift_type, sent_time) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [userId, friendId, targetWaifu.id, giftType]
    );
    
    // Actualizar puntos de amistad
    await updateFriendshipPoints(userId, friendId, 10);
    
    // Actualizar estadísticas
    await updateGiftStats(userId, friendId);
    
    const waifuStats = await getWaifuStats(targetWaifu.id, friendId);
    const rareza = getRarezaEmoji(targetWaifu.price);
    
    let giftMessage = `🎁 *REGALO ENVIADO* 🎁\n\n`;
    giftMessage += `👤 *@${userId.split('@')[0]}* ha enviado un regalo a *@${friendId.split('@')[0]}*\n\n`;
    giftMessage += `${giftDef.emoji} *Regalo:* ${giftDef.name}\n`;
    giftMessage += `${rareza} *Para:* ${targetWaifu.name}\n`;
    giftMessage += `📺 *Anime:* ${targetWaifu.anime}\n\n`;
    giftMessage += `✨ *Efectos del regalo:*\n`;
    
    Object.entries(giftDef.effect).forEach(([stat, value]) => {
      const statName = stat === 'affection' ? 'Afecto' : 'Felicidad';
      giftMessage += `• ${statName}: +${value}\n`;
    });
    
    giftMessage += `\n💝 *Puntos de amistad ganados:* +10\n`;
    giftMessage += `🎉 *@${friendId.split('@')[0]}* apreciará mucho tu regalo!`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: targetWaifu.image_url[Math.floor(Math.random() * targetWaifu.image_url.length)] },
        caption: giftMessage,
        mentions: [userId, friendId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: giftMessage, 
        mentions: [userId, friendId] 
      }, { quoted: m });
    }
    
    socialLogger.success(`Regalo enviado de ${userId} a ${friendId} - tipo: ${giftType}`);
    
  } catch (error) {
    socialLogger.error('Error al enviar regalo:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al enviar el regalo.'
    }, { quoted: m });
  }
}

/**
 * Crea una fiesta
 */
async function createParty(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const partyName = args.join(' ');
  
  if (!partyName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes darle un nombre a la fiesta.\n\n' +
            '💡 *Uso:* `.fiesta <nombre de la fiesta>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar cooldown
    const lastParty = await db.get(
      'SELECT * FROM parties WHERE host_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    if (lastParty) {
      const timeSince = Date.now() - new Date(lastParty.created_at).getTime();
      if (timeSince < CONFIG.partyCooldown) {
        const remaining = Math.ceil((CONFIG.partyCooldown - timeSince) / (60 * 60 * 1000));
        return await sock.sendMessage(chatId, {
          text: `⏰ Debes esperar ${remaining} horas antes de organizar otra fiesta.`
        }, { quoted: m });
      }
    }
    
    // Crear fiesta
    const partyId = await db.run(
      'INSERT INTO parties (host_id, name, max_participants, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [userId, partyName, CONFIG.maxPartySize]
    );
    
    let partyMessage = `🎉 *FIESTA CREADA* 🎉\n\n`;
    partyMessage += `👤 *Anfitrión:* @${userId.split('@')[0]}\n`;
    partyMessage += `🎊 *Nombre:* ${partyName}\n`;
    partyMessage += `🆔 *ID de fiesta:* ${partyId.lastID}\n`;
    partyMessage += `👥 *Capacidad:* ${CONFIG.maxPartySize} participantes\n`;
    partyMessage += `⏰ *Duración:* 24 horas\n\n`;
    partyMessage += `💡 *Para unirse:* \`.unirse_fiesta ${partyId.lastID}\`\n`;
    partyMessage += `🎁 *Beneficios:* Bonificaciones para todos los participantes`;
    
    await sock.sendMessage(chatId, { 
      text: partyMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    socialLogger.success(`Fiesta creada por ${userId} - ID: ${partyId.lastID}`);
    
  } catch (error) {
    socialLogger.error('Error al crear fiesta:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al crear la fiesta.'
    }, { quoted: m });
  }
}

/**
 * Se une a una fiesta
 */
async function joinParty(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const partyId = args[0];
  
  if (!partyId) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el ID de la fiesta.\n\n' +
            '💡 *Uso:* `.unirse_fiesta <id_fiesta>`'
    }, { quoted: m });
  }
  
  try {
    // Obtener información de la fiesta
    const party = await db.get(
      'SELECT * FROM parties WHERE id = ? AND created_at > datetime("now", "-24 hours")',
      [partyId]
    );
    
    if (!party) {
      return await sock.sendMessage(chatId, {
        text: `❌ No existe una fiesta activa con ID ${partyId}.`
      }, { quoted: m });
    }
    
    // Verificar si ya es participante
    const alreadyJoined = await db.get(
      'SELECT * FROM party_participants WHERE party_id = ? AND user_id = ?',
      [partyId, userId]
    );
    
    if (alreadyJoined) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya eres participante de la fiesta "${party.name}".`
      }, { quoted: m });
    }
    
    // Verificar capacidad
    const participants = await db.get(
      'SELECT COUNT(*) as count FROM party_participants WHERE party_id = ?',
      [partyId]
    );
    
    if (participants.count >= party.max_participants) {
      return await sock.sendMessage(chatId, {
        text: `❌ La fiesta "${party.name}" está llena.`
      }, { quoted: m });
    }
    
    // Unirse a la fiesta
    await db.run(
      'INSERT INTO party_participants (party_id, user_id, joined_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [partyId, userId]
    );
    
    let joinMessage = `🎉 *TE HAS UNIDO A LA FIESTA* 🎉\n\n`;
    joinMessage += `🎊 *Fiesta:* ${party.name}\n`;
    joinMessage += `👤 *Anfitrión:* @${party.host_id.split('@')[0]}\n`;
    joinMessage += `🆔 *ID:* ${partyId}\n`;
    joinMessage += `👥 *Participantes:* ${participants.count + 1}/${party.max_participants}\n\n`;
    joinMessage += `🎁 *Obtén bonificaciones especiales durante la fiesta!`;
    
    await sock.sendMessage(chatId, { 
      text: joinMessage, 
      mentions: [userId, party.host_id] 
    }, { quoted: m });
    
    socialLogger.success(`Usuario ${userId} se unió a la fiesta ${partyId}`);
    
  } catch (error) {
    socialLogger.error('Error al unirse a fiesta:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al unirse a la fiesta.'
    }, { quoted: m });
  }
}

/**
 * Muestra las relaciones de waifus
 */
async function showRelationships(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userWaifus = await getUserWaifus(userId);
    
    if (userWaifus.length === 0) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes waifus para ver relaciones.\n\n` +
              `💡 *Usa \`.waifus\` para obtener waifus`
      }, { quoted: m });
    }
    
    let relationshipsMessage = `💝 *RELACIONES DE WAIFUS* 💝\n\n`;
    relationshipsMessage += `👤 *@${userId.split('@')[0]}*\n\n`;
    
    for (const waifu of userWaifus) {
      const stats = await getWaifuStats(waifu.id, userId);
      const level = await getWaifuLevel(waifu.id, userId);
      const rareza = getRarezaEmoji(waifu.price);
      
      relationshipsMessage += `${rareza} *${waifu.name}*\n`;
      relationshipsMessage += `📺 ${waifu.anime}\n`;
      relationshipsMessage += `⭐ Nivel ${level}\n`;
      relationshipsMessage += `❤️ Afecto: ${stats.affection}/100 (${getRelationshipStatus(stats.affection)})\n`;
      relationshipsMessage += `😊 Felicidad: ${stats.happiness}/100 (${getRelationshipStatus(stats.happiness)})\n\n`;
    }
    
    relationshipsMessage += `💡 *Mejora las relaciones interactuando con tus waifus*\n`;
    relationshipsMessage += `🎯 *Usa \`.interact <waifu> <acción>\` para mejorar los vínculos`;
    
    await sock.sendMessage(chatId, { 
      text: relationshipsMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    socialLogger.error('Error al mostrar relaciones:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las relaciones.'
    }, { quoted: m });
  }
}

/**
 * Funciones auxiliares
 */
async function getUserFriends(userId) {
  try {
    const friends = await db.all(
      'SELECT f.*, u.username FROM friendships f LEFT JOIN users u ON f.friend_id = u.chatId WHERE f.user_id = ?',
      [userId]
    );
    return friends;
  } catch (error) {
    socialLogger.error('Error al obtener amigos:', error);
    return [];
  }
}

async function getFriendsCount(userId) {
  try {
    const result = await db.get(
      'SELECT COUNT(*) as count FROM friendships WHERE user_id = ?',
      [userId]
    );
    return result.count || 0;
  } catch (error) {
    socialLogger.error('Error al contar amigos:', error);
    return 0;
  }
}

async function getPendingRequests(userId) {
  try {
    const result = await db.get(
      'SELECT COUNT(*) as count FROM friend_requests WHERE receiver_id = ? AND status = "pending"',
      [userId]
    );
    return result.count || 0;
  } catch (error) {
    socialLogger.error('Error al obtener solicitudes pendientes:', error);
    return 0;
  }
}

async function getSocialStats(userId) {
  try {
    const stats = await db.get(
      'SELECT COUNT(DISTINCT id) as partiesHosted, COUNT(DISTINCT id) as giftsSent FROM parties p LEFT JOIN sent_gifts g ON p.host_id = g.sender_id WHERE p.host_id = ? OR g.sender_id = ?',
      [userId, userId]
    );
    return stats || { partiesHosted: 0, giftsSent: 0 };
  } catch (error) {
    socialLogger.error('Error al obtener estadísticas sociales:', error);
    return { partiesHosted: 0, giftsSent: 0 };
  }
}

function getRelationshipLevel(points) {
  for (const [level, required] of Object.entries(CONFIG.relationshipLevels)) {
    if (points >= required) {
      return level.replace('_', ' ').charAt(0).toUpperCase() + level.replace('_', ' ').slice(1);
    }
  }
  return 'Stranger';
}

function getRelationshipStatus(value) {
  if (value >= 80) return 'Excelente';
  if (value >= 60) return 'Muy bueno';
  if (value >= 40) return 'Bueno';
  if (value >= 20) return 'Regular';
  return 'Necesita mejorar';
}

async function updateFriendshipPoints(userId, friendId, points) {
  try {
    await db.run(
      'UPDATE friendships SET friendship_points = friendship_points + ?, last_interaction = CURRENT_TIMESTAMP WHERE user_id = ? AND friend_id = ?',
      [points, userId, friendId]
    );
    
    // También actualizar la relación inversa
    await db.run(
      'UPDATE friendships SET friendship_points = friendship_points + ?, last_interaction = CURRENT_TIMESTAMP WHERE user_id = ? AND friend_id = ?',
      [points, friendId, userId]
    );
  } catch (error) {
    socialLogger.error('Error al actualizar puntos de amistad:', error);
  }
}

async function getFriendWaifus(friendId) {
  try {
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [friendId]);
    const claimedIds = claimed.map(c => c.character_id);
    return characters.filter(c => claimedIds.includes(c.id));
  } catch (error) {
    socialLogger.error('Error al obtener waifus de amigo:', error);
    return [];
  }
}

async function getUserWaifus(userId) {
  try {
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    return characters.filter(c => claimedIds.includes(c.id));
  } catch (error) {
    socialLogger.error('Error al obtener waifus de usuario:', error);
    return [];
  }
}

async function applyGiftEffects(waifuId, userId, effects) {
  try {
    const updates = [];
    Object.entries(effects).forEach(([stat, value]) => {
      if (stat === 'affection') {
        updates.push(`affection = MIN(100, affection + ${value})`);
      } else if (stat === 'happiness') {
        updates.push(`happiness = MIN(100, happiness + ${value})`);
      }
    });
    
    if (updates.length > 0) {
      await db.run(
        `UPDATE waifu_levels SET ${updates.join(', ')} WHERE character_id = ? AND user_id = ?`,
        [waifuId, userId]
      );
    }
  } catch (error) {
    socialLogger.error('Error al aplicar efectos de regalo:', error);
  }
}

async function updateGiftStats(senderId, receiverId) {
  try {
    await db.run(
      'INSERT OR IGNORE INTO gift_stats (sender_id, receiver_id, gifts_sent, gifts_received) VALUES (?, ?, 0, 0)',
      [senderId, receiverId]
    );
    await db.run(
      'UPDATE gift_stats SET gifts_sent = gifts_sent + 1 WHERE sender_id = ? AND receiver_id = ?',
      [senderId, receiverId]
    );
    await db.run(
      'INSERT OR IGNORE INTO gift_stats (sender_id, receiver_id, gifts_sent, gifts_received) VALUES (?, ?, 0, 0)',
      [receiverId, senderId]
    );
    await db.run(
      'UPDATE gift_stats SET gifts_received = gifts_received + 1 WHERE sender_id = ? AND receiver_id = ?',
      [receiverId, senderId]
    );
  } catch (error) {
    socialLogger.error('Error al actualizar estadísticas de regalos:', error);
  }
}

// Inicializar tablas sociales
async function initializeSocialTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS friendships (
        user_id TEXT,
        friend_id TEXT,
        friendship_points INTEGER DEFAULT 0,
        message_count INTEGER DEFAULT 0,
        last_interaction DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, friend_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT,
        receiver_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS friend_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_id TEXT,
        visited_id TEXT,
        waifu_id INTEGER,
        visit_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS sent_gifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT,
        receiver_id TEXT,
        waifu_id INTEGER,
        gift_type TEXT,
        sent_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS parties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id TEXT,
        name TEXT,
        max_participants INTEGER DEFAULT 10,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS party_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        party_id INTEGER,
        user_id TEXT,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(party_id, user_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS gift_stats (
        sender_id TEXT,
        receiver_id TEXT,
        gifts_sent INTEGER DEFAULT 0,
        gifts_received INTEGER DEFAULT 0,
        PRIMARY KEY (sender_id, receiver_id)
      )
    `);
    
    socialLogger.success('Tablas sociales inicializadas');
  } catch (error) {
    socialLogger.error('Error al inicializar tablas sociales:', error);
  }
}

// Exportar configuración y funciones necesarias
export const command = ['.amigos', '.agregar_amigo', '.visitar', '.regalar', '.fiesta', '.unirse_fiesta', '.relaciones', '.social'];
export const alias = ['.friends', '.add_friend', '.visit', '.gift', '.party', '.join_party', '.relationships', '.social_menu'];
export const description = 'Sistema de relaciones sociales entre usuarios y waifus';

// Inicializar sistema al iniciar
(async () => {
  try {
    // Asegurar que las tablas existan
    await initializeSocialTables();
    // Cargar personajes
    await loadCharacters();
    socialLogger.success('Sistema social waifu inicializado correctamente');
  } catch (error) {
    socialLogger.error('Error inicializando sistema social waifu:', error);
  }
})();

export { CONFIG, socialLogger, RELATIONSHIP_TYPES, GIFT_TYPES, GIFT_DEFINITIONS };
