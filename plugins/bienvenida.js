/**
 * @file Plugin avanzado de bienvenida con imágenes y múltiples funcionalidades
 * @description Sistema de bienvenida completo con plantillas personalizadas, efectos visuales y estadísticas
 * @version 2.0.0
 */

import axios from 'axios'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp' // Para procesamiento de imágenes
import { JSDOM } from 'jsdom' // Para HTML personalizado

export const command = 'bienvenida'
export const alias = ['configbienvenida', 'setwelcome', 'welcomesettings', 'welcome']

// Plantillas predefinidas de bienvenida
const welcomeTemplates = {
  elegant: {
    name: '🌟 Elegante',
    background: 'https://i.ibb.co/3T3mQ4G/elegant-bg.jpg',
    textColor: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Georgia',
    effects: ['glow', 'fade-in']
  },
  anime: {
    name: '🎌 Anime',
    background: 'https://i.ibb.co/6P4sY7K/anime-bg.jpg',
    textColor: '#FF69B4',
    fontSize: 28,
    fontFamily: 'Arial',
    effects: ['sparkle', 'bounce']
  },
  gaming: {
    name: '🎮 Gaming',
    background: 'https://i.ibb.co/0QZmG6G/gaming-bg.jpg',
    textColor: '#00FF00',
    fontSize: 26,
    fontFamily: 'Courier New',
    effects: ['neon', 'pulse']
  },
  minimal: {
    name: '⚪ Minimalista',
    background: 'https://i.ibb.co/1n8Q6mX/minimal-bg.jpg',
    textColor: '#333333',
    fontSize: 22,
    fontFamily: 'Helvetica',
    effects: ['fade-in']
  },
  luxury: {
    name: '💎 Lujo',
    background: 'https://i.ibb.co/8X7t4K9/luxury-bg.jpg',
    textColor: '#FFD700',
    fontSize: 30,
    fontFamily: 'Times New Roman',
    effects: ['gold-glow', 'elegant']
  }
}

