import { WAMessageStubType } from '@whiskeysockets/baileys'
import axios from 'axios'

export async function before(m, { conn, participants, groupMetadata }) {
  if (!m.messageStubType || !m.isGroup) return true

  let who = m.messageStubParameters[0]
  let taguser = `@${who.split('@')[0]}`
  let chat = global.db.data.chats[m.chat]
  let defaultImage = 'https://files.catbox.moe/k4cdwk.jpg';

  // Obtener configuración de bienvenida del grupo
  let welcomeConfig = chat.welcomeConfig || {}
  let modo = welcomeConfig.modo || 'imagen'  // imagen, texto, sticker
  let fondoPersonalizado = welcomeConfig.fondo || null

  if (chat.welcome) {
    let img;
    try {
      let pp = await conn.profilePictureUrl(who, 'image');
      img = (await axios.get(pp, { responseType: 'arraybuffer' })).data;
    } catch {
      img = (await axios.get(defaultImage, { responseType: 'arraybuffer' })).data;
    }

    // Obtener información adicional del grupo
    let groupName = groupMetadata.subject
    let groupDesc = groupMetadata.desc || 'No hay descripción'
    let groupSize = groupMetadata.participants.length
    let groupOwner = groupMetadata.owner || 'No definido'
    let groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id)

    // Obtener hora actual formateada
    let now = new Date()
    let fecha = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    let hora = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

    if (m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_ADD) {
      // Mensaje de BIENVENIDA mejorado
      let bienvenida = `╭━━━━━━━━━━━━━━━━━━━━━╮
┃  ✨  B I E N V E N I D O  ✨  
╰━━━━━━━━━━━━━━━━━━━━━╯

┌─「 *DATOS DEL USUARIO* 」
│ 👤 *Usuario:* ${taguser}
│ 🆔 *Número:* ${who.split('@')[0]}
└─────────────────────┘

┌─「 *DATOS DEL GRUPO* 」
│ 📛 *Grupo:* ${groupName}
│ 👥 *Miembros:* ${groupSize}
│ 📅 *Fecha:* ${fecha}
│ ⏰ *Hora:* ${hora}
└─────────────────────┘

${groupDesc ? `┌─「 *DESCRIPCIÓN* 」\n│ ${groupDesc.slice(0, 100)}${groupDesc.length > 100 ? '...' : ''}\n└─────────────────────┘` : ''}

╭━━━━━━━━━━━━━━━━━━━━━╮
┃  💫  ¡Bienvenido al grupo!  💫  
┃ 
┃  🎉 Disfruta tu estadía y conoce 
┃     a todos los miembros
┃ 
┃  📚 Usa *#menu* para ver comandos
┃  ❓ Usa *#ayuda* para obtener ayuda
╰━━━━━━━━━━━━━━━━━━━━━╯

${chat.swelcome || '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜɪɴᴀᴛᴀ-ʙᴏᴛ'}`

      // Enviar según el modo configurado
      if (modo === 'sticker') {
        // Enviar como sticker
        await conn.sendMessage(m.chat, { 
          sticker: img, 
          mentions: [who] 
        })
        await conn.sendMessage(m.chat, { 
          text: bienvenida, 
          mentions: [who] 
        })
      } else if (modo === 'texto') {
        // Solo texto sin imagen
        await conn.sendMessage(m.chat, { 
          text: bienvenida, 
          mentions: [who] 
        })
      } else {
        // Modo imagen (por defecto)
        await conn.sendMessage(m.chat, { 
          image: img, 
          caption: bienvenida, 
          mentions: [who] 
        })
      }

    } else if (m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_REMOVE || m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_LEAVE) {
      // Mensaje de DESPEDIDA mejorado
      let bye = `╭━━━━━━━━━━━━━━━━━━━━━╮
┃  👋  H A S T A  L U E G O  👋  
╰━━━━━━━━━━━━━━━━━━━━━╯

┌─「 *DATOS DEL USUARIO* 」
│ 👤 *Usuario:* ${taguser}
│ 🆔 *Número:* ${who.split('@')[0]}
└─────────────────────┘

┌─「 *DATOS DEL GRUPO* 」
│ 📛 *Grupo:* ${groupName}
│ 👥 *Miembros restantes:* ${groupSize - 1}
│ 📅 *Fecha:* ${fecha}
│ ⏰ *Hora:* ${hora}
└─────────────────────┘

╭━━━━━━━━━━━━━━━━━━━━━╮
┃  😢  ¡Te extrañaremos!  😢  
┃ 
┃  Esperamos que vuelvas 
┃     pronto
┃ 
┃  👋 ¡Fue un placer tenerte!
╰━━━━━━━━━━━━━━━━━━━━━╯

${chat.sbye || '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜɪɴᴀᴛᴀ-ʙᴏᴛ'}`

      // Enviar según el modo configurado
      if (modo === 'sticker') {
        await conn.sendMessage(m.chat, { 
          sticker: img, 
          mentions: [who] 
        })
        await conn.sendMessage(m.chat, { 
          text: bye, 
          mentions: [who] 
        })
      } else if (modo === 'texto') {
        await conn.sendMessage(m.chat, { 
          text: bye, 
          mentions: [who] 
        })
      } else {
        await conn.sendMessage(m.chat, { 
          image: img, 
          caption: bye, 
          mentions: [who] 
        })
      }
    }
  }

  return true
}