/**
 * @file Plugin Music Player - Reproductor de música
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema completo de reproducción de música para grupos
 */

import axios from 'axios';
import { db } from './db.js';

// Configuración
const CONFIG = {
  enableLogging: true,
  maxQueueSize: 50,
  maxPlaylistSize: 20,
  searchResultsLimit: 10,
  supportedFormats: ['mp3', 'mp4', 'm4a', 'webm'],
  volume: { min: 0, max: 100, default: 70 },
  autoPlay: true,
  autoLeave: 300000 // 5 minutos
};

// Sistema de logging
const musicLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[MUSIC] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[MUSIC] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[MUSIC] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[MUSIC] ❌ ${message}`)
};

// Funciones principales
export const command = ['.play', '.skip', '.pause', '.resume', '.stop', '.queue', '.nowplaying', '.volume', '.loop', '.playlist', '.search'];
export const alias = ['.reproducir', '.saltar', '.pausar', '.continuar', '.detener', '.cola', '.ahora', '.volumen', '.repetir', '.lista', '.buscar'];
export const description = 'Sistema completo de reproducción de música';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.play':
        await playMusic(sock, m, text);
        break;
      case '.skip':
        await skipMusic(sock, m);
        break;
      case '.pause':
        await pauseMusic(sock, m);
        break;
      case '.resume':
        await resumeMusic(sock, m);
        break;
      case '.stop':
        await stopMusic(sock, m);
        break;
      case '.queue':
        await showQueue(sock, m);
        break;
      case '.nowplaying':
        await showNowPlaying(sock, m);
        break;
      case '.volume':
        await adjustVolume(sock, m, text);
        break;
      case '.loop':
        await toggleLoop(sock, m);
        break;
      case '.playlist':
        await managePlaylist(sock, m, text);
        break;
      case '.search':
        await searchMusic(sock, m, text);
        break;
      default:
        await showMusicHelp(sock, m);
    }
  } catch (error) {
    musicLogger.error('Error en sistema de música:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de música. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Reproducir música
async function playMusic(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const query = text.replace(/^\.play\s*/, '').trim();

  if (!query) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar una canción o URL.\n\n💡 *Uso:* `.play <canción>` o `.play <url>`'
    }, { quoted: m });
  }

  try {
    await sock.sendMessage(chatId, {
      text: '🔍 *Buscando música...*'
    }, { quoted: m });

    // Buscar canción
    const songInfo = await searchSong(query);
    if (!songInfo) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se encontró la canción. Intenta con otro nombre o URL.'
      }, { quoted: m });
    }

    // Agregar a la cola
    await addToQueue(chatId, {
      title: songInfo.title,
      artist: songInfo.artist,
      url: songInfo.url,
      duration: songInfo.duration,
      requestedBy: userId,
      thumbnail: songInfo.thumbnail
    });

    let message = `🎵 *CANCIÓN AGREGADA* 🎵\n\n`;
    message += `🎵 ${songInfo.title}\n`;
    message += `👤 ${songInfo.artist}\n`;
    message += `⏱️ ${songInfo.duration}\n`;
    message += `👤 Solicitada por: @${userId.split('@')[0]}\n\n`;
    message += `📊 Posición en cola: ${await getQueuePosition(chatId)}`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    // Si no hay música reproduciéndose, iniciar
    if (!await isCurrentlyPlaying(chatId)) {
      await startPlayback(sock, chatId);
    }

    musicLogger.success(`Canción agregada: ${songInfo.title} por ${userId}`);

  } catch (error) {
    musicLogger.error('Error reproduciendo música:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al reproducir la canción.'
    }, { quoted: m });
  }
}

// Saltar canción
async function skipMusic(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const currentSong = await getCurrentSong(chatId);
    if (!currentSong) {
      return await sock.sendMessage(chatId, {
        text: '❌ No hay música reproduciéndose.'
      }, { quoted: m });
    }

    await skipToNext(sock, chatId);

    let message = `⏭️ *CANCIÓN SALTADA* ⏭️\n\n`;
    message += `🎵 ${currentSong.title}\n`;
    message += `👤 Saltada por: @${userId.split('@')[0]}`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    musicLogger.error('Error saltando canción:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al saltar la canción.'
    }, { quoted: m });
  }
}

// Pausar música
async function pauseMusic(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const currentSong = await getCurrentSong(chatId);
    if (!currentSong) {
      return await sock.sendMessage(chatId, {
        text: '❌ No hay música reproduciéndose.'
      }, { quoted: m });
    }

    if (await isPaused(chatId)) {
      return await sock.sendMessage(chatId, {
        text: '⏸️ La música ya está pausada.'
      }, { quoted: m });
    }

    await pausePlayback(chatId);

    let message = `⏸️ *MÚSICA PAUSADA* ⏸️\n\n`;
    message += `🎵 ${currentSong.title}\n`;
    message += `👤 Pausada por: @${userId.split('@')[0]}`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    musicLogger.error('Error pausando música:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al pausar la música.'
    }, { quoted: m });
  }
}

// Reanudar música
async function resumeMusic(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const currentSong = await getCurrentSong(chatId);
    if (!currentSong) {
      return await sock.sendMessage(chatId, {
        text: '❌ No hay música reproduciéndose.'
      }, { quoted: m });
    }

    if (!await isPaused(chatId)) {
      return await sock.sendMessage(chatId, {
        text: '▶️ La música ya está reproduciéndose.'
      }, { quoted: m });
    }

    await resumePlayback(chatId);

    let message = `▶️ *MÚSICA REANUDADA* ▶️\n\n`;
    message += `🎵 ${currentSong.title}\n`;
    message += `👤 Reanudada por: @${userId.split('@')[0]}`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    musicLogger.error('Error reanudando música:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al reanudar la música.'
    }, { quoted: m });
  }
}

// Detener música
async function stopMusic(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const currentSong = await getCurrentSong(chatId);
    if (!currentSong) {
      return await sock.sendMessage(chatId, {
        text: '❌ No hay música reproduciéndose.'
      }, { quoted: m });
    }

    await stopPlayback(chatId);

    let message = `⏹️ *MÚSICA DETENIDA* ⏹️\n\n`;
    message += `🎵 ${currentSong.title}\n`;
    message += `👤 Detenida por: @${userId.split('@')[0]}\n\n`;
    message += `📋 Cola limpiada`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    musicLogger.error('Error deteniendo música:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al detener la música.'
    }, { quoted: m });
  }
}

// Mostrar cola
async function showQueue(sock, m) {
  const chatId = m.key.remoteJid;

  try {
    const queue = await getQueue(chatId);
    const currentSong = await getCurrentSong(chatId);

    if (queue.length === 0 && !currentSong) {
      return await sock.sendMessage(chatId, {
        text: '📋 La cola está vacía. Usa `.play` para agregar canciones.'
      }, { quoted: m });
    }

    let message = `📋 *COLA DE REPRODUCCIÓN* 📋\n\n`;

    if (currentSong) {
      message += `🎵 *Reproduciendo ahora:*\n`;
      message += `${currentSong.title} - ${currentSong.artist}\n`;
      message += `⏱️ ${currentSong.duration}\n`;
      message += `👤 @${currentSong.requestedBy.split('@')[0]}\n\n`;
    }

    if (queue.length > 0) {
      message += `📝 *Próximas canciones:*\n\n`;
      queue.slice(0, 10).forEach((song, index) => {
        message += `${index + 1}. ${song.title} - ${song.artist}\n`;
        message += `   ⏱️ ${song.duration} | 👤 @${song.requestedBy.split('@')[0]}\n\n`;
      });

      if (queue.length > 10) {
        message += `📊 Y ${queue.length - 10} canciones más...\n`;
      }
    }

    message += `📊 Total: ${queue.length} canciones en cola`;

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    musicLogger.error('Error mostrando cola:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la cola de reproducción.'
    }, { quoted: m });
  }
}

// Mostrar canción actual
async function showNowPlaying(sock, m) {
  const chatId = m.key.remoteJid;

  try {
    const currentSong = await getCurrentSong(chatId);
    if (!currentSong) {
      return await sock.sendMessage(chatId, {
        text: '❌ No hay música reproduciéndose.'
      }, { quoted: m });
    }

    const isPausedState = await isPaused(chatId);
    const isLooping = await isLoopEnabled(chatId);
    const volume = await getVolume(chatId);

    let message = `🎵 *REPRODUCIENDO AHORA* 🎵\n\n`;
    message += `🎵 ${currentSong.title}\n`;
    message += `👤 ${currentSong.artist}\n`;
    message += `⏱️ ${currentSong.duration}\n`;
    message += `👤 Solicitada por: @${currentSong.requestedBy.split('@')[0]}\n\n`;
    
    message += `📊 *Estado:*\n`;
    message += `${isPausedState ? '⏸️ Pausada' : '▶️ Reproduciendo'}\n`;
    message += `🔊 Volumen: ${volume}%\n`;
    message += `🔁 Loop: ${isLooping ? 'Activado' : 'Desactivado'}`;

    // Enviar thumbnail si está disponible
    if (currentSong.thumbnail) {
      await sock.sendMessage(chatId, {
        image: { url: currentSong.thumbnail },
        caption: message,
        mentions: [currentSong.requestedBy]
      }, { quoted: m });
    } else {
      await sock.sendMessage(chatId, {
        text: message,
        mentions: [currentSong.requestedBy]
      }, { quoted: m });
    }

  } catch (error) {
    musicLogger.error('Error mostrando canción actual:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la información de la canción actual.'
    }, { quoted: m });
  }
}

// Ajustar volumen
async function adjustVolume(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const volume = parseInt(args[1]);

  if (isNaN(volume) || volume < CONFIG.volume.min || volume > CONFIG.volume.max) {
    return await sock.sendMessage(chatId, {
      text: `❌ Volumen inválido. Debe estar entre ${CONFIG.volume.min} y ${CONFIG.volume.max}.\n\n💡 *Uso:* `.volume <0-100>``
    }, { quoted: m });
  }

  try {
    await setVolume(chatId, volume);

    let message = `🔊 *VOLUMEN AJUSTADO* 🔊\n\n`;
    message += `👤 Ajustado por: @${userId.split('@')[0]}\n`;
    message += `🔊 Nuevo volumen: ${volume}%`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    musicLogger.error('Error ajustando volumen:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al ajustar el volumen.'
    }, { quoted: m });
  }
}

// Activar/desactivar loop
async function toggleLoop(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const isLooping = await isLoopEnabled(chatId);
    await setLoop(chatId, !isLooping);

    let message = `🔁 *LOOP ${!isLooping ? 'ACTIVADO' : 'DESACTIVADO'}* 🔁\n\n`;
    message += `👤 Cambiado por: @${userId.split('@')[0]}`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    musicLogger.error('Error cambiando loop:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cambiar el modo loop.'
    }, { quoted: m });
  }
}

// Gestionar playlist
async function managePlaylist(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const action = args[1];

  if (!action) {
    return await showPlaylistHelp(sock, m);
  }

  try {
    switch (action) {
      case 'create':
        await createPlaylist(sock, m, args.slice(2).join(' '));
        break;
      case 'add':
        await addToPlaylist(sock, m, args.slice(2).join(' '));
        break;
      case 'play':
        await playPlaylist(sock, m, args.slice(2).join(' '));
        break;
      case 'list':
        await listPlaylists(sock, m);
        break;
      case 'delete':
        await deletePlaylist(sock, m, args.slice(2).join(' '));
        break;
      default:
        await showPlaylistHelp(sock, m);
    }
  } catch (error) {
    musicLogger.error('Error gestionando playlist:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al gestionar la playlist.'
    }, { quoted: m });
  }
}

// Buscar música
async function searchMusic(sock, m, text) {
  const chatId = m.key.remoteJid;
  const query = text.replace(/^\.search\s*/, '').trim();

  if (!query) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar qué buscar.\n\n💡 *Uso:* `.search <canción>`'
    }, { quoted: m });
  }

  try {
    await sock.sendMessage(chatId, {
      text: '🔍 *Buscando música...*'
    }, { quoted: m });

    const results = await searchSongs(query, CONFIG.searchResultsLimit);
    
    if (results.length === 0) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se encontraron resultados.'
      }, { quoted: m });
    }

    let message = `🔍 *RESULTADOS DE BÚSQUEDA* 🔍\n\n`;
    message += `📝 Búsqueda: "${query}"\n\n`;

    results.forEach((song, index) => {
      message += `${index + 1}. ${song.title}\n`;
      message += `   👤 ${song.artist}\n`;
      message += `   ⏱️ ${song.duration}\n`;
      message += `   🎵 Para reproducir: \`.play ${song.title}\`\n\n`;
    });

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    musicLogger.error('Error buscando música:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al buscar música.'
    }, { quoted: m });
  }
}

