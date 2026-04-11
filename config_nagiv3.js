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

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log("Update 'config_nagiv3.js'")
  import(`${file}?update=${Date.now()}`)
})
