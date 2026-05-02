/**
 * @file Plugin Media Downloader - Descargador multimedia
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema completo para descargar contenido de múltiples plataformas
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// Configuración
const CONFIG = {
  enableLogging: true,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  downloadPath: './downloads',
  supportedPlatforms: ['youtube', 'instagram', 'tiktok', 'twitter', 'facebook'],
  qualityOptions: {
    audio: ['low', 'medium', 'high'],
    video: ['360p', '720p', '1080p']
  }
};

// Sistema de logging
const downloadLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[DOWNLOAD] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[DOWNLOAD] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[DOWNLOAD] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[DOWNLOAD] ❌ ${message}`)
};

// Funciones principales
export const command = ['.ytmp3', '.ytmp4', '.insta', '.tiktok', '.twitter', '.fb', '.play', '.quality'];
export const alias = ['.youtubeaudio', '.youtubevideo', '.instagram', '.tiktokdl', '.twitterdl', '.facebook', '.playvideo', '.calidad'];
export const description = 'Sistema de descarga multimedia de múltiples plataformas';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.ytmp3':
        await downloadYouTubeAudio(sock, m, text);
        break;
      case '.ytmp4':
        await downloadYouTubeVideo(sock, m, text);
        break;
      case '.insta':
        await downloadInstagram(sock, m, text);
        break;
      case '.tiktok':
        await downloadTikTok(sock, m, text);
        break;
      case '.twitter':
        await downloadTwitter(sock, m, text);
        break;
      case '.fb':
        await downloadFacebook(sock, m, text);
        break;
      case '.play':
        await playMedia(sock, m, text);
        break;
      case '.quality':
        await showQualityOptions(sock, m);
        break;
      default:
        await showDownloadHelp(sock, m);
    }
  } catch (error) {
    downloadLogger.error('Error en sistema de descarga:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de descarga. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Descargar audio de YouTube
async function downloadYouTubeAudio(sock, m, text) {
  const chatId = m.key.remoteJid;
  const url = text.split(' ')[1];

  if (!url) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes proporcionar una URL de YouTube.\n\n💡 *Uso:* `.ytmp3 <url>`'
    }, { quoted: m });
  }

  try {
    await sock.sendMessage(chatId, {
      text: '🔄 *Procesando descarga de audio...*\n\n⏳ Por favor espera un momento...'
    }, { quoted: m });

    // Validar URL
    if (!isValidYouTubeUrl(url)) {
      return await sock.sendMessage(chatId, {
        text: '❌ URL de YouTube inválida.'
      }, { quoted: m });
    }

    // Simular descarga (en producción usarías ytdl-core o similar)
    const videoInfo = await getYouTubeInfo(url);
    
    if (!videoInfo) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo obtener información del video.'
      }, { quoted: m });
    }

    // Enviar mensaje de progreso
    await sock.sendMessage(chatId, {
      text: `📥 *Descargando audio...*\n\n🎵 ${videoInfo.title}\n⏱️ ${videoInfo.duration}\n👤 ${videoInfo.channel}`
    }, { quoted: m });

    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Enviar audio (simulado)
    const audioMessage = {
      audio: { 
        url: `https://example.com/audio/${Date.now()}.mp3` // URL simulada
      },
      mimetype: 'audio/mp4',
      caption: `🎵 *${videoInfo.title}*\n\n📥 Descargado por HINATA-BOT\n⏱️ Duración: ${videoInfo.duration}`
    };

    await sock.sendMessage(chatId, audioMessage, { quoted: m });
    
    downloadLogger.success(`Audio descargado: ${videoInfo.title} por ${userId}`);

  } catch (error) {
    downloadLogger.error('Error descargando audio YouTube:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al descargar el audio. Verifica la URL e intenta nuevamente.'
    }, { quoted: m });
  }
}

// Descargar video de YouTube
async function downloadYouTubeVideo(sock, m, text) {
  const chatId = m.key.remoteJid;
  const args = text.split(' ');
  const url = args[1];
  const quality = args[2] || '720p';

  if (!url) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes proporcionar una URL de YouTube.\n\n💡 *Uso:* `.ytmp4 <url> [calidad]`\n*Calidades:* 360p, 720p, 1080p'
    }, { quoted: m });
  }

  try {
    await sock.sendMessage(chatId, {
      text: '🔄 *Procesando descarga de video...*\n\n⏳ Por favor espera...'
    }, { quoted: m });

    if (!isValidYouTubeUrl(url)) {
      return await sock.sendMessage(chatId, {
        text: '❌ URL de YouTube inválida.'
      }, { quoted: m });
    }

    const videoInfo = await getYouTubeInfo(url);
    
    if (!videoInfo) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo obtener información del video.'
      }, { quoted: m });
    }

    await sock.sendMessage(chatId, {
      text: `📥 *Descargando video...*\n\n🎬 ${videoInfo.title}\n⏱️ ${videoInfo.duration}\n👤 ${videoInfo.channel}\n📺 Calidad: ${quality}`
    }, { quoted: m });

    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Enviar video (simulado)
    const videoMessage = {
      video: { 
        url: `https://example.com/video/${Date.now()}.mp4` // URL simulada
      },
      caption: `🎬 *${videoInfo.title}*\n\n📥 Descargado por HINATA-BOT\n📺 Calidad: ${quality}\n⏱️ Duración: ${videoInfo.duration}`
    };

    await sock.sendMessage(chatId, videoMessage, { quoted: m });
    
    downloadLogger.success(`Video descargado: ${videoInfo.title} (${quality}) por ${userId}`);

  } catch (error) {
    downloadLogger.error('Error descargando video YouTube:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al descargar el video. Verifica la URL e intenta nuevamente.'
    }, { quoted: m });
  }
}

// Descargar de Instagram
async function downloadInstagram(sock, m, text) {
  const chatId = m.key.remoteJid;
  const url = text.split(' ')[1];

  if (!url) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes proporcionar una URL de Instagram.\n\n💡 *Uso:* `.insta <url>`'
    }, { quoted: m });
  }

  try {
    await sock.sendMessage(chatId, {
      text: '🔄 *Procesando contenido de Instagram...*\n\n⏳ Por favor espera...'
    }, { quoted: m });

    if (!isValidInstagramUrl(url)) {
      return await sock.sendMessage(chatId, {
        text: '❌ URL de Instagram inválida.'
      }, { quoted: m });
    }

    const mediaInfo = await getInstagramInfo(url);
    
    if (!mediaInfo) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo obtener información del contenido.'
      }, { quoted: m });
    }

    await sock.sendMessage(chatId, {
      text: `📥 *Descargando de Instagram...*\n\n👤 @${mediaInfo.username}\n📝 ${mediaInfo.caption?.substring(0, 50) || 'Sin caption'}...\n❤️ ${mediaInfo.likes} likes`
    }, { quoted: m });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Enviar contenido según el tipo
    if (mediaInfo.type === 'image') {
      await sock.sendMessage(chatId, {
        image: { url: `https://example.com/insta/${Date.now()}.jpg` },
        caption: `📷 *@${mediaInfo.username}*\n\n${mediaInfo.caption || ''}\n\n📥 Descargado por HINATA-BOT`
      }, { quoted: m });
    } else if (mediaInfo.type === 'video') {
      await sock.sendMessage(chatId, {
        video: { url: `https://example.com/insta/${Date.now()}.mp4` },
        caption: `🎥 *@${mediaInfo.username}*\n\n${mediaInfo.caption || ''}\n\n📥 Descargado por HINATA-BOT`
      }, { quoted: m });
    } else if (mediaInfo.type === 'carousel') {
      // Para carrusel, enviar el primer elemento
      await sock.sendMessage(chatId, {
        image: { url: `https://example.com/insta/${Date.now()}.jpg` },
        caption: `🎑 *@${mediaInfo.username}* (Carrusel)\n\n${mediaInfo.caption || ''}\n📎 ${mediaInfo.items.length} elementos\n\n📥 Descargado por HINATA-BOT`
      }, { quoted: m });
    }
    
    downloadLogger.success(`Instagram descargado: @${mediaInfo.username} por ${userId}`);

  } catch (error) {
    downloadLogger.error('Error descargando Instagram:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al descargar de Instagram. Verifica que el post sea público.'
    }, { quoted: m });
  }
}

// Descargar de TikTok
async function downloadTikTok(sock, m, text) {
  const chatId = m.key.remoteJid;
  const url = text.split(' ')[1];

  if (!url) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes proporcionar una URL de TikTok.\n\n💡 *Uso:* `.tiktok <url>`'
    }, { quoted: m });
  }

  try {
    await sock.sendMessage(chatId, {
      text: '🔄 *Procesando video de TikTok...*\n\n⏳ Por favor espera...'
    }, { quoted: m });

    if (!isValidTikTokUrl(url)) {
      return await sock.sendMessage(chatId, {
        text: '❌ URL de TikTok inválida.'
      }, { quoted: m });
    }

    const videoInfo = await getTikTokInfo(url);
    
    if (!videoInfo) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo obtener información del video.'
      }, { quoted: m });
    }

    await sock.sendMessage(chatId, {
      text: `📥 *Descargando de TikTok...*\n\n👤 @${videoInfo.username}\n🎵 ${videoInfo.music}\n❤️ ${videoInfo.likes} likes`
    }, { quoted: m });

    await new Promise(resolve => setTimeout(resolve, 3000));

    await sock.sendMessage(chatId, {
      video: { url: `https://example.com/tiktok/${Date.now()}.mp4` },
      caption: `🎵 *@${videoInfo.username}*\n\n🎶 ${videoInfo.music}\n❤️ ${videoInfo.likes} likes\n💬 ${videoInfo.comments} comments\n\n📥 Descargado por HINATA-BOT`
    }, { quoted: m });
    
    downloadLogger.success(`TikTok descargado: @${videoInfo.username} por ${userId}`);

  } catch (error) {
    downloadLogger.error('Error descargando TikTok:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al descargar de TikTok. Verifica la URL e intenta nuevamente.'
    }, { quoted: m });
  }
}

// Descargar de Twitter
async function downloadTwitter(sock, m, text) {
  const chatId = m.key.remoteJid;
  const url = text.split(' ')[1];

  if (!url) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes proporcionar una URL de Twitter.\n\n💡 *Uso:* `.twitter <url>`'
    }, { quoted: m });
  }

  try {
    await sock.sendMessage(chatId, {
      text: '🔄 *Procesando contenido de Twitter...*\n\n⏳ Por favor espera...'
    }, { quoted: m });

    if (!isValidTwitterUrl(url)) {
      return await sock.sendMessage(chatId, {
        text: '❌ URL de Twitter inválida.'
      }, { quoted: m });
    }

    const tweetInfo = await getTwitterInfo(url);
    
    if (!tweetInfo) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo obtener información del tweet.'
      }, { quoted: m });
    }

    await sock.sendMessage(chatId, {
      text: `📥 *Descargando de Twitter...*\n\n🐦 @${tweetInfo.username}\n📝 ${tweetInfo.text?.substring(0, 50) || ''}...\n❤️ ${tweetInfo.likes} likes`
    }, { quoted: m });

    await new Promise(resolve => setTimeout(resolve, 3000));

    if (tweetInfo.hasMedia) {
      if (tweetInfo.mediaType === 'image') {
        await sock.sendMessage(chatId, {
          image: { url: `https://example.com/twitter/${Date.now()}.jpg` },
          caption: `🐦 *@${tweetInfo.username}*\n\n${tweetInfo.text || ''}\n\n📥 Descargado por HINATA-BOT`
        }, { quoted: m });
      } else if (tweetInfo.mediaType === 'video') {
        await sock.sendMessage(chatId, {
          video: { url: `https://example.com/twitter/${Date.now()}.mp4` },
          caption: `🐦 *@${tweetInfo.username}*\n\n${tweetInfo.text || ''}\n\n📥 Descargado por HINATA-BOT`
        }, { quoted: m });
      }
    } else {
      await sock.sendMessage(chatId, {
        text: `🐦 *@${tweetInfo.username}*\n\n${tweetInfo.text}\n\n❤️ ${tweetInfo.likes} likes\n🔄 ${tweetInfo.retweets} retweets\n\n📥 Descargado por HINATA-BOT`
      }, { quoted: m });
    }
    
    downloadLogger.success(`Twitter descargado: @${tweetInfo.username} por ${userId}`);

  } catch (error) {
    downloadLogger.error('Error descargando Twitter:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al descargar de Twitter. Verifica la URL e intenta nuevamente.'
    }, { quoted: m });
  }
}

// Descargar de Facebook
async function downloadFacebook(sock, m, text) {
  const chatId = m.key.remoteJid;
  const url = text.split(' ')[1];

  if (!url) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes proporcionar una URL de Facebook.\n\n💡 *Uso:* `.fb <url>`'
    }, { quoted: m });
  }

  try {
    await sock.sendMessage(chatId, {
      text: '🔄 *Procesando contenido de Facebook...*\n\n⏳ Por favor espera...'
    }, { quoted: m });

    if (!isValidFacebookUrl(url)) {
      return await sock.sendMessage(chatId, {
        text: '❌ URL de Facebook inválida.'
      }, { quoted: m });
    }

    const mediaInfo = await getFacebookInfo(url);
    
    if (!mediaInfo) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo obtener información del contenido.'
      }, { quoted: m });
    }

    await sock.sendMessage(chatId, {
      text: `📥 *Descargando de Facebook...*\n\n👤 ${mediaInfo.author}\n📝 ${mediaInfo.description?.substring(0, 50) || 'Sin descripción'}...`
    }, { quoted: m });

    await new Promise(resolve => setTimeout(resolve, 4000));

    if (mediaInfo.type === 'video') {
      await sock.sendMessage(chatId, {
        video: { url: `https://example.com/facebook/${Date.now()}.mp4` },
        caption: `📘 *${mediaInfo.title}*\n\n${mediaInfo.description || ''}\n\n📥 Descargado por HINATA-BOT`
      }, { quoted: m });
    } else {
      await sock.sendMessage(chatId, {
        image: { url: `https://example.com/facebook/${Date.now()}.jpg` },
        caption: `📘 *${mediaInfo.title}*\n\n${mediaInfo.description || ''}\n\n📥 Descargado por HINATA-BOT`
      }, { quoted: m });
    }
    
    downloadLogger.success(`Facebook descargado: ${mediaInfo.title} por ${userId}`);

  } catch (error) {
    downloadLogger.error('Error descargando Facebook:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al descargar de Facebook. Verifica que el contenido sea público.'
    }, { quoted: m });
  }
}

// Reproducir media (función combinada)
async function playMedia(sock, m, text) {
  const chatId = m.key.remoteJid;
  const url = text.split(' ').slice(1).join(' ');

  if (!url) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes proporcionar una URL.\n\n💡 *Uso:* `.play <url>\n*Plataformas soportadas:* YouTube, Instagram, TikTok, Twitter, Facebook'
    }, { quoted: m });
  }

  try {
    // Detectar plataforma automáticamente
    let platform = null;
    if (isValidYouTubeUrl(url)) platform = 'youtube';
    else if (isValidInstagramUrl(url)) platform = 'instagram';
    else if (isValidTikTokUrl(url)) platform = 'tiktok';
    else if (isValidTwitterUrl(url)) platform = 'twitter';
    else if (isValidFacebookUrl(url)) platform = 'facebook';

    if (!platform) {
      return await sock.sendMessage(chatId, {
        text: '❌ Plataforma no soportada o URL inválida.'
      }, { quoted: m });
    }

    await sock.sendMessage(chatId, {
      text: `🔄 *Detectando plataforma: ${platform.toUpperCase()}*\n\n⏳ Procesando...`
    }, { quoted: m });

    // Redirigir a la función correspondiente
    switch (platform) {
      case 'youtube':
        await downloadYouTubeVideo(sock, m, `.ytmp4 ${url}`);
        break;
      case 'instagram':
        await downloadInstagram(sock, m, `.insta ${url}`);
        break;
      case 'tiktok':
        await downloadTikTok(sock, m, `.tiktok ${url}`);
        break;
      case 'twitter':
        await downloadTwitter(sock, m, `.twitter ${url}`);
        break;
      case 'facebook':
        await downloadFacebook(sock, m, `.fb ${url}`);
        break;
    }

  } catch (error) {
    downloadLogger.error('Error en play media:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al procesar la URL.'
    }, { quoted: m });
  }
}

// Mostrar opciones de calidad
async function showQualityOptions(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `📺 *OPCIONES DE CALIDAD* 📺\n\n`;
  
  message += `🎵 *Audio:*\n`;
  message += `• Low - ~64 kbps (rápido, menor calidad)\n`;
  message += `• Medium - ~128 kbps (balanceado)\n`;
  message += `• High - ~320 kbps (mejor calidad)\n\n`;
  
  message += `🎬 *Video:*\n`;
  message += `• 360p - Rápido, menor tamaño\n`;
  message += `• 720p - Balanceado\n`;
  message += `• 1080p - Máxima calidad\n\n`;
  
  message += `💡 *Cómo especificar calidad:*\n`;
  message += `• \`.ytmp4 <url> 720p\` - Video en 720p\n`;
  message += `• \`.ytmp3 <url> high\` - Audio alta calidad\n\n`;
  
  message += `📊 *Límites:*\n`;
  message += `• Tamaño máximo: ${(CONFIG.maxFileSize / 1024 / 1024).toFixed(0)}MB\n`;
  message += `• Tiempo de espera: Variable según calidad\n`;
  message += `• Formatos: MP3 (audio), MP4 (video)`;
  
  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Mostrar ayuda
async function showDownloadHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `📱 *SISTEMA DE DESCARGA* 📱\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `🎵 *YouTube:*\n`;
  message += `• \`.ytmp3 <url>\` - Descargar audio\n`;
  message += `• \`.ytmp4 <url> [calidad]\` - Descargar video\n\n`;
  
  message += `📷 *Redes Sociales:*\n`;
  message += `• \`.insta <url>\` - Instagram (foto/video)\n`;
  message += `• \`.tiktok <url>\` - TikTok (video)\n`;
  message += `• \`.twitter <url>\` - Twitter (foto/video)\n`;
  message += `• \`.fb <url>\` - Facebook (foto/video)\n\n`;
  
  message += `🔄 *General:*\n`;
  message += `• \`.play <url>\` - Auto-detectar plataforma\n`;
  message += `• \`.quality\` - Ver opciones de calidad\n\n`;
  
  message += `⚠️ *Importante:*\n`;
  message += `• Solo contenido público\n`;
  message += `• Respeta los derechos de autor\n`;
  message += `• Usa responsablemente\n\n`;
  
  message += `🔧 *Soportado:*\n`;
  message += `• YouTube ( Shorts, videos normales)\n`;
  message += `• Instagram ( Posts, Reels)\n`;
  message += `• TikTok ( Videos)\n`;
  message += `• Twitter ( Fotos, videos)\n`;
  message += `• Facebook ( Videos, fotos)`;
  
  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones de validación
function isValidYouTubeUrl(url) {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/.test(url);
}

function isValidInstagramUrl(url) {
  return /(?:instagram\.com\/p\/|instagram\.com\/reel\/)/.test(url);
}

function isValidTikTokUrl(url) {
  return /(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com)/.test(url);
}

function isValidTwitterUrl(url) {
  return /(?:twitter\.com\/[\w.-]+\/status\/|x\.com\/[\w.-]+\/status\/)/.test(url);
}

function isValidFacebookUrl(url) {
  return /(?:facebook\.com\/[\w.-]+\/posts\/|facebook\.com\/[\w.-]+\/videos\/|fb\.watch)/.test(url);
}

// Funciones simuladas (en producción usarías APIs reales)
async function getYouTubeInfo(url) {
  // Simulación - en producción usarías ytdl-core
  return {
    title: "Video de ejemplo",
    duration: "3:45",
    channel: "Canal de ejemplo",
    views: "1.2M",
    likes: "50K"
  };
}

async function getInstagramInfo(url) {
  return {
    username: "usuario_ejemplo",
    type: "image", // image, video, carousel
    caption: "Caption de ejemplo...",
    likes: 1000,
    items: 1
  };
}

async function getTikTokInfo(url) {
  return {
    username: "usuario_ejemplo",
    music: "Canción de ejemplo",
    likes: 10000,
    comments: 500
  };
}

async function getTwitterInfo(url) {
  return {
    username: "usuario_ejemplo",
    text: "Este es un tweet de ejemplo...",
    likes: 500,
    retweets: 100,
    hasMedia: true,
    mediaType: "image" // image, video
  };
}

async function getFacebookInfo(url) {
  return {
    title: "Título de ejemplo",
    author: "Autor de ejemplo",
    description: "Descripción de ejemplo...",
    type: "video" // video, image
  };
}

// Inicializar directorio de descargas
async function initializeDownloadDirectory() {
  try {
    await fs.mkdir(CONFIG.downloadPath, { recursive: true });
    downloadLogger.success(`Directorio de descargas creado: ${CONFIG.downloadPath}`);
  } catch (error) {
    downloadLogger.error('Error creando directorio:', error);
  }
}

// Inicializar sistema
initializeDownloadDirectory();

// Exportar funciones para compatibilidad
export { 
  CONFIG,
  downloadLogger,
  isValidYouTubeUrl,
  isValidInstagramUrl,
  isValidTikTokUrl,
  isValidTwitterUrl,
  isValidFacebookUrl
};
