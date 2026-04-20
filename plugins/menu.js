import fs from 'fs';

export const command = '.menu';

export async function run(sock, m) {
  const chatId = (m && m.key && m.key.remoteJid) ? m.key.remoteJid : (m.chat || m.from || '');

  const menu = `
╔═══❖•ೋ° °ೋ•❖═══╗
║     🌟 HINATA-BOT 🌟
║   ¡Tu asistente virtual!
╚═══❖•ೋ° °ೋ•❖═══╝

╔══════════════════════╗
║   📋 MENÚ PRINCIPAL
╚══════════════════════╝

╔═══🔍 BÚSQUEDAS ═══╗
║
║ 🔎 *.google* <texto>
║    └ Busca en Google
║
║ 🎬 *.anime* <nombre>
║    └ Info de anime o imágenes locales
║    └ Ej: .anime hinata
║
║ 📌 *.pinterest* <texto>
║    └ Busca imágenes en Pinterest
║
║ 🖼️ *.papel* <texto>
║    └ Fondos de pantalla
║
╚════════════════════╝

╔═══🎵 MULTIMEDIA ═══╗
║
║ 🎵 *.musica* <canción/URL>
║    └ Descarga música (MP3, WAV, etc.)
║    └ YouTube, SoundCloud, TikTok
║
║ 🖼️ *.sticker*
║    └ Crea stickers de imagen/video
║
║ 🎭 *.gif* <texto>
║    └ Busca y envía GIFs animados
║
╚════════════════════╝

╔═══🎭 ACCIONES ANIME ═══╗
║
║ � *Emociones Negativas:*
║ • *.angry* / *.enojado*
║ • *.cry* / *.llorar*
║ • *.bored* / *.aburrido*
║
║ 😊 *Emociones Positivas:*
║ • *.blush* / *.sonrojarse*
║ • *.bleh* / *.lengua*
║ • *.dance* / *.bailar*
║
║ 💕 *Cariñosas:*
║ • *.cuddle* / *.acurrucarse*
║ • *.bite* / *.morder*
║ • *.cafe* / *.coffe*
║ • *.bath* / *.bañarse*
║
║ 🌙 *Saludos del Día:*
║ • *.noche* / *.noches* / *.nights*
║ • *.dia* / *.dias* / *.days*
║
╚════════════════════╝

╔═══🎮 JUEGOS ═══╗
║
║ 🎯 *.juegos*
║    └ Menú completo de juegos
║
║ 🔢 *.adivina*
║    └ Adivina el número
║
║ 📝 *.ahorcado*
║    └ Juego del ahorcado
║
║ ❓ *.trivia*
║    └ Preguntas de trivia
║
║ 🎰 *.slot*
║    └ Máquina tragamonedas
║
║ ✂️ *.ppt* <piedra|papel|tijera>
║    └ Piedra, papel o tijera
║
╚════════════════════╝

╔═══💰 ECONOMÍA ═══╗
║
║ 💳 *.saldo*
║    └ Consulta tus puntos
║
║ 📥 *.depositar* <cantidad>
║    └ Deposita puntos en banco
║
║ 📤 *.retirar* <cantidad>
║    └ Retira puntos del banco
║
║ 🎲 *.apostar* <cantidad>
║    └ Apuesta tus puntos
║
║ 📋 *.mision*
║    └ Misión diaria (50-300 pts)
║
║ ✅ *.completarmision*
║    └ Completa y cobra misión
║
║ 🏴‍☠️ *.robar* @usuario
║    └ Intenta robar (2h cooldown)
║
║ 🏆 *.ranking*
║    └ Ranking de saldos
║
╚════════════════════╝

╔═══👥 GRUPOS ═══╗
║
║ 🚫 *.kick* @usuario
║    └ Expulsa miembro (admins)
║
║ 📊 *.inactivos* [días]
║    └ Lista miembros inactivos
║
║ 🔨 *.ban* @usuario
║    └ Banea del bot (owner)
║
║ ✅ *.unban* @usuario
║    └ Desbanea del bot (owner)
║
╚════════════════════╝

╔═══ℹ️ INFORMACIÓN ═══╗
║
║ 📋 *.menu*
║    └ Muestra este menú
║
║ ℹ️ *.info*
║    └ Información del bot
║
║ 🏓 *.ping*
║    └ Verifica latencia
║
║ ❓ *.help* [comando]
║    └ Ayuda detallada
║
║ 👨‍💻 *.creater*
║    └ Info del creador
║
╚════════════════════╝

╔═══⚙️ BOT ADMIN ═══╗
║
║ 🔄 *.reload*
║    └ Recarga plugins (owner)
║
║ ⚡ *.cmd* <on|off> <comando>
║    └ Activa/desactiva comandos
║
║ ⏱️ *.setcooldown* <clave> <valor>
║    └ Configura cooldowns
║
╚════════════════════╝

╔══════════════════════╗
║   💡 Usa .help <comando> para más info
║   🎮 Total: 45+ comandos disponibles
║   🌟 ¡Disfruta de HINATA-BOT!
╚══════════════════════╝

╔══════════════════════╗
║   👨‍💻 Creado por: nicolassanilo
║   📱 Versión: 2.0.0
║   ⚡ Estado: 🟢 Online
╚══════════════════════╝
`;

  const imgPath = './media/menu.jpg';

  try {
    if (fs.existsSync(imgPath)) {
      const buffer = fs.readFileSync(imgPath);
      await sock.sendMessage(chatId, { image: buffer, caption: menu }, { quoted: m });
      return;
    }
  } catch (err) {
    console.error('Error leyendo imagen de menu:', err && err.message ? err.message : err);
  }

  // Fallback a mensaje de texto si la imagen no está disponible
  try {
    await sock.sendMessage(chatId, { text: menu }, { quoted: m });
  } catch (err) {
    console.error('Error enviando menu como texto:', err && err.message ? err.message : err);
  }
}
