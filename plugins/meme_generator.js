/**
 * @file Plugin Meme Generator - Generador de memes
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema completo de generación y gestión de memes
 */

import axios from 'axios';
import { db } from './db.js';
import fs from 'fs/promises';
import path from 'path';

// Configuración
const CONFIG = {
  enableLogging: true,
  maxTextLength: 100,
  supportedFormats: ['jpg', 'png', 'webp'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  memeTemplates: [
    'drake', 'distracted', 'expanding_brain', 'woman_yelling',
    'two_buttons', 'change_my_mind', 'butterfly', 'panik_kalm',
    'stonks', 'surprised_pikachu', 'this_is_fine', 'galaxy_brain'
  ],
  fonts: {
    impact: 'Impact',
    arial: 'Arial Black',
    comic: 'Comic Sans MS',
    helvetica: 'Helvetica'
  }
};

// Sistema de logging
const memeLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[MEME] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[MEME] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[MEME] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[MEME] ❌ ${message}`)
};

// Funciones principales
export const command = ['.meme', '.templates', '.makememe', '.memelist', '.randommeme', '.savememe', '.mymemes'];
export const alias = ['.meme', '.plantillas', '.crearmeme', '.listamemes', '.memealeatorio', '.guardarmeme', '.mismemes'];
export const description = 'Sistema completo de generación y gestión de memes';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.meme':
        await showMemeTemplates(sock, m);
        break;
      case '.templates':
      case '.plantillas':
        await showMemeTemplates(sock, m);
        break;
      case '.makememe':
      case '.crearmeme':
        await createMeme(sock, m, text);
        break;
      case '.memelist':
      case '.listamemes':
        await showMemeList(sock, m);
        break;
      case '.randommeme':
      case '.memealeatorio':
        await generateRandomMeme(sock, m);
        break;
      case '.savememe':
      case '.guardarmeme':
        await saveMeme(sock, m);
        break;
      case '.mymemes':
      case '.mismemes':
        await showMyMemes(sock, m);
        break;
      default:
        await showMemeHelp(sock, m);
    }
  } catch (error) {
    memeLogger.error('Error en sistema de memes:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de memes. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Mostrar plantillas de memes
async function showMemeTemplates(sock, m) {
  const chatId = m.key.remoteJid;

  try {
    let message = `🎭 *PLANTILLAS DE MEMES* 🎭\n\n`;
    message += `💡 *Plantillas disponibles:*\n\n`;

    const templates = await getMemeTemplates();
    templates.forEach((template, index) => {
      message += `${index + 1}. **${template.name}**\n`;
      message += `   📝 ${template.description}\n`;
      message += `   👥 ${template.text_boxes} cuadros de texto\n`;
      message += `   🎨 Ejemplo: \`.makememe ${template.name} | texto1 | texto2\`\n\n`;
    });

    message += `💡 *Cómo usar:*\n`;
    message += `• \`.makememe <plantilla> | texto1 | texto2\`\n`;
    message += `• \`.randommeme\` - Generar meme aleatorio\n`;
    message += `• \`.memelist\` - Ver memes guardados`;

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    memeLogger.error('Error mostrando plantillas:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las plantillas de memes.'
    }, { quoted: m });
  }
}

// Crear meme
async function createMeme(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split('|').map(arg => arg.trim());

  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.makememe <plantilla> | texto1 | texto2`\n*Ejemplo:* `.makememe drake | No quiero memes | Quiero memes`'
    }, { quoted: m });
  }

  const templateName = args[0].replace('.makememe', '').trim();
  const texts = args.slice(1);

  try {
    await sock.sendMessage(chatId, {
      text: '🎨 *Creando meme...*'
    }, { quoted: m });

    const template = await getTemplateByName(templateName);
    if (!template) {
      return await sock.sendMessage(chatId, {
        text: `❌ Plantilla "${templateName}" no encontrada.\n\n💡 Usa \`.meme\` para ver plantillas disponibles.`
      }, { quoted: m });
    }

    // Validar textos
    if (texts.length !== template.text_boxes) {
      return await sock.sendMessage(chatId, {
        text: `❌ Esta plantilla necesita ${template.text_boxes} textos, proporcionaste ${texts.length}.`
      }, { quoted: m });
    }

    for (const text of texts) {
      if (text.length > CONFIG.maxTextLength) {
        return await sock.sendMessage(chatId, {
          text: `❌ El texto "${text.substring(0, 20)}..." es demasiado largo. Máximo ${CONFIG.maxTextLength} caracteres.`
        }, { quoted: m });
      }
    }

    // Generar meme
    const memeBuffer = await generateMeme(template, texts);
    if (!memeBuffer) {
      return await sock.sendMessage(chatId, {
        text: '❌ Error al generar el meme. Intenta con otra plantilla.'
      }, { quoted: m });
    }

    // Enviar meme
    await sock.sendMessage(chatId, {
      image: memeBuffer,
      caption: `🎭 *Meme creado*\n\n🎨 Plantilla: ${template.name}\n👤 Creado por: @${userId.split('@')[0]}\n\n💡 Usa \`.savememe\` para guardarlo`,
      mentions: [userId]
    }, { quoted: m });

    // Guardar en historial
    await saveMemeToHistory(userId, template.name, texts);

    memeLogger.success(`Meme creado: ${template.name} por ${userId}`);

  } catch (error) {
    memeLogger.error('Error creando meme:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al crear el meme.'
    }, { quoted: m });
  }
}

