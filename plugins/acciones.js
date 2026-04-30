/**
 * @file Plugin Acciones v2.0 - Sistema robusto de acciones interactivas
 * @description Mejorado con validaciones robustas, manejo de errores y seguridad
 * @version 2.0.0
 */

import axios from 'axios';

// Configuración de seguridad y límites
const CONFIG = {
  timeout: 10000,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxRetries: 3,
  retryDelay: 1000,
  rateLimitDelay: 500,
  maxConcurrentRequests: 2
};

// Estado global para control de concurrencia
const requestState = {
  active: 0,
  lastRequest: 0
};

export const command = [
  '.pegar', '.slap',
  '.abrazar', '.hug',
  '.besar', '.kiss',
  '.acariciar', '.pat',
  '.morder', '.bite',
  '.alimentar', '.feed',
  '.sonrojar', '.blush',
  '.sonreir', '.smile',
  '.saludar', '.wave',
  '.bailar', '.dance',
  '.llorar', '.cry',
  '.reir', '.laugh',
  '.dormir', '.sleep',
  '.pensar', '.think',
  '.guiñar', '.wink',
  '.abrazar2', '.cuddle',
  '.bofetada', '.slap',
  '.patada', '.kick',
  '.picar', '.poke',
  '.cosquillas', '.tickle',
  '.punch'
];

export const help = `
🎭 *ACCIONES INTERACTIVAS v2.0* 🎭

*Sistema mejorado con seguridad y validaciones robustas*

*📋 Categorías de Acciones:*

*👊 Acciones Agresivas:*
  • ".pegar" / ".punch" @usuario
  • ".bofetada" / ".slap" @usuario
  • ".patada" / ".kick" @usuario
  • ".morder" / ".bite" @usuario

*💕 Acciones Cariñosas:*
  • ".abrazar" / ".hug" @usuario
  • ".besar" / ".kiss" @usuario
  • ".acariciar" / ".pat" @usuario
  • ".abrazar2" / ".cuddle" @usuario
  • ".alimentar" / ".feed" @usuario

*🎪 Acciones Interactivas:*
  • ".picar" / ".poke" @usuario
  • ".cosquillas" / ".tickle" @usuario
  • ".saludar" / ".wave" @usuario
  • ".bailar" / ".dance" @usuario
  • ".guiñar" / ".wink" @usuario

*😊 Acciones Emocionales:*
  • ".sonrojar" / ".blush"
  • ".sonreir" / ".smile"
  • ".llorar" / ".cry"
  • ".reir" / ".laugh"
  • ".dormir" / ".sleep"
  • ".pensar" / ".think"

*🔧 Características de Seguridad:*
  ✅ Validación de entradas
  ✅ Control de concurrencia
  ✅ Límites de tamaño
  ✅ Reintentos automáticos
  ✅ Manejo robusto de errores

*💡 Uso:*
  Menciona a un usuario para acciones interactivas
  Las acciones emocionales no requieren mención

*⚠️ Limites:*
  • Máximo 10MB por GIF
  • 3 reintentos automáticos
  • Control de rate limiting
`;

// Mapeo mejorado de comandos a acciones
const ACCIONES_MAP = {
  '.pegar': 'punch',
  '.punch': 'punch',
  '.slap': 'slap',
  '.bofetada': 'slap',
  '.abrazar': 'hug',
  '.hug': 'hug',
  '.besar': 'kiss',
  '.kiss': 'kiss',
  '.acariciar': 'pat',
  '.pat': 'pat',
  '.morder': 'bite',
  '.bite': 'bite',
  '.alimentar': 'feed',
  '.feed': 'feed',
  '.sonrojar': 'blush',
  '.blush': 'blush',
  '.sonreir': 'smile',
  '.smile': 'smile',
  '.saludar': 'wave',
  '.wave': 'wave',
  '.bailar': 'dance',
  '.dance': 'dance',
  '.llorar': 'cry',
  '.cry': 'cry',
  '.reir': 'laugh',
  '.laugh': 'laugh',
  '.dormir': 'sleep',
  '.sleep': 'sleep',
  '.pensar': 'think',
  '.think': 'think',
  '.guiñar': 'wink',
  '.wink': 'wink',
  '.abrazar2': 'cuddle',
  '.cuddle': 'cuddle',
  '.patada': 'kick',
  '.kick': 'kick',
  '.picar': 'poke',
  '.poke': 'poke',
  '.cosquillas': 'tickle',
  '.tickle': 'tickle'
};

