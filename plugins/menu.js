import fs from 'fs';

export const command = '.menu';

export async function run(sock, m) {
  const chatId = (m && m.key && m.key.remoteJid) ? m.key.remoteJid : (m.chat || m.from || '');

  const menu = `
╔════════════════════════════╗
║     🌟 HINATA-BOT v4.0 🌟     ║
║   ¡Tu asistente virtual evolucionado!   ║
╚════════════════════════════╝

╔════════════════════════════╗
║     📋 MENÚ PRINCIPAL     ║
║  💖 Sistema Waifu v3.0 Activo!  ║
║  🕷️ Spider-X-API Integrada!  ║
╚════════════════════════════╝

╔═══💖 WAIFU SYSTEM v3.0 ═══╗
║
║ 🌟 *.waifus* [página|filtro]
║    └ Lista completa con paginación
║    └ Filtros: disponibles, reclamados
║    └ Ej: .waifus --page=2
║
║ 💝 *.claim* <nombre>
║    └ Reclama tu waifu ideal
║    └ Ej: .claim Hinata Hyuga
║
║ 📋 *.mywaifus*
║    └ Tu colección personal
║    └ Estadísticas y progreso
║
║ 🎭 *.waifu* <nombre>
║    └ Detalles avanzados
║    └ Nivel, EXP, estadísticas
║
║ 💕 *.interact* <nombre> <acción>
║    └ Interactúa con tu waifu
║    └ Acciones: afectar, alimentar, jugar
║    └ Ej: .interact Hinata Hyuga afectar
║
║ 🌟 *.evolucion* <nombre>
║    └ Progreso de evolución
║    └ Barras de EXP visual
║
║ ⚔️ *.batalla* <waifu> @oponente <waifu>
║    └ Sistema de combate PvP
║    └ Estadísticas de batalla
║    └ Cooldown: 1 hora
║
║ 💰 *.vender* <nombre>
║    └ Vende tu waifu (50% valor)
║    └ Recuperar inversión
║
║ 📊 *.waifuinfo* <nombre>
║    └ Información básica
║    └ Anime, rareza, precio
║
║ 🏆 *.coleccion*
║    └ Estadísticas completas
║    └ Valor total, rarezas, top 3
║
║ 🛒 *.tienda waifu*
║    └ Tienda de waifus
║    └ Compra con puntos del trabajo
║
║ 💳 *.comprar* <nombre/número>
║    └ Compra waifu de la tienda
║    └ Precios dinámicos por rareza
║
║ 🎯 *Sistema de Niveles:*
║    └ 100 niveles máximos
║    └ Sistema EXP progresivo
║    └ Bonificaciones por rareza
║
║ 💎 *8 Categorías de Rareza:*
║    └ 👑 Mítico (100k+ pts)
║    └ 💠 Legendario (50k+ pts)
║    └ 💎 Épico Legendario (30k+ pts)
║    └ 🔥 Épico (20k+ pts)
║    └ ⚡ Super Raro (15k+ pts)
║    └ 🌟 Raro (10k+ pts)
║    └ ✨ Poco Común (5k+ pts)
║    └ ⚪ Común (<5k pts)
║
╚════════════════════╝

╔═══🎵 MULTIMEDIA v4.0 ═══╗
║
║ 🎵 *.play* <URL o búsqueda>
║    └ Descarga videos/audio YouTube
║    └ MP4 (720p/1080p) y MP3
║    └ Spider-X-API integrada
║
║ 🎵 *.yt* <URL o búsqueda>
║    └ Alternativa de .play
║    └ Mismas funciones
║
║ 🎥 *.youtube* <URL> [calidad]
║    └ Descarga videos YouTube
║    └ Spider-X v4.0 con 4 APIs
║    └ Calidades: 360p-1080p
║
║ 🎥 *.ytvideo* <URL> [calidad]
║    └ Alternativa de .youtube
║
║ 🎥 *.ytdl* <URL> [calidad]
║    └ Abreviatura de youtube
║
║ 🎥 *.ytd* <URL> [calidad]
║    └ Versión corta de youtube
║
║ 🎥 *.spideryt* <URL> [calidad]
║    └ Versión Spider-X
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
║ 🔧 *.setupyoutube*
║    └ Guía configuración API YouTube
║    └ Spider-X-API setup
║
╚════════════════════╝

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
║ 🖼️ *.waifurandom*
║    └ Waifus aleatorios (legacy)
║
╚════════════════════╝

╔═══🤖 INTELIGENCIA ARTIFICIAL ═══╗
║
║ 🤖 *.ia* <pregunta>
║    └ Chat con IA avanzada
║
║ 🔮 *.gemini* <pregunta>
║    └ Gemini AI
║
║ 🦙 *.llama* <texto>
║    └ Meta Llama AI
║
║ 💬 *.simi* / *.bot* <texto>
║    └ Simi AI conversacional
║
║ 🎨 *.dalle* <descripción>
║    └ Genera imágenes con IA
║
║ 🌈 *.flux* <descripción>
║    └ Genera imágenes Flux AI
║
║ 📝 *.text2img* <descripción>
║    └ Texto a imagen
║
╚════════════════════╝

╔═══🎭 ACCIONES ANIME v4.0 ═══╗
║
║ 😢 *Emociones Negativas:*
║ • *.angry* / *.enojado*
║ • *.cry* / *.llorar*
║ • *.bored* / *.aburrido*
║
║ 😊 *Emociones Positivas:*
║ • *.blush* / *.sonrojarse*
║ • *.bleh* / *.lengua*
║ • *.dance* / *.bailar*
║ • *.smile* / *.sonreir*
║ • *.laugh* / *.reir*
║ • *.wink* / *.guiñar*
║
║ 💕 *Cariñosas:*
║ • *.cuddle* / *.acurrucarse*
║ • *.bite* / *.morder*
║ • *.cafe* / *.coffe*
║ • *.bath* / *.bañarse*
║ • *.feed* / *.alimentar*
║ • *.pat* / *.acariciar*
║ • *.hug* / *.abrazar*
║ • *.kiss* / *.besar*
║
║ 🌙 *Saludos del Día:*
║ • *.noche* / *.noches* / *.nights*
║ • *.dia* / *.dias* / *.days*
║ • *.buenas_noches*
║ • *.buenos_días*
║
║ ⚡ *Acciones Divertidas:*
║ • *.slap* / *.bofetada*
║ • *.kick* / *.patada*
║ • *.poke* / *.picar*
║ • *.tickle* / *.cosquillas*
║ • *.punch* / *.pegar*
║ • *.think* / *.pensar*
║ • *.sleep* / *.dormir*
║ • *.wave* / *.saludar*
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
║ 🎲 *.dados* [número]
║    └ Tira dados (d6, d20, etc.)
║
║ 🏰 *.mazmorra* <lugar>
║    └ Explora mazmorras PvE
║    └ Ej: .mazmorra bosque
║
╚════════════════════╝

╔═══💰 ECONOMÍA v4.0 ═══╗
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
║ 💼 *.trabajar*
║    └ Trabaja y gana dinero
║
║ 🏴‍☠️ *.robar* @usuario
║    └ Intenta robar (2h cooldown)
║
║ 🏆 *.ranking*
║    └ Ranking de saldos
║
╚════════════════════╝

╔═══👥 GRUPOS v4.0 ═══╗
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
║ 📊 *.encuesta* <pregunta>
║    └ Crea una encuesta
║
║ 🤡 *.payasos* [número]
║    └ Lista payasos aleatorios
║
║ 💅 *.femboys* [número]
║    └ Lista femboys aleatorios
║
║ 🏀 *.tomboys* [número]
║    └ Lista tomboys aleatorios
║
║ 🔍 *.debugowner*
║    └ Diagnóstico de propietario
║    └ Verificación de permisos
║
╚════════════════════╝

╔═══🛠️ HERRAMIENTAS ═══╗
║
║ 🧮 *.calculadora* <operación>
║    └ Calculadora matemática
║    └ Ej: .calc 5+5*2
║
║ 📱 *.qr* <texto/URL>
║    └ Genera código QR
║
║ 🌐 *.traducir* <idioma> <texto>
║    └ Traduce texto
║    └ Idiomas: es, en, fr, de, it, pt, ja
║
║ 🔤 *.letra* <texto>
║    └ Convierte a alfabeto sundanés
║
║ 🎮 *.stalkml* <ID>
║    └ Stalkea perfil de ML
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

╔═══⚙️ BOT ADMIN v4.0 ═══╗
║
║ 🔄 *.reload* / *.updateplugins*
║    └ Recarga plugins (owner)
║    └ Spider-X-API v4.0
║
║ 🔄 *.recargar*
║    └ Versión en español de .reload
║
║ ⚡ *.cmd* <on|off> <comando>
║    └ Activa/desactiva comandos
║
║ ⏱️ *.setcooldown* <clave> <valor>
║    └ Configura cooldowns
║
║ 🔍 *.testowner*
║    └ Verificación de propietario
║    └ Sistema mejorado
║
╚════════════════════╝

╔════════════════════════════╗
║ 💡 Usa .help <comando> para más info ║
║ 🎮 Total: 100+ comandos disponibles  ║
║ 🌟 ¡Disfruta de HINATA-BOT v4.0!  ║
║ 🕷️ Spider-X-API: 4 APIs activas  ║
╚════════════════════════════╝

╔════════════════════════════╗
║ 👨‍💻 Creado por: nicolassanilo  ║
║ 📱 Versión: 4.0.0               ║
║ ⚡ Estado: 🟢 Online           ║
║ 💖 Sistema Waifu: ✅ Activo     ║
║ 🕷️ Spider-X-API: ✅ Integrada   ║
║ 🎵 YouTube Downloader: ✅ v4.0  ║
╚════════════════════════════╝
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