// Mostrar lista de memes guardados
async function showMemeList(sock, m) {
  const chatId = m.key.remoteJid;

  try {
    const memes = await getPublicMemes();
    
    if (memes.length === 0) {
      return await sock.sendMessage(chatId, {
        text: '📭 No hay memes guardados públicamente.\n\n💡 Usa \`.makememe\` para crear y guardar memes.'
      }, { quoted: m });
    }

    let message = `📋 *LISTA DE MEMES* 📋\n\n`;
    message += `📊 Total: ${memes.length} memes\n\n`;

    memes.slice(0, 10).forEach((meme, index) => {
      message += `${index + 1}. **${meme.title}**\n`;
      message += `   👤 @${meme.creator.split('@')[0]}\n`;
      message += `   🎨 Plantilla: ${meme.template}\n`;
      message += `   ❤️ ${meme.likes} likes\n`;
      message += `   📅 ${new Date(meme.created_at).toLocaleDateString()}\n\n`;
    });

    if (memes.length > 10) {
      message += `📊 Y ${memes.length - 10} memes más...\n\n`;
    }

    message += `💡 *Comandos:*\n`;
    message += `• \`.mymemes\` - Ver tus memes\n`;
    message += `• \`.randommeme\` - Meme aleatorio`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: memes.slice(0, 10).map(m => m.creator)
    }, { quoted: m });

  } catch (error) {
    memeLogger.error('Error mostrando lista de memes:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la lista de memes.'
    }, { quoted: m });
  }
}

// Generar meme aleatorio
async function generateRandomMeme(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    await sock.sendMessage(chatId, {
      text: '🎲 *Generando meme aleatorio...*'
    }, { quoted: m });

    const templates = await getMemeTemplates();
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    // Generar textos aleatorios
    const randomTexts = await generateRandomTexts(randomTemplate.text_boxes);
    
    // Generar meme
    const memeBuffer = await generateMeme(randomTemplate, randomTexts);
    if (!memeBuffer) {
      return await sock.sendMessage(chatId, {
        text: '❌ Error al generar el meme aleatorio.'
      }, { quoted: m });
    }

    await sock.sendMessage(chatId, {
      image: memeBuffer,
      caption: `🎲 *MEME ALEATORIO* 🎲\n\n🎨 Plantilla: ${randomTemplate.name}\n👤 Generado para: @${userId.split('@')[0]}\n\n💡 Usa \`.savememe\` para guardarlo`,
      mentions: [userId]
    }, { quoted: m });

    memeLogger.success(`Meme aleatorio generado: ${randomTemplate.name} para ${userId}`);

  } catch (error) {
    memeLogger.error('Error generando meme aleatorio:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al generar el meme aleatorio.'
    }, { quoted: m });
  }
}

// Guardar meme
async function saveMeme(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  // Verificar si hay una imagen para guardar
  if (!m.message?.imageMessage && !m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes responder a una imagen o enviar una para guardarla como meme.'
    }, { quoted: m });
  }

  try {
    await sock.sendMessage(chatId, {
      text: '💾 *Guardando meme...*'
    }, { quoted: m });

    // Obtener la imagen
    let imageBuffer;
    if (m.message?.imageMessage) {
      imageBuffer = await sock.downloadMediaMessage(m);
    } else {
      const quotedMessage = m.message.extendedTextMessage.contextInfo.quotedMessage;
      imageBuffer = await sock.downloadMediaMessage({
        key: {
          remoteJid: chatId,
          id: m.message.extendedTextMessage.contextInfo.stanzaId,
          fromMe: false
        },
        message: quotedMessage
      });
    }

    // Guardar meme en la base de datos
    const memeId = await saveMemeToDatabase(userId, imageBuffer);

    let message = `💾 *MEME GUARDADO* 💾\n\n`;
    message += `👤 Guardado por: @${userId.split('@')[0]}\n`;
    message += `🆔 ID: ${memeId}\n`;
    message += `📅 Fecha: ${new Date().toLocaleDateString()}\n\n`;
    message += `💡 *Comandos:*\n`;
    message += `• \`.mymemes\` - Ver tus memes guardados\n`;
    message += `• \`.memelist\` - Ver memes públicos`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    memeLogger.success(`Meme guardado: ${memeId} por ${userId}`);

  } catch (error) {
    memeLogger.error('Error guardando meme:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al guardar el meme.'
    }, { quoted: m });
  }
}

