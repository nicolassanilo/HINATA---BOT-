/**
 * @file Plugin Waifu Collection - Sistema de colección y gestión de waifus
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de colección, venta y gestión de waifus separado del plugin principal
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
  getRarezaTexto,
  getUserBalance,
  updateUserBalance,
  getUserWaifus,
  validateUserWaifu,
  logger
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  sellPriceMultiplier: 0.5, // 50% del precio original
  minSellPrice: 100,
  maxCollectionDisplay: 20,
  collectionPerPage: 10
};

// Sistema de logging
const logger = {
  info: (message) => CONFIG.enableLogging && console.log(`[COLLECTION] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[COLLECTION] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[COLLECTION] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[COLLECTION] ❌ ${message}`),
  debug: (message) => CONFIG.enableLogging && console.log(`[COLLECTION] 🔍 ${message}`)
};

/**
 * Sistema de colección de waifus
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.mywaifus':
        await showMyWaifus(sock, m, userId);
        break;
      case '.vender':
        await sellWaifu(sock, m, userId, text);
        break;
      case '.coleccion':
        await showCollectionStats(sock, m, userId);
        break;
      case '.waifuinfo':
        await showWaifuInfo(sock, m, text);
        break;
      case '.waifus':
        await listWaifus(sock, m, text);
        break;
      case '.claim':
        await claimWaifu(sock, m, userId, text);
        break;
      default:
        logger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    logger.error('Error en el sistema de colección:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de colección. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Muestra las waifus del usuario
 */
async function showMyWaifus(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    const myCharacters = characters.filter(c => claimedIds.includes(c.id));
    
    if (myCharacters.length === 0) {
      return await sock.sendMessage(chatId, {
        text: `📦 *No tienes waifus en tu colección*\n\n` +
              `💡 *Usa \`.waifus\` para ver disponibles\n` +
              `🛍️ *Usa \`.tienda waifu\` para comprar\n` +
              `🎯 *Usa \`.claim <nombre>\` para reclamar gratuitas`
      }, { quoted: m });
    }
    
    let list = `💖 *TU COLECCIÓN DE WAIFUS* 💖\n\n`;
    list += `👤 *@${userId.split('@')[0]}*\n`;
    list += `📊 *Total de waifus:* ${myCharacters.length}\n\n`;
    
    // Ordenar por precio (más caras primero)
    myCharacters.sort((a, b) => b.price - a.price);
    
    for (const char of myCharacters) {
      const level = await getWaifuLevel(char.id, userId);
      const stats = await getWaifuStats(char.id, userId);
      const rareza = getRarezaEmoji(char.price);
      
      list += `${rareza} *${char.name}*\n`;
      list += `   📺 ${char.anime}\n`;
      list += `   💎 ${char.price.toLocaleString()} puntos\n`;
      list += `   ⭐ Nivel ${level}\n`;
      list += `   ❤️ Afecto: ${stats.affection}/100 | 😊 Felicidad: ${stats.happiness}/100 | 🍖 Hambre: ${stats.hunger}/100\n\n`;
    }
    
    list += `💡 *Comandos disponibles:*\n`;
    list += `• \`.waifuinfo <nombre>\` - Info detallada\n`;
    list += `• \`.vender <nombre>\` - Vender waifu\n`;
    list += `• \`.coleccion\` - Estadísticas de colección\n`;
    list += `• \`.interact <nombre> <acción>\` - Interactuar\n`;
    list += `• \`.evolucion <nombre>\` - Ver evolución`;
    
    await sock.sendMessage(chatId, { text: list, mentions: [userId] }, { quoted: m });
    
  } catch (error) {
    logger.error('Error al mostrar waifus del usuario:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar tu colección. Intenta nuevamente.'
    }, { quoted: m });
  }
}

/**
 * Vende una waifu
 */
