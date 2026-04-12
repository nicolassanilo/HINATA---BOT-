/**
 * @file Plugin Juegos Mejorado - Menú interactivo con estadísticas y rankings
 * @version 2.0.0
 * @author Mejorado para HINATA-BOT
 */

import { db } from './db.js';

export const command = '.juegos';

export async function run(sock, m, { text }) {
    const chatId = m.key.remoteJid;
    const userId = m.key.participant || m.key.remoteJid;

    try {
        // Obtener estadísticas del usuario
        let estadisticas = await db.get('SELECT * FROM estadisticas_juegos WHERE chatId = ?', [userId]);
        if (!estadisticas) {
            await db.run('INSERT INTO estadisticas_juegos (chatId) VALUES (?)', [userId]);
            estadisticas = {
                victorias: 0,
                derrotas: 0,
                empates: 0,
                puntos_totales: 0,
                juegos_jugados: 0
            };
        }

        // Si hay un argumento, mostrar estadísticas detalladas
        if (text && text.toLowerCase().includes('stats')) {
            const ratioVictoria = estadisticas.juegos_jugados > 0 ?
                ((estadisticas.victorias / estadisticas.juegos_jugados) * 100).toFixed(1) : 0;

            return await sock.sendMessage(chatId, {
                text: `📊 *ESTADÍSTICAS DE JUEGOS* 📊\n\n` +
                      `👤 *Jugador:* ${m.pushName || 'Usuario'}\n\n` +
                      `🏆 *Victorias:* ${estadisticas.victorias}\n` +
                      `❌ *Derrotas:* ${estadisticas.derrotas}\n` +
                      `🤝 *Empates:* ${estadisticas.empates}\n` +
                      `🎮 *Juegos totales:* ${estadisticas.juegos_jugados}\n` +
                      `💎 *Puntos acumulados:* ${estadisticas.puntos_totales?.toLocaleString() || 0}\n` +
                      `📈 *Ratio de victoria:* ${ratioVictoria}%\n\n` +
                      `💡 *Comandos disponibles:*\n` +
                      `• .juegos - Ver menú principal\n` +
                      `• .juegos ranking - Ver top jugadores\n` +
                      `• .juegos reset - Reiniciar estadísticas`
            }, { quoted: m });
        }

        // Mostrar ranking
        if (text && text.toLowerCase().includes('ranking')) {
            const ranking = await db.all('SELECT chatId, victorias, puntos_totales FROM estadisticas_juegos ORDER BY puntos_totales DESC LIMIT 10');

            let rankingText = `🏅 *RANKING GLOBAL DE JUGADORES* 🏅\n\n`;

            for (let i = 0; i < ranking.length; i++) {
                const posicion = i + 1;
                const emoji = posicion === 1 ? '🥇' : posicion === 2 ? '🥈' : posicion === 3 ? '🥉' : ` ${posicion}.`;
                rankingText += `${emoji} *Puntos:* ${ranking[i].puntos_totales?.toLocaleString() || 0} | *Victorias:* ${ranking[i].victorias}\n`;
            }

            if (ranking.length === 0) {
                rankingText += `📝 Aún no hay estadísticas registradas.\n¡Sé el primero en jugar!`;
            }

            return await sock.sendMessage(chatId, { text: rankingText }, { quoted: m });
        }

        // Resetear estadísticas
        if (text && text.toLowerCase().includes('reset')) {
            await db.run('UPDATE estadisticas_juegos SET victorias = 0, derrotas = 0, empates = 0, puntos_totales = 0, juegos_jugados = 0 WHERE chatId = ?', [userId]);

            return await sock.sendMessage(chatId, {
                text: `🔄 *Estadísticas reiniciadas*\n\n` +
                      `Todas tus estadísticas han sido borradas.\n` +
                      `¡Comienza de cero y establece nuevos récords!`
            }, { quoted: m });
        }

        // Menú principal mejorado
        const menuJuegos = `🎮 *CENTRO DE JUEGOS HINATA* 🎮

┌─━━━━━━━━━━━━━━━━━━━━━─┐
│ 🎯 *JUEGOS DISPONIBLES* 🎯 │
├─━━━━━━━━━━━━━━━━━━━━━─┤
│ 🎲 *.adivina*              │
│   Adivina el número secreto │
│                            │
│ 🪢 *.ahorcado*             │
│   Clásico juego del ahorcado│
│                            │
│ 🎰 *.slot*                 │
│   Máquina tragamonedas     │
│                            │
│ ❓ *.trivia*               │
│   Preguntas de cultura     │
│                            │
│ ✊ *.ppt <piedra|papel|tijera>* │
│   Contra la IA             │
│                            │
│ 🎯 *.dardos*              │
│   Apunta y gana puntos     │
│                            │
│ 🧠 *.matematicas*         │
│   Resuelve operaciones     │
└─━━━━━━━━━━━━━━━━━━━━━─┘

📊 *TUS ESTADÍSTICAS* 📊
┌─━━━━━━━━━━━━━━━━━━━━━─┤
│ 🏆 Victorias: ${estadisticas.victorias}         │
│ ❌ Derrotas: ${estadisticas.derrotas}          │
│ 🤝 Empates: ${estadisticas.empates}           │
│ 💎 Puntos: ${estadisticas.puntos_totales?.toLocaleString() || 0} │
└─━━━━━━━━━━━━━━━━━━━━━─┘

🎮 *COMANDOS ESPECIALES* 🎮
• *.juegos stats* - Ver estadísticas detalladas
• *.juegos ranking* - Ver ranking global
• *.juegos reset* - Reiniciar estadísticas

💡 *CONSEJOS* 💡
• Juega regularmente para ganar puntos
• Los puntos se acumulan con cada victoria
• Compite con amigos en el ranking global
• Algunos juegos dan bonificaciones especiales

¡Elige un juego y demuestra tus habilidades! 🚀`;

        await sock.sendMessage(chatId, { text: menuJuegos }, { quoted: m });

    } catch (error) {
        console.error('Error en plugin juegos:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Ocurrió un error al cargar el menú de juegos.'
        }, { quoted: m });
    }
}
