import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'

global.owner = [
  ['542604035392', 'Owner', true]
]

global.mods = ['542604035392']
global.suittag = ['50231458537']
global.prems = ['573001533523', '50231458537', '573133374132', '522202410659']

global.packname = '🎄 NᴀɢɪBᴏᴛ V³ 🎋'
global.botname = 'HINATA-𝙫²'
global.wm = 'HINATA𝘁-𝗠𝗗'
global.author = 'HINATABᴏᴛ X NICOLAS '

global.dfail = (type, m, conn) => {
  let msg = {
    rowner: 'Este comando solo puede ser usado por el propietario del bot',
    owner: 'Este comando solo puede ser usado por el propietario del bot',
    mods: 'Este comando solo puede ser usado por moderadores',
    premium: 'Este comando es solo para usuarios premium',
    group: 'Este comando solo se puede usar en grupos',
    private: 'Este comando solo se puede usar en chat privado',
    admin: 'Este comando solo puede ser usado por administradores del grupo',
    botAdmin: 'Necesito ser administrador para usar este comando',
    unreg: 'Regístrate para usar este comando con .reg nombre.edad',
    restrict: 'Este bot está restringido'
  }[type]
  if (msg) return conn.reply(m.chat, msg, m)
}

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log("Update 'config_nagiv3.js'")
  import(`${file}?update=${Date.now()}`)
})
