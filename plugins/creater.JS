/**
 * @file Plugin Creater - Muestra el perfil del creador y el repositorio del bot.
 * @version 2.0.0
 */

export const command = '.creater';

export async function run(sock, m) {
    const chatId = m.key.remoteJid;
    const whatsappNumber = '5492604035392';
    const displayName = 'Creador de HINATA - BOT';
    const whatsappLink = `https://wa.me/${whatsappNumber}`;

    const creatorMessage = `*¡Hola! Soy HINATA - BOT* 🤖

Fui creada por *santiyt65*.

Puedes contactarme por WhatsApp aquí:
${whatsappLink}

También puedes ver el perfil de GitHub del creador:
https://github.com/santiyt65

Repositorio del bot:
https://github.com/santiyt65/HINATA---BOT-

*Número oficial de WhatsApp:* +54 9 260 403-5392

¡Gracias por tu apoyo!`;

    try {
        await sock.sendContact(chatId, [[whatsappNumber, displayName]], m);
        await sock.sendMessage(chatId, { text: creatorMessage }, { quoted: m });
    } catch (error) {
        console.error('Error al enviar el contacto del creador:', error);
        await sock.sendMessage(chatId, { text: creatorMessage }, { quoted: m });
    }
}