async function sellWaifu(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar qué waifu quieres vender.\n\n' +
            '💡 *Ejemplo:* `.vender Hinata Hyuga`\n\n' +
            '⚠️ *Recibirás el 50% del precio original*'
    }, { quoted: m });
  }
  
  // Verificar si el usuario tiene esta waifu
  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
  const claimedIds = claimed.map(c => c.character_id);
  
  const character = characters.find(c => 
    claimedIds.includes(c.id) &&
    c.name.toLowerCase().includes(waifuName.toLowerCase())
  );
  
  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No tienes a *${waifuName}* en tu colección.\n\n` +
            'Usa `.mywaifus` para ver tus waifus.'
    }, { quoted: m });
  }
  
  // Calcular precio de venta
  const sellPrice = Math.max(CONFIG.minSellPrice, Math.floor(character.price * CONFIG.sellPriceMultiplier));
  
  // Obtener saldo actual
  const currentBalance = await db.get('SELECT saldo FROM usuarios WHERE chatId = ?', [userId]);
  const newBalance = (currentBalance?.saldo || 0) + sellPrice;
  
  // Realizar la venta
  try {
    await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
    await db.run('DELETE FROM claimed_characters WHERE character_id = ? AND user_id = ?', [character.id, userId]);
    await db.run('DELETE FROM waifu_levels WHERE character_id = ? AND user_id = ?', [character.id, userId]);
    
    const rareza = getRarezaEmoji(character.price);
    await sock.sendMessage(chatId, {
      text: `💸 *WAIFU VENDIDA* 💸\n\n` +
            `${rareza} *${character.name}* (${character.anime})\n` +
            `💰 *Precio de venta:* ${sellPrice.toLocaleString()} 💎\n` +
            `💵 *Tu saldo actual:* ${newBalance.toLocaleString()} 💎\n\n` +
            `⚠️ *Esta waifu ha sido eliminada de tu colección*\n` +
            `💡 *Usa \`.mywaifus\` para ver tu colección actualizada*`,
      mentions: [userId]
    }, { quoted: m });
    
    logger.success(`Waifu ${character.name} vendida por usuario ${userId} por ${sellPrice} 💎`);
    
  } catch (error) {
    logger.error('Error al vender waifu:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al procesar la venta. Intenta nuevamente.'
    }, { quoted: m });
  }
}

/**
 * Muestra estadísticas de la colección del usuario
 */
async function showCollectionStats(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    const myCharacters = characters.filter(c => claimedIds.includes(c.id));
    
    if (myCharacters.length === 0) {
      return await sock.sendMessage(chatId, {
        text: `📊 *No tienes estadísticas de colección*\n\n` +
              `💡 *Adquiere waifus para ver tus estadísticas*`
      }, { quoted: m });
    }
    
    // Calcular estadísticas
    const totalValue = myCharacters.reduce((sum, char) => sum + char.price, 0);
    const averageLevel = await calculateAverageLevel(claimedIds, userId);
    const rarityDistribution = calculateRarityDistribution(myCharacters);
    const animeDistribution = calculateAnimeDistribution(myCharacters);
    
    let stats = `📊 *ESTADÍSTICAS DE COLECCIÓN* 📊\n\n`;
    stats += `👤 *@${userId.split('@')[0]}*\n\n`;
    
    stats += `📈 *Resumen General:*\n`;
    stats += `• Total de waifus: ${myCharacters.length}\n`;
    stats += `• Valor total: ${totalValue.toLocaleString()} 💎\n`;
    stats += `• Nivel promedio: ${averageLevel.toFixed(1)}⭐\n`;
    stats += `• Valor promedio: ${Math.floor(totalValue / myCharacters.length).toLocaleString()} 💎\n\n`;
    
    stats += `🎨 *Distribución por Rareza:*\n`;
    Object.entries(rarityDistribution).forEach(([rarity, count]) => {
      const emoji = getRarezaEmoji(getPriceFromRarity(rarity));
      stats += `• ${emoji} ${rarity}: ${count}\n`;
    });
    
    stats += `\n🎬 *Top Animes:*\n`;
    animeDistribution.slice(0, 3).forEach(([anime, count]) => {
      stats += `• ${anime}: ${count} waifus\n`;
    });
    
    // Top 3 waifus más valiosas
    const top3 = myCharacters.sort((a, b) => b.price - a.price).slice(0, 3);
    if (top3.length > 0) {
      stats += `\n🏆 *TOP 3 WAIFUS MÁS VALIOSAS*\n`;
      top3.forEach((char, index) => {
        const emoji = ['🥇', '🥈', '🥉'][index];
        const rareza = getRarezaEmoji(char.price);
        stats += `${emoji} ${rareza} ${char.name} (${char.price.toLocaleString()} 💎)\n`;
      });
    }
    
    await sock.sendMessage(chatId, { text: stats, mentions: [userId] }, { quoted: m });
    
  } catch (error) {
    logger.error('Error al mostrar estadísticas de colección:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar estadísticas. Intenta nuevamente.'
    }, { quoted: m });
  }
}

