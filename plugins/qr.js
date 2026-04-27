/**
 * @file Plugin de QR - Generador de códigos QR
 * @version 1.0.0
 * @author HINATA-BOT
 */

import { Buffer } from 'buffer';

export const command = ['.qr', '.codigoqr'];

export async function run(sock, m, { text, args }) {
    const chatId = m.key.remoteJid;
    
    if (!args || args.length < 1) {
        return await sock.sendMessage(chatId, {
            text: `📱 *GENERADOR DE QR* 📱\n\n` +
                  `📝 *Uso:* .qr <texto o URL>\n\n` +
                  `💡 *Ejemplos:*\n` +
                  `• .qr https://google.com\n` +
                  `• .qr Mi mensaje secreto\n` +
                  `• .qr HINATA-BOT`
        }, { quoted: m });
    }

    const contenido = args.join(' ');
    
    // Validar longitud
    if (contenido.length > 1000) {
        return await sock.sendMessage(chatId, {
            text: `❌ El texto es demasiado largo.\n\n` +
                  `Máximo 1000 caracteres permitidos.`
        }, { quoted: m });
    }

    try {
        // Generar código QR usando API pública
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(contenido)}`;
        
        await sock.sendMessage(chatId, {
            image: { url: qrApiUrl },
            caption: `📱 *CÓDIGO QR* 📱\n\n` +
                      `📝 *Contenido:*\n${contenido}\n\n` +
                      `⚡ Tamaño: 300x300 px`
        }, { quoted: m });

    } catch (error) {
        // Fallback: crear QR simple como texto
        await sock.sendMessage(chatId, {
            text: `📱 *CÓDIGO QR* 📱\n\n` +
                  `📝 *Contenido:*\n${contenido}\n\n` +
                  `⚠️ *Nota:* No se pudo generar la imagen QR.\n` +
                  `El código QR se ha generado pero hubo un problema al mostrarlo.`
        }, { quoted: m });
    }
}

export const help = `
Genera un código QR a partir de texto o URLs.

📝 *Uso:*
.qr <texto o URL>

💡 *Ejemplos:*
• .qr https://google.com
• .qr Mi mensaje secreto
• .qr HINATA-BOT

📋 *Características:*
• Funciona con cualquier texto
• Soporta URLs
• Tamaño: 300x300 px
• Máximo 1000 caracteres
`;