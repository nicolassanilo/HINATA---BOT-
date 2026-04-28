import axios from 'axios'

export const command = 'bienvenida'
export const alias = ['configbienvenida', 'setwelcome', 'welcomesettings']

export async function run(sock, m, { args, usedPrefix, isAdmin, isOwner }) {
  const chatId = m.key.remoteJid
  const chat = global.db.data.chats[chatId]
  
  // Verificar que sea grupo
  if (!m.isGroup) {
    await sock.sendMessage(chatId, { text: '⚠️ Este comando solo funciona en grupos.' })
    return
  }
  
  // Verificar permisos (admin o owner del bot)
  if (!isAdmin && !isOwner) {
    await sock.sendMessage(chatId, { text: '⚠️ Solo administradores pueden usar este comando.' })
    return
  }
  
  const subCommand = args[0]?.toLowerCase()
  
  // Si no hay argumentos, mostrar ayuda
  if (!subCommand || subCommand === 'help' || subCommand === 'ayuda') {
    const helpMessage = `╭━━━━━━━━━━━━━━━━━━━━━╮
┃  ⚙️ CONFIGURAR BIENVENIDA ⚙️  
╰━━━━━━━━━━━━━━━━━━━━━╯

┌─「 *USO DEL COMANDO* 」
│
│ ${usedPrefix}bienvenida modo <tipo>
│    └ Cambia el tipo de mensaje
│
│ ${usedPrefix}bienvenida ver
│    └ Muestra configuración actual
│
│ ${usedPrefix}bienvenida on
│    └ Activa la bienvenida
│
│ ${usedPrefix}bienvenida off
│    └ Desactiva la bienvenida
│
└─────────────────────┘

┌─「 *TIPOS DE MENSAJE* 」
│
│ 📷 *imagen* - Mensaje con imagen de perfil
│    (Por defecto)
│
│ 📝 *texto* - Solo texto sin imagen
│
│ 🎫 *sticker* - Envía sticker + texto
│
└─────────────────────┘

┌─「 *EJEMPLOS* 」
│
│ ${usedPrefix}bienvenida modo texto
│ ${usedPrefix}bienvenida modo sticker
│ ${usedPrefix}bienvenida ver
│
└─────────────────────┘

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜɪɴᴀᴛᴀ-ʙᴏᴛ`
    
    await sock.sendMessage(chatId, { text: helpMessage })
    return
  }
  
  // Comando: ver configuración
  if (subCommand === 'ver' || subCommand === 'config' || subCommand === 'settings') {
    const welcomeStatus = chat.welcome ? '✅ Activada' : '❌ Desactivada'
    const modoActual = chat.welcomeConfig?.modo || 'imagen'
    
    const configMessage = `╭━━━━━━━━━━━━━━━━━━━━━╮
┃  ⚙️ BIENVENIDA - CONFIG  ⚙️  
╰━━━━━━━━━━━━━━━━━━━━━╯

┌─「 *ESTADO* 」
│ Estado: ${welcomeStatus}
│ Modo: *${modoActual.toUpperCase()}*
└─────────────────────┘

┌─「 *DESCRIPCIÓN DE MODOS* 」
│
│ 📷 *imagen* - Muestra imagen de perfil 
│    del nuevo miembro con mensaje
│
│ 📝 *texto* - Solo mensaje de texto
│    sin imagen (ahorra datos)
│
│ 🎫 *sticker* - Envía sticker de la 
│    imagen de perfil + texto
│
└─────────────────────┘

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜɪɴᴀᴛᴀ-ʙᴏᴛ`
    
    await sock.sendMessage(chatId, { text: configMessage })
    return
  }
  
  // Comando: activar/desactivar
  if (subCommand === 'on' || subCommand === 'activar' || subCommand === 'enable') {
    chat.welcome = true
    await sock.sendMessage(chatId, { text: '✅ *Bienvenida activada*\n\nLos nuevos miembros recibirán un mensaje de bienvenida.' })
    return
  }
  
  if (subCommand === 'off' || subCommand === 'desactivar' || subCommand === 'disable') {
    chat.welcome = false
    await sock.sendMessage(chatId, { text: '❌ *Bienvenida desactivada*\n\nLos nuevos miembros no recibirán mensajes de bienvenida.' })
    return
  }
  
  // Comando: modo
  if (subCommand === 'modo' || subCommand === 'mode' || subCommand === 'type') {
    const modo = args[1]?.toLowerCase()
    
    if (!modo) {
      await sock.sendMessage(chatId, { text: `⚠️ Debes especificar un modo.\n\nEjemplo: ${usedPrefix}bienvenida modo texto` })
      return
    }
    
    const modosValidos = ['imagen', 'texto', 'sticker']
    
    if (!modosValidos.includes(modo)) {
      await sock.sendMessage(chatId, { text: `⚠️ Modo no válido.\n\nModos disponibles: ${modosValidos.join(', ')}` })
      return
    }
    
    // Inicializar welcomeConfig si no existe
    if (!chat.welcomeConfig) {
      chat.welcomeConfig = {}
    }
    
    chat.welcomeConfig.modo = modo
    
    const modoEmoji = {
      imagen: '📷',
      texto: '📝',
      sticker: '🎫'
    }
    
    await sock.sendMessage(chatId, { 
      text: `${modoEmoji[modo]} *Modo de bienvenida actualizado*\n\nNuevo modo: *${modo.toUpperCase()}*\n\nLos mensajes de bienvenida se enviarán de esta forma.` 
    })
    return
  }
  
  // Si none de los anteriores, mostrar ayuda
  await sock.sendMessage(chatId, { text: `⚠️ Comando no reconocido.\n\nUsa *${usedPrefix}bienvenida* para ver la ayuda.` })
}