// Mostrar ayuda
async function showMusicHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `🎵 *SISTEMA DE MÚSICA* 🎵\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `▶️ *Reproducción:*\n`;
  message += `• \`.play <canción/url>\` - Reproducir música\n`;
  message += `• \`.skip\` - Saltar canción actual\n`;
  message += `• \`.pause\` - Pausar reproducción\n`;
  message += `• \`.resume\` - Reanudar reproducción\n`;
  message += `• \`.stop\` - Detener y limpiar cola\n\n`;
  
  message += `📊 *Información:*\n`;
  message += `• \`.queue\` - Ver cola de reproducción\n`;
  message += `• \`.nowplaying\` - Ver canción actual\n`;
  message += `• \`.search <canción>\` - Buscar música\n\n`;
  
  message += `⚙️ *Configuración:*\n`;
  message += `• \`.volume <0-100>\` - Ajustar volumen\n`;
  message += `• \`.loop\` - Activar/desactivar loop\n\n`;
  
  message += `📝 *Playlists:*\n`;
  message += `• \`.playlist create <nombre>\` - Crear playlist\n`;
  message += `• \`.playlist add <nombre> <canción>\` - Agregar a playlist\n`;
  message += `• \`.playlist play <nombre>\` - Reproducir playlist\n`;
  message += `• \`.playlist list\` - Ver playlists\n`;
  message += `• \`.playlist delete <nombre>\` - Eliminar playlist\n\n`;
  
  message += `📋 *Límites:*\n`;
  message += `• Máximo ${CONFIG.maxQueueSize} canciones en cola\n`;
  message += `• Máximo ${CONFIG.maxPlaylistSize} playlists por usuario\n`;
  message += `• Volumen: ${CONFIG.volume.min}-${CONFIG.volume.max}\n\n`;
  
  message += `💡 *Formatos soportados:*\n`;
  message += `${CONFIG.supportedFormats.join(', ')}`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones auxiliares