// Textos mejorados para cada acción
const TEXTOS_ACCIONES = {
  'punch': ['le dio un puñetazo a', 'golpeó fuertemente a', 'atacó a'],
  'slap': ['le dio una bofetada a', 'abofeteó a', 'reventó a'],
  'hug': ['abrazó tiernamente a', 'dio un abrazo a', 'acurrucó a'],
  'kiss': ['besó dulcemente a', 'dio un beso a', 'besó apasionadamente a'],
  'pat': ['acarició la cabeza de', 'dio palmaditas a', 'consoló a'],
  'bite': ['mordió a', 'dio un mordisco a', 'nibbled on'],
  'feed': ['alimentó a', 'dio comida a', 'compartió comida con'],
  'blush': ['se sonrojó', 'puso rojo como un tomate', 'se ruborizó'],
  'smile': ['sonrió felizmente', 'mostró una sonrisa', 'brilló con alegría'],
  'wave': ['saludó a', 'hizo señas a', 'dijo hola a'],
  'dance': ['bailó con', 'invitó a bailar a', 'se movió al ritmo con'],
  'cry': ['empezó a llorar', 'lloró tristemente', 'derramó lágrimas'],
  'laugh': ['se rio a carcajadas', 'explotó en risas', 'rió divertidamente'],
  'sleep': ['se quedó dormido', 'se durmió pacíficamente', 'cayó en un sueño profundo'],
  'think': ['está pensando', 'se puso a reflexionar', 'meditó profundamente'],
  'wink': ['le guiñó un ojo a', 'hizo un guiño a', 'parpadeó coquetamente a'],
  'cuddle': ['se acurrucó con', 'se abrazó tiernamente con', 'se acurrucó junto a'],
  'kick': ['le dio una patada a', 'pateó a', 'lanzó una patada a'],
  'poke': ['picó a', 'dio un toque a', 'molesto a'],
  'tickle': ['hizo cosquillas a', 'hizo reír a', 'molestó juguetonamente a']
};

// APIs mejoradas con fallback
const APIS_CONFIG = [
  {
    name: 'waifu.pics',
    baseUrl: 'https://api.waifu.pics/sfw',
    endpoints: {
      'hug': 'hug',
      'pat': 'pat',
      'slap': 'slap',
      'poke': 'poke',
      'neko': 'neko',
      'bite': 'bite',
      'blush': 'blush',
      'smile': 'smile',
      'wave': 'wave',
      'wink': 'wink'
    },
    getImageUrl: (data) => data.url
  },
  {
    name: 'nekos.life',
    baseUrl: 'https://nekos.life/api/v2',
    endpoints: {
      'hug': 'hug',
      'pat': 'pat',
      'slap': 'slap',
      'kiss': 'kiss',
      'cuddle': 'cuddle',
      'feed': 'feed',
      'tickle': 'tickle',
      'poke': 'poke',
      'smug': 'smug',
      'baka': 'baka'
    },
    getImageUrl: (data) => data.url
  },
  {
    name: 'some-random-api',
    baseUrl: 'https://some-random-api.com/animu',
    endpoints: {
      'hug': 'hug',
      'pat': 'pat',
      'wink': 'wink',
      'pat': 'pat',
      'slap': 'slap'
    },
    getImageUrl: (data) => data.link
  }
];

