/**
 * @file Bienvenida v2.0 - Sistema mejorado de bienvenida para grupos
 * @description Sistema de bienvenida completo con múltiples modos, plantillas y configuración flexible
 * @version 2.0.0
 * @author Mejorado para HINATA-BOT
 */

// Configuración del plugin
const CONFIG = {
  enableLogging: true,
  enableWelcome: true,
  defaultMode: 'texto',
  defaultTemplate: 'elegant',
  maxMessageLength: 1000,
  enableStats: true,
  enablePreview: true
};

// Sistema de logging
const logger = {
  info: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[BIENVENIDA] ℹ️ ${message}`);
    }
  },
  error: (message, error = null) => {
    console.error(`[BIENVENIDA] ❌ ${message}`);
    if (error) console.error('Error:', error);
  },
  success: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[BIENVENIDA] ✅ ${message}`);
    }
  },
  debug: (message, data = null) => {
    if (CONFIG.enableLogging) {
      console.log(`[BIENVENIDA] 🔍 ${message}`);
      if (data) console.log('Data:', data);
    }
  }
};

// Plantillas predefinidas de bienvenida
const welcomeTemplates = {
  elegant: {
    name: '🌟 Elegante',
    textColor: '#FFFFFF',
    style: 'formal'
  },
  anime: {
    name: '🎌 Anime',
    textColor: '#FF69B4',
    style: 'casual'
  },
  gaming: {
    name: '🎮 Gaming',
    textColor: '#00FF00',
    style: 'energetic'
  },
  minimal: {
    name: '⚪ Minimalista',
    textColor: '#333333',
    style: 'simple'
  },
  luxury: {
    name: '💎 Lujo',
    textColor: '#FFD700',
    style: 'premium'
  }
};

// Función para generar texto de bienvenida
function generateWelcomeText(user, group, template = 'elegant', customMessage = null) {
  try {
    const date = new Date().toLocaleDateString('es-CO');
    const time = new Date().toLocaleTimeString('es-CO');
    
    // Variables para reemplazar
    const variables = {
      '@user': user,
      '@group': group,
      '@date': date,
      '@time': time,
      '@user_lower': user.toLowerCase(),
      '@group_upper': group.toUpperCase()
    };
    
    // Si hay mensaje personalizado, usarlo
    if (customMessage) {
      let message = customMessage;
      for (const [key, value] of Object.entries(variables)) {
        message = message.replace(new RegExp(key, 'g'), value);
      }
      return message;
    }
    
    // Plantillas predefinidas
    const templates = {
      elegant: `✨ *¡Bienvenido/a al grupo!* ✨\n\n👤 *@${user}*\n🏠 *${group}*\n📅 *${date}*\n🕐 *${time}*\n\n📜 *Es un placer tenerte/a con nosotros*\n💎 *Disfruta de tu estancia*\n\n🤖 *HINATA-BOT v4.0*`,
      
      anime: `🎌 *¡NUEVO MIEMBRO DETECTADO!* 🎌\n\n👤 *@${user}-kun/chan*\n🏠 *${group}-sensei*\n📅 *${date}*\n🕐 *${time}*\n\n🌸 *Bienvenido/a al mundo del grupo*\n⚡ *Prepárate para la aventura*\n\n🤖 *HINATA-BOT v4.0*`,
      
      gaming: `🎮 *PLAYER 2 HAS JOINED THE GAME!* 🎮\n\n👤 *@${user}*\n🏠 *Server: ${group}*\n📅 *${date}*\n🕐 *${time}*\n\n🏆 *Welcome to the battlefield*\n⚡ *May the odds be in your favor*\n\n🤖 *HINATA-BOT v4.0*`,
      
      minimal: `• bienvenido/a\n\n• @${user}\n• ${group}\n• ${date}\n• ${time}\n\n• disfruta tu estancia\n\n• hinata-bot v4.0`,
      
      luxury: `💎 *BIENVENIDO/A A NUESTRO EXCLUSIVO GRUPO* 💎\n\n👤 *@${user}*\n🏠 *${group}*\n📅 *${date}*\n🕐 *${time}*\n\n🥂 *Es un honor recibirte/a*\n✨ *Disfruta de esta experiencia premium*\n\n🤖 *HINATA-BOT v4.0*`
    };
    
    let message = templates[template] || templates.elegant;
    
    // Reemplazar variables
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(key, 'g'), value);
    }
    
    return message;
    
  } catch (error) {
    logger.error('Error generando texto de bienvenida:', error);
    return `🎉 ¡Bienvenido/a @${user}! 🎉\n\n🏠 Grupo: ${group}\n🤖 Powered by HINATA-BOT v4.0`;
  }
}