// Mostrar memes del usuario
async function showMyMemes(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const memes = await getUserMemes(userId);
    
    if (memes.length === 0) {
      return await sock.sendMessage(chatId, {
        text: '📭 No tienes memes guardados.\n\n💡 Usa \`.makememe\` para crear memes o \`.savememe\` para guardar imágenes.'
      }, { quoted: m });
    }

    let message = `🎭 *TUS MEMES* 🎭\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `📊 Total: ${memes.length} memes\n\n`;

    memes.slice(0, 5).forEach((meme, index) => {
      message += `${index + 1}. **${meme.title || 'Sin título'}**\n`;
      message += `   🆔 ID: ${meme.id}\n`;
      message += `   📅 ${new Date(meme.created_at).toLocaleDateString()}\n`;
      message += `   ❤️ ${meme.likes || 0} likes\n\n`;
    });

    if (memes.length > 5) {
      message += `📊 Y ${memes.length - 5} memes más...\n\n`;
    }

    message += `💡 *Para compartir un meme:*\n`;
    message += `• Responde a este mensaje con \`.share <ID del meme>\``;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    memeLogger.error('Error mostrando memes del usuario:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar tus memes.'
    }, { quoted: m });
  }
}

// Mostrar ayuda
async function showMemeHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `🎭 *SISTEMA DE MEMES* 🎭\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `🎨 *Creación:*\n`;
  message += `• \`.meme\` - Ver plantillas disponibles\n`;
  message += `• \`.makememe <plantilla> | texto1 | texto2\` - Crear meme\n`;
  message += `• \`.randommeme\` - Generar meme aleatorio\n\n`;
  
  message += `💾 *Gestión:*\n`;
  message += `• \`.savememe\` - Guardar imagen como meme (responde a imagen)\n`;
  message += `• \`.mymemes\` - Ver tus memes guardados\n`;
  message += `• \`.memelist\` - Ver memes públicos\n\n`;
  
  message += `📊 *Plantillas populares:*\n`;
  message += `• drake - Meme de Drake\n`;
  message += `• distracted - Novia distraída\n`;
  message += `• expanding_brain - Cerebro expandiéndose\n`;
  message += `• woman_yelling - Mujer gritando\n`;
  message += `• two_buttons - Dos botones\n`;
  message += `• change_my_mind - Cambia mi mente\n`;
  message += `• butterfly - Mariposa\n`;
  message += `• panik_kalm - Panik Kalm Panik\n`;
  message += `• stonks - Stonks\n`;
  message += `• surprised_pikachu - Pikachu sorprendido\n`;
  message += `• this_is_fine - Esto está bien\n`;
  message += `• galaxy_brain - Cerebro de galaxia\n\n`;
  
  message += `💡 *Ejemplos de uso:*\n`;
  message += `• \`.makememe drake | No estudiar | Estudiar y aprobar\`\n`;
  message += `• \`.makememe distracted | Mi waifu | Otra waifu\`\n`;
  message += `• \`.makememe two_buttons | Café | Té\`\n\n`;
  
  message += `📋 *Límites:*\n`;
  message += `• Máximo ${CONFIG.maxTextLength} caracteres por texto\n`;
  message += `• Formatos soportados: ${CONFIG.supportedFormats.join(', ')}\n`;
  message += `• Tamaño máximo: ${(CONFIG.maxFileSize / 1024 / 1024).toFixed(0)}MB`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones auxiliares