async function searchSong(query) {
  try {
    // Simulación de búsqueda (en producción usarías APIs reales)
    const mockResults = [
      {
        title: "Canción de ejemplo 1",
        artist: "Artista de ejemplo",
        duration: "3:45",
        url: "https://example.com/song1.mp3",
        thumbnail: "https://example.com/thumb1.jpg"
      },
      {
        title: "Canción de ejemplo 2",
        artist: "Otro artista",
        duration: "4:20",
        url: "https://example.com/song2.mp3",
        thumbnail: "https://example.com/thumb2.jpg"
      }
    ];
    
    // Simular búsqueda por coincidencia
    return mockResults.find(song => 
      song.title.toLowerCase().includes(query.toLowerCase()) ||
      song.artist.toLowerCase().includes(query.toLowerCase())
    ) || mockResults[0];
    
  } catch (error) {
    musicLogger.error('Error buscando canción:', error);
    return null;
  }
}

async function searchSongs(query, limit = 10) {
  try {
    // Simulación de búsqueda múltiple
    const mockResults = [
      { title: "Canción popular 1", artist: "Artista famoso", duration: "3:30" },
      { title: "Canción popular 2", artist: "Otro artista", duration: "4:15" },
      { title: "Canción popular 3", artist: "Banda conocida", duration: "3:55" },
      { title: "Canción popular 4", artist: "Solista", duration: "5:00" },
      { title: "Canción popular 5", artist: "Grupo musical", duration: "3:20" }
    ];
    
    return mockResults.slice(0, limit);
    
  } catch (error) {
    musicLogger.error('Error buscando canciones:', error);
    return [];
  }
}

// Funciones de base de datos y estado
async function addToQueue(chatId, song) {
  try {
    await db.run(`
      INSERT INTO music_queue (chat_id, title, artist, url, duration, requested_by, thumbnail, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [chatId, song.title, song.artist, song.url, song.duration, song.requestedBy, song.thumbnail]);
  } catch (error) {
    musicLogger.error('Error agregando a cola:', error);
    throw error;
  }
}

async function getQueue(chatId) {
  try {
    return await db.all(`
      SELECT * FROM music_queue 
      WHERE chat_id = ? 
      ORDER BY added_at ASC
    `, [chatId]);
  } catch (error) {
    musicLogger.error('Error obteniendo cola:', error);
    return [];
  }
}

async function getCurrentSong(chatId) {
  try {
    return await db.get(`
      SELECT * FROM music_current 
      WHERE chat_id = ?
    `, [chatId]);
  } catch (error) {
    musicLogger.error('Error obteniendo canción actual:', error);
    return null;
  }
}

async function isCurrentlyPlaying(chatId) {
  try {
    const current = await getCurrentSong(chatId);
    return current && !current.is_paused;
  } catch (error) {
    return false;
  }
}

async function isPaused(chatId) {
  try {
    const current = await getCurrentSong(chatId);
    return current && current.is_paused;
  } catch (error) {
    return false;
  }
}

async function isLoopEnabled(chatId) {
  try {
    const result = await db.get('SELECT is_loop FROM music_settings WHERE chat_id = ?', [chatId]);
    return result ? result.is_loop : false;
  } catch (error) {
    return false;
  }
}

async function setLoop(chatId, enabled) {
  try {
    await db.run(`
      INSERT OR REPLACE INTO music_settings (chat_id, is_loop, volume)
      VALUES (?, ?, COALESCE((SELECT volume FROM music_settings WHERE chat_id = ?), ?))
    `, [chatId, enabled, chatId, CONFIG.volume.default]);
  } catch (error) {
    musicLogger.error('Error configurando loop:', error);
    throw error;
  }
}

async function getVolume(chatId) {
  try {
    const result = await db.get('SELECT volume FROM music_settings WHERE chat_id = ?', [chatId]);
    return result ? result.volume : CONFIG.volume.default;
  } catch (error) {
    return CONFIG.volume.default;
  }
}

async function setVolume(chatId, volume) {
  try {
    await db.run(`
      INSERT OR REPLACE INTO music_settings (chat_id, volume, is_loop)
      VALUES (?, ?, COALESCE((SELECT is_loop FROM music_settings WHERE chat_id = ?), 0))
    `, [chatId, volume, chatId]);
  } catch (error) {
    musicLogger.error('Error configurando volumen:', error);
    throw error;
  }
}

async function getQueuePosition(chatId) {
  try {
    const result = await db.get('SELECT COUNT(*) as count FROM music_queue WHERE chat_id = ?', [chatId]);
    return result ? result.count + 1 : 1;
  } catch (error) {
    return 1;
  }
}

// Funciones de control de reproducción (simuladas)
async function startPlayback(sock, chatId) {
  try {
    const queue = await getQueue(chatId);
    if (queue.length === 0) return;

    const nextSong = queue[0];
    
    // Mover a current
    await db.run(`
      INSERT OR REPLACE INTO music_current 
      (chat_id, title, artist, url, duration, requested_by, thumbnail, is_paused, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `, [chatId, nextSong.title, nextSong.artist, nextSong.url, nextSong.duration, nextSong.requested_by, nextSong.thumbnail]);
    
    // Eliminar de cola
    await db.run('DELETE FROM music_queue WHERE id = ?', [nextSong.id]);
    
    musicLogger.success(`Iniciando reproducción: ${nextSong.title}`);
    
  } catch (error) {
    musicLogger.error('Error iniciando reproducción:', error);
    throw error;
  }
}

async function skipToNext(sock, chatId) {
  try {
    await startPlayback(sock, chatId);
  } catch (error) {
    musicLogger.error('Error saltando canción:', error);
    throw error;
  }
}

async function pausePlayback(chatId) {
  try {
    await db.run('UPDATE music_current SET is_paused = 1 WHERE chat_id = ?', [chatId]);
  } catch (error) {
    musicLogger.error('Error pausando reproducción:', error);
    throw error;
  }
}

async function resumePlayback(chatId) {
  try {
    await db.run('UPDATE music_current SET is_paused = 0 WHERE chat_id = ?', [chatId]);
  } catch (error) {
    musicLogger.error('Error reanudando reproducción:', error);
    throw error;
  }
}

async function stopPlayback(chatId) {
  try {
    await db.run('DELETE FROM music_current WHERE chat_id = ?', [chatId]);
    await db.run('DELETE FROM music_queue WHERE chat_id = ?', [chatId]);
  } catch (error) {
    musicLogger.error('Error deteniendo reproducción:', error);
    throw error;
  }
}

// Funciones de playlist
async function createPlaylist(sock, m, name) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  if (!name) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar un nombre para la playlist.\n\n💡 *Uso:* `.playlist create <nombre>`'
    }, { quoted: m });
  }

  try {
    await db.run(`
      INSERT INTO music_playlists (user_id, name, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [userId, name]);

    await sock.sendMessage(chatId, {
      text: `✅ Playlist "${name}" creada exitosamente.`
    }, { quoted: m });

  } catch (error) {
    await sock.sendMessage(chatId, {
      text: '❌ Error al crear la playlist.'
    }, { quoted: m });
  }
}

async function listPlaylists(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const playlists = await db.all('SELECT * FROM music_playlists WHERE user_id = ?', [userId]);
    
    if (playlists.length === 0) {
      return await sock.sendMessage(chatId, {
        text: '📝 No tienes playlists creadas.'
      }, { quoted: m });
    }

    let message = `📝 *TUS PLAYLISTS* 📝\n\n`;
    playlists.forEach((playlist, index) => {
      message += `${index + 1}. ${playlist.name}\n`;
      message += `   📅 Creada: ${new Date(playlist.created_at).toLocaleDateString()}\n\n`;
    });

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar tus playlists.'
    }, { quoted: m });
  }
}