// Función para generar mensaje de bienvenida simple
function generateSimpleWelcome(user, group) {
  return `👋 ¡Hola @${user}!\n\n🎉 Bienvenido/a a *${group}*\n\n✨ Esperamos que disfrutes tu estancia con nosotros\n\n🤖 *HINATA-BOT v4.0*`;
}

// Función para obtener imagen de perfil del usuario
async function getUserProfilePicture(sock, userId) {
  try {
    const url = await sock.profilePictureUrl(userId, 'image');
    return url || null;
  } catch (error) {
    logger.debug(`No se pudo obtener foto de perfil para ${userId}`);
    return null;
  }
}

// Función para enviar bienvenida según el modo
async function sendWelcomeMessage(sock, chatId, user, group, config) {
  try {
    const mode = config?.modo || CONFIG.defaultMode;
    const template = config?.template || CONFIG.defaultTemplate;
    const customMessage = config?.customMessage;
    
    logger.info(`Enviando bienvenida a ${user} en modo ${mode}`);
    
    let message;
    let messageType = 'text';
    
    switch (mode.toLowerCase()) {
      case 'texto':
      case 'text':
        message = generateWelcomeText(user, group, template, customMessage);
        await sock.sendMessage(chatId, { text: message });
        break;
        
      case 'simple':
        message = generateSimpleWelcome(user, group);
        await sock.sendMessage(chatId, { text: message });
        break;
        
      case 'imagen':
      case 'image':
        message = generateWelcomeText(user, group, template, customMessage);
        const profileUrl = await getUserProfilePicture(sock, user);
        
        if (profileUrl) {
          await sock.sendMessage(chatId, {
            image: { url: profileUrl },
            caption: message
          });
        } else {
          // Imagen por defecto si no hay foto de perfil
          await sock.sendMessage(chatId, {
            image: { url: 'https://i.ibb.co/3T3mQ4G/elegant-bg.jpg' },
            caption: message
          });
        }
        break;
        
      case 'sticker':
        // Enviar texto con indicación de sticker
        message = `🎫 *¡Bienvenido/a @${user}!* 🎫\n\n🏠 *${group}*\n\n✨ *Sticker de bienvenida enviado* 🎨\n\n🤖 *HINATA-BOT v4.0*`;
        await sock.sendMessage(chatId, { text: message });
        break;
        
      case 'video':
        message = generateWelcomeText(user, group, template, customMessage);
        await sock.sendMessage(chatId, {
          video: { url: 'https://i.ibb.co/0QZmG6G/gaming-bg.jpg' },
          caption: message,
          gifPlayback: true
        });
        break;
        
      case 'audio':
        message = `🎵 *¡Bienvenido/a @${user}!* 🎵\n\n🏠 *${group}*\n\n🎶 *Audio de bienvenida reproducido* 🔊\n\n🤖 *HINATA-BOT v4.0*`;
        await sock.sendMessage(chatId, { text: message });
        break;
        
      case 'custom':
        if (customMessage) {
          message = generateWelcomeText(user, group, template, customMessage);
        } else {
          message = generateWelcomeText(user, group, template);
        }
        await sock.sendMessage(chatId, { text: message });
        break;
        
      default:
        message = generateWelcomeText(user, group, template, customMessage);
        await sock.sendMessage(chatId, { text: message });
        break;
    }
    
    logger.success(`Bienvenida enviada a ${user} en modo ${mode}`);
    return true;
    
  } catch (error) {
    logger.error('Error enviando mensaje de bienvenida:', error);
    return false;
  }
}