/**
 * Muestra información detallada de una waifu
 */
async function showWaifuInfo(sock, m, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Ejemplo:* `.waifuinfo Hinata Hyuga`'
    }, { quoted: m });
  }
  
  const character = characters.find(c => 
    c.name.toLowerCase().includes(waifuName.toLowerCase())
  );
  
  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No se encontró la waifu "${waifuName}"\n\n` +
            '💡 *Usa \`.waifus\` para ver todas las disponibles*'
    }, { quoted: m });
  }
  
  // Verificar si está reclamado
  const isClaimed = await db.get('SELECT user_id FROM claimed_characters WHERE character_id = ?', [character.id]);
  
  const rareza = getRarezaEmoji(character.price);
  const rarezaTexto = getRarezaTexto(character.price);
  
  let info = `📋 *INFORMACIÓN DEL PERSONAJE* 📋\n\n`;
  info += `${rareza} *${character.name}*\n`;
  info += `📺 *Anime:* ${character.anime}\n`;
  info += `💎 *Precio:* ${character.price.toLocaleString()} 💎\n`;
  info += `🏷️ *Rareza:* ${rarezaTexto}\n`;
  info += `📊 *Estado:* ${isClaimed ? `❌ Reclamada por @${isClaimed.user_id.split('@')[0]}` : '✅ Disponible'}\n\n`;
  
  info += `🖼️ *Imágenes:*\n`;
  character.image_url.forEach((url, index) => {
    info += `• Imagen ${index + 1}: ${url}\n`;
  });
  
  info += `\n💡 *Comandos disponibles:*\n`;
  if (isClaimed) {
    info += `• \`.waifuinfo ${character.name}\` - Ver esta info\n`;
    info += `• \`.evolucion ${character.name}\` - Ver evolución (si es tuya)\n`;
    info += `• \`.interact ${character.name} <acción>\` - Interactuar (si es tuya)\n`;
  } else {
    info += `• \`.claim ${character.name}\` - Reclamar esta waifu\n`;
    info += `• \`.comprar ${character.name}\` - Comprar esta waifu\n`;
  }
  
  try {
    await sock.sendMessage(chatId, {
      image: { url: character.image_url[0] },
      caption: info,
      mentions: isClaimed ? [isClaimed.user_id] : []
    }, { quoted: m });
  } catch (imageError) {
    logger.error('Error al enviar imagen:', imageError);
    await sock.sendMessage(chatId, { text: info }, { quoted: m });
  }
}

/**
 * Lista todos los personajes disponibles
 */
