/**
 * @file Plugin Waifu Mejorado - Sistema completo de colección de personajes
 * @version 2.0.0
 * @author Mejorado para HINATA-BOT
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Cargar personajes desde el archivo JSON
let characters = [];
async function loadCharacters() {
  try {
    const data = await fs.readFile('./characters.json', 'utf8');
    characters = JSON.parse(data);
  } catch (error) {
    console.error('Error al cargar characters.json:', error);
  }
}
loadCharacters();

export const command = ['.claim', '.waifus', '.mywaifus', '.vender', '.waifuinfo', '.coleccion'];
export const description = 'Sistema completo de colección de personajes de anime.';

/**
 * Función principal que maneja todos los comandos de waifu
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.waifus':
        await listWaifus(sock, m);
        break;
      case '.claim':
        await claimWaifu(sock, m, userId, text);
        break;
      case '.mywaifus':
        await showMyWaifus(sock, m, userId);
        break;
      case '.vender':
        await sellWaifu(sock, m, userId, text);
        break;
      case '.waifuinfo':
        await showWaifuInfo(sock, m, text);
        break;
      case '.coleccion':
        await showCollectionStats(sock, m, userId);
        break;
    }
  } catch (error) {
    console.error(`Error en el comando ${command}:`, error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error al procesar tu solicitud de waifu.'
    }, { quoted: m });
  }
}

/**
 * Lista todos los personajes disponibles con filtros mejorados
 */
async function listWaifus(sock, m) {
  const chatId = m.key.remoteJid;
  const args = (m.text || '').split(' ').slice(1); // Obtener argumentos después del comando

  // Obtener personajes reclamados
  const claimed = await db.all('SELECT character_id, user_id FROM claimed_characters');
  const claimedIds = claimed.map(c => c.character_id);
  const claimedMap = Object.fromEntries(claimed.map(c => [c.character_id, c.user_id]));

  // Filtrar personajes según argumentos
  let filteredCharacters = characters;
  let filtroTexto = '';

  if (args.length > 0) {
    const filtro = args.join(' ').toLowerCase();
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
      filtroTexto = ` (Búsqueda: "${args.join(' ')}")`;
    }
  }

  // Ordenar por precio (más caros primero)
  filteredCharacters.sort((a, b) => b.price - a.price);

  // Crear mensaje paginado (máximo 15 personajes por mensaje)
  const personajesPorPagina = 15;
  const totalPaginas = Math.ceil(filteredCharacters.length / personajesPorPagina);
  const paginaActual = 1; // Por ahora solo primera página

  const personajesMostrar = filteredCharacters.slice(0, personajesPorPagina);

  let list = `🌟 *LISTA DE PERSONAJES${filtroTexto}* 🌟\n\n`;
  list += `📊 *Mostrando ${personajesMostrar.length} de ${filteredCharacters.length} personajes*\n\n`;

  for (const char of personajesMostrar) {
    const isClaimed = claimedIds.includes(char.id);
    const status = isClaimed ? `❌ Reclamado` : '✅ Disponible';
    const rareza = getRarezaEmoji(char.price);

    list += `${rareza} *${char.name}*\n`;
    list += `📺 ${char.anime}\n`;
    list += `💎 ${char.price.toLocaleString()} puntos\n`;
    list += `📋 ${status}\n\n`;
  }

  list += `💡 *Comandos disponibles:*\n`;
  list += `• \`.waifus\` - Ver todos\n`;
  list += `• \`.waifus disponibles\` - Solo disponibles\n`;
  list += `• \`.waifus <nombre/anime>\` - Buscar\n`;
  list += `• \`.claim <nombre>\` - Reclamar\n`;
  list += `• \`.waifuinfo <nombre>\` - Info detallada\n`;

  if (totalPaginas > 1) {
    list += `\n📄 *Página 1 de ${totalPaginas}*`;
  }

  await sock.sendMessage(chatId, { text: list, mentions: Object.values(claimedMap) }, { quoted: m });
}

/**
 * Reclama un personaje con mejor validación y feedback
 */