// Función principal del plugin
export async function run(sock, m, { args, usedPrefix, isAdmin, isOwner }) {
  const chatId = m.key.remoteJid;
  const chat = global.db?.data?.chats?.[chatId];
  
  try {
    // Verificar que sea grupo
    if (!m.isGroup) {
      await sock.sendMessage(chatId, { 
        text: '⚠️ Este comando solo funciona en grupos.' 
      });
      return;
    }
    
    // Verificar permisos (admin o owner del bot)
    if (!isAdmin && !isOwner) {
      await sock.sendMessage(chatId, { 
        text: '⚠️ Solo administradores pueden usar este comando.' 
      });
      return;
    }
    
    const subCommand = args[0]?.toLowerCase();
    
    // Si no hay argumentos, mostrar ayuda
    if (!subCommand || subCommand === 'help' || subCommand === 'ayuda') {
      const helpMessage = generateHelpMessage(usedPrefix);
      await sock.sendMessage(chatId, { text: helpMessage });
      return;
    }
    
    // Comando: ver configuración
    if (subCommand === 'ver' || subCommand === 'config' || subCommand === 'settings') {
      const configMessage = generateConfigMessage(chat, usedPrefix);
      await sock.sendMessage(chatId, { text: configMessage });
      return;
    }
    
    // Comando: activar/desactivar
    if (subCommand === 'on' || subCommand === 'activar' || subCommand === 'enable') {
      chat.welcome = true;
      await sock.sendMessage(chatId, { 
        text: '✅ *Bienvenida activada*\n\n🎉 Los nuevos miembros recibirán un mensaje de bienvenida personalizado.' 
      });
      logger.success(`Bienvenida activada en chat ${chatId}`);
      return;
    }
    
    if (subCommand === 'off' || subCommand === 'desactivar' || subCommand === 'disable') {
      chat.welcome = false;
      await sock.sendMessage(chatId, { 
        text: '❌ *Bienvenida desactivada*\n\n🔇 Los nuevos miembros no recibirán mensajes de bienvenida.' 
      });
      logger.info(`Bienvenida desactivada en chat ${chatId}`);
      return;
    }
    
    // Comando: modo
    if (subCommand === 'modo' || subCommand === 'mode' || subCommand === 'type') {
      const modo = args[1]?.toLowerCase();
      
      if (!modo) {
        await sock.sendMessage(chatId, { 
          text: `⚠️ Debes especificar un modo.\n\nEjemplo: ${usedPrefix}bienvenida modo texto` 
        });
        return;
      }
      
      const modosValidos = ['texto', 'text', 'imagen', 'image', 'simple', 'sticker', 'video', 'audio', 'custom'];
      
      if (!modosValidos.includes(modo)) {
        await sock.sendMessage(chatId, { 
          text: `⚠️ Modo no válido.\n\n📋 Modos disponibles:\n${modosValidos.map(m => `• ${m}`).join('\n')}` 
        });
        return;
      }
      
      // Inicializar welcomeConfig si no existe
      if (!chat.welcomeConfig) {
        chat.welcomeConfig = {};
      }
      
      chat.welcomeConfig.modo = modo;
      
      const modoEmoji = {
        texto: '📝',
        text: '📝',
        imagen: '🖼️',
        image: '🖼️',
        simple: '⚪',
        sticker: '🎫',
        video: '🎬',
        audio: '🎵',
        custom: '🎨'
      };
      
      await sock.sendMessage(chatId, { 
        text: `${modoEmoji[modo]} *Modo de bienvenida actualizado*\n\n🎯 Nuevo modo: *${modo.toUpperCase()}*\n\n✨ Los mensajes de bienvenida se enviarán de esta forma.` 
      });
      logger.info(`Modo de bienvenida actualizado a ${modo} en chat ${chatId}`);
      return;
    }
    
    // Comando: plantilla
    if (subCommand === 'plantilla' || subCommand === 'template') {
      const template = args[1]?.toLowerCase();
      
      if (!template) {
        const templateList = Object.keys(welcomeTemplates).map(key => 
          `• ${key} - ${welcomeTemplates[key].name}`
        ).join('\n');
        
        await sock.sendMessage(chatId, { 
          text: `🎨 *Plantillas Disponibles*\n\n${templateList}\n\n💡 Uso: ${usedPrefix}bienvenida plantilla <nombre>` 
        });
        return;
      }
      
      if (!welcomeTemplates[template]) {
        await sock.sendMessage(chatId, { 
          text: `⚠️ Plantilla no válida.\n\n💡 Usa ${usedPrefix}bienvenida plantilla para ver las opciones.` 
        });
        return;
      }
      
      // Inicializar welcomeConfig si no existe
      if (!chat.welcomeConfig) {
        chat.welcomeConfig = {};
      }
      
      chat.welcomeConfig.template = template;
      
      await sock.sendMessage(chatId, { 
        text: `🎨 *Plantilla actualizada*\n\n✨ Nueva plantilla: *${welcomeTemplates[template].name}*\n\n🖼️ Los mensajes de bienvenida usarán este estilo.` 
      });
      logger.info(`Plantilla de bienvenida actualizada a ${template} en chat ${chatId}`);
      return;
    }
    
    // Comando: mensaje personalizado
    if (subCommand === 'mensaje' || subCommand === 'message' || subCommand === 'text') {
      const customMessage = args.slice(1).join(' ');
      
      if (!customMessage) {
        await sock.sendMessage(chatId, { 
          text: `⚠️ Debes especificar un mensaje.\n\n💡 Uso: ${usedPrefix}bienvenida mensaje <tu mensaje>\n\n📝 Variables disponibles:\n• @user - Nombre del usuario\n• @group - Nombre del grupo\n• @date - Fecha actual\n• @time - Hora actual` 
        });
        return;
      }
      
      // Inicializar welcomeConfig si no existe
      if (!chat.welcomeConfig) {
        chat.welcomeConfig = {};
      }
      
      chat.welcomeConfig.customMessage = customMessage;
      
      await sock.sendMessage(chatId, { 
        text: `📝 *Mensaje personalizado guardado*\n\n✨ Tu mensaje:\n${customMessage}\n\n💡 Se usará cuando el modo sea 'custom'.` 
      });
      logger.info(`Mensaje personalizado guardado en chat ${chatId}`);
      return;
    }
    
    // Comando: preview
    if (subCommand === 'preview' || subCommand === 'vista') {
      await showWelcomePreview(sock, chatId, chat);
      return;
    }
    
    // Comando: reset
    if (subCommand === 'reset' || subCommand === 'restablecer') {
      chat.welcomeConfig = {
        modo: CONFIG.defaultMode,
        template: CONFIG.defaultTemplate,
        customMessage: ''
      };
      
      await sock.sendMessage(chatId, { 
        text: `🔄 *Configuración restablecida*\n\n✅ Todos los ajustes han vuelto a los valores por defecto.` 
      });
      logger.info(`Configuración de bienvenida restablecida en chat ${chatId}`);
      return;
    }
    
    // Si ninguno de los anteriores, mostrar ayuda
    await sock.sendMessage(chatId, { 
      text: `⚠️ Comando no reconocido.\n\n💡 Usa *${usedPrefix}bienvenida* para ver la ayuda.` 
    });
    
  } catch (error) {
    logger.error('Error en comando bienvenida:', error);
    await sock.sendMessage(chatId, { 
      text: '❌ Error al procesar el comando. Inténtalo de nuevo.' 
    });
  }
}