// Validación de entrada robusta
function validarEntrada(command, mentionedJid) {
  const errores = [];
  
  // Validar comando
  if (!command || typeof command !== 'string') {
    errores.push('Comando inválido o nulo');
  }
  
  if (!ACCIONES_MAP[command]) {
    errores.push(`Comando no reconocido: ${command}`);
  }
  
  // Validar mención si es requerida
  const action = ACCIONES_MAP[command];
  const accionesSinMencion = ['blush', 'smile', 'cry', 'laugh', 'sleep', 'think'];
  
  if (!accionesSinMencion.includes(action) && !mentionedJid) {
    errores.push('Esta acción requiere mencionar a un usuario');
  }
  
  // Validar que no se mencione a uno mismo
  if (mentionedJid && mentionedJid === command?.participant) {
    errores.push('No puedes realizar esta acción sobre ti mismo');
  }
  
  return {
    isValid: errores.length === 0,
    errores
  };
}

// Control de concurrencia
function checkConcurrency() {
  const now = Date.now();
  
  if (requestState.active >= CONFIG.maxConcurrentRequests) {
    return false;
  }
  
  if (now - requestState.lastRequest < CONFIG.rateLimitDelay) {
    return false;
  }
  
  requestState.active++;
  requestState.lastRequest = now;
  return true;
}

function releaseConcurrency() {
  if (requestState.active > 0) {
    requestState.active--;
  }
}

// Obtener imagen con reintentos y validación
async function obtenerImagenConRetries(action, retries = CONFIG.maxRetries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    for (const api of APIS_CONFIG) {
      try {
        console.log(`📡 Intentando API ${api.name} (intentos: ${attempt}/${retries})`);
        
        // Verificar si la API soporta la acción
        const endpoint = api.endpoints[action] || 'hug'; // Fallback a 'hug'
        const url = `${api.baseUrl}/${endpoint}`;
        
        const response = await axios.get(url, {
          timeout: CONFIG.timeout,
          headers: {
            'User-Agent': 'HINATA-BOT/2.0',
            'Accept': 'application/json'
          }
        });
        
        if (response.data && api.getImageUrl(response.data)) {
          const imageUrl = api.getImageUrl(response.data);
          
          // Validar URL
          if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
            console.log(`✅ Imagen obtenida desde ${api.name}: ${imageUrl}`);
            return imageUrl;
          }
        }
      } catch (error) {
        console.warn(`❌ Error con ${api.name} (intento ${attempt}):`, error.message);
        
        // Si es error de red, esperar antes de reintentar
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * attempt));
        }
      }
    }
  }
  
  throw new Error('No se pudo obtener imagen de ninguna API después de todos los intentos');
}

// Descargar y validar archivo
async function descargarYValidarArchivo(url) {
  try {
    console.log(`📥 Descargando archivo: ${url}`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: CONFIG.timeout * 2,
      maxContentLength: CONFIG.maxFileSize,
      headers: {
        'User-Agent': 'HINATA-BOT/2.0'
      }
    });
    
    // Validar tamaño
    if (response.data.byteLength > CONFIG.maxFileSize) {
      throw new Error(`Archivo demasiado grande: ${response.data.byteLength} bytes`);
    }
    
    // Validar que sea un archivo de imagen válido
    const buffer = Buffer.from(response.data);
    
    // Validar headers de imagen
    const isGif = buffer.toString('hex', 0, 6) === '474946383961' || buffer.toString('hex', 0, 6) === '474946383761';
    const isWebp = buffer.toString('hex', 0, 8) === '52494646' && buffer.toString('ascii', 8, 12) === 'WEBP';
    const isJpeg = buffer.toString('hex', 0, 4) === 'ffd8';
    const isPng = buffer.toString('hex', 0, 8) === '89504e470d0a1a0a';
    
    if (!isGif && !isWebp && !isJpeg && !isPng) {
      throw new Error('El archivo no es un formato de imagen válido');
    }
    
    console.log(`✅ Archivo validado: ${buffer.length} bytes`);
    return buffer;
    
  } catch (error) {
    console.error('❌ Error al descargar/validar archivo:', error.message);
    throw error;
  }
}

