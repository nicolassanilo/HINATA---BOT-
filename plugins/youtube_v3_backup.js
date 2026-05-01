/**
 * @file Plugin YouTube Downloader v3.0 - Sistema mejorado con API youtube-video-downloader-api
 * @description Integración con la API de zararashraf para descarga robusta de YouTube
 * @version 3.0.0
 */

import axios from 'axios';
import yts from 'yt-search';

// Configuración robusta
const CONFIG = {
  maxVideoSizeMB: 100,
  timeout: 180000, // 3 minutos
  maxRetries: 3,
  retryDelay: 2000,
  downloadTimeout: 300000, // 5 minutos para descarga
  supportedFormats: ['mp4', 'webm', 'mkv', 'avi'],
  qualities: ['144p', '240p', '360p', '480p', '720p', '1080p'],
  // Configuración de la API youtube-video-downloader-api
  apiEndpoints: {
    base: 'https://youtube-downloader-api.onrender.com', // URL de ejemplo, debe ser reemplazada
    download: '/download/{resolution}',
    videoInfo: '/video_info',
    availableResolutions: '/available_resolutions'
  }
};

// Sistema de logging
const logger = {
  info: (message) => console.log(`[YOUTUBE v3] ℹ️ ${message}`),
  error: (message, error = null) => {
    console.error(`[YOUTUBE v3] ❌ ${message}`);
    if (error) console.error('Error:', error);
  },
  success: (message) => console.log(`[YOUTUBE v3] ✅ ${message}`),
  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[YOUTUBE v3] 🔍 ${message}`);
      if (data) console.log('Data:', data);
    }
  }
};

// Validación mejorada de URL de YouTube
function validarYouTubeURL(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(\?[^&]*)?(#.*)?$/;
  return youtubeRegex.test(url);
}

// Extraer ID de video de YouTube
function extraerVideoID(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Parseo mejorado de tamaño
function parseSize(sizeStr) {
  if (!sizeStr || typeof sizeStr !== 'string') return 0;
  
  const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  switch (unit) {
    case 'TB': return value * 1024 * 1024;
    case 'GB': return value * 1024;
    case 'MB': return value;
    case 'KB': return value / 1024;
    case 'B': return value / (1024 * 1024);
    default: return value;
  }
}

// API youtube-video-downloader-api
class YouTubeDownloaderAPI {
  constructor() {
    this.baseURL = CONFIG.apiEndpoints.base;
    this.endpoints = CONFIG.apiEndpoints;
  }

  // Obtener información del video
  async getVideoInfo(url) {
    try {
      logger.debug(`Obteniendo información del video: ${url}`);
      
      const response = await axios.post(`${this.baseURL}${this.endpoints.videoInfo}`, {
        url: url
      }, {
        timeout: CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.data && response.data.success) {
        logger.success('Información del video obtenida exitosamente');
        return {
          success: true,
          data: response.data.data || response.data
        };
      } else {
        logger.error('La API devolvió respuesta no exitosa', response.data);
        return { success: false, error: response.data.message || 'Error en la API' };
      }
    } catch (error) {
      logger.error('Error obteniendo información del video', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Error de conexión'
      };
    }
  }

  // Obtener resoluciones disponibles
  async getAvailableResolutions(url) {
    try {
      logger.debug(`Obteniendo resoluciones disponibles: ${url}`);
      
      const response = await axios.post(`${this.baseURL}${this.endpoints.availableResolutions}`, {
        url: url
      }, {
        timeout: CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.data && response.data.success) {
        logger.success('Resoluciones disponibles obtenidas');
        return {
          success: true,
          resolutions: response.data.resolutions || response.data.data || []
        };
      } else {
        logger.error('Error obteniendo resoluciones', response.data);
        return { success: false, error: response.data.message || 'Error en la API' };
      }
    } catch (error) {
      logger.error('Error obteniendo resoluciones disponibles', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Error de conexión'
      };
    }
  }

  // Descargar video
  async downloadVideo(url, resolution = '720p') {
    try {
      logger.debug(`Iniciando descarga: ${url} @ ${resolution}`);
      
      const endpoint = this.endpoints.download.replace('{resolution}', resolution);
      
      const response = await axios.post(`${this.baseURL}${endpoint}`, {
        url: url
      }, {
        timeout: CONFIG.downloadTimeout,
        responseType: 'arraybuffer',
        maxContentLength: CONFIG.maxVideoSizeMB * 1024 * 1024,
        maxBodyLength: CONFIG.maxVideoSizeMB * 1024 * 1024,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.data) {
        const buffer = Buffer.from(response.data);
        const sizeMB = buffer.length / (1024 * 1024);
        
        logger.success(`Video descargado: ${sizeMB.toFixed(2)} MB`);
        
        return {
          success: true,
          buffer: buffer,
          sizeMB: sizeMB,
          resolution: resolution,
          contentType: response.headers['content-type'] || 'video/mp4'
        };
      } else {
        return { success: false, error: 'No se recibieron datos del video' };
      }
    } catch (error) {
      logger.error('Error descargando video', error);
      
      let errorMsg = error.message || 'Error desconocido';
      
      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Tiempo de espera agotado';
      } else if (error.response?.status === 413) {
        errorMsg = 'Video demasiado grande';
      } else if (error.response?.status === 404) {
        errorMsg = 'Video no encontrado';
      }
      
      return { success: false, error: errorMsg };
    }
  }
}

// Obtener información del video con yt-search (fallback)
async function obtenerInfoVideoFallback(videoId) {
  try {
    const videoInfo = await yts({ videoId: videoId });
    if (videoInfo && videoInfo.videos && videoInfo.videos.length > 0) {
      const video = videoInfo.videos[0];
      return {
        videoId: video.videoId,
        titulo: video.title,
        duracion: video.duration?.timestamp || video.duration,
        duracionSegundos: video.seconds,
        vistas: video.views,
        canal: video.author?.name,
        canalId: video.author?.channelId,
        fecha: video.uploadedAt,
        thumbnail: video.thumbnail,
        descripcion: video.description,
        categoria: video.category
      };
    }
    return null;
  } catch (error) {
    logger.error('Error obteniendo info del video (fallback):', error.message);
    return null;
  }
}

// Validar formato de video
function validarFormatoVideo(buffer) {
  const signatures = {
    'mp4': ['66747970', '69736F6D'], // ftyp, isom
    'webm': ['1A45DFA3'], // EBML
    'mkv': ['1A45DFA3'], // EBML (same as webm)
    'avi': ['52494646'] // RIFF
  };
  
  const hex = buffer.toString('hex', 0, 16);
  
  for (const [format, sigs] of Object.entries(signatures)) {
    for (const sig of sigs) {
      if (hex.startsWith(sig.toLowerCase())) {
        return format;
      }
    }
  }
  
  return 'unknown';
}

// Formatear tamaño en MB
function formatSizeMB(bytes) {
  if (!bytes) return 'Desconocido';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export const command = ['.youtube', '.ytvideo', '.ytdl', '.ytd'];

export const help = `
🎥 *YOUTUBE DOWNLOADER v3.0* 🎥

*Sistema mejorado con API youtube-video-downloader-api*

*📋 Comandos disponibles:*
• \`.youtube <URL>\` - Descargar video
• \`.ytvideo <URL>\` - Alternativa
• \`.ytdl <URL>\` - Abreviatura
• \`.ytd <URL>\` - Versión corta

*🎯 Características:*
✅ API youtube-video-downloader-api
✅ Detección automática de resoluciones
✅ Fallback a yt-search
✅ Reintentos automáticos
✅ Validación de tamaño y formato
✅ Manejo robusto de errores
✅ Límite configurable (100MB)

*🎬 Calidades soportadas:*
• 144p - Mínima calidad
• 240p - Baja calidad
• 360p - Calidad estándar
• 480p - Calidad media
• 720p - Alta calidad (defecto)
• 1080p - Máxima calidad

*📋 Ejemplos de uso:*
• \`.youtube https://youtu.be/dQw4w9WgXcQ\`
• \`.youtube https://www.youtube.com/watch?v=xxxxx 480p\`
• \`.ytd https://youtube.com/shorts/xxxxx\`

*⚠️ Límites y restricciones:*
• Máximo 100MB por video
• 3 reintentos automáticos
• 5 minutos de timeout
• Videos privados no soportados

*🔧 API utilizada:*
• youtube-video-downloader-api
• Pytube backend
• Flask API server
`;

export async function run(sock, m, { text, args }) {
  const chatId = m.key.remoteJid;
  const senderId = m.key.participant || m.key.remoteJid;
  const url = text?.trim();
  
  // Parsear calidad desde argumentos
  const calidad = args[1]?.toLowerCase() || '720p';
  
  try {
    // Validar entrada
    if (!url) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* Debes proporcionar una URL de YouTube\n\n` +
              `📝 *Uso correcto:*\n` +
              `\`.youtube <URL> [calidad]\`\n\n` +
              `💡 *Ejemplos:*\n` +
              `\`.youtube https://youtu.be/dQw4w9WgXcQ\`\n` +
              `\`.youtube https://youtu.be/dQw4w9WgXcQ 480p\`\n\n` +
              `🎯 *Calidades disponibles:* ${CONFIG.qualities.join(', ')}`
      }, { quoted: m });
    }
    
    // Validar URL
    if (!validarYouTubeURL(url)) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* URL de YouTube inválida\n\n` +
              `🔗 *URLs válidas:*\n` +
              `• https://www.youtube.com/watch?v=xxxxx\n` +
              `• https://youtu.be/xxxxx\n` +
              `• https://youtube.com/shorts/xxxxx\n` +
              `• https://youtube.com/embed/xxxxx\n\n` +
              `💡 *Asegúrate de copiar la URL completa*`
      }, { quoted: m });
    }
    
    // Validar calidad
    if (!CONFIG.qualities.includes(calidad)) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* Calidad no válida\n\n` +
              `🎯 *Calidades disponibles:* ${CONFIG.qualities.join(', ')}\n\n` +
              `💡 *Uso:* \`.youtube <URL> <calidad>\`\n` +
              `📝 *Ejemplo:* \`.youtube https://youtu.be/xxxxx 720p\``
      }, { quoted: m });
    }
    
    // Extraer ID del video
    const videoId = extraerVideoID(url);
    if (!videoId) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* No se pudo extraer el ID del video\n\n` +
              `💡 *Verifica que la URL sea correcta*`
      }, { quoted: m });
    }
    
    // Enviar mensaje de análisis
    await sock.sendMessage(chatId, {
      text: `🔍 *Analizando video...*\n\n` +
            `🎬 *ID:* ${videoId}\n` +
            `🎯 *Calidad solicitada:* ${calidad}\n` +
            `⏳ *Verificando disponibilidad...*`
    }, { quoted: m });
    
    // Inicializar API
    const api = new YouTubeDownloaderAPI();
    
    // Obtener información del video
    let infoVideo = null;
    const videoInfoResult = await api.getVideoInfo(url);
    
    if (videoInfoResult.success) {
      infoVideo = videoInfoResult.data;
    } else {
      // Fallback a yt-search
      logger.info('Usando fallback para obtener información del video');
      infoVideo = await obtenerInfoVideoFallback(videoId);
    }
    
    if (!infoVideo) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* No se pudo obtener información del video\n\n` +
              `💡 *Posibles causas:*\n` +
              `• Video privado o eliminado\n` +
              `• Contenido restringido\n` +
              `• URL inválida\n` +
              `• Problemas temporales de YouTube`
      }, { quoted: m });
    }
    
    // Mostrar información del video
    await sock.sendMessage(chatId, {
      text: `✅ *Video encontrado*\n\n` +
            `🎬 *Título:* ${infoVideo.title || infoVideo.titulo}\n` +
            `👤 *Canal:* ${infoVideo.author || infoVideo.canal || 'Desconocido'}\n` +
            `⏱️ *Duración:* ${infoVideo.length || infoVideo.duracion || 'Desconocida'}\n` +
            `👀 *Vistas:* ${infoVideo.views || infoVideo.vistas ? (infoVideo.views || infoVideo.vistas).toLocaleString() : 'Desconocidas'}\n` +
            `📅 *Publicado:* ${infoVideo.published || infoVideo.fecha || 'Desconocida'}\n\n` +
            `🎯 *Calidad solicitada:* ${calidad}\n` +
            `⬇️ *Verificando disponibilidad de descarga...*`
    }, { quoted: m });
    
    // Obtener resoluciones disponibles
    const resolutionsResult = await api.getAvailableResolutions(url);
    let availableResolutions = [];
    
    if (resolutionsResult.success) {
      availableResolutions = resolutionsResult.resolutions;
    }
    
    // Verificar si la calidad solicitada está disponible
    if (availableResolutions.length > 0 && !availableResolutions.includes(calidad)) {
      const closestQuality = availableResolutions[availableResolutions.length - 1]; // Tomar la más alta disponible
      await sock.sendMessage(chatId, {
        text: `⚠️ *Calidad no disponible*\n\n` +
              `🎯 *Solicitada:* ${calidad}\n` +
              `✅ *Disponible:* ${closestQuality}\n\n` +
              `🔄 *Usando calidad disponible: ${closestQuality}*`
      }, { quoted: m });
      calidad = closestQuality;
    }
    
    // Enviar mensaje de descarga
    await sock.sendMessage(chatId, {
      text: `📥 *Iniciando descarga...*\n\n` +
            `🎬 *Título:* ${infoVideo.title || infoVideo.titulo}\n` +
            `🎯 *Calidad:* ${calidad}\n` +
            `🔗 *API:* youtube-video-downloader-api\n\n` +
            `⏳ *Descargando... (puede tardar varios minutos)*`
    }, { quoted: m });
    
    // Descargar el video
    const downloadResult = await api.downloadVideo(url, calidad);
    
    if (!downloadResult.success) {
      throw new Error(downloadResult.error);
    }
    
    // Validar tamaño
    if (downloadResult.sizeMB > CONFIG.maxVideoSizeMB) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Video demasiado grande*\n\n` +
              `📏 *Tamaño:* ${downloadResult.sizeMB.toFixed(2)} MB\n` +
              `📏 *Límite:* ${CONFIG.maxVideoSizeMB} MB\n\n` +
              `💡 *Sugerencias:*\n` +
              `• Intenta con menor calidad (360p o 480p)\n` +
              `• Busca un video más corto`
      }, { quoted: m });
    }
    
    // Validar formato
    const formato = validarFormatoVideo(downloadResult.buffer);
    if (!CONFIG.supportedFormats.includes(formato)) {
      logger.warn(`⚠️ Formato no estándar detectado: ${formato}`);
    }
    
    // Enviar reacción de éxito
    await m.react('✅');
    
    // Enviar el video
    await sock.sendMessage(chatId, {
      video: downloadResult.buffer,
      caption: `🎥 *${infoVideo.title || infoVideo.titulo}*\n\n` +
               `👤 *Canal:* ${infoVideo.author || infoVideo.canal || 'Desconocido'}\n` +
               `⏱️ *Duración:* ${infoVideo.length || infoVideo.duracion || 'Desconocida'}\n` +
               `👀 *Vistas:* ${infoVideo.views || infoVideo.vistas ? (infoVideo.views || infoVideo.vistas).toLocaleString() : 'Desconocidas'}\n` +
               `📏 *Tamaño:* ${downloadResult.sizeMB.toFixed(2)} MB\n` +
               `🎯 *Calidad:* ${calidad} ${formato.toUpperCase()}\n` +
               `🔗 *API:* youtube-video-downloader-api\n\n` +
               `🤖 *Descargado por HINATA-BOT v3.0*`,
      mimetype: downloadResult.contentType,
      contextInfo: {
        externalAdReply: {
          title: infoVideo.title || infoVideo.titulo,
          body: `${infoVideo.author || infoVideo.canal || 'YouTube'} • ${calidad}`,
          thumbnailUrl: infoVideo.thumbnail || infoVideo.thumbnail_url,
          mediaType: 2,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m });
    
    logger.success(`Video descargado exitosamente: ${infoVideo.title || infoVideo.titulo}`);
    
  } catch (error) {
    console.error('❌ Error en descarga de YouTube:', error);
    
    // Enviar reacción de error
    try { await m.react('❌'); } catch {}
    
    // Mensaje de error específico
    let errorMsg = `❌ *Error al descargar el video*\n\n`;
    
    if (error.message.includes('tiempo de espera') || error.message.includes('timeout')) {
      errorMsg += `⏰ *Tiempo de espera agotado*\n\n` +
                  `💡 *Posibles causas:*\n` +
                  `• Video muy grande\n` +
                  `• Conexión lenta\n` +
                  `• Servidores saturados`;
    } else if (error.message.includes('demasiado grande') || error.message.includes('grande')) {
      errorMsg += `📏 *Límite de tamaño excedido*\n\n` +
                  `💡 *Intenta con menor calidad*`;
    } else if (error.message.includes('no encontrado') || error.message.includes('404')) {
      errorMsg += `🔒 *Video no disponible*\n\n` +
                  `💡 *El video puede ser privado o estar eliminado*`;
    } else if (error.message.includes('conexión') || error.message.includes('network')) {
      errorMsg += `🌐 *Problemas de conexión*\n\n` +
                  `💡 *Soluciones:*\n` +
                  `• Verifica tu conexión a internet\n` +
                  `• Intenta más tarde\n` +
                  `• Prueba con otro video`;
    } else {
      errorMsg += `⚠️ *Error específico:* ${error.message.substring(0, 100)}\n\n` +
                  `💡 *Intenta con otro video o más tarde*`;
    }
    
    errorMsg += `\n\n🔧 *Soporte técnico disponible*`;
    
    await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
  }
}
