import axios from 'axios';

const handler = async (m, { conn, args }) => {

  if (!args[0]) return conn.reply(m.chat, '🍟 Por favor, proporciona un término.', m);
  
  try {
    await m.react('🕓');
  } catch (error) {
    console.error('Error inicial al reaccionar:', error);
  }

  const emojis = [
    '😊', '🔥', '💥', '😍', '🤩', '🎉', '😘', '🤗', '😆', '😂',
    '🎊', '🔴', '💖', '❤️', '💕', '🥳', '🤯', '💯', '😎', '😌',
    '😏', '🤔', '🥺', '😮', '🤪', '😅', '😇', '🤭', '🤫', '🙃',
    '😏', '🤑', '💀', '👻', '👾', '🤖', '👺', '👹', '🦸', '🦸‍♀️',
    '🦸‍♂️', '🌈', '🌟', '⚡', '💫', '🌧️', '🔥', '🔥', '🌸', '🌼',
    '🌻', '🌷', '🍀', '🍁', '🍂', '🍃', '🍉', '🍓', '🍒', '🍑',
    '🥭', '🍍', '🥤', '🍦', '🍰', '🎂', '🍭', '🍬', '🍫', '🍿',
    '🎈', '🎀', '🎁', '📦', '🏆', '🥇', '🥈', '🥉', '🎊', '📣',
    '🎶', '🎵', '🎤', '🎧', '🎹', '⚽', '🏀', '🏈', '🎣', '🎮',
    '🧩', '🧸', '🍭', '🎨', '✈️', '🚗', '🚀', '🛥️', '🏍️', '🛴',
    '🛶', '⛴️', '🚁', '🚢', '🚊', '🚉', '🚏', '🚥', '🚦', '🗺️',
    '🗿', '🎭', '🖼️', '🏰', '🏯', '🌅', '🌄', '🏞️', '🌌', '🌠',
    '🔔', '🔊', '🔉', '🔈', '🛎️', '🏴‍☠️', '🎌', '🎇', '✨', '🌌',
    '🌈', '🥳', '👨‍🍳', '👩‍🍳', '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨', '🎖️', '🕊️',
    '🤝', '👐', '🤲', '✋', '👋', '☝️', '👆', '👇', '👉', '👈',
    '🤙', '🖐️', '🤚', '✋', '🦶', '🦵', '🦿', '🧘‍♂️', '🧘‍♀️', '👣',
    '👥', '👤', '👫', '👬', '👭', '🤝', '🧑‍🤝‍🧑', '💏', '💑', '👨‍❤️‍👨',
    '👩‍❤️‍👩', '🧑‍🤝‍🧑'
  ];

  const delay = ms => new Promise(res => setTimeout(res, ms));

  try {
    for (const emoji of emojis) {
      try {
        await m.react(emoji);
      } catch (error) {
        console.error('Error al reaccionar con emoji', emoji, error);
      }
      await delay(200);
    }

    await conn.reply(m.chat, '¡Reaccioné con 200 emojis!', m);
  } catch (error) {
    console.error('Error en el comando reaccionar:', error);
    try {
      await m.react('✖️');
    } catch (innerError) {
      console.error('No se pudo enviar la reacción de error:', innerError);
      await conn.reply(m.chat, 'No pude reaccionar correctamente.', m);
    }
  }
};

handler.command = ['reaccionar', 'reacc']; 

export default handler;