async function claimWaifu(sock, m, userId, characterName) {
  const chatId = m.key.remoteJid;

  if (!characterName || characterName.trim().length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre del personaje que quieres reclamar.\n\n' +
            '💡 *Ejemplos:*\n' +
            '• `.claim Hinata Hyuga`\n' +
            '• `.claim Naruto Uzumaki`\n\n' +
            'Usa `.waifus` para ver personajes disponibles.'
    }, { quoted: m });
  }

  // Buscar personaje (búsqueda flexible)
  const character = characters.find(c =>
    c.name.toLowerCase().includes(characterName.toLowerCase()) ||
    characterName.toLowerCase().includes(c.name.toLowerCase())
  );

  if (!character) {
    // Sugerir personajes similares
    const sugerencias = characters
      .filter(c => c.name.toLowerCase().includes(characterName.toLowerCase().split(' ')[0]))
      .slice(0, 3);

    let mensajeError = `❌ El personaje "${characterName}" no existe en la lista.\n\n`;

    if (sugerencias.length > 0) {
      mensajeError += `💡 *Sugerencias:*\n`;
      sugerencias.forEach(c => {
        mensajeError += `• ${c.name} (${c.anime})\n`;
      });
    }

    mensajeError += `\nUsa \`.waifus\` para ver todos los personajes disponibles.`;
    return await sock.sendMessage(chatId, { text: mensajeError }, { quoted: m });
  }

  // Verificar si ya está reclamado
  const isClaimed = await db.get('SELECT * FROM claimed_characters WHERE character_id = ?', [character.id]);
  if (isClaimed) {
    const ownerId = isClaimed.user_id;
    return await sock.sendMessage(chatId, {
      text: `❌ Lo siento, *${character.name}* ya ha sido reclamada por @${ownerId.split('@')[0]}.\n\n` +
            `💡 Usa \`.waifus disponibles\` para ver personajes libres.`,
      mentions: [ownerId]
    }, { quoted: m });
  }

  // Verificar saldo del usuario
  let user = await db.get('SELECT saldo FROM usuarios WHERE chatId = ?', [userId]);
  if (!user) {
    await db.run('INSERT INTO usuarios (chatId, saldo) VALUES (?, ?)', [userId, 100]);
    user = { saldo: 100 };
  }

  if (user.saldo < character.price) {
    const faltante = character.price - user.saldo;
    return await sock.sendMessage(chatId, {
      text: `❌ No tienes suficientes 💎 para reclamar a *${character.name}*.\n\n` +
            `💰 *Necesitas:* ${character.price.toLocaleString()} puntos\n` +
            `💵 *Tienes:* ${user.saldo.toLocaleString()} puntos\n` +
            `⚠️ *Faltan:* ${faltante.toLocaleString()} puntos\n\n` +
            `💡 Gana puntos jugando (.juegos) o apostando (.apostar).`
    }, { quoted: m });
  }

  // Realizar la transacción
  const newBalance = user.saldo - character.price;
  await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
  await db.run('INSERT INTO claimed_characters (character_id, user_id) VALUES (?, ?)', [character.id, userId]);

  // Mensaje de éxito con imagen
  const rareza = getRarezaEmoji(character.price);
  const caption = `🎉 *¡WAIFU RECLAMADA!* 🎉\n\n` +
                  `${rareza} *${character.name}*\n` +
                  `📺 *Anime:* ${character.anime}\n` +
                  `💎 *Pagaste:* ${character.price.toLocaleString()} puntos\n` +
                  `💵 *Saldo restante:* ${newBalance.toLocaleString()} puntos\n\n` +
                  `💖 ¡Disfruta de tu nueva waifu, @${userId.split('@')[0]}!`;

  try {
    await sock.sendMessage(chatId, {
      image: { url: character.image_url },
      caption: caption,
      mentions: [userId]
    }, { quoted: m });
  } catch (imageError) {
    // Si falla la imagen, enviar solo texto
    console.error('Error al enviar imagen:', imageError);
    await sock.sendMessage(chatId, { text: caption, mentions: [userId] }, { quoted: m });
  }
}

/**
 * Muestra los personajes del usuario con estadísticas
 */
