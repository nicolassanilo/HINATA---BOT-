/**
 * @file YouTube Downloader v4.0 - Sistema Spider-X-API
 * @description Plugin mejorado con sistema Spider-X-API para descargas robustas
 * @version 4.0.0
 */

import SpiderXAPI, { utils } from './spider-x-api.js';

// Configuración del plugin
const CONFIG = {
  maxVideoSizeMB: 100,
  timeout: 180000,
  maxRetries: 3,
  supportedFormats: ['mp4', 'webm', 'mkv', 'avi'],
  qualities: ['144p', '240p', '360p', '480p', '720p', '1080p']
};

// Sistema de logging
const logger = {
  info: (message) => console.log(`[YOUTUBE-SPIDER] ℹ️ ${message}`),
  error: (message, error = null) => {
    console.error(`[YOUTUBE-SPIDER] ❌ ${message}`);
    if (error) console.error('Error:', error);
  },
  success: (message) => console.log(`[YOUTUBE-SPIDER] ✅ ${message}`),
  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[YOUTUBE-SPIDER] 🔍 ${message}`);
      if (data) console.log('Data:', data);
    }
  }
};

// Formatear tamaño
function formatSizeMB(bytes) {
  if (!bytes) return 'Desconocido';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

// Formatear número
function formatNumber(num) {
  if (!num) return 'Desconocido';
  return num.toLocaleString();
}

export const command = ['.youtube', '.ytvideo', '.ytdl', '.ytd', '.spideryt'];

export const help = `
🕷️ *YOUTUBE DOWNLOADER SPIDER-X v4.0* 🕷️

*Sistema avanzado con Spider-X-API y múltiples fuentes*

*📋 Comandos disponibles:*
• \`.youtube <URL>\` - Descargar video
• \`.ytvideo <URL>\` - Alternativa
• \`.ytdl <URL>\` - Abreviatura
• \`.ytd <URL>\` - Versión corta
• \`.spideryt <URL>\` - Versión Spider

*🎯 Características:*
✅ Spider-X-API integrada
✅ 4 APIs de descarga automáticas
✅ Sistema de fallback inteligente
✅ Validación de URLs y archivos
✅ Reintentos automáticos
✅ Manejo robusto de errores
✅ Límite configurable (100MB)

*🕷️ APIs Spider-X integradas:*
• Cobalt API (prioridad 1)
• YTDL API (prioridad 2)
• YT-DLP Web (prioridad 3)
• Loader.to (prioridad 4)

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
• \`.spideryt https://youtube.com/shorts/xxxxx\`

*⚠️ Límites y restricciones:*
• Máximo 100MB por video
• 3 reintentos por API
• 5 minutos de timeout
• Videos privados no soportados

*🔧 Sistema Spider-X:*
• Detección automática de APIs funcionales
• Balanceo de carga automático
• Validación de enlaces de descarga
• Estadísticas de rendimiento
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
              `🎯 *Calidades disponibles:* ${CONFIG.qualities.join(', ')}\n\n` +
              `🕷️ *Sistema:* Spider-X-API v4.0`
      }, { quoted: m });
    }
    
    // Inicializar Spider-X-API
    const spiderAPI = new SpiderXAPI();
    
    // Validar URL
    if (!spiderAPI.validateYouTubeURL(url)) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* URL de YouTube inválida\n\n` +
              `🔗 *URLs válidas:*\n` +
              `• https://www.youtube.com/watch?v=xxxxx\n` +
              `• https://youtu.be/xxxxx\n` +
              `• https://youtube.com/shorts/xxxxx\n` +
              `• https://youtube.com/embed/xxxxx\n\n` +
              `💡 *Asegúrate de copiar la URL completa*\n\n` +
              `🕷️ *Validación por Spider-X-API*`
      }, { quoted: m });
    }
    
    // Validar calidad
    if (!CONFIG.qualities.includes(calidad)) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* Calidad no válida\n\n` +
              `🎯 *Calidades disponibles:* ${CONFIG.qualities.join(', ')}\n\n` +
              `💡 *Uso:* \`.youtube <URL> <calidad>\`\n` +
              `📝 *Ejemplo:* \`.youtube https://youtu.be/xxxxx 720p\`\n\n` +
              `🕷️ *Calidades Spider-X validadas*`
      }, { quoted: m });
    }
    
    // Extraer ID del video
    const videoId = spiderAPI.extractVideoID(url);
    if (!videoId) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* No se pudo extraer el ID del video\n\n` +
              `💡 *Verifica que la URL sea correcta*\n\n` +
              `🕷️ *Extracción por Spider-X-API*`
      }, { quoted: m });
    }
    
    // Enviar mensaje de análisis
    await sock.sendMessage(chatId, {
      text: `🕷️ *Spider-X-API Analizando...*\n\n` +
            `🎬 *ID:* ${videoId}\n` +
            `🎯 *Calidad solicitada:* ${calidad}\n` +
            `⏳ *Verificando disponibilidad...*\n\n` +
            `🔍 *Usando sistema Spider-X de 4 APIs*`
    }, { quoted: m });
    
    // Obtener estadísticas de APIs
    const apiStats = spiderAPI.getAPIStats();
    logger.debug(`APIs disponibles: ${apiStats.enabledAPIs}/${apiStats.totalAPIs}`);
    
    // Obtener información del video
    const infoResult = await spiderAPI.getVideoInfo(url);
    
    if (!infoResult.success) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* No se pudo obtener información del video\n\n` +
              `💡 *Posibles causas:*\n` +
              `• Video privado o eliminado\n` +
              `• Contenido restringido\n` +
              `• URL inválida\n` +
              `• Problemas temporales de YouTube\n\n` +
              `🕷️ *Spider-X-API: Info fallida*`
      }, { quoted: m });
    }
    
    const infoVideo = infoResult.data;
    
    // Mostrar información del video
    await sock.sendMessage(chatId, {
      text: `✅ *Video encontrado por Spider-X*\n\n` +
            `🎬 *Título:* ${infoVideo.title}\n` +
            `👤 *Canal:* ${infoVideo.channel || 'Desconocido'}\n` +
            `⏱️ *Duración:* ${infoVideo.duration || 'Desconocida'}\n` +
            `👀 *Vistas:* ${formatNumber(infoVideo.views)}\n` +
            `📅 *Publicado:* ${infoVideo.uploadedAt || 'Desconocida'}\n\n` +
            `🎯 *Calidad solicitada:* ${calidad}\n` +
            `🕷️ *APIs activas:* ${apiStats.enabledAPIs}/${apiStats.totalAPIs}\n` +
            `⬇️ *Iniciando Spider-X download...*`
    }, { quoted: m });
    
    // Obtener calidades disponibles
    const qualitiesResult = await spiderAPI.getAvailableQualities(url);
    
    if (qualitiesResult.success && qualitiesResult.qualities) {
      const availableQualities = qualitiesResult.qualities;
      
      // Verificar si la calidad solicitada está disponible
      if (!availableQualities.includes(calidad)) {
        const closestQuality = availableQualities[availableQualities.length - 1];
        await sock.sendMessage(chatId, {
          text: `⚠️ *Calidad no disponible*\n\n` +
                `🎯 *Solicitada:* ${calidad}\n` +
                `✅ *Disponible:* ${closestQuality}\n\n` +
                `🔄 *Spider-X ajustando a: ${closestQuality}*`
        }, { quoted: m });
        calidad = closestQuality;
      }
    }
    
    // Enviar mensaje de descarga
    await sock.sendMessage(chatId, {
      text: `🕷️ *Spider-X Download Iniciado*\n\n` +
            `🎬 *Título:* ${infoVideo.title}\n` +
            `🎯 *Calidad:* ${calidad}\n` +
            `🔗 *Sistema:* Spider-X-API\n` +
            `📊 *APIs:* ${apiStats.enabledAPIs} activas\n\n` +
            `⏳ *Spider-X trabajando... (puede tardar varios minutos)*`
    }, { quoted: m });
    
    // Descargar el video con Spider-X-API
    const downloadResult = await spiderAPI.downloadVideo(url, calidad);
    
    if (!downloadResult.success) {
      let errorMsg = `❌ *Spider-X-API Error*\n\n`;
      
      if (downloadResult.results && downloadResult.results.length > 0) {
        errorMsg += `🕷️ *Resultados de APIs:*\n`;
        downloadResult.results.forEach(result => {
          errorMsg += `• ${result.api}: ❌ ${result.error}\n`;
        });
      }
      
      errorMsg += `\n💡 *Soluciones:*\n` +
                  `• Intenta con otro video\n` +
                  `• Prueba diferente calidad\n` +
                  `• Verifica tu conexión\n` +
                  `• Intenta más tarde`;
      
      return await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
    }
    
    // Validar tamaño si está disponible
    let tamañoMB = 0;
    if (downloadResult.size && downloadResult.size !== 'Unknown') {
      tamañoMB = spiderAPI.parseSize(downloadResult.size);
      
      if (tamañoMB > CONFIG.maxVideoSizeMB) {
        return await sock.sendMessage(chatId, {
          text: `❌ *Video demasiado grande*\n\n` +
                `📏 *Tamaño:* ${downloadResult.size} (${tamañoMB.toFixed(1)} MB)\n` +
                `📏 *Límite:* ${CONFIG.maxVideoSizeMB} MB\n\n` +
                `💡 *Sugerencias Spider-X:*\n` +
                `• Intenta con menor calidad (360p o 480p)\n` +
                `• Busca un video más corto\n` +
                `• Spider-X recomienda calidad media`
        }, { quoted: m });
      }
    }
    
    // Enviar mensaje de descarga del archivo
    await sock.sendMessage(chatId, {
      text: `📥 *Spider-X Descargando archivo...*\n\n` +
            `🎬 *Título:* ${infoVideo.title}\n` +
            `🎯 *Calidad:* ${downloadResult.quality}\n` +
            `📏 *Tamaño:* ${downloadResult.size || 'Calculando...'}\n` +
            `🕷️ *API usada:* ${downloadResult.api}\n` +
            `🔄 *Intento:* ${downloadResult.attempt}\n\n` +
            `⏳ *Spider-X descargando bytes...*`
    }, { quoted: m });
    
    // Descargar el archivo completo
    const fileResult = await spiderAPI.downloadFile(downloadResult.url, CONFIG.maxVideoSizeMB);
    
    if (!fileResult.success) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error descargando archivo*\n\n` +
              `🕷️ *Spider-X Error:* ${fileResult.error}\n\n` +
              `💡 *El enlace de descarga expiró o no está disponible*\n` +
              `🔄 *Intenta descargar nuevamente*`
      }, { quoted: m });
    }
    
    // Validar formato
    const formato = spiderAPI.validateVideoFormat(fileResult.buffer);
    if (!CONFIG.supportedFormats.includes(formato)) {
      logger.warn(`⚠️ Formato no estándar detectado por Spider-X: ${formato}`);
    }
    
    // Enviar reacción de éxito
    await m.react('✅');
    
    // Enviar el video
    await sock.sendMessage(chatId, {
      video: fileResult.buffer,
      caption: `🕷️ *${infoVideo.title}*\n\n` +
               `👤 *Canal:* ${infoVideo.channel || 'Desconocido'}\n` +
               `⏱️ *Duración:* ${infoVideo.duration || 'Desconocida'}\n` +
               `👀 *Vistas:* ${formatNumber(infoVideo.views)}\n` +
               `📏 *Tamaño:* ${fileResult.sizeMB.toFixed(2)} MB\n` +
               `🎯 *Calidad:* ${downloadResult.quality} ${formato.toUpperCase()}\n` +
               `🕷️ *API:* ${downloadResult.api}\n` +
               `🔄 *Intento:* ${downloadResult.attempt}\n\n` +
               `🤖 *Descargado por HINATA-BOT Spider-X v4.0*`,
      mimetype: fileResult.contentType,
      contextInfo: {
        externalAdReply: {
          title: infoVideo.title,
          body: `${infoVideo.channel || 'YouTube'} • ${downloadResult.quality} • Spider-X`,
          thumbnailUrl: infoVideo.thumbnail,
          mediaType: 2,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m });
    
    logger.success(`Video descargado exitosamente por Spider-X: ${infoVideo.title}`);
    
  } catch (error) {
    console.error('❌ Error en Spider-X YouTube:', error);
    
    // Enviar reacción de error
    try { await m.react('❌'); } catch {}
    
    // Mensaje de error específico
    let errorMsg = `❌ *Spider-X API Error*\n\n`;
    
    if (error.message.includes('tiempo de espera') || error.message.includes('timeout')) {
      errorMsg += `⏰ *Tiempo de espera agotado*\n\n` +
                  `💡 *Spider-X sugiere:*\n` +
                  `• Video muy grande\n` +
                  `• Conexión lenta\n` +
                  `• Servidores saturados`;
    } else if (error.message.includes('demasiado grande') || error.message.includes('grande')) {
      errorMsg += `📏 *Límite de tamaño excedido*\n\n` +
                  `💡 *Spider-X recomienda:*\n` +
                  `• Intenta con menor calidad\n` +
                  `• Busca video más corto`;
    } else if (error.message.includes('no encontrado') || error.message.includes('404')) {
      errorMsg += `🔒 *Video no disponible*\n\n` +
                  `💡 *Spider-X detectó:*\n` +
                  `• Video privado o eliminado\n` +
                  `• URL incorrecta`;
    } else if (error.message.includes('conexión') || error.message.includes('network')) {
      errorMsg += `🌐 *Problemas de conexión Spider-X*\n\n` +
                  `💡 *Soluciones:*\n` +
                  `• Verifica conexión a internet\n` +
                  `• Intenta más tarde\n` +
                  `• Spider-X reintentará automáticamente`;
    } else {
      errorMsg += `⚠️ *Error Spider-X:* ${error.message.substring(0, 100)}\n\n` +
                  `💡 *Spider-X está trabajando en ello*\n` +
                  `🔄 *Intenta con otro video o más tarde*`;
    }
    
    errorMsg += `\n\n🕷️ *Spider-X-API v4.0 - Sistema avanzado*`;
    
    await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
  }
}