async function listWaifus(sock, m, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  // Parsear página y filtros
  let page = 1;
  let filtro = '';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--page=') || arg.startsWith('-p=')) {
      page = parseInt(arg.split('=')[1]) || 1;
    } else if (!filtro) {
      filtro = arg.toLowerCase();
    }
  }

  // Obtener personajes reclamados
  const claimed = await db.all('SELECT character_id, user_id FROM claimed_characters');
  const claimedIds = claimed.map(c => c.character_id);
  const claimedMap = Object.fromEntries(claimed.map(c => [c.character_id, c.user_id]));

  // Filtrar personajes según argumentos
  let filteredCharacters = characters;
  let filtroTexto = '';

  if (filtro) {
    if (filtro === 'disponibles' || filtro === 'available') {
      filteredCharacters = characters.filter(c => !claimedIds.includes(c.id));
      filtroTexto = ' (Disponibles)';
    } else if (filtro === 'reclamados' || filtro === 'claimed') {
      filteredCharacters = characters.filter(c => claimedIds.includes(c.id));
      filtroTexto = ' (Reclamados)';
    } else {
      // Buscar por nombre o anime
      filteredCharacters = characters.filter(c =>
        c.name.toLowerCase().includes(filtro) ||
        c.anime.toLowerCase().includes(filtro)
      );
      filtroTexto = ` (Búsqueda: "${filtro}")`;
    }
  }

  // Ordenar por precio (más caros primero)
  filteredCharacters.sort((a, b) => b.price - a.price);

  // Sistema de paginación
  const personajesPorPagina = CONFIG.collectionPerPage;
  const totalPaginas = Math.ceil(filteredCharacters.length / personajesPorPagina);
  page = Math.max(1, Math.min(page, totalPaginas));
  
  const startIndex = (page - 1) * personajesPorPagina;
  const endIndex = startIndex + personajesPorPagina;
  const personajesMostrar = filteredCharacters.slice(startIndex, endIndex);

  let list = `🌟 *LISTA DE PERSONAJES${filtroTexto}* 🌟\n\n`;
  list += `📊 *Página ${page} de ${totalPaginas}* (${filteredCharacters.length} totales)\n\n`;

  for (const char of personajesMostrar) {
    const isClaimed = claimedIds.includes(char.id);
    const status = isClaimed ? `❌ Reclamado` : '✅ Disponible';
    const rareza = getRarezaEmoji(char.price);
    let nivel = 1;
    
    if (isClaimed) {
      const ownerId = claimedMap[char.id];
      nivel = await getWaifuLevel(char.id, ownerId);
    }

    list += `${rareza} *${char.name}*\n`;
    list += `📺 ${char.anime}\n`;
    list += `💎 ${char.price.toLocaleString()} puntos\n`;
    list += `⭐ Nivel ${nivel}\n`;
    list += `📋 ${status}\n\n`;
  }

  list += `💡 *Comandos disponibles:*\n`;
  list += `• \`.waifus\` - Ver todos\n`;
  list += `• \`.waifus disponibles\` - Solo disponibles\n`;
  list += `• \`.waifus <nombre/anime>\` - Buscar\n`;
  list += `• \`.waifus --page=2\` - Cambiar página\n`;
  list += `• \`.claim <nombre>\` - Reclamar\n`;
  list += `• \`.waifuinfo <nombre>\` - Info detallada\n`;

  // Navegación de páginas
  if (totalPaginas > 1) {
    list += `\n📄 *Navegación:* \n`;
    if (page > 1) list += `• \`.waifus --page=${page - 1}\` ← Anterior\n`;
    if (page < totalPaginas) list += `• \`.waifus --page=${page + 1}\` Siguiente →\n`;
  }

  await sock.sendMessage(chatId, { text: list, mentions: Object.values(claimedMap) }, { quoted: m });
}

/**
 * Reclama una waifu gratuita
 */