async function showMyWaifus(sock, m, userId) {
  const chatId = m.key.remoteJid;

  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);

  if (claimed.length === 0) {
    return await sock.sendMessage(chatId, {
      text: '😔 Aún no has reclamado ningún personaje.\n\n' +
            '💡 *Cómo empezar:*\n' +
            '1. Usa `.waifus` para ver personajes disponibles\n' +
            '2. Usa `.claim <nombre>` para reclamar uno\n' +
            '3. ¡Gana puntos jugando para poder comprar!'
    }, { quoted: m });
  }

  const claimedIds = claimed.map(c => c.character_id);
  const myCharacters = characters.filter(c => claimedIds.includes(c.id));

  // Ordenar por precio (más valiosos primero)
  myCharacters.sort((a, b) => b.price - a.price);

  let totalValue = 0;
  let list = `💖 *TU COLECCIÓN DE WAIFUS* 💖\n\n`;
  list += `👤 *@${userId.split('@')[0]}*\n`;
  list += `📊 *Total de waifus:* ${myCharacters.length}\n\n`;

  for (const char of myCharacters) {
    const rareza = getRarezaEmoji(char.price);
    list += `${rareza} *${char.name}*\n`;
    list += `   📺 ${char.anime}\n`;
    list += `   💎 ${char.price.toLocaleString()} puntos\n\n`;
    totalValue += char.price;
  }

  list += `💰 *Valor total de colección:* ${totalValue.toLocaleString()} 💎\n\n`;
  list += `💡 *Comandos útiles:*\n`;
  list += `• \`.vender <nombre>\` - Vender waifu\n`;
  list += `• \`.waifuinfo <nombre>\` - Ver detalles\n`;
  list += `• \`.coleccion\` - Estadísticas completas`;

  await sock.sendMessage(chatId, { text: list, mentions: [userId] }, { quoted: m });
}

/**
 * Vende un personaje por la mitad de su valor
 */
async function sellWaifu(sock, m, userId, characterName) {
  const chatId = m.key.remoteJid;

  if (!characterName || characterName.trim().length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre del personaje que quieres vender.\n\n' +
            '💡 *Ejemplo:* `.vender Hinata Hyuga`\n\n' +
            'Usa `.mywaifus` para ver tus personajes.'
    }, { quoted: m });
  }

  // Buscar personaje en la colección del usuario
  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
  const claimedIds = claimed.map(c => c.character_id);

  const character = characters.find(c =>
    claimedIds.includes(c.id) &&
    c.name.toLowerCase().includes(characterName.toLowerCase())
  );

  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No tienes a *${characterName}* en tu colección.\n\n` +
            'Usa `.mywaifus` para ver tus personajes disponibles para venta.'
    }, { quoted: m });
  }

  // Calcular precio de venta (50% del valor original)
  const precioVenta = Math.floor(character.price * 0.5);

  // Actualizar saldo y remover personaje
  let user = await db.get('SELECT saldo FROM usuarios WHERE chatId = ?', [userId]);
  const newBalance = (user?.saldo || 0) + precioVenta;

  await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
  await db.run('DELETE FROM claimed_characters WHERE character_id = ? AND user_id = ?', [character.id, userId]);

  const rareza = getRarezaEmoji(character.price);
  await sock.sendMessage(chatId, {
    text: `💸 *WAIFU VENDIDA* 💸\n\n` +
          `${rareza} *${character.name}* (${character.anime})\n` +
          `💰 *Valor de venta:* ${precioVenta.toLocaleString()} puntos\n` +
          `💵 *Nuevo saldo:* ${newBalance.toLocaleString()} puntos\n\n` +
          `😢 ¡Adiós ${character.name}!`
  }, { quoted: m });
}

/**
 * Muestra información detallada de un personaje
 */
async function showWaifuInfo(sock, m, characterName) {
  const chatId = m.key.remoteJid;

  if (!characterName || characterName.trim().length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre del personaje.\n\n' +
            '💡 *Ejemplo:* `.waifuinfo Hinata Hyuga`'
    }, { quoted: m });
  }

  const character = characters.find(c =>
    c.name.toLowerCase().includes(characterName.toLowerCase())
  );

  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No se encontró información sobre "${characterName}".\n\n` +
            'Usa `.waifus` para ver personajes disponibles.'
    }, { quoted: m });
  }

  // Verificar si está reclamado
  const isClaimed = await db.get('SELECT user_id FROM claimed_characters WHERE character_id = ?', [character.id]);

  const rareza = getRarezaEmoji(character.price);
  const rarezaTexto = getRarezaTexto(character.price);

  let info = `📋 *INFORMACIÓN DEL PERSONAJE* 📋\n\n`;
  info += `${rareza} *${character.name}*\n`;
  info += `📺 *Anime:* ${character.anime}\n`;
  info += `💎 *Valor:* ${character.price.toLocaleString()} puntos\n`;
  info += `⭐ *Rareza:* ${rarezaTexto}\n`;
  info += `📊 *Estado:* ${isClaimed ? '❌ Reclamado' : '✅ Disponible'}\n`;

  if (isClaimed) {
    info += `👤 *Dueño:* @${isClaimed.user_id.split('@')[0]}\n`;
  }

  info += `\n💡 *Comandos relacionados:*\n`;
  if (!isClaimed) {
    info += `• \`.claim ${character.name}\` - Reclamar\n`;
  }
  info += `• \`.waifus ${character.anime}\` - Más de este anime`;

  try {
    await sock.sendMessage(chatId, {
      image: { url: character.image_url },
      caption: info,
      mentions: isClaimed ? [isClaimed.user_id] : []
    }, { quoted: m });
  } catch (imageError) {
    // Si falla la imagen, enviar solo texto
    console.error('Error al enviar imagen:', imageError);
    await sock.sendMessage(chatId, { text: info, mentions: isClaimed ? [isClaimed.user_id] : [] }, { quoted: m });
  }
}

/**
 * Muestra estadísticas completas de la colección
 */
async function showCollectionStats(sock, m, userId) {
  const chatId = m.key.remoteJid;

  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);

  if (claimed.length === 0) {
    return await sock.sendMessage(chatId, {
      text: '📊 *ESTADÍSTICAS DE COLECCIÓN* 📊\n\n' +
            '😔 Aún no has reclamado ningún personaje.\n\n' +
            '💡 ¡Comienza tu colección con `.waifus`!'
    }, { quoted: m });
  }

  const claimedIds = claimed.map(c => c.character_id);
  const myCharacters = characters.filter(c => claimedIds.includes(c.id));

  // Calcular estadísticas
  const totalValue = myCharacters.reduce((sum, c) => sum + c.price, 0);
  const avgValue = Math.floor(totalValue / myCharacters.length);

  // Contar por rareza
  const rarezas = {
    comun: myCharacters.filter(c => c.price < 5000).length,
    raro: myCharacters.filter(c => c.price >= 5000 && c.price < 15000).length,
    epico: myCharacters.filter(c => c.price >= 15000 && c.price < 30000).length,
    legendario: myCharacters.filter(c => c.price >= 30000).length
  };

  // Top 3 personajes más valiosos
  const top3 = myCharacters.sort((a, b) => b.price - a.price).slice(0, 3);

  let stats = `📊 *ESTADÍSTICAS DE COLECCIÓN* 📊\n\n`;
  stats += `👤 *@${userId.split('@')[0]}*\n\n`;

  stats += `📈 *RESUMEN GENERAL*\n`;
  stats += `• Total de waifus: ${myCharacters.length}\n`;
  stats += `• Valor total: ${totalValue.toLocaleString()} 💎\n`;
  stats += `• Valor promedio: ${avgValue.toLocaleString()} 💎\n\n`;

  stats += `⭐ *DISTRIBUCIÓN POR RAREZA*\n`;
  stats += `• Común: ${rarezas.comun} waifus\n`;
  stats += `• Raro: ${rarezas.raro} waifus\n`;
  stats += `• Épico: ${rarezas.epico} waifus\n`;
  stats += `• Legendario: ${rarezas.legendario} waifus\n\n`;

  if (top3.length > 0) {
    stats += `🏆 *TOP 3 WAIFUS MÁS VALIOSAS*\n`;
    top3.forEach((char, index) => {
      const emoji = ['🥇', '🥈', '🥉'][index];
      const rareza = getRarezaEmoji(char.price);
      stats += `${emoji} ${rareza} ${char.name} (${char.price.toLocaleString()} 💎)\n`;
    });
  }

  await sock.sendMessage(chatId, { text: stats, mentions: [userId] }, { quoted: m });
}

/**
 * Función auxiliar para obtener emoji de rareza según precio
 */
function getRarezaEmoji(price) {
  if (price >= 30000) return '💎'; // Legendario
  if (price >= 15000) return '🔥'; // Épico
  if (price >= 5000) return '⭐';  // Raro
  return '⚪'; // Común
}

/**
 * Función auxiliar para obtener texto de rareza
 */
function getRarezaTexto(price) {
  if (price >= 30000) return 'Legendario';
  if (price >= 15000) return 'Épico';
  if (price >= 5000) return 'Raro';
  return 'Común';
}