// Función principal mejorada
export async function run(sock, m, { command }) {
  const chatId = m.key.remoteJid;
  const senderId = m.key.participant || m.key.remoteJid;
  const senderName = m.pushName || senderId.split('@')[0];
  
  let concurrencyReleased = false;
  
  try {
    // Control de concurrencia
    if (!checkConcurrency()) {
      return await sock.sendMessage(chatId, {
        text: '⏱️ *Demasiadas solicitudes simultáneas*\n\nPor favor, espera un momento y vuelve a intentar.'
      }, { quoted: m });
    }
    
    // Validar entrada
    const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const validacion = validarEntrada(command, mentionedJid);
    
    if (!validacion.isValid) {
      return await sock.sendMessage(chatId, {
        text: `❌ *Error de validación*\n\n${validacion.errores.join('\n')}\n\n💡 Usa \`.help acciones\` para ver la ayuda.`
      }, { quoted: m });
    }
    
    // Obtener acción
    const action = ACCIONES_MAP[command];
    const textosAccion = TEXTOS_ACCIONES[action] || ['realizó una acción con'];
    const textoAleatorio = textosAccion[Math.floor(Math.random() * textosAccion.length)];
    
    // Construir mensaje
    let mensaje = '';
    let mentions = [senderId];
    
    const accionesSinMencion = ['blush', 'smile', 'cry', 'laugh', 'sleep', 'think'];
    
    if (mentionedJid && !accionesSinMencion.includes(action)) {
      const targetName = m.message?.extendedTextMessage?.contextInfo?.participant?.split('@')[0] || mentionedJid.split('@')[0];
      mensaje = `*@${senderName}* ${textoAleatorio} *@${targetName}* 💫`;
      mentions.push(mentionedJid);
    } else {
      mensaje = `*@${senderName}* ${textoAleatorio} 💫`;
    }
    
    // Obtener imagen con reintentos
    const imageUrl = await obtenerImagenConRetries(action);
    
    // Descargar y validar archivo
    const buffer = await descargarYValidarArchivo(imageUrl);
    
    // Enviar mensaje de procesamiento
    await m.react('⏳');
    
    // Enviar GIF/imagen
    await sock.sendMessage(chatId, {
      image: buffer,
      caption: mensaje,
      mentions: mentions,
      gifPlayback: imageUrl.includes('.gif') || buffer.toString('hex', 0, 6) === '474946'
    }, { quoted: m });
    
    // Reacción de éxito
    await m.react('✅');
    
  } catch (error) {
    console.error('❌ Error en comando de acción:', error);
    
    // Reacción de error
    try { await m.react('❌'); } catch {}
    
    // Mensaje de error específico
    let errorMsg = '❌ *Error al procesar la acción*\n\n';
    
    if (error.message.includes('Archivo demasiado grande')) {
      errorMsg += '📁 El archivo es demasiado grande (máximo 10MB)\n';
    } else if (error.message.includes('formato de imagen válido')) {
      errorMsg += '🖼️ El archivo no es un formato de imagen válido\n';
    } else if (error.message.includes('No se pudo obtener imagen')) {
      errorMsg += '🌐 No se pudo obtener imagen de las APIs\n';
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMsg += '⏱️ Tiempo de espera agotado\n';
    } else if (error.code === 'ECONNRESET') {
      errorMsg += '🔌 Conexión interrumpida\n';
    } else {
      errorMsg += `💻 Error: ${error.message.substring(0, 100)}\n`;
    }
    
    errorMsg += '\n💡 *Soluciones posibles:*';
    errorMsg += '\n• Intenta con otra acción';
    errorMsg += '\n• Espera unos segundos y vuelve a intentar';
    errorMsg += '\n• Verifica tu conexión a internet';
    
    await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
    
  } finally {
    // Liberar concurrencia
    if (!concurrencyReleased) {
      releaseConcurrency();
      concurrencyReleased = true;
    }
  }
}