async function claimWaifu(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar qué waifu quieres reclamar.\n\n' +
            '💡 *Ejemplo:* `.claim Hinata Hyuga`\n\n' +
            '🎯 *Solo puedes reclamar waifus gratuitas*'
    }, { quoted: m });
  }
  
  const character = characters.find(c => 
    c.name.toLowerCase().includes(waifuName.toLowerCase())
  );
  
  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No se encontró la waifu "${waifuName}"\n\n` +
            '💡 *Usa \`.waifus disponibles\` para ver las gratuitas*'
    }, { quoted: m });
  }
  
  // Verificar si ya la tiene
  const alreadyOwned = await db.get(
    'SELECT character_id FROM claimed_characters WHERE user_id = ? AND character_id = ?',
    [userId, character.id]
  );
  
  if (alreadyOwned) {
    return await sock.sendMessage(chatId, {
      text: `❌ Ya tienes a *${character.name}* en tu colección.\n\n` +
            '💡 *Usa \`.mywaifus\` para ver tu colección.*'
    }, { quoted: m });
  }
  
  // Verificar si está disponible (no reclamada por otro)
  const isClaimed = await db.get(
    'SELECT user_id FROM claimed_characters WHERE character_id = ?',
    [character.id]
  );
  
  if (isClaimed) {
    return await sock.sendMessage(chatId, {
      text: `❌ *${character.name}* ya está reclamada por @${isClaimed.user_id.split('@')[0]}\n\n` +
            '💡 *Usa \`.waifus disponibles\` para ver las gratuitas*',
      mentions: [isClaimed.user_id]
    }, { quoted: m });
  }
  
  // Reclamar la waifu
  try {
    await db.run('INSERT INTO claimed_characters (character_id, user_id) VALUES (?, ?)', [character.id, userId]);
    
    const rareza = getRarezaEmoji(character.price);
    const caption = `🎉 *¡WAIFU RECLAMADA!* 🎉\n\n` +
                    `${rareza} *${character.name}*\n` +
                    `📺 *Anime:* ${character.anime}\n` +
                    `💎 *Precio:* ${character.price.toLocaleString()} 💎\n` +
                    `💖 ¡Ahora es tuya, @${userId.split('@')[0]}!\n\n` +
                    `💡 *Usa \`.mywaifus\` para ver tu colección*`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: caption,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      logger.error('Error al enviar imagen:', imageError);
      await sock.sendMessage(chatId, { text: caption, mentions: [userId] }, { quoted: m });
    }
    
    logger.success(`Waifu ${character.name} reclamada por usuario ${userId}`);
    
  } catch (error) {
    logger.error('Error al reclamar waifu:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al reclamar la waifu. Intenta nuevamente.'
    }, { quoted: m });
  }
}

// Funciones auxiliares
async function calculateAverageLevel(claimedIds, userId) {
  let totalLevel = 0;
  let count = 0;
  
  for (const characterId of claimedIds) {
    const level = await getWaifuLevel(characterId, userId);
    totalLevel += level;
    count++;
  }
  
  return count > 0 ? totalLevel / count : 0;
}

function calculateRarityDistribution(myCharacters) {
  const distribution = {};
  
  myCharacters.forEach(char => {
    const rarity = getRarezaTexto(char.price);
    distribution[rarity] = (distribution[rarity] || 0) + 1;
  });
  
  return distribution;
}

function calculateAnimeDistribution(myCharacters) {
  const distribution = {};
  
  myCharacters.forEach(char => {
    distribution[char.anime] = (distribution[char.anime] || 0) + 1;
  });
  
  return Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function getPriceFromRarity(rarity) {
  const rarityPrices = {
    'Común': 500,
    'Común Plus': 3500,
    'Poco Común': 7500,
    'Raro': 12500,
    'Super Raro': 17500,
    'Épico': 25000,
    'Épico Legendario': 40000,
    'Legendario': 75000,
    'Mítico': 150000
  };
  
  return rarityPrices[rarity] || 1000;
}

// Exportar configuración y funciones necesarias
export const command = ['.mywaifus', '.vender', '.coleccion', '.waifuinfo', '.waifus', '.claim'];
export const alias = ['.miswaifus', '.venderwaifu', '.colección', '.info', '.personajes', '.reclamar'];
export const description = 'Sistema de colección y gestión de waifus';

// Cargar personajes al iniciar
loadCharacters();

export { CONFIG, logger };
