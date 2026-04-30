/**
 * @file Plugin YouTube Downloader v2.0 - Sistema robusto de descarga
 * @description Mejorado con múltiples APIs, formatos y manejo de errores avanzado
 * @version 2.0.0
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
  qualities: ['360p', '480p', '720p', '1080p']
};

// APIs de descarga con fallback
const DOWNLOAD_APIS = [
  {
    name: 'y2mate',
    priority: 1,
    enabled: true,
    download: async (url, quality = '720p') => {
      try {
        // Implementación mejorada de y2mate
        const response = await axios.post('https://www.y2mate.com/api/convert', {
          url: url,
          quality: quality,
          format: 'mp4'
        }, {
          timeout: CONFIG.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && response.data.downloadUrl) {
          return {
            url: response.data.downloadUrl,
            size: response.data.size || 'Unknown',
            quality: response.data.quality || quality,
            format: response.data.format || 'mp4'
          };
        }
        return null;
      } catch (error) {
        console.error('Error con y2mate:', error.message);
        return null;
      }
    }
  },
  {
    name: 'yt5s',
    priority: 2,
    enabled: true,
    download: async (url, quality = '720p') => {
      try {
        const response = await axios.post('https://yt5s.com/api/ajaxSearch', {
          q: url,
          vt: 'mp4'
        }, {
          timeout: CONFIG.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        if (response.data && response.data.links) {
          const links = JSON.parse(response.data.links);
          const qualityKey = Object.keys(links).find(key => key.includes(quality)) || Object.keys(links)[0];
          
          if (links[qualityKey]) {
            return {
              url: links[qualityKey],
              size: 'Unknown',
              quality: qualityKey,
              format: 'mp4'
            };
          }
        }
        return null;
      } catch (error) {
        console.error('Error con yt5s:', error.message);
        return null;
      }
    }
  },
  {
    name: 'ytmp3',
    priority: 3,
    enabled: true,
    download: async (url, quality = '720p') => {
      try {
        const response = await axios.get(`https://api.ytmp3.vip/api/convert?url=${encodeURIComponent(url)}&format=mp4`, {
          timeout: CONFIG.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.data && response.data.downloadUrl) {
          return {
            url: response.data.downloadUrl,
            size: response.data.size || 'Unknown',
            quality: response.data.quality || quality,
            format: 'mp4'
          };
        }
        return null;
      } catch (error) {
        console.error('Error con ytmp3:', error.message);
        return null;
      }
    }
  }
];

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

// Obtener información del video con múltiples fuentes
async function obtenerInfoVideo(videoId) {
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
    console.error('Error obteniendo info del video:', error.message);
    return null;
  }
}

// Descargar video con reintentos y múltiples APIs
async function descargarVideoConAPIs(url, calidad = '720p') {
  const apisOrdenadas = DOWNLOAD_APIS.filter(api => api.enabled).sort((a, b) => a.priority - b.priority);
  
  for (const api of apisOrdenadas) {
    for (let intento = 1; intento <= CONFIG.maxRetries; intento++) {
      try {
        console.log(`📡 Intentando API ${api.name} (intento ${intento}/${CONFIG.maxRetries})`);
        
        const resultado = await api.download(url, calidad);
        
        if (resultado && resultado.url) {
          console.log(`✅ Éxito con ${api.name}: ${resultado.quality}`);
          return {
            ...resultado,
            api: api.name,
            intento: intento
          };
        }
      } catch (error) {
        console.error(`❌ Error con ${api.name} (intento ${intento}):`, error.message);
        
        if (intento < CONFIG.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * intento));
        }
      }
    }
  }
  
  throw new Error('No se pudo descargar el video con ninguna API');
}

// Descargar archivo con validación
async function descargarArchivo(url, maxSizeMB = CONFIG.maxVideoSizeMB) {
  try {
    console.log(`📥 Descargando archivo: ${url}`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: CONFIG.downloadTimeout,
      maxContentLength: maxSizeMB * 1024 * 1024,
      maxBodyLength: maxSizeMB * 1024 * 1024,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });
    
    const buffer = Buffer.from(response.data);
    const sizeMB = buffer.length / (1024 * 1024);
    
    console.log(`✅ Archivo descargado: ${sizeMB.toFixed(2)} MB`);
    
    return {
      buffer,
      sizeMB,
      contentType: response.headers['content-type'] || 'video/mp4'
    };
  } catch (error) {
    console.error('❌ Error descargando archivo:', error.message);
    throw error;
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

export const command = ['.youtube', '.ytvideo', '.ytdl'];

export const help = `
🎥 *YOUTUBE DOWNLOADER v2.0* 🎥

*Sistema mejorado con múltiples APIs y robustez*

*📋 Comandos disponibles:*
• \`.youtube <URL>\` - Descargar video
• \`.ytvideo <URL>\` - Alternativa
• \`.ytdl <URL>\` - Abreviatura

*🎯 Características:*
✅ Múltiples APIs de descarga
✅ Reintentos automáticos
✅ Validación de tamaño y formato
✅ Soporte para diferentes calidades
✅ Manejo robusto de errores
✅ Límite configurable (100MB)

*🎬 Calidades soportadas:*
• 360p - Baja calidad, rápido
• 480p - Calidad estándar
• 720p - Alta calidad (defecto)
• 1080p - Máxima calidad

*📋 Ejemplos de uso:*
• \`.youtube https://youtu.be/dQw4w9WgXcQ\`
• \`.youtube https://www.youtube.com/watch?v=xxxxx\`
• \`.youtube https://youtube.com/shorts/xxxxx\`

*⚠️ Límites y restricciones:*
• Máximo 100MB por video
• 3 reintentos automáticos
• 5 minutos de timeout
• Videos privados no soportados

*🛠️ APIs de respaldo:*
• y2mate (principal)
• yt5s (alternativa)
• ytmp3 (fallback)
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
    
    // Obtener información del video
    const infoVideo = await obtenerInfoVideo(videoId);
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
            `🎬 *Título:* ${infoVideo.titulo}\n` +
            `👤 *Canal:* ${infoVideo.canal || 'Desconocido'}\n` +
            `⏱️ *Duración:* ${infoVideo.duracion || 'Desconocida'}\n` +
            `👀 *Vistas:* ${infoVideo.vistas ? infoVideo.vistas.toLocaleString() : 'Desconocidas'}\n` +
            `📅 *Publicado:* ${infoVideo.fecha || 'Desconocida'}\n\n` +
            `🎯 *Calidad solicitada:* ${calidad}\n` +
            `⬇️ *Buscando fuentes de descarga...*`
    }, { quoted: m });
    
    // Obtener información de descarga
    const infoDescarga = await descargarVideoConAPIs(url, calidad);
    
    // Validar tamaño si está disponible
    let tamañoMB = 0;
    if (infoDescarga.size && infoDescarga.size !== 'Unknown') {
      tamañoMB = parseSize(infoDescarga.size);
      
      if (tamañoMB > CONFIG.maxVideoSizeMB) {
        return await sock.sendMessage(chatId, {
          text: `❌ *Video demasiado grande*\n\n` +
                `📏 *Tamaño:* ${infoDescarga.size} (${tamañoMB.toFixed(1)} MB)\n` +
                `📏 *Límite:* ${CONFIG.maxVideoSizeMB} MB\n\n` +
                `💡 *Sugerencias:*\n` +
                `• Intenta con menor calidad (360p o 480p)\n` +
                `• Busca un video más corto\n` +
                `• Usa \`.musica\` para descargar solo audio`
        }, { quoted: m });
      }
    }
    
    // Enviar mensaje de descarga
    await sock.sendMessage(chatId, {
      text: `📥 *Iniciando descarga...*\n\n` +
            `🎬 *Título:* ${infoVideo.titulo}\n` +
            `🎯 *Calidad:* ${infoDescarga.quality}\n` +
            `📏 *Tamaño:* ${infoDescarga.size || 'Calculando...'}\n` +
            `🔗 *API:* ${infoDescarga.api}\n\n` +
            `⏳ *Descargando... (puede tardar varios minutos)*`
    }, { quoted: m });
    
    // Descargar el video
    const { buffer, sizeMB, contentType } = await descargarArchivo(infoDescarga.url, CONFIG.maxVideoSizeMB);
    
    // Validar formato
    const formato = validarFormatoVideo(buffer);
    if (!CONFIG.supportedFormats.includes(formato)) {
      console.warn(`⚠️ Formato no estándar detectado: ${formato}`);
    }
    
    // Enviar reacción de éxito
    await m.react('✅');
    
    // Enviar el video
    await sock.sendMessage(chatId, {
      video: buffer,
      caption: `🎥 *${infoVideo.titulo}*\n\n` +
               `👤 *Canal:* ${infoVideo.canal || 'Desconocido'}\n` +
               `⏱️ *Duración:* ${infoVideo.duracion || 'Desconocida'}\n` +
               `👀 *Vistas:* ${infoVideo.vistas ? infoVideo.vistas.toLocaleString() : 'Desconocidas'}\n` +
               `📏 *Tamaño:* ${sizeMB.toFixed(2)} MB\n` +
               `🎯 *Calidad:* ${infoDescarga.quality} ${formato.toUpperCase()}\n` +
               `🔗 *API:* ${infoDescarga.api}\n\n` +
               `🤖 *Descargado por HINATA-BOT v2.0*`,
      mimetype: contentType,
      contextInfo: {
        externalAdReply: {
          title: infoVideo.titulo,
          body: `${infoVideo.canal || 'YouTube'} • ${infoDescarga.quality}`,
          thumbnailUrl: infoVideo.thumbnail,
          mediaType: 2,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m });
    
  } catch (error) {
    console.error('❌ Error en descarga de YouTube:', error);
    
    // Enviar reacción de error
    try { await m.react('❌'); } catch {}
    
    // Mensaje de error específico
    let errorMsg = `❌ *Error al descargar el video*\n\n`;
    
    if (error.message.includes('No se pudo descargar')) {
      errorMsg += `🌐 *APIs no disponibles*\n\n` +
                  `💡 *Soluciones:*\n` +
                  `• Intenta más tarde\n` +
                  `• Prueba con otro video\n` +
                  `• Verifica tu conexión`;
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMsg += `⏰ *Tiempo de espera agotado*\n\n` +
                  `💡 *Posibles causas:*\n` +
                  `• Video muy grande\n` +
                  `• Conexión lenta\n` +
                  `• Servidores saturados`;
    } else if (error.message.includes('tamaño')) {
      errorMsg += `📏 *Límite de tamaño excedido*\n\n` +
                  `💡 *Intenta con menor calidad*`;
    } else if (error.message.includes('privado') || error.message.includes('eliminado')) {
      errorMsg += `🔒 *Video no disponible*\n\n` +
                  `💡 *El video puede ser privado o estar eliminado*`;
    } else {
      errorMsg += `⚠️ *Error específico:* ${error.message.substring(0, 100)}\n\n` +
                  `💡 *Intenta con otro video o más tarde*`;
    }
    
    errorMsg += `\n\n🔧 *Soporte técnico disponible*`;
    
    await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
  }
}
