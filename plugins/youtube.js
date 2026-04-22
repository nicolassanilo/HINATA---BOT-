/**
 * @file Plugin YouTube Video Downloader con límite de tamaño
 * @version 1.0.0
 * @author HINATA-BOT
 */

import axios from 'axios';
import yts from 'yt-search';
import { ytv } from '../lib/y2mate.js';
import { obtenerConfig } from '../lib/functions.js';

export const command = '.youtube';

export const help = `
🎥 *COMANDO DE DESCARGA DE VIDEOS DE YOUTUBE*

Descarga videos de YouTube con límite de tamaño para evitar errores.

*Uso:*
  \`.youtube <URL de YouTube>\`

*Ejemplos:*
  - \`.youtube https://www.youtube.com/watch?v=xxxxx\`
  - \`.youtube https://youtu.be/xxxxx\`

*Características:*
  • Verificación de tamaño antes de descargar
  • Límite configurable (por defecto 50 MB)
  • Calidad 720p MP4
  • Información detallada del video
`;

// Función para parsear tamaño (ej: "10.5 MB" -> 10.5)
function parseSize(sizeStr) {
  const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*(MB|GB|KB)/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  switch (unit) {
    case 'GB': return value * 1024;
    case 'MB': return value;
    case 'KB': return value / 1024;
    default: return value;
  }
}

// Función para validar URL de YouTube
function esYouTubeURL(url) {
  const ytRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/;
  return ytRegex.test(url);
}

// Función para obtener información del video
async function obtenerInfoVideo(url) {
  try {
    const videoInfo = await yts({ videoId: url.split('v=')[1] || url.split('/').pop() });
    if (videoInfo) {
      return {
        titulo: videoInfo.title,
        duracion: videoInfo.duration?.timestamp,
        vistas: videoInfo.views,
        canal: videoInfo.author?.name,
        fecha: videoInfo.uploadedAt,
        thumbnail: videoInfo.thumbnail
      };
    }
    return null;
  } catch (err) {
    console.error('Error obteniendo info del video:', err);
    return null;
  }
}

export async function run(sock, m, { text }) {
  const chatId = (m && m.key && m.key.remoteJid) ? m.key.remoteJid : (m.chat || m.from || '');

  if (!text.trim()) {
    return await sock.sendMessage(chatId, {
      text: `❌ *Error:* Debes proporcionar una URL de YouTube\n\n` +
            `📝 *Uso correcto:*\n` +
            `\`.youtube https://www.youtube.com/watch?v=xxxxx\`\n\n` +
            `💡 *Ejemplo:*\n` +
            `\`.youtube https://youtu.be/dQw4w9WgXcQ\``
    }, { quoted: m });
  }

  const url = text.trim();

  if (!esYouTubeURL(url)) {
    return await sock.sendMessage(chatId, {
      text: `❌ *Error:* La URL proporcionada no es válida o no es de YouTube\n\n` +
            `🔗 *URLs válidas:*\n` +
            `• https://www.youtube.com/watch?v=xxxxx\n` +
            `• https://youtu.be/xxxxx\n` +
            `• https://youtube.com/embed/xxxxx`
    }, { quoted: m });
  }

  await sock.sendMessage(chatId, {
    text: `🔍 *Analizando video...*\n\n` +
          `⏳ *Verificando tamaño y disponibilidad...*`
  }, { quoted: m });

  try {
    // Obtener información del video
    const infoVideo = await obtenerInfoVideo(url);
    if (!infoVideo) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* No se pudo obtener información del video\n\n` +
              `💡 *Posibles causas:*\n` +
              `• Video privado o eliminado\n` +
              `• Contenido restringido\n` +
              `• URL inválida`
      }, { quoted: m });
    }

    // Obtener detalles de descarga con y2mate
    const detallesDescarga = await ytv(url);
    if (!detallesDescarga || !detallesDescarga.size) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error:* No se pudo obtener información de descarga\n\n` +
              `💡 *Intenta más tarde o con otro video*`
      }, { quoted: m });
    }

    // Parsear tamaño
    const tamañoMB = parseSize(detallesDescarga.size);
    const config = obtenerConfig();
    const limiteMB = config.maxVideoSizeMB || 50;

    if (tamañoMB > limiteMB) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Video demasiado grande*\n\n` +
              `📏 *Tamaño del video:* ${detallesDescarga.size} (${tamañoMB.toFixed(1)} MB)\n` +
              `📏 *Límite máximo:* ${limiteMB} MB\n\n` +
              `💡 *Sugerencias:*\n` +
              `• Busca un video más corto\n` +
              `• Usa el comando .musica para audio\n` +
              `• Contacta al admin para aumentar el límite`
      }, { quoted: m });
    }

    // Mostrar información y comenzar descarga
    await sock.sendMessage(chatId, {
      text: `✅ *Video encontrado y aprobado*\n\n` +
            `🎬 *Título:* ${infoVideo.titulo}\n` +
            `👤 *Canal:* ${infoVideo.canal || 'Desconocido'}\n` +
            `⏱️ *Duración:* ${infoVideo.duracion || 'Desconocida'}\n` +
            `👀 *Vistas:* ${infoVideo.vistas ? infoVideo.vistas.toLocaleString() : 'Desconocidas'}\n` +
            `📏 *Tamaño:* ${detallesDescarga.size}\n` +
            `🎯 *Calidad:* ${detallesDescarga.quality} MP4\n\n` +
            `⬇️ *Descargando video...*`
    }, { quoted: m });

    // Descargar el video
    const videoResponse = await axios.get(detallesDescarga.link, {
      responseType: 'arraybuffer',
      timeout: 120000, // 2 minutos
      maxContentLength: limiteMB * 1024 * 1024, // límite en bytes
      maxBodyLength: limiteMB * 1024 * 1024
    });

    const buffer = Buffer.from(videoResponse.data);

    // Enviar el video
    await sock.sendMessage(chatId, {
      video: buffer,
      caption: `🎥 *${infoVideo.titulo}*\n\n` +
               `👤 *Canal:* ${infoVideo.canal || 'Desconocido'}\n` +
               `📏 *Tamaño:* ${detallesDescarga.size}\n` +
               `🎯 *Calidad:* ${detallesDescarga.quality} MP4\n\n` +
               `🤖 *Descargado por HINATA-BOT*`,
      mimetype: 'video/mp4'
    }, { quoted: m });

  } catch (error) {
    console.error('Error descargando video:', error);

    let mensajeError = `❌ *Error al descargar el video*\n\n`;

    if (error.code === 'ECONNABORTED') {
      mensajeError += `⏰ *Tiempo de espera agotado*\n\n💡 *El video es muy grande o la conexión es lenta*`;
    } else if (error.response && error.response.status === 404) {
      mensajeError += `🔍 *Video no encontrado*\n\n💡 *Verifica que la URL sea correcta*`;
    } else if (error.message.includes('size')) {
      mensajeError += `📏 *El video excede el límite de tamaño*\n\n💡 *Prueba con un video más corto*`;
    } else {
      mensajeError += `⚠️ *Error desconocido:* ${error.message}\n\n💡 *Intenta con otro video o contacta al soporte*`;
    }

    await sock.sendMessage(chatId, { text: mensajeError }, { quoted: m });
  }
}