async function showPlaylistHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `📝 *GESTIÓN DE PLAYLISTS* 📝\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  message += `• \`.playlist create <nombre>\` - Crear nueva playlist\n`;
  message += `• \`.playlist add <nombre> <canción>\` - Agregar canción\n`;
  message += `• \`.playlist play <nombre>\` - Reproducir playlist\n`;
  message += `• \`.playlist list\` - Ver tus playlists\n`;
  message += `• \`.playlist delete <nombre>\` - Eliminar playlist`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Inicializar tablas
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS music_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT,
        title TEXT,
        artist TEXT,
        url TEXT,
        duration TEXT,
        requested_by TEXT,
        thumbnail TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS music_current (
        chat_id TEXT PRIMARY KEY,
        title TEXT,
        artist TEXT,
        url TEXT,
        duration TEXT,
        requested_by TEXT,
        thumbnail TEXT,
        is_paused INTEGER DEFAULT 0,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS music_settings (
        chat_id TEXT PRIMARY KEY,
        volume INTEGER DEFAULT 70,
        is_loop INTEGER DEFAULT 0
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS music_playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS music_playlist_songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlist_id INTEGER,
        title TEXT,
        artist TEXT,
        url TEXT,
        duration TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playlist_id) REFERENCES music_playlists (id)
      )
    `);
    
    musicLogger.success('Tablas de música inicializadas');
  } catch (error) {
    musicLogger.error('Error inicializando tablas:', error);
  }
}

// Inicializar sistema
initializeTables();

// Exportar funciones para compatibilidad
export { 
  CONFIG,
  musicLogger,
  searchSong,
  addToQueue,
  startPlayback
};