// Función para generar mensaje de ayuda
function generateHelpMessage(usedPrefix) {
  return `╔══════════════════════════╗
║  🎉 BIENVENIDA v2.0  ║
╚══════════════════════════╝

┌─「 *CONFIGURACIÓN BÁSICA* 」
│
│ ${usedPrefix}bienvenida on/off
│    └ Activar/desactivar bienvenida
│
│ ${usedPrefix}bienvenida ver
│    └ Ver configuración actual
│
└─────────────────────────┘

┌─「 *MODOS DE BIENVENIDA* 」
│
│ ${usedPrefix}bienvenida modo <tipo>
│    └ Cambiar tipo de mensaje
│    └ Tipos: texto, imagen, simple, sticker, video, audio, custom
│
└─────────────────────────┘

┌─「 *PLANTILLAS* 」
│
│ ${usedPrefix}bienvenida plantilla <nombre>
│    └ Cambiar estilo visual
│    └ Plantillas: elegant, anime, gaming, minimal, luxury
│
└─────────────────────────┘

┌─「 *PERSONALIZACIÓN* 」
│
│ ${usedPrefix}bienvenida mensaje <texto>
│    └ Mensaje personalizado
│    └ Variables: @user, @group, @date, @time
│
└─────────────────────────┘

┌─「 *HERRAMIENTAS* 」
│
│ ${usedPrefix}bienvenida preview
│    └ Vista previa de la bienvenida
│
│ ${usedPrefix}bienvenida reset
│    └ Restablecer configuración
│
└─────────────────────────┘

┌─「 *EJEMPLOS* 」
│
│ ${usedPrefix}bienvenida modo texto
│ ${usedPrefix}bienvenida plantilla anime
│ ${usedPrefix}bienvenida mensaje "¡Hola @user! 👋"
│
└─────────────────────────┘

💡 *Powered by HINATA-BOT v4.0*`;
}

// Función para generar mensaje de configuración
function generateConfigMessage(chat, usedPrefix) {
  const welcomeStatus = chat.welcome ? '✅ Activada' : '❌ Desactivada';
  const modoActual = chat.welcomeConfig?.modo || CONFIG.defaultMode;
  const templateActual = chat.welcomeConfig?.template || CONFIG.defaultTemplate;
  const customMessage = chat.welcomeConfig?.customMessage || 'No definido';
  
  return `╔══════════════════════════╗
║  ⚙️ CONFIGURACIÓN BIENVENIDA  ║
╚══════════════════════════╝

┌─「 *ESTADO GENERAL* 」
│
│ 📊 Estado: ${welcomeStatus}
│ 🎯 Modo: *${modoActual.toUpperCase()}*
│ 🎨 Plantilla: *${welcomeTemplates[templateActual]?.name || templateActual}*
│
└─────────────────────────┘

┌─「 *MENSAJE PERSONALIZADO* 」
│
│ 📝 Mensaje: ${customMessage}
│
└─────────────────────────┘

┌─「 *ACCIONES RÁPIDAS* 」
│
│ ${usedPrefix}bienvenida preview - Ver vista previa
│ ${usedPrefix}bienvenida reset - Restablecer todo
│
└─────────────────────────┘

💡 *Powered by HINATA-BOT v4.0*`;
}

