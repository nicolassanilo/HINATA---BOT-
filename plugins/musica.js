/**
 * @file Plugin Musica Mejorado - Descarga y envía música con información detallada
 * @version 2.1.0
 * @author Mejorado para HINATA-BOT
 */

import axios from 'axios';
import yts from 'yt-search';
import { obtenerConfig } from '../lib/functions.js';

export const command = '.musica';

export const help = `
🎵 *COMANDO DE MÚSICA MEJORADO*

Descarga y envía música desde múltiples plataformas con información detallada.

*Uso:*
  \`.musica <URL o término de búsqueda> [formato]\`

*Formatos disponibles:*
  - mp3 (predeterminado - mejor calidad/peso)
  - wav (alta calidad)
  - ogg (buena compresión)
  - opus (muy comprimido)
  - m4a (compatible con iOS)

*Ejemplos:*
  - \`.musica Queen - Bohemian Rhapsody\`
  - \`.musica https://www.youtube.com/watch?v=fJ9rUzIMcZQ\`
  - \`.musica https://youtu.be/xxxx wav\`
  - \`.musica never gonna give you up mp3\`

*Plataformas soportadas:*
  YouTube, SoundCloud, Twitter, TikTok, Instagram, y más.
`;

// Función para buscar en YouTube con mejor información
async function buscarEnYouTube(query) {
  try {
    const config = obtenerConfig();

    // Si hay API key de Google, usar búsqueda personalizada
    if (config.googleSearchApiKey && config.googleCseId) {
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${config.googleSearchApiKey}&cx=${config.googleCseId}&q=${encodeURIComponent(query + ' site:youtube.com')}`;
      const response = await axios.get(searchUrl);

      if (response.data.items && response.data.items.length > 0) {
        const link = response.data.items[0].link;
        if (link.includes('youtube.com/watch')) {
          return { url: link, titulo: response.data.items[0].title };
        }
      }
    }

    // Fallback: usar yt-search para encontrar el primer video con más info
    const searchResult = await yts(query);
    if (searchResult.videos && searchResult.videos.length > 0) {
      const video = searchResult.videos[0];
      return {
        url: video.url,
        titulo: video.title,
        duracion: video.duration?.timestamp || video.duration,
        vistas: video.views,
        canal: video.author?.name,
        fecha: video.uploadedAt
      };
    }

    return null;
  } catch (err) {
    console.error('Error en búsqueda de YouTube:', err);
    return null;
  }
}

// Función para validar si es una URL válida
function esURL(text) {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

// Función para obtener información de la URL (si es YouTube)
async function obtenerInfoURL(url) {
  try {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoInfo = await yts({ videoId: url.split('v=')[1] || url.split('/').pop() });
      if (videoInfo) {
        return {
          titulo: videoInfo.title,
          duracion: videoInfo.duration?.timestamp,
          vistas: videoInfo.views,
          canal: videoInfo.author?.name,
          fecha: videoInfo.uploadedAt
        };
      }
    }
    return null;
  } catch (err) {
    console.error('Error obteniendo info de URL:', err);
    return null;
  }
}

// Función para descargar usando Cobalt API mejorada
async function descargarConCobalt(url, formato = 'mp3') {
  const COBALT_API = 'https://api.cobalt.tools/api/json';

  try {
    const response = await axios.post(COBALT_API, {
      url: url,
      vCodec: 'h264',
      vQuality: '720',
      aFormat: formato,
      filenamePattern: 'basic',
      isAudioOnly: true,
      disableMetadata: false
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.data && response.data.status === 'redirect' && response.data.url) {
      return {
        success: true,
        url: response.data.url,
        filename: response.data.filename || 'audio'
      };
    } else if (response.data && response.data.status === 'picker' && response.data.picker) {
      // Si hay múltiples opciones, tomar la primera
      return {
        success: true,
        url: response.data.picker[0].url,
        filename: response.data.picker[0].filename || 'audio'
      };
    } else {
      return {
        success: false,
        error: response.data.text || 'No se pudo procesar la URL'
      };
    }
  } catch (err) {
    console.error('Error en Cobalt API:', err.message);
    return {
      success: false,
      error: err.response?.data?.text || err.message || 'Error al conectar con el servicio de descarga'
    };
  }
}

export async function run(sock, m, { text }) {
  const chatId = m.key.remoteJid;

  if (!text || text.trim().length === 0) {
    return await sock.sendMessage(chatId, {
      text: `🎵 *COMANDO DE MÚSICA MEJORADO* 🎵\n\n` +
            `💡 *Uso:* \`.musica <URL o búsqueda> [formato]\`\n\n` +
            `🎼 *Formatos disponibles:*\n` +
            `• mp3 (predeterminado - óptimo)\n` +
            `• wav (alta calidad)\n` +
            `• ogg (buena compresión)\n` +
            `• opus (muy comprimido)\n` +
            `• m4a (compatible iOS)\n\n` +
            `📱 *Ejemplos:*\n` +
            `• \`.musica Bohemian Rhapsody\`\n` +
            `• \`.musica https://youtu.be/xxxx\`\n` +
            `• \`.musica https://youtu.be/xxxx wav\`\n\n` +
            `🌐 *Plataformas:* YouTube, SoundCloud, TikTok, Twitter, Instagram, etc.\n\n` +
            `⚡ *Características:*\n` +
            `• Información detallada de la canción\n` +
            `• Tamaño optimizado para WhatsApp\n` +
            `• Múltiples formatos de audio\n` +
            `• Búsqueda inteligente`
    }, { quoted: m });
  }

  // Parsear argumentos
  const args = text.trim().split(/\s+/);
  const formatosValidos = ['mp3', 'wav', 'ogg', 'opus', 'm4a'];

  // Verificar si el último argumento es un formato
  let formato = 'mp3';
  let query = text.trim();

  const ultimoArg = args[args.length - 1].toLowerCase();
  if (formatosValidos.includes(ultimoArg)) {
    formato = ultimoArg;
    query = args.slice(0, -1).join(' ');
  }

  let url = null;
  let infoCancion = null;

  // Verificar si es una URL directa
  if (esURL(query)) {
    url = query;
    infoCancion = await obtenerInfoURL(url);
  } else {
    // Buscar en YouTube
    await sock.sendMessage(chatId, {
      text: `🔍 *Buscando:* "${query}"...`
    }, { quoted: m });

    const resultadoBusqueda = await buscarEnYouTube(query);

    if (!resultadoBusqueda) {
      return await sock.sendMessage(chatId, {
        text: `❌ *No se encontraron resultados* para: "${query}"\n\n` +
              `💡 *Sugerencias:*\n` +
              `• Verifica la ortografía\n` +
              `• Usa el nombre del artista y canción\n` +
              `• Prueba con una URL directa\n` +
              `• Evita caracteres especiales`
      }, { quoted: m });
    }

    url = resultadoBusqueda.url;
    infoCancion = resultadoBusqueda;
  }

  // Mostrar información de la canción si está disponible
  if (infoCancion) {
    await sock.sendMessage(chatId, {
      text: `🎵 *INFORMACIÓN DE LA CANCIÓN* 🎵\n\n` +
            `📀 *Título:* ${infoCancion.titulo || 'Desconocido'}\n` +
            `${infoCancion.canal ? `🎤 *Artista/Canal:* ${infoCancion.canal}\n` : ''}` +
            `${infoCancion.duracion ? `⏱️ *Duración:* ${infoCancion.duracion}\n` : ''}` +
            `${infoCancion.vistas ? `👀 *Vistas:* ${infoCancion.vistas?.toLocaleString()}\n` : ''}` +
            `${infoCancion.fecha ? `📅 *Subido:* ${infoCancion.fecha}\n` : ''}\n` +
            `⬇️ *Descargando en formato ${formato.toUpperCase()}...*`
    }, { quoted: m });
  } else {
    // Mensaje de descarga sin info detallada
    await sock.sendMessage(chatId, {
      text: `⬇️ *Descargando audio...*\n\n` +
            `📎 *Formato:* ${formato.toUpperCase()}\n` +
            `🔗 *URL:* ${url}\n\n` +
            `⏳ *Procesando...*`
    }, { quoted: m });
  }

  try {
    // Descargar usando Cobalt API
    const resultado = await descargarConCobalt(url, formato);

    if (!resultado.success) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error en la descarga:*\n${resultado.error}\n\n` +
              `💡 *Posibles soluciones:*\n` +
              `• Verifica que la URL sea válida\n` +
              `• El contenido podría estar restringido\n` +
              `• Prueba con otro formato\n` +
              `• Intenta más tarde`
      }, { quoted: m });
    }

    // Descargar el archivo de audio
    const audioResponse = await axios.get(resultado.url, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxContentLength: 50 * 1024 * 1024, // 50 MB máximo
      maxBodyLength: 50 * 1024 * 1024
    });

    const buffer = Buffer.from(audioResponse.data);

    // Verificar tamaño
    const maxSizeBytes = 50 * 1024 * 1024; // 50 MB
    if (buffer.length > maxSizeBytes) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Archivo demasiado grande*\n\n` +
              `📏 *Tamaño:* ${(buffer.length / 1024 / 1024).toFixed(2)} MB\n` +
              `📱 *Límite WhatsApp:* 50 MB\n\n` +
              `💡 *Sugerencias:*\n` +
              `• Usa formato MP3 para reducir tamaño\n` +
              `• Busca una versión más corta\n` +
              `• Divide en partes si es posible`
      }, { quoted: m });
    }

    // Determinar mimetype según formato
    const mimetypes = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      opus: 'audio/opus',
      m4a: 'audio/mp4'
    };

    const mimetype = mimetypes[formato] || 'audio/mpeg';
    const filename = resultado.filename || `audio.${formato}`;

    // Enviar audio con información adicional
    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: mimetype,
      fileName: filename,
      ptt: false,
      contextInfo: {
        externalAdReply: {
          title: infoCancion?.titulo || filename,
          body: `🎵 Formato: ${formato.toUpperCase()} | Tamaño: ${(buffer.length / 1024).toFixed(2)} KB`,
          mediaType: 2,
          thumbnailUrl: infoCancion?.thumbnail || null,
          sourceUrl: url
        }
      }
    }, { quoted: m });

    console.log(`✅ Audio enviado: ${filename} (${(buffer.length / 1024).toFixed(2)} KB) - Formato: ${formato}`);

  } catch (err) {
    console.error('Error al procesar audio:', err);

    let errorMsg = '❌ *Error al procesar el audio*\n\n';

    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      errorMsg += '⏱️ *Tiempo de espera agotado*\n\n' +
                  'El archivo puede ser muy grande o el servidor está lento.\n' +
                  'Intenta con un formato más comprimido (opus/mp3).';
    } else if (err.response && err.response.status === 404) {
      errorMsg += '🔍 *Contenido no encontrado*\n\n' +
                  'Verifica que la URL sea correcta y que el contenido esté disponible.';
    } else if (err.message && err.message.includes('maxContentLength')) {
      errorMsg += '📦 *Archivo demasiado grande*\n\n' +
                  'El archivo supera el límite de descarga. Prueba con MP3.';
    } else {
      errorMsg += `💡 *Error técnico:* ${err.message}\n\n` +
                  'Intenta con otra URL, formato diferente, o contacta al administrador.';
    }

    await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
  }
}