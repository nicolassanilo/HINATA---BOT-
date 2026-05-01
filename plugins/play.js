/**
 * @file Plugin Play - YouTube Downloader para WhatsApp
 * @description Plugin completo para descargar videos y audio de YouTube con múltiples formatos
 * @version 1.0.0
 * @author HINATA-BOT
 */

import yts from 'yt-search';
import SpiderXAPI from './spider-x-api.js';
import { getConfig } from '../index.js';

// Configuración del plugin
const CONFIG = {
  maxVideoSizeMB: 100,
  timeout: 300000, // 5 minutos
  maxRetries: 3,
  supportedQualities: ['360p', '480p', '720p', '1080p'],
  defaultQuality: '720p',
  audioFormats: ['mp3', 'webm'],
  videoFormats: ['mp4', 'webm']
};

// Sistema de logging
const logger = {
  info: (message) => console.log(`[PLAY] ℹ️ ${message}`),
  error: (message, error = null) => {
    console.error(`[PLAY] ❌ ${message}`);
    if (error) console.error('Error:', error);
  },
  success: (message) => console.log(`[PLAY] ✅ ${message}`),
  debug: (message, data = null) => {
    const runtimeConfig = getConfig();
    if (runtimeConfig?.debugMode) {
      console.log(`[PLAY] 🔍 ${message}`);
      if (data) console.log('Data:', data);
    }
  }
};

// Validar URL de YouTube
function validateYouTubeURL(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(\?[^&]*)?(#.*)?$/;
  return youtubeRegex.test(url);
}

// Extraer ID de video de YouTube
function extractVideoID(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Formatear tamaño
function formatSize(bytes) {
  if (!bytes) return 'Desconocido';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

// Formatear número
function formatNumber(num) {
  if (!num) return 'Desconocido';
  return num.toLocaleString();
}

// Formatear duración
function formatDuration(seconds) {
  if (!seconds) return 'Desconocida';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Buscar video en YouTube
async function searchYouTube(query) {
  try {
    logger.debug(`Buscando en YouTube: ${query}`);
    const results = await yts(query);
    
    if (results && results.videos && results.videos.length > 0) {
      const video = results.videos[0];
      return {
        success: true,
        data: {
          videoId: video.videoId,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          duration: video.duration?.timestamp || video.duration,
          durationSeconds: video.seconds,
          views: video.views,
          channel: video.author?.name,
          channelUrl: video.author?.url,
          uploadedAt: video.uploadedAt,
          thumbnail: video.thumbnail,
          description: video.description
        }
      };
    }
    
    return { success: false, error: 'No se encontraron resultados' };
  } catch (error) {
    logger.error('Error buscando en YouTube:', error);
    return { success: false, error: error.message };
  }
}

// Obtener información del video
async function getVideoInfo(urlOrQuery) {
  // Si es una URL, extraer el ID y obtener info
  if (validateYouTubeURL(urlOrQuery)) {
    const videoId = extractVideoID(urlOrQuery);
    if (!videoId) {
      return { success: false, error: 'URL de YouTube inválida' };
    }
    
    try {
      const videoInfo = await yts({ videoId: videoId });
      if (videoInfo && videoInfo.videos && videoInfo.videos.length > 0) {
        const video = videoInfo.videos[0];
        return {
          success: true,
          data: {
            videoId: video.videoId,
            title: video.title,
            url: `https://www.youtube.com/watch?v=${video.videoId}`,
            duration: video.duration?.timestamp || video.duration,
            durationSeconds: video.seconds,
            views: video.views,
            channel: video.author?.name,
            channelUrl: video.author?.url,
            uploadedAt: video.uploadedAt,
            thumbnail: video.thumbnail,
            description: video.description
          }
        };
      }
    } catch (error) {
      logger.error('Error obteniendo info del video:', error);
    }
  }
  
  // Si no es URL o falló, buscar como término
  return await searchYouTube(urlOrQuery);
}

// Determinar mejor calidad disponible
function getBestQuality(availableQualities, preferred = CONFIG.defaultQuality) {
  if (!availableQualities || availableQualities.length === 0) {
    return preferred;
  }
  
  // Buscar la calidad preferida
  if (availableQualities.includes(preferred)) {
    return preferred;
  }
  
  // Buscar desde la más alta hacia la más baja
  const qualityOrder = ['1080p', '720p', '480p', '360p'];
  for (const quality of qualityOrder) {
    if (availableQualities.includes(quality)) {
      return quality;
    }
  }
  
  // Si no encuentra ninguna, devolver la primera disponible
  return availableQualities[0];
}

// Función principal del plugin
export async function execute(sock, message, args) {
  const chatId = message.key.remoteJid;
  const senderId = message.key.participant || message.key.remoteJid;
  const text = args.join(' ').trim();
  
  try {
    // Validar entrada
    if (!text) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* Debes proporcionar una URL de YouTube o un término de búsqueda\n\n` +
              `📝 *Uso correcto:*\n` +
              `\`.play <URL o búsqueda>\`\n` +
              `\`.yt <URL o búsqueda>\`\n\n` +
              `💡 *Ejemplos:*\n` +
              `\`.play https://youtu.be/dQw4w9WgXcQ\`\n` +
              `\`.play Never Gonna Give You Up\`\n` +
              `\`.yt Rick Astley - Never Gonna Give You Up\`\n\n` +
              `🎯 *Formatos disponibles:*\n` +
              `• Video MP4 (720p o 1080p)\n` +
              `• Audio MP3`
      }, { quoted: message });
    }
    
    // Enviar mensaje de búsqueda
    await sock.sendMessage(chatId, {
      text: `🔍 *Buscando video...*\n\n` +
            `📝 *Término:* ${text}\n` +
            `⏳ *Buscando en YouTube...*`
    }, { quoted: message });
    
    // Obtener información del video
    const videoInfoResult = await getVideoInfo(text);
    
    if (!videoInfoResult.success) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error en la búsqueda*\n\n` +
              `💡 *Posibles causas:*\n` +
              `• Término de búsqueda muy específico\n` +
              `• Video privado o eliminado\n` +
              `• URL inválida\n` +
              `• Problemas de conexión\n\n` +
              `🔍 *Error:* ${videoInfoResult.error}`
      }, { quoted: message });
    }
    
    const videoInfo = videoInfoResult.data;
    
    // Mostrar información del video encontrado
    await sock.sendMessage(chatId, {
      text: `✅ *Video encontrado*\n\n` +
            `🎬 *Título:* ${videoInfo.title}\n` +
            `👤 *Canal:* ${videoInfo.channel || 'Desconocido'}\n` +
            `⏱️ *Duración:* ${videoInfo.duration || 'Desconocida'}\n` +
            `👀 *Vistas:* ${formatNumber(videoInfo.views)}\n` +
            `📅 *Publicado:* ${videoInfo.uploadedAt || 'Desconocida'}\n\n` +
            `🔗 *URL:* ${videoInfo.url}\n\n` +
            `⬇️ *Iniciando descarga...*`
    }, { quoted: message });
    
    // Inicializar Spider-X-API
    const spiderAPI = new SpiderXAPI();
    
    // Determinar si descargar video o audio basado en el comando
    const isAudioCommand = message.message?.extendedTextMessage?.text?.includes('.mp3') || 
                          text.toLowerCase().includes('mp3') ||
                          text.toLowerCase().includes('audio');
    
    const downloadType = isAudioCommand ? 'audio' : 'video';
    const targetQuality = isAudioCommand ? 'best' : CONFIG.defaultQuality;
    
    // Enviar mensaje de descarga
    await sock.sendMessage(chatId, {
      text: `📥 *Descargando ${downloadType}...*\n\n` +
            `🎬 *Título:* ${videoInfo.title}\n` +
            `🎯 *Formato:* ${isAudioCommand ? 'MP3' : 'MP4'}\n` +
            `${!isAudioCommand ? `📏 *Calidad:* ${targetQuality}\n` : ''}` +
            `🕷️ *Sistema:* Spider-X-API\n\n` +
            `⏳ *Descargando... (puede tardar varios minutos)*`
    }, { quoted: message });
    
    let downloadResult;
    
    if (isAudioCommand) {
      // Descargar audio
      downloadResult = await spiderAPI.downloadVideo(videoInfo.url, '360p'); // Usar calidad baja para audio
    } else {
      // Descargar video
      const qualitiesResult = await spiderAPI.getAvailableQualities(videoInfo.url);
      const availableQualities = qualitiesResult.success ? qualitiesResult.qualities : CONFIG.supportedQualities;
      const bestQuality = getBestQuality(availableQualities);
      
      downloadResult = await spiderAPI.downloadVideo(videoInfo.url, bestQuality);
    }
    
    if (!downloadResult.success) {
      let errorMsg = `❌ *Error en la descarga*\n\n`;
      
      if (downloadResult.results && downloadResult.results.length > 0) {
        errorMsg += `🕷️ *Resultados de APIs:*\n`;
        downloadResult.results.forEach(result => {
          errorMsg += `• ${result.api}: ❌ ${result.error}\n`;
        });
      } else {
        errorMsg += `💡 *Error:* ${downloadResult.error}\n`;
      }
      
      errorMsg += `\n🔄 *Soluciones:*\n` +
                  `• Intenta con otro video\n` +
                  `• Verifica tu conexión\n` +
                  `• Intenta más tarde`;
      
      return await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
    
    // Descargar el archivo
    const fileResult = await spiderAPI.downloadFile(downloadResult.url, CONFIG.maxVideoSizeMB);
    
    if (!fileResult.success) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error descargando archivo*\n\n` +
              `🕷️ *Error:* ${fileResult.error}\n\n` +
              `💡 *El enlace de descarga expiró*\n` +
              `🔄 *Intenta descargar nuevamente*`
      }, { quoted: message });
    }
    
    // Validar tamaño
    if (fileResult.sizeMB > CONFIG.maxVideoSizeMB) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Archivo demasiado grande*\n\n` +
              `📏 *Tamaño:* ${fileResult.sizeMB.toFixed(2)} MB\n` +
              `📏 *Límite:* ${CONFIG.maxVideoSizeMB} MB\n\n` +
              `💡 *Intenta con otro video más corto*`
      }, { quoted: message });
    }
    
    // Enviar reacción de éxito
    try { await message.react('✅'); } catch {}
    
    // Preparar mensaje de envío
    const caption = `🎵 *${videoInfo.title}*\n\n` +
                   `👤 *Canal:* ${videoInfo.channel || 'Desconocido'}\n` +
                   `⏱️ *Duración:* ${videoInfo.duration || 'Desconocida'}\n` +
                   `👀 *Vistas:* ${formatNumber(videoInfo.views)}\n` +
                   `📏 *Tamaño:* ${fileResult.sizeMB.toFixed(2)} MB\n` +
                   `🎯 *Formato:* ${isAudioCommand ? 'MP3' : 'MP4'}\n` +
                   `${!isAudioCommand ? `📊 *Calidad:* ${downloadResult.quality}\n` : ''}` +
                   `🕷️ *API:* ${downloadResult.api}\n\n` +
                   `🤖 *Descargado por HINATA-BOT*`;
    
    // Enviar el archivo
    if (isAudioCommand) {
      // Enviar como audio
      await sock.sendMessage(chatId, {
        audio: fileResult.buffer,
        mimetype: 'audio/mpeg',
        caption: caption,
        contextInfo: {
          externalAdReply: {
            title: videoInfo.title,
            body: `${videoInfo.channel || 'YouTube'} • MP3`,
            thumbnailUrl: videoInfo.thumbnail,
            mediaType: 2,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: message });
    } else {
      // Enviar como video
      await sock.sendMessage(chatId, {
        video: fileResult.buffer,
        caption: caption,
        mimetype: fileResult.contentType,
        contextInfo: {
          externalAdReply: {
            title: videoInfo.title,
            body: `${videoInfo.channel || 'YouTube'} • ${downloadResult.quality}`,
            thumbnailUrl: videoInfo.thumbnail,
            mediaType: 2,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: message });
    }
    
    logger.success(`${isAudioCommand ? 'Audio' : 'Video'} descargado exitosamente: ${videoInfo.title}`);
    
  } catch (error) {
    console.error('❌ Error en plugin play:', error);
    
    // Enviar reacción de error
    try { await message.react('❌'); } catch {}
    
    // Mensaje de error específico
    let errorMsg = `❌ *Error al procesar la solicitud*\n\n`;
    
    if (error.message.includes('tiempo de espera') || error.message.includes('timeout')) {
      errorMsg += `⏰ *Tiempo de espera agotado*\n\n` +
                  `💡 *El video puede ser muy grande o la conexión lenta*`;
    } else if (error.message.includes('tamaño') || error.message.includes('grande')) {
      errorMsg += `📏 *Archivo demasiado grande*\n\n` +
                  `💡 *Intenta con un video más corto*`;
    } else if (error.message.includes('no encontrado') || error.message.includes('404')) {
      errorMsg += `🔒 *Video no disponible*\n\n` +
                  `💡 *El video puede ser privado o estar eliminado*`;
    } else {
      errorMsg += `⚠️ *Error específico:* ${error.message.substring(0, 100)}\n\n` +
                  `💡 *Intenta con otro video o más tarde*`;
    }
    
    errorMsg += `\n\n🤖 *HINATA-BOT Play Plugin*`;
    
    await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
  }
}

// Exportar configuración del comando
export const command = ['.play', '.yt'];

export const help = `
🎵 *PLAY - YouTube Downloader* 🎵

*Plugin completo para descargar videos y audio de YouTube*

*📋 Comandos disponibles:*
• \`.play <URL o búsqueda>\` - Descargar video (MP4)
• \`.yt <URL o búsqueda>\` - Alternativa
• \`.play <término> mp3\` - Descargar audio (MP3)
• \`.yt <URL> audio\` - Descargar audio

*🎯 Características:*
✅ Búsqueda por URL o término
✅ Descarga de video MP4 (720p/1080p)
✅ Descarga de audio MP3
✅ Spider-X-API integrada
✅ Múltiples APIs de respaldo
✅ Manejo robusto de errores
✅ Mensajes de espera informativos

*📋 Ejemplos de uso:*
• \`.play https://youtu.be/dQw4w9WgXcQ\`
• \`.play Never Gonna Give You Up\`
• \`.yt Rick Astley mp3\`
• \`.play https://youtube.com/shorts/xxxxx audio\`

*🎬 Formatos soportados:*
• Video: MP4 (360p, 480p, 720p, 1080p)
• Audio: MP3 (mejor calidad disponible)

*⚠️ Límites:*
• Máximo 100MB por archivo
• 5 minutos de timeout
• Videos privados no soportados

*🕷️ Tecnología:*
• Spider-X-API con 4 APIs
• yt-search para búsqueda
• ytdl-core compatible
`;

export default {
  execute,
  command,
  help
};
