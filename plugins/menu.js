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
║  💖 Sistema Waifu v4.0 Activo!  ║
║  🕷️ Spider-X-API Integrada!  ║
╚════════════════════════════╝

╔═══💖 WAIFU SYSTEM v4.0 ═══╗
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
║    └ 15+ acciones disponibles
║    └ Ej: .interact Hinata Hyuga afectar
║
║ 🌟 *.evolucion* <nombre>
║    └ Progreso de evolución
║    └ Barras de EXP visual
║
║ ⚔️ *.batalla* <waifu> @oponente <waifu>
║    └ Sistema de combate PvP
║    └ Estadísticas de batalla
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
║ 🎉 *.evento*
║    └ Eventos temporales activos
║    └ Festivales y torneos especiales
║
║ 🎮 *.minijuego*
║    └ Menú de minijuegos
║    └ Adivinanzas, quizzes, trivia
║
║ 👥 *.social*
║    └ Sistema social completo
║    └ Amigos, visitas, regalos, fiestas
║
║ 💰 *.economia*
║    └ Sistema económico avanzado
║    └ Mercado, subastas, inversiones
║
║ 🎨 *.personalizar*
║    └ Sistema de personalización
║    └ Vestuario, accesorios, decoración
║
║ ⚔️ *.habilidades*
║    └ Sistema de habilidades y clases
║    └ Árbol de talentos, combate
║
║ 🏆 *.logros*
║    └ Sistema de logros y trofeos
║    └ Salón de la fama, marcas personales
║
║ 🗺️ *.mundo*
║    └ Sistema de mundo y exploración
║    └ Lugares, misiones, mazmorras
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
║ 🎯 *Nuevas Funcionalidades:*
║    └ 🎉 Eventos temporales
║    └ 🎮 Minijuegos interactivos
║    └ 👥 Sistema social completo
║    └ 💰 Economía avanzada
║    └ 🎨 Personalización total
║    └ ⚔️ Habilidades y clases
║    └ 🏆 Sistema de logros
║    └ 🗺️ Mundo y exploración
║
╚══════════════════════════╝

╔═══ BÚSQUEDAS ═══╗
║
║ 🔎 *.google* <texto>
║    └ Busca en Google
║
║ 📌 *.pinterest* <texto>
║    └ Busca imágenes en Pinterest
║
║ 🖼️ *.waifurandom*
║    └ Waifus aleatorios (legacy)
║
╚══════════════════╝

╔═══🤖 INTELIGENCIA ARTIFICIAL ═══╗
║
║ 💬 *.simi* / *.bot* <texto>
║    └ Simi AI conversacional
║
╚══════════════════╝

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
╚══════════════════════════╝

╔════════════════════════════╗
║ 👨‍💻 Creado por: nicolassanilo  ║
║ 📱 Versión: 4.0.0               ║
║ ⚡ Estado: 🟢 Online           ║
║ 💖 Sistema Waifu: ✅ Activo v4.0 ║
║ 🎯 Bot Optimizado: ✅ 8 nuevos módulos  ║
║ 🚀 Plugins: 100+ comandos nuevos  ║
╚══════════════════════════╝
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