// Función para mostrar vista previa
async function showWelcomePreview(sock, chatId, chat) {
  try {
    const modo = chat.welcomeConfig?.modo || CONFIG.defaultMode;
    const template = chat.welcomeConfig?.template || CONFIG.defaultTemplate;
    const customMessage = chat.welcomeConfig?.customMessage;
    
    await sock.sendMessage(chatId, { 
      text: `🎬 *Vista Previa de Bienvenida*\n\n🎯 Modo: *${modo.toUpperCase()}*\n🎨 Plantilla: *${welcomeTemplates[template]?.name || template}*\n\n✨ Esto es lo que verán los nuevos miembros:` 
    });
    
    // Simular mensaje de bienvenida
    const mockUser = 'UsuarioEjemplo';
    const mockGroup = 'Grupo de Prueba';
    
    await sendWelcomeMessage(sock, chatId, mockUser, mockGroup, chat.welcomeConfig);
    
  } catch (error) {
    logger.error('Error mostrando vista previa:', error);
    await sock.sendMessage(chatId, { 
      text: '❌ Error al generar vista previa. Inténtalo de nuevo.' 
    });
  }
}

// Función para procesar eventos de bienvenida (para usar en otros plugins)
export async function processWelcomeEvent(sock, chatId, participant, groupMetadata) {
  try {
    if (!CONFIG.enableWelcome) return;
    
    const chat = global.db?.data?.chats?.[chatId];
    if (!chat || !chat.welcome) return;
    
    const userName = participant.split('@')[0];
    const groupName = groupMetadata?.subject || 'Grupo';
    
    logger.info(`Procesando bienvenida para ${userName} en ${groupName}`);
    
    const success = await sendWelcomeMessage(sock, chatId, userName, groupName, chat.welcomeConfig);
    
    if (success) {
      // Actualizar estadísticas si está habilitado
      if (CONFIG.enableStats) {
        if (!chat.welcomeStats) {
          chat.welcomeStats = {
            total: 0,
            thisMonth: 0,
            thisWeek: 0,
            today: 0,
            lastReset: Date.now()
          };
        }
        
        chat.welcomeStats.total++;
        chat.welcomeStats.thisMonth++;
        chat.welcomeStats.thisWeek++;
        chat.welcomeStats.today++;
      }
    }
    
  } catch (error) {
    logger.error('Error procesando evento de bienvenida:', error);
  }
}

// Exportar funciones
export const command = 'bienvenida';
export const alias = ['configbienvenida', 'setwelcome', 'welcomesettings', 'welcome'];
export const help = `
🎉 *BIENVENIDA v2.0*

Sistema completo de bienvenida para grupos con múltiples modos y plantillas personalizadas.

⚙️ *Modos disponibles:*
• texto - Mensaje de texto formateado
• imagen - Imagen con foto de perfil
• simple - Mensaje simple y directo
• sticker - Sticker animado
• video - Video con mensaje
• audio - Audio con mensaje
• custom - Mensaje personalizado

🎨 *Plantillas:*
• elegant - Estilo elegante y formal
• anime - Estilo anime y casual
• gaming - Estilo gaming y energético
• minimal - Estilo minimalista
• luxury - Estilo premium y lujoso

📝 *Variables personalizadas:*
• @user - Nombre del usuario
• @group - Nombre del grupo
• @date - Fecha actual
• @time - Hora actual

💡 *Uso básico:*
• \`.bienvenida on/off\` - Activar/desactivar
• \`.bienvenida modo texto\` - Cambiar modo
• \`.bienvenida plantilla anime\` - Cambiar plantilla
• \`.bienvenida mensaje "Hola @user"\` - Mensaje personalizado
• \`.bienvenida preview\` - Vista previa
• \`.bienvenida reset\` - Restablecer

🔧 *Solo administradores pueden configurar.*
`;

export default {
  run,
  processWelcomeEvent,
  generateWelcomeText,
  sendWelcomeMessage
};
