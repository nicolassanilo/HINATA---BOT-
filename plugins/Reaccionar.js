/**
 * @file Plugin Reaccionar - Envía múltiples reacciones en secuencia
 * @version 2.0.0
 * @description Mejora: Mejor manejo de errores y reportes de estado
 */

const handler = async (m, { conn, args }) => {

  const emojis = [
    '😊', '🔥', '💥', '😍', '🤩', '🎉', '😘', '🤗', '😆', '😂',
    '🎊', '🔴', '💖', '❤️', '💕', '🥳', '🤯', '💯', '😎', '😌',
    '😏', '🤔', '🥺', '😮', '🤪', '😅', '😇', '🤭', '🤫', '🙃',
    '🤑', '💀', '👻', '👾', '🤖', '👺', '👹', '🦸', '🦸‍♀️',
    '🦸‍♂️', '🌈', '🌟', '⚡', '💫', '🌧️', '🌸', '🌼',
    '🌻', '🌷', '🍀', '🍁', '🍂', '🍃', '🍉', '🍓', '🍒', '🍑',
    '🥭', '🍍', '🥤', '🍦', '🍰', '🎂', '🍭', '🍬', '🍫', '🍿',
    '🎈', '🎀', '🎁', '📦', '🏆', '🥇', '🥈', '🥉', '📣',
    '🎶', '🎵', '🎤', '🎧', '🎹', '⚽', '🏀', '🏈', '🎣', '🎮',
    '🧩', '🧸', '🎨', '✈️', '🚗', '🚀', '🛥️', '🏍️', '🛴',
    '🛶', '⛴️', '🚁', '🚢', '🚊', '🚉', '🚏', '🚥', '🚦', '🗺️',
    '🗿', '🎭', '🖼️', '🏰', '🏯', '🌅', '🌄', '🏞️', '🌌', '🌠',
    '🔔', '🔊', '🔉', '🔈', '🛎️', '🎌', '🎇', '✨',
    '🥳', '👨‍🍳', '👩‍🍳', '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨', '🎖️', '🕊️',
    '🤝', '👐', '🤲', '✋', '👋', '☝️', '👆', '👇', '👉', '👈',
    '🤙', '🖐️', '🤚', '🦶', '🦵', '🦿', '🧘‍♂️', '🧘‍♀️', '👣',
    '👥', '👤', '👫', '👬', '👭', '🧑‍🤝‍🧑', '💏', '💑', '👨‍❤️‍👨',
    '👩‍❤️‍👩', '🧑‍🤝‍🧑'
  ];

  const delay = ms => new Promise(res => setTimeout(res, ms));
  let reactCount = 0;
  const failedEmojis = [];

  try {
    await m.react('⏳');
  } catch (error) {
    console.error('Error al enviar reacción inicial:', error);
  }

  try {
    for (const emoji of emojis) {
      try {
        await m.react(emoji);
        reactCount++;
      } catch (error) {
        console.warn(`⚠️ No se pudo reaccionar con: ${emoji}`);
        failedEmojis.push(emoji);
      }
      await delay(150);
    }

    let response = `✅ *¡Reacción completada!*\n`;
    response += `📊 Emojis enviados: ${reactCount}/${emojis.length}\n`;
    
    if (failedEmojis.length > 0) {
      response += `⚠️ Emojis que fallaron: ${failedEmojis.length}`;
    }

    await conn.reply(m.chat, response, m);
  } catch (error) {
    console.error('❌ Error crítico en el comando reaccionar:', error);
    
    let errorMsg = `❌ *Hubo un error con la reacción*\n`;
    errorMsg += `✅ Emojis exitosos: ${reactCount}/${emojis.length}\n`;
    
    if (error.message.includes('timeout')) {
      errorMsg += '⏱️ Tiempo de espera agotado';
    } else if (error.message.includes('rate')) {
      errorMsg += '🚫 Demasiadas reacciones muy rápido';
    } else {
      errorMsg += `Error: ${error.message.substring(0, 50)}`;
    }

    try {
      await conn.reply(m.chat, errorMsg, m);
    } catch (replyError) {
      console.error('No se pudo enviar mensaje de error:', replyError);
    }
  }
};

handler.help = ['reaccionar', 'reacc'];
handler.command = ['reaccionar', 'reacc'];

export default handler;