async function getMemeTemplates() {
  try {
    return [
      {
        name: 'drake',
        description: 'Drake aprobando/desaprobando',
        text_boxes: 2,
        url: 'https://i.imgflip.com/30b1gx.jpg'
      },
      {
        name: 'distracted',
        description: 'Novia distraída con otro hombre',
        text_boxes: 3,
        url: 'https://i.imgflip.com/1ur9b0.jpg'
      },
      {
        name: 'expanding_brain',
        description: 'Cerebro expandiéndose',
        text_boxes: 4,
        url: 'https://i.imgflip.com/1jwhww.jpg'
      },
      {
        name: 'woman_yelling',
        description: 'Mujer gritando con gato confundido',
        text_boxes: 2,
        url: 'https://i.imgflip.com/345v97.jpg'
      },
      {
        name: 'two_buttons',
        description: 'Hombre sudando con dos botones',
        text_boxes: 2,
        url: 'https://i.imgflip.com/222403.jpg'
      },
      {
        name: 'change_my_mind',
        description: 'Hombre con pistola "Change My Mind"',
        text_boxes: 1,
        url: 'https://i.imgflip.com/24y43o.jpg'
      },
      {
        name: 'butterfly',
        description: 'Mariposa "¿Y si las dos?"',
        text_boxes: 2,
        url: 'https://i.imgflip.com/3513v3.jpg'
      },
      {
        name: 'panik_kalm',
        description: 'Panik Kalm Panik',
        text_boxes: 3,
        url: 'https://i.imgflip.com/3omwz.jpg'
      },
      {
        name: 'stonks',
        description: 'Hombre con gráficos "Stonks"',
        text_boxes: 1,
        url: 'https://i.imgflip.com/4ywoe.jpg'
      },
      {
        name: 'surprised_pikachu',
        description: 'Pikachu sorprendido',
        text_boxes: 1,
        url: 'https://i.imgflip.com/2hkje.jpg'
      },
      {
        name: 'this_is_fine',
        description: 'Perro en cuarto en llamas "This is Fine"',
        text_boxes: 1,
        url: 'https://i.imgflip.com/3bwx7.jpg'
      },
      {
        name: 'galaxy_brain',
        description: 'Cerebro de galaxia',
        text_boxes: 4,
        url: 'https://i.imgflip.com/3o7he.png'
      }
    ];
  } catch (error) {
    memeLogger.error('Error obteniendo plantillas:', error);
    return [];
  }
}

async function getTemplateByName(name) {
  const templates = await getMemeTemplates();
  return templates.find(t => t.name.toLowerCase() === name.toLowerCase());
}

async function generateMeme(template, texts) {
  try {
    // Simulación de generación de meme (en producción usarías Canvas o una API real)
    memeLogger.info(`Generando meme con plantilla ${template.name} y textos: ${texts.join(', ')}`);
    
    // Simulación - en producción aquí usarías una librería como Canvas.js o una API externa
    // Por ahora, devolvemos null para simular que no se puede generar
    return null;
    
    // Ejemplo de cómo sería con Canvas:
    /*
    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext('2d');
    
    // Cargar imagen de plantilla
    const image = await loadImage(template.url);
    ctx.drawImage(image, 0, 0, template.width, template.height);
    
    // Añadir textos
    ctx.font = '30px Impact';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    
    template.text_positions.forEach((pos, index) => {
      const text = texts[index];
      ctx.fillText(text, pos.x, pos.y);
      ctx.strokeText(text, pos.x, pos.y);
    });
    
    return canvas.toBuffer();
    */
  } catch (error) {
    memeLogger.error('Error generando meme:', error);
    return null;
  }
}

async function generateRandomTexts(count) {
  const randomTexts = [
    'Cuando no estudias para el examen',
    'Pero apruebas igual',
    'Yo vs Yo después de café',
    'Mi cara cuando me despierto',
    'Esa persona que siempre tiene razón',
    'Mi vida en una imagen',
    'Cuando alguien dice "confía en mí"',
    'Mis expectativas vs Realidad',
    'Yo tratando de ser productivo',
    'Cuando finalmente es viernes'
  ];
  
  const texts = [];
  for (let i = 0; i < count; i++) {
    texts.push(randomTexts[Math.floor(Math.random() * randomTexts.length)]);
  }
  return texts;
}

async function saveMemeToHistory(userId, templateName, texts) {
  try {
    await db.run(`
      INSERT INTO meme_history (user_id, template, texts, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, templateName, JSON.stringify(texts)]);
  } catch (error) {
    memeLogger.error('Error guardando en historial:', error);
  }
}

async function saveMemeToDatabase(userId, imageBuffer) {
  try {
    const result = await db.run(`
      INSERT INTO saved_memes (user_id, image_data, title, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, imageBuffer, 'Meme guardado']);
    
    return result.lastID;
  } catch (error) {
    memeLogger.error('Error guardando meme en base de datos:', error);
    throw error;
  }
}

async function getPublicMemes() {
  try {
    return await db.all(`
      SELECT * FROM saved_memes 
      WHERE is_public = 1 
      ORDER BY likes DESC, created_at DESC 
      LIMIT 20
    `);
  } catch (error) {
    memeLogger.error('Error obteniendo memes públicos:', error);
    return [];
  }
}

async function getUserMemes(userId) {
  try {
    return await db.all(`
      SELECT * FROM saved_memes 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [userId]);
  } catch (error) {
    memeLogger.error('Error obteniendo memes del usuario:', error);
    return [];
  }
}

// Inicializar tablas
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS meme_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        template TEXT,
        texts TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS saved_memes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        image_data BLOB,
        title TEXT,
        is_public INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    memeLogger.success('Tablas de memes inicializadas');
  } catch (error) {
    memeLogger.error('Error inicializando tablas:', error);
  }
}

// Inicializar sistema
initializeTables();

// Exportar funciones para compatibilidad
export { 
  CONFIG,
  memeLogger,
  getMemeTemplates,
  generateMeme
};
