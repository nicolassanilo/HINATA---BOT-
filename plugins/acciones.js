/**
 * @file Plugin Acciones - Envía GIFs de anime con acciones interactivas
 * @version 3.0.0
 * @description Usa la API de OtakuGIFs para GIFs de anime de alta calidad
 */

import axios from 'axios';

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
  '.bofetada',
  '.patada', '.kick',
  '.picar', '.poke',
  '.cosquillas', '.tickle',
  '.punch'
];

export const help = `
Envía GIFs de anime con acciones interactivas 🎭

*Acciones disponibles:*

*Agresivas:* 👊
  • ".pegar" / ".punch" @usuario
  • ".bofetada" / ".slap" @usuario
  • ".patada" / ".kick" @usuario (Usa 'punch' como alternativa)
  • ".morder" / ".bite" @usuario

*Cariñosas:* 💕
  • ".abrazar" / ".hug" @usuario
  • ".besar" / ".kiss" @usuario
  • ".acariciar" / ".pat" @usuario
  • ".abrazar2" / ".cuddle" @usuario
  • ".alimentar" / ".feed" @usuario

*Interactivas:* 🎪
  • ".picar" / ".poke" @usuario
  • ".cosquillas" / ".tickle" @usuario
  • ".saludar" / ".wave" @usuario
  • ".bailar" / ".dance" @usuario
  • ".guiñar" / ".wink" @usuario

*Emocionales:* 😊
  • ".sonrojar" / ".blush"
  • ".sonreir" / ".smile"
  • ".llorar" / ".cry"
  • ".reir" / ".laugh"
  • ".dormir" / ".sleep"
  • ".pensar" / ".think"

*Uso:*
  Menciona a un usuario para realizar la acción
  
*Ejemplos:*
  - ".pegar @usuario" - Le pega a alguien
  - ".abrazar @usuario" - Abraza a alguien
  - ".besar @usuario" - Besa a alguien
  - ".llorar" - Llora (sin mención)

*Nota:* Usa la API de OtakuGIFs - GIFs de alta calidad
`;

// Mapeo de comandos a endpoints de OtakuGIFs API
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
  '.alimentar': 'nom', // 'nom' es lo más cercano a 'feed'
  '.feed': 'nom',
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
  '.pensar': 'confused', // 'confused' es lo más cercano a 'think'
  '.think': 'confused',
  '.guiñar': 'wink',
  '.wink': 'wink',
  '.abrazar2': 'cuddle',
  '.cuddle': 'cuddle',
  '.patada': 'punch', // No hay 'kick', se usa 'punch'
  '.kick': 'punch',
  '.picar': 'poke',
  '.poke': 'poke',
  '.cosquillas': 'tickle',
  '.tickle': 'tickle'
};

// Textos para cada acción
const TEXTOS_ACCIONES = {
  'punch': ['punched', 'gave a punch to', 'hit'],
  'slap': ['slapped', 'gave a slap to'],
  'hug': ['hugged', 'gave a hug to', 'is hugging'],
  'kiss': ['kissed', 'gave a kiss to', 'is kissing'],
  'pat': ['patted', 'gave pats to', 'gave headpats to'],
  'bite': ['bit', 'gave a bite to', 'is biting'],
  'nom': ['fed', 'gave food to', 'is feeding'],
  'blush': ['blushed', 'is blushing', 'turned red'],
  'smile': ['smiled', 'is smiling', 'has a smile'],
  'wave': ['waved at', 'made signs to', 'is waving at'],
  'dance': ['danced with', 'is dancing with', 'invited to dance'],
  'cry': ['is crying', 'cried', 'started crying'],
  'laugh': ['laughed', 'is laughing', 'burst out laughing'],
  'sleep': ['fell asleep', 'is sleeping', 'went to sleep'],
  'confused': ['is thinking', 'pondered', 'got confused'],
  'wink': ['winked at', 'gave a wink to', 'winked'],
  'cuddle': ['cuddled', 'cuddled with', 'is cuddling'],
  'poke': ['poked', 'gave a poke to', 'is annoying'],
  'tickle': ['tickled', 'is tickling', 'annoyed']
};

// Función para obtener GIF de OtakuGIFs API
async function obtenerGif(action) {
  try {
    const url = `https://api.otakugifs.xyz/gif?reaction=${encodeURIComponent(action)}&format=GIF`;
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data?.url) {
      return response.data.url;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener GIF de OtakuGIFs:', error.message);
    return null;
  }
}

export async function run(sock, m, { command }) {
  const chatId = m.key.remoteJid;
  const senderId = m.key.participant || m.key.remoteJid;
  const senderName = senderId.split('@')[0];

  try {
    // Obtener usuario mencionado
    const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    
    // Obtener acción de la API
    const action = ACCIONES_MAP[command];
    
    if (!action) {
      return await sock.sendMessage(chatId, {
        text: '❌ Acción no reconocida. Usa `.help acciones` para ver las acciones disponibles.'
      }, { quoted: m });
    }

    // Obtener textos posibles para la acción
    const textosAccion = TEXTOS_ACCIONES[action] || ['realizó una acción con'];
    const textoAleatorio = textosAccion[Math.floor(Math.random() * textosAccion.length)];

    // Construir mensaje
    let mensaje = '';
    let mentions = [senderId];

    // Acciones que no requieren mención (emocionales)
    const accionesSinMencion = ['blush', 'smile', 'cry', 'laugh', 'sleep', 'confused'];

    if (mentionedJid && !accionesSinMencion.includes(action)) {
      const targetName = mentionedJid.split('@')[0];
      mensaje = `*@${senderName}* ${textoAleatorio} *@${targetName}*! 💫`;
      mentions.push(mentionedJid);
    } else {
      // Mensaje sin mención
      mensaje = `*@${senderName}* ${textoAleatorio}! 💫`;
    }

    // Buscar GIF
    const gifUrl = await obtenerGif(action);

    if (!gifUrl) {
      return await sock.sendMessage(chatId, {
        text: `❌ No se pudo obtener el GIF. Intenta nuevamente o usa otra acción.`
      }, { quoted: m });
    }

    // Descargar el GIF
    const gifResponse = await axios.get(gifUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024 // 50 MB máximo
    });

    const buffer = Buffer.from(gifResponse.data);

    // Enviar GIF con mensaje
    await sock.sendMessage(chatId, {
      video: buffer,
      gifPlayback: true,
      caption: mensaje,
      mentions: mentions
    }, { quoted: m });

  } catch (error) {
    console.error('Error en comando de acción:', error);
    
    let errorMsg = '❌ Ocurrió un error al procesar la acción.';
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMsg += '\n⏱️ Tiempo de espera agotado. Intenta nuevamente.';
    } else if (error.response && error.response.status === 404) {
      errorMsg += '\n🔍 Acción no disponible en este momento.';
    }
    
    await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
  }
}