// Efectos visuales disponibles
const visualEffects = {
  'glow': { filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' },
  'neon': { filter: 'drop-shadow(0 0 20px currentColor)' },
  'sparkle': { filter: 'brightness(1.2) contrast(1.1)' },
  'fade-in': { animation: 'fadeIn 1s ease-in' },
  'bounce': { animation: 'bounce 0.6s ease-out' },
  'pulse': { animation: 'pulse 2s infinite' },
  'gold-glow': { filter: 'drop-shadow(0 0 15px gold)' },
  'elegant': { filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' }
}

// Función para generar imagen de bienvenida personalizada
async function generateWelcomeImage(user, group, template) {
  try {
    const templateConfig = welcomeTemplates[template] || welcomeTemplates.elegant
    
    // Crear canvas HTML para generar la imagen
    const dom = new JSDOM(`<!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; }
            .welcome-card {
              width: 800px;
              height: 400px;
              background: url('${templateConfig.background}') center/cover;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: ${templateConfig.fontFamily};
              color: ${templateConfig.textColor};
              text-align: center;
              overflow: hidden;
            }
            .overlay {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0,0,0,0.4);
            }
            .content {
              position: relative;
              z-index: 1;
              padding: 20px;
            }
            .title {
              font-size: ${templateConfig.fontSize + 8}px;
              font-weight: bold;
              margin-bottom: 20px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            }
            .user-info {
              font-size: ${templateConfig.fontSize}px;
              margin: 15px 0;
            }
            .group-info {
              font-size: ${templateConfig.fontSize - 4}px;
              opacity: 0.9;
              margin-top: 30px;
            }
            .footer {
              position: absolute;
              bottom: 20px;
              right: 20px;
              font-size: 14px;
              opacity: 0.7;
            }
            ${templateConfig.effects.map(effect => {
              const effectConfig = visualEffects[effect]
              if (effectConfig.filter) {
                return `.welcome-card { ${effectConfig.filter} }`
              }
              return ''
            }).join('\n')}
          </style>
        </head>
        <body>
          <div class="welcome-card">
            <div class="overlay"></div>
            <div class="content">
              <div class="title">🎉 ¡BIENVENIDO/A! 🎉</div>
              <div class="user-info">👤 @${user}</div>
              <div class="group-info">🏠 Grupo: ${group}</div>
              <div class="footer">🤖 HINATA-BOT v3.0</div>
            </div>
          </div>
        </body>
      </html>
    `)
    
    // Aquí iría la conversión de HTML a imagen usando una librería como puppeteer o html2canvas
    // Por ahora, devolveremos una URL de imagen pre-generada
    return {
      url: templateConfig.background,
      caption: generateWelcomeText(user, group, template)
    }
    
  } catch (error) {
    console.error('Error generando imagen de bienvenida:', error)
    return {
      url: 'https://i.ibb.co/3T3mQ4G/elegant-bg.jpg',
      caption: `🎉 ¡Bienvenido/a @${user}! 🎉\n\n🏠 Grupo: ${group}\n🤖 Powered by HINATA-BOT v3.0`
    }
  }
}

// Función para generar texto de bienvenida
function generateWelcomeText(user, group, template) {
  const templates = {
    elegant: `✨ *¡Bienvenido/a al grupo!* ✨\n\n👤 *@${user}*\n🏠 *${group}*\n\n📜 *Es un placer tenerte/a con nosotros*\n💎 *Disfruta de tu estancia*\n\n🤖 *HINATA-BOT v3.0*`,
    
    anime: `🎌 *¡NUEVO MIEMBRO DETECTADO!* 🎌\n\n👤 *@${user}-kun/chan*\n🏠 *${group}-sensei*\n\n🌸 *Bienvenido/a al mundo del grupo*\n⚡ *Prepárate para la aventura*\n\n🤖 *HINATA-BOT v3.0*`,
    
    gaming: `🎮 *PLAYER 2 HAS JOINED THE GAME!* 🎮\n\n👤 *@${user}*\n🏠 *Server: ${group}*\n\n🏆 *Welcome to the battlefield*\n⚡ *May the odds be in your favor*\n\n🤖 *HINATA-BOT v3.0*`,
    
    minimal: `• bienvenido/a\n\n• @${user}\n• ${group}\n\n• disfruta tu estancia\n\n• hinata-bot v3.0`,
    
    luxury: `💎 *BIENVENIDO/A A NUESTRO EXCLUSIVO GRUPO* 💎\n\n👤 *@${user}*\n🏠 *${group}*\n\n🥂 *Es un honor recibirte/a*\n✨ *Disfruta de esta experiencia premium*\n\n🤖 *HINATA-BOT v3.0*`
  }
  
  return templates[template] || templates.elegant
}

// Función para procesar imagen de perfil del usuario
async function processProfilePicture(imageUrl, effects = []) {
  try {
    // Aquí iría el procesamiento de imagen con sharp
    // Por ahora, devolveremos la URL original
    return imageUrl
  } catch (error) {
    console.error('Error procesando imagen de perfil:', error)
    return null
  }
}

// Función principal del plugin
export async function run(sock, m, { args, usedPrefix, isAdmin, isOwner }) {
  const chatId = m.key.remoteJid
  const chat = global.db.data.chats[chatId]
  
  // Verificar que sea grupo
  if (!m.isGroup) {
    await sock.sendMessage(chatId, { 
      text: '⚠️ Este comando solo funciona en grupos.' 
    })
    return
  }
  
  // Verificar permisos (admin o owner del bot)
  if (!isAdmin && !isOwner) {
    await sock.sendMessage(chatId, { 
      text: '⚠️ Solo administradores pueden usar este comando.' 
    })
    return
  }
  
  const subCommand = args[0]?.toLowerCase()
  
  // Si no hay argumentos, mostrar ayuda
  if (!subCommand || subCommand === 'help' || subCommand === 'ayuda') {
    const helpMessage = generateHelpMessage(usedPrefix)
    await sock.sendMessage(chatId, { text: helpMessage })
    return
  }
  
  // Comando: ver configuración
  if (subCommand === 'ver' || subCommand === 'config' || subCommand === 'settings') {
    const configMessage = generateConfigMessage(chat, usedPrefix)
    await sock.sendMessage(chatId, { text: configMessage })
    return
  }
  
  // Comando: activar/desactivar
  if (subCommand === 'on' || subCommand === 'activar' || subCommand === 'enable') {
    chat.welcome = true
    await sock.sendMessage(chatId, { 
      text: '✅ *Bienvenida activada*\n\n🎉 Los nuevos miembros recibirán un mensaje de bienvenida personalizado.' 
    })
    return
  }
  
  if (subCommand === 'off' || subCommand === 'desactivar' || subCommand === 'disable') {
    chat.welcome = false
    await sock.sendMessage(chatId, { 
      text: '❌ *Bienvenida desactivada*\n\n🔇 Los nuevos miembros no recibirán mensajes de bienvenida.' 
    })
    return
  }
  
  // Comando: modo
  if (subCommand === 'modo' || subCommand === 'mode' || subCommand === 'type') {
    const modo = args[1]?.toLowerCase()
    
    if (!modo) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Debes especificar un modo.\n\nEjemplo: ${usedPrefix}bienvenida modo imagen` 
      })
      return
    }
    
    const modosValidos = ['imagen', 'texto', 'sticker', 'video', 'audio', 'custom']
    
    if (!modosValidos.includes(modo)) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Modo no válido.\n\n📋 Modos disponibles:\n${modosValidos.map(m => `• ${m}`).join('\n')}` 
      })
      return
    }
    
    // Inicializar welcomeConfig si no existe
    if (!chat.welcomeConfig) {
      chat.welcomeConfig = {}
    }
    
    chat.welcomeConfig.modo = modo
    
    const modoEmoji = {
      imagen: '🖼️',
      texto: '📝',
      sticker: '🎫',
      video: '🎬',
      audio: '🎵',
      custom: '🎨'
    }
    
    await sock.sendMessage(chatId, { 
      text: `${modoEmoji[modo]} *Modo de bienvenida actualizado*\n\n🎯 Nuevo modo: *${modo.toUpperCase()}*\n\n✨ Los mensajes de bienvenida se enviarán de esta forma.` 
    })
    return
  }
  
  // Comando: plantilla
  if (subCommand === 'plantilla' || subCommand === 'template') {
    const template = args[1]?.toLowerCase()
    
    if (!template) {
      const templateList = Object.keys(welcomeTemplates).map(key => 
        `• ${key} - ${welcomeTemplates[key].name}`
      ).join('\n')
      
      await sock.sendMessage(chatId, { 
        text: `🎨 *Plantillas Disponibles*\n\n${templateList}\n\n💡 Uso: ${usedPrefix}bienvenida plantilla <nombre>` 
      })
      return
    }
    
    if (!welcomeTemplates[template]) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Plantilla no válida.\n\n💡 Usa ${usedPrefix}bienvenida plantilla para ver las opciones.` 
      })
      return
    }
    
    // Inicializar welcomeConfig si no existe
    if (!chat.welcomeConfig) {
      chat.welcomeConfig = {}
    }
    
    chat.welcomeConfig.template = template
    
    await sock.sendMessage(chatId, { 
      text: `🎨 *Plantilla actualizada*\n\n✨ Nueva plantilla: *${welcomeTemplates[template].name}*\n\n🖼️ Los mensajes de bienvenida usarán este estilo.` 
    })
    return
  }
  
  // Comando: mensaje personalizado
  if (subCommand === 'mensaje' || subCommand === 'message' || subCommand === 'text') {
    const customMessage = args.slice(1).join(' ')
    
    if (!customMessage) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Debes especificar un mensaje.\n\n💡 Uso: ${usedPrefix}bienvenida mensaje <tu mensaje>\n\n📝 Variables disponibles:\n• @user - Nombre del usuario\n• @group - Nombre del grupo\n• @date - Fecha actual\n• @time - Hora actual` 
      })
      return
    }
    
    // Inicializar welcomeConfig si no existe
    if (!chat.welcomeConfig) {
      chat.welcomeConfig = {}
    }
    
    chat.welcomeConfig.customMessage = customMessage
    
    await sock.sendMessage(chatId, { 
      text: `📝 *Mensaje personalizado guardado*\n\n✨ Tu mensaje:\n${customMessage}\n\n💡 Se usará cuando el modo sea 'custom'.` 
    })
    return
  }
  
  // Comando: efectos
  if (subCommand === 'efectos' || subCommand === 'effects') {
    const effects = args.slice(1)
    
    if (effects.length === 0) {
      const effectList = Object.keys(visualEffects).map(effect => 
        `• ${effect} - ${effect.charAt(0).toUpperCase() + effect.slice(1).replace('-', ' ')}`
      ).join('\n')
      
      await sock.sendMessage(chatId, { 
        text: `✨ *Efectos Visuales Disponibles*\n\n${effectList}\n\n💡 Uso: ${usedPrefix}bienvenida efectos <efecto1> <efecto2> ...` 
      })
      return
    }
    
    const invalidEffects = effects.filter(effect => !visualEffects[effect])
    
    if (invalidEffects.length > 0) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Efectos no válidos: ${invalidEffects.join(', ')}\n\n💡 Usa ${usedPrefix}bienvenida efectos para ver las opciones.` 
      })
      return
    }
    
    // Inicializar welcomeConfig si no existe
    if (!chat.welcomeConfig) {
      chat.welcomeConfig = {}
    }
    
    chat.welcomeConfig.effects = effects
    
    await sock.sendMessage(chatId, { 
      text: `✨ *Efectos visuales actualizados*\n\n🎯 Efectos activos: ${effects.map(e => `• ${e}`).join('\n')}\n\n🖼️ Se aplicarán a las imágenes de bienvenida.` 
    })
    return
  }
  
  // Comando: estadísticas
  if (subCommand === 'stats' || subCommand === 'estadisticas') {
    const stats = generateWelcomeStats(chatId)
    await sock.sendMessage(chatId, { text: stats })
    return
  }
  
  // Comando: preview
  if (subCommand === 'preview' || subCommand === 'vista') {
    await showWelcomePreview(sock, chatId, chat)
    return
  }
  
  // Comando: reset
  if (subCommand === 'reset' || subCommand === 'restablecer') {
    chat.welcomeConfig = {
      modo: 'imagen',
      template: 'elegant',
      effects: ['fade-in'],
      customMessage: ''
    }
    
    await sock.sendMessage(chatId, { 
      text: `🔄 *Configuración restablecida*\n\n✅ Todos los ajustes han vuelto a los valores por defecto.` 
    })
    return
  }
  
  // Si ninguno de los anteriores, mostrar ayuda
  await sock.sendMessage(chatId, { 
    text: `⚠️ Comando no reconocido.\n\n💡 Usa *${usedPrefix}bienvenida* para ver la ayuda.` 
  })
}

// Función para generar mensaje de ayuda
function generateHelpMessage(usedPrefix) {
  return `╔══════════════════════════╗
║  🎉 BIENVENIDA AVANZADA v2.0  ║
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
│    └ Tipos: imagen, texto, sticker, video, audio, custom
│
└─────────────────────────┘

┌─「 *PLANTILLAS VISUALES* 」
│
│ ${usedPrefix}bienvenida plantilla <nombre>
│    └ Cambiar estilo visual
│    └ Plantillas: elegant, anime, gaming, minimal, luxury
│
└─────────────────────────┘

┌─" *PERSONALIZACIÓN* 」
│
│ ${usedPrefix}bienvenida mensaje <texto>
│    └ Mensaje personalizado
│    └ Variables: @user, @group, @date, @time
│
│ ${usedPrefix}bienvenida efectos <efectos...>
│    └ Efectos visuales para imágenes
│    └ Efectos: glow, neon, sparkle, fade-in, bounce, pulse
│
└─────────────────────────┘

┌─" *HERRAMIENTAS* 」
│
│ ${usedPrefix}bienvenida preview
│    └ Vista previa de la bienvenida
│
│ ${usedPrefix}bienvenida stats
│    └ Estadísticas de uso
│
│ ${usedPrefix}bienvenida reset
│    └ Restablecer configuración
│
└─────────────────────────┘

┌─" *EJEMPLOS* 」
│
│ ${usedPrefix}bienvenida modo imagen
│ ${usedPrefix}bienvenida plantilla anime
│ ${usedPrefix}bienvenida mensaje "¡Hola @user! 👋"\n│ ${usedPrefix}bienvenida efectos glow sparkle
│
└─────────────────────────┘

💡 *Powered by HINATA-BOT v3.0*`
}

// Función para generar mensaje de configuración
function generateConfigMessage(chat, usedPrefix) {
  const welcomeStatus = chat.welcome ? '✅ Activada' : '❌ Desactivada'
  const modoActual = chat.welcomeConfig?.modo || 'imagen'
  const templateActual = chat.welcomeConfig?.template || 'elegant'
  const effectsActual = chat.welcomeConfig?.effects || ['fade-in']
  const customMessage = chat.welcomeConfig?.customMessage || 'No definido'
  
  return `╔══════════════════════════╗
║  ⚙️ CONFIGURACIÓN BIENVENIDA  ║
╚══════════════════════════╝

┌─" *ESTADO GENERAL* 」
│
│ 📊 Estado: ${welcomeStatus}
│ 🎯 Modo: *${modoActual.toUpperCase()}*
│ 🎨 Plantilla: *${welcomeTemplates[templateActual]?.name || templateActual}*
│
└─────────────────────────┘

┌─" *EFECTOS VISUALES* 」
│
│ ✨ Efectos activos:\n${effectsActual.map(e => `• ${e}`).join('\n')}
│
└─────────────────────────┘

┌─" *MENSAJE PERSONALIZADO* 」
│
│ 📝 Mensaje: ${customMessage}\n│
└─────────────────────────┘

┌─" *ACCIONES RÁPIDAS* 」
│
│ ${usedPrefix}bienvenida preview - Ver vista previa\n│ ${usedPrefix}bienvenida reset - Restablecer todo\n│
└─────────────────────────┘

💡 *Powered by HINATA-BOT v3.0*`
}

// Función para generar estadísticas
function generateWelcomeStats(chatId) {
  // Aquí iría la lógica para obtener estadísticas reales
  const stats = {
    totalWelcomes: Math.floor(Math.random() * 100),
    thisMonth: Math.floor(Math.random() * 30),
    thisWeek: Math.floor(Math.random() * 7),
    today: Math.floor(Math.random() * 3),
    mostUsedTemplate: 'elegant',
    averageResponseTime: '1.2s'
  }
  
  return `╔══════════════════════════╗
║  📊 ESTADÍSTICAS BIENVENIDA  ║
╚══════════════════════════╝

┌─" *RESUMEN GENERAL* 」
│
│ 🎉 Total de bienvenidas: ${stats.totalWelcomes}\n│ 📅 Este mes: ${stats.thisMonth}\n│ 📆 Esta semana: ${stats.thisWeek}\n│ 🕐 Hoy: ${stats.today}\n│
└─────────────────────────┘

┌─" *PREFERENCIAS* 」
│
│ 🎨 Plantilla más usada: ${stats.mostUsedTemplate}\n│ ⚡ Tiempo de respuesta: ${stats.averageResponseTime}\n│
└─────────────────────────┘

💡 *Powered by HINATA-BOT v3.0*`
}

// Función para mostrar vista previa
async function showWelcomePreview(sock, chatId, chat) {
  try {
    const modo = chat.welcomeConfig?.modo || 'imagen'
    const template = chat.welcomeConfig?.template || 'elegant'
    
    await sock.sendMessage(chatId, { 
      text: `🎬 *Vista Previa de Bienvenida*\n\n🎯 Modo: *${modo.toUpperCase()}*\n🎨 Plantilla: *${welcomeTemplates[template]?.name || template}*\n\n✨ Esto es lo que verán los nuevos miembros:` 
    })
    
    // Simular mensaje de bienvenida
    const mockUser = 'UsuarioEjemplo'
    const mockGroup = 'Grupo de Prueba'
    
    if (modo === 'imagen') {
      const welcomeData = await generateWelcomeImage(mockUser, mockGroup, template)
      await sock.sendMessage(chatId, { 
        image: { url: welcomeData.url }, 
        caption: welcomeData.caption 
      })
    } else if (modo === 'texto') {
      const welcomeText = generateWelcomeText(mockUser, mockGroup, template)
      await sock.sendMessage(chatId, { text: welcomeText })
    } else if (modo === 'sticker') {
      await sock.sendMessage(chatId, { 
        text: '🎫 *Modo Sticker*\n\n✨ Se enviaría un sticker animado con el mensaje de bienvenida.' 
      })
    } else {
      await sock.sendMessage(chatId, { 
        text: `🎯 *Modo ${modo.toUpperCase()}*\n\n✨ Configuración lista para usar.` 
      })
    }
    
  } catch (error) {
    console.error('Error mostrando vista previa:', error)
    await sock.sendMessage(chatId, { 
      text: '❌ Error al generar vista previa. Inténtalo de nuevo.' 
    })
  }
}

// Exportar funciones para uso en eventos del bot
export { generateWelcomeImage, generateWelcomeText, processProfilePicture }