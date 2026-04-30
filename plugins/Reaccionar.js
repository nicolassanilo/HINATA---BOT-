/**
 * @file Plugin Reaccionar v2.0 - Sistema avanzado de reacciones
 * @description Sistema completo de reacciones con categorías, personalización y estadísticas
 * @version 2.0.0
 */

const handler = async (m, { conn, args, usedPrefix }) => {
  
  // Categorías de emojis predefinidas
  const emojiCategories = {
    feliz: [
      '😊', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', 
      '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '🤗', '🤩', '🥳'
    ],
    triste: [
      '😢', '😭', '😿', '😔', '😞', '😟', '😕', '🙁', '☹️', '😣',
      '😖', '😫', '😩', '🥺', '😢', '😭', '😿', '😔'
    ],
    enojado: [
      '😠', '😡', '😤', '😾', '😠', '😡', '😤', '😾', '🤬', '😤',
      '😠', '😡', '🤬', '😾', '💢', '👿', '😈', '💢'
    ],
    amor: [
      '❤️', '💕', '💖', '💗', '💓', '💞', '💝', '💘', '💋', '💌',
      '💑', '👩‍❤️‍👩', '🧑‍🤝‍🧑', '💏', '💑', '💞', '💖'
    ],
    anime: [
      '🎌', '🌸', '🌺', '🦊', '⛩️', '🗾', '🎋', '🍙', '🍘', '🍥',
      '🍡', '🍢', '🍣', '🍤', '🍥', '🥟', '🥠', '🥡', '🥢', '🥣'
    ],
    gaming: [
      '🎮', '🕹️', '🎯', '🎲', '🎰', '🎳', '🎯', '🎪', '🎭', '🎨',
      '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏆', '🏅'
    ],
    comida: [
      '🍔', '🍕', '🌭', '🍟', '🍿', '🥪', '🍖', '🍗', '🥓', '🍔',
      '🍕', '🌭', '🍟', '🍿', '🥪', '🍖', '🍗', '🥓', '🍔'
    ],
    naturaleza: [
      '🌸', '🌺', '🦊', '🌳', '🌲', '🌴', '🌵', '🌾', '🌿', '🍀',
      '🌺', '🦊', '🦝', '🦫', '🦮', '🦯', '🦰', '🦱', '🦲', '🦳'
    ],
    tecnologia: [
      '💻', '📱', '⌨️', '🖥️', '🖨️', '🖱️', '💾', '💿', '📀', '🎥',
      '📷', '📸', '📹', '📼', '🔋', '🔌', '🔌', '🔌', '💡', '🔦'
    ],
    random: [
      '🎉', '🎊', '🎈', '🎉', '🎊', '🎈', '🎉', '🎊', '🎈', '🎉',
      '🎊', '🎈', '🎉', '🎊', '🎈', '🎉', '🎊', '🎈', '🎉', '🎊'
    ]
  };

  // Emojis especiales y raros
  const specialEmojis = [
    '👩‍❤️‍👩', '🧑‍🤝‍🧑', '👨‍❤️‍👨', '👩‍❤️‍👩', '🧑‍🤝‍🧑',
    '👾', '🎮', '🕹️', '🎯', '🎲', '🎰', '🎳', '🎯',
    '🦸‍♀️', '🦸‍♂️', '🦸', '🦹', '🦺', '🦻', '🦼', '🦽', '🦾',
    '🌈', '🌟', '⭐', '✨', '💫', '🌠', '🌡', '🌢', '🌣', '🌤'
  ];

  // Función de delay
  const delay = ms => new Promise(res => setTimeout(res, ms));
  
  // Variables para estadísticas
  let reactCount = 0;
  const failedEmojis = [];
  const startTime = Date.now();

  try {
    // Reacción inicial
    await m.react('⏳');
    
    // Parsear argumentos
    const category = args[0]?.toLowerCase();
    const count = parseInt(args[1]) || 10;
    const speed = args[2]?.toLowerCase() || 'normal';
    
    // Si no hay argumentos, mostrar ayuda
    if (!category) {
      return await showHelp(conn, m, usedPrefix);
    }
    
    // Determinar qué emojis usar
    let emojisToUse = [];
    
    if (category === 'help' || category === 'ayuda') {
      return await showHelp(conn, m, usedPrefix);
    } else if (category === 'special' || category === 'especiales') {
      emojisToUse = specialEmojis;
    } else if (category === 'all' || category === 'todo') {
      // Combinar todas las categorías
      emojisToUse = [
        ...emojiCategories.feliz,
        ...emojiCategories.amor,
        ...emojiCategories.gaming,
        ...emojiCategories.anime,
        ...specialEmojis
      ];
    } else if (emojiCategories[category]) {
      emojisToUse = emojiCategories[category];
    } else {
      return await conn.reply(m.chat, 
        `❌ *Categoría no válida*\n\n💡 *Categorías disponibles:*\n${Object.keys(emojiCategories).map(cat => `• ${cat}`).join('\n')}\n\n🎯 *Especiales:*\n• special\n• all\n\n💡 *Uso:* ${usedPrefix}reaccionar <categoría> [cantidad] [velocidad]`, 
        m
      );
    }
    
    // Limitar cantidad
    const maxEmojis = Math.min(count, emojisToUse.length, 50);
    const selectedEmojis = emojisToUse.slice(0, maxEmojis);
    
    // Determinar velocidad
    const delays = {
      lento: 300,
      normal: 150,
      rapido: 75,
      ultra: 30
    };
    
    const reactionDelay = delays[speed] || 150;
    
    // Enviar reacciones
    for (const emoji of selectedEmojis) {
      try {
        await m.react(emoji);
        reactCount++;
      } catch (error) {
        console.warn(`⚠️ No se pudo reaccionar con: ${emoji}`);
        failedEmojis.push(emoji);
      }
      await delay(reactionDelay);
    }
    
    // Calcular tiempo total
    const totalTime = Date.now() - startTime;
    const successRate = ((reactCount / selectedEmojis.length) * 100).toFixed(1);
    
    // Generar respuesta
    let response = generateResponse(category, reactCount, selectedEmojis.length, failedEmojis.length, totalTime, successRate, speed);
    
    await conn.reply(m.chat, response, m);
    
  } catch (error) {
    console.error('❌ Error crítico en el comando reaccionar:', error);
    await handleError(conn, m, error, reactCount);
  }
};

// Función para mostrar ayuda
async function showHelp(conn, m, usedPrefix) {
  const helpText = `╔══════════════════════════╗
║  🎭 REACCIONAR v2.0 - AYUDA  ║
╚══════════════════════════╝

┌─「 *CATEGORÍAS DISPONIBLES* 」
│
│ 😊 *feliz* - Emojis felices y alegres
│ 😢 *triste* - Emojis tristes
│ 😠 *enojado* - Emojis de enojo
│ ❤️ *amor* - Emojis de amor y corazones
│ 🎌 *anime* - Emojis estilo japonés
│ 🎮 *gaming* - Emojis de videojuegos
│ 🍔 *comida* - Emojis de comida
│ 🌳 *naturaleza* - Emojis de naturaleza
│ 💻 *tecnología* - Emojis de tecnología
│ 🎲 *random* - Emojis aleatorios
│
└─────────────────────────┘

┌─「 *OPCIONES ESPECIALES* 」
│
│ 🌟 *special* - Emojis especiales y raros
│ 🎯 *all* - Todas las categorías combinadas
│
└─────────────────────────┘

┌─「 *SINTAXIS* 」
│
│ ${usedPrefix}reaccionar <categoría> [cantidad] [velocidad]
│
│ 📋 *Parámetros:*
│ • categoría: (requerido) - Tipo de emojis
│ • cantidad: (opcional) - Número de emojis (defecto: 10)
│ • velocidad: (opcional) - Velocidad de reacción
│   - lento, normal, rapido, ultra
│
└─────────────────────────┘

┌─「 *EJEMPLOS* 」
│
│ ${usedPrefix}reaccionar feliz
│ ${usedPrefix}reaccionar amor 20
│ ${usedPrefix}reaccionar gaming 15 rapido
│ ${usedPrefix}reaccionar special 30 ultra
│ ${usedPrefix}reaccionar all 25 normal
│
└─────────────────────────┘

💡 *Powered by HINATA-BOT v3.0*`;

  await conn.reply(m.chat, helpText, m);
}

// Función para generar respuesta
function generateResponse(category, successCount, totalCount, failedCount, totalTime, successRate, speed) {
  const categoryEmojis = {
    feliz: '😊',
    triste: '😢',
    enojado: '😠',
    amor: '❤️',
    anime: '🎌',
    gaming: '🎮',
    comida: '🍔',
    naturaleza: '🌳',
    tecnologia: '💻',
    random: '🎲',
    special: '🌟',
    all: '🎯'
  };
  
  const emoji = categoryEmojis[category] || '🎭';
  const speedEmojis = {
    lento: '🐌',
    normal: '⚡',
    rapido: '🚀',
    ultra: '⚡'
  };
  
  const speedEmoji = speedEmojis[speed] || '⚡';
  
  let response = `${emoji} *REACCIÓN COMPLETADA* ${emoji}\n\n`;
  response += `📊 *Estadísticas:*\n`;
  response += `✅ Enviados: ${successCount}/${totalCount}\n`;
  response += `📈 Tasa de éxito: ${successRate}%\n`;
  response += `⏱️ Tiempo total: ${(totalTime / 1000).toFixed(2)}s\n`;
  response += `${speedEmoji} Velocidad: ${speed}\n`;
  
  if (failedCount > 0) {
    response += `⚠️ Fallaron: ${failedCount}\n`;
  }
  
  response += `\n🎯 *Categoría:* ${category}\n`;
  response += `💡 *Tip:* Usa ${successCount > totalCount * 0.8 ? '¡Excelente!' : successCount > totalCount * 0.5 ? '¡Bien!' : 'Intenta con menos emojis'}`;
  
  return response;
}

// Función para manejar errores
async function handleError(conn, m, error, successCount) {
  let errorMsg = `❌ *ERROR EN REACCIÓN*\n\n`;
  errorMsg += `🔧 *Detalles del error:*\n`;
  
  if (error.message.includes('timeout')) {
    errorMsg += `⏱️ Tiempo de espera agotado\n`;
  } else if (error.message.includes('rate')) {
    errorMsg += `🚫 Demasiadas reacciones (rate limit)\n`;
  } else if (error.message.includes('forbidden')) {
    errorMsg += `🚫 No tienes permisos para reaccionar\n`;
  } else {
    errorMsg += `💻 Error: ${error.message.substring(0, 50)}...\n`;
  }
  
  errorMsg += `\n✅ *Reacciones exitosas:* ${successCount}`;
  errorMsg += `\n💡 *Solución:* Intenta con menos emojis o más lento`;
  
  try {
    await conn.reply(m.chat, errorMsg, m);
  } catch (replyError) {
    console.error('No se pudo enviar mensaje de error:', replyError);
  }
}

// Configuración del handler
handler.help = ['reaccionar', 'reacc', 'react'];
handler.command = ['reaccionar', 'reacc', 'react'];
handler.tags = ['fun', 'reactions'];

export default handler;
