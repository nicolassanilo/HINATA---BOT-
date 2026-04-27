/**
 * @file Plugin de Encuestas - Crear encuestas en grupos
 * @version 1.0.0
 * @author HINATA-BOT
 */

import { db } from './db.js';

export const command = ['.encuesta', '.poll', '.votar'];

export async function run(sock, m, { text, args, isGroup, sender }) {
    const chatId = m.key.remoteJid;
    const userId = m.key.participant || m.key.remoteJid;
    
    if (!isGroup) {
        return await sock.sendMessage(chatId, {
            text: `❌ Las encuestas solo funcionan en grupos.`
        }, { quoted: m });
    }

    const subcomando = args[0]?.toLowerCase();

    // .encuesta crear <pregunta> | <opción1> | <opción2> | ...
    if (subcomando === 'crear' || subcomando === 'new') {
        const resto = args.slice(1).join(' ');
        const partes = resto.split('|');
        
        if (partes.length < 3) {
            return await sock.sendMessage(chatId, {
                text: `📊 *CREAR ENCUESTA* 📊\n\n` +
                      `📝 *Uso:* .encuesta crear <pregunta> | <opción1> | <opción2> | ...\n\n` +
                      `💡 *Ejemplo:*\n` +
                      `• .encuesta crear ¿Qué tema prefieren? | Anime | Juegos | Música | Tecnología`
            }, { quoted: m });
        }

        const pregunta = partes[0].trim();
        const opciones = partes.slice(1).map(o => o.trim());

        if (opciones.length < 2) {
            return await sock.sendMessage(chatId, {
                text: `❌ Necesitas al menos 2 opciones para la encuesta.`
            }, { quoted: m });
        }

        // Crear la encuesta
        const pollId = `poll_${Date.now()}`;
        const opcionesTexto = opciones.map((op, i) => 
            `   ${i + 1}. ${op} (0 votos)`
        ).join('\n');

        await db.run(
            'INSERT INTO encuestas (id, chatId, pregunta, opciones, creador) VALUES (?, ?, ?, ?, ?)',
            [pollId, chatId, pregunta, JSON.stringify(opciones), userId]
        );

        return await sock.sendMessage(chatId, {
            text: `📊 *ENCUESTA CREADA* 📊\n\n` +
                  `❓ *Pregunta:* ${pregunta}\n\n` +
                  `📋 *Opciones:*\n${opcionesTexto}\n\n` +
                  `🆔 *ID:* ${pollId}\n\n` +
                  `💡 *Para votar:* .encuesta votar ${pollId} <número>`
        }, { quoted: m });
    }

    // .encuesta votar <id> <opción>
    if (subcomando === 'votar' || subcomando === 'vote') {
        if (args.length < 3) {
            return await sock.sendMessage(chatId, {
                text: `📊 *VOTAR EN ENCUESTA* 📊\n\n` +
                      `📝 *Uso:* .encuesta votar <id> <número>\n\n` +
                      `💡 *Ejemplo:*\n` +
                      `• .encuesta votar poll_123456 1`
            }, { quoted: m });
        }

        const pollId = args[1];
        const opcionNum = parseInt(args[2]);

        const encuesta = await db.get(
            'SELECT * FROM encuestas WHERE id = ? AND chatId = ?',
            [pollId, chatId]
        );

        if (!encuesta) {
            return await sock.sendMessage(chatId, {
                text: `❌ Encuesta no encontrada.\n\n` +
                      `Verifica el ID de la encuesta.`
            }, { quoted: m });
        }

        const opciones = JSON.parse(encuesta.opciones);
        
        if (opcionNum < 1 || opcionNum > opciones.length) {
            return await sock.sendMessage(chatId, {
                text: `❌ Opción inválida.\n\n` +
                      `Las opciones disponibles son: 1-${opciones.length}`
            }, { quoted: m });
        }

        // Registrar voto
        const votos = JSON.parse(encuesta.votos || '{}');
        if (!votos[userId]) {
            votos[userId] = [];
        }
        
        if (!votos[userId].includes(opcionNum)) {
            votos[userId].push(opcionNum);
        }

        await db.run(
            'UPDATE encuestas SET votos = ? WHERE id = ?',
            [JSON.stringify(votos), pollId]
        );

        return await sock.sendMessage(chatId, {
            text: `✅ *VOTO REGISTRADO* ✅\n\n` +
                  `📊 Encuesta: ${encuesta.pregunta}\n` +
                  `🗳️ Opción: ${opcionNum} - ${opciones[opcionNum - 1]}\n\n` +
                  `¡Gracias por votar!`
        }, { quoted: m });
    }

    // .encuesta ver <id>
    if (subcomando === 'ver' || subcomando === 'result') {
        if (args.length < 2) {
            return await sock.sendMessage(chatId, {
                text: `📊 *VER RESULTADOS* 📊\n\n` +
                      `📝 *Uso:* .encuesta ver <id>\n\n` +
                      `💡 *Ejemplo:*\n` +
                      `• .encuesta ver poll_123456`
            }, { quoted: m });
        }

        const pollId = args[1];
        const encuesta = await db.get(
            'SELECT * FROM encuestas WHERE id = ? AND chatId = ?',
            [pollId, chatId]
        );

        if (!encuesta) {
            return await sock.sendMessage(chatId, {
                text: `❌ Encuesta no encontrada.`
            }, { quoted: m });
        }

        const opciones = JSON.parse(encuesta.opciones);
        const votos = JSON.parse(encuesta.votos || '{}');
        
        // Contar votos por opción
        const conteo = {};
        opciones.forEach((_, i) => conteo[i + 1] = 0);
        
        Object.values(votos).forEach(votosUsuario => {
            votosUsuario.forEach(op => {
                if (conteo[op] !== undefined) conteo[op]++;
            });
        });

        const totalVotos = Object.values(conteo).reduce((a, b) => a + b, 0);
        const resultados = opciones.map((op, i) => {
            const numVotos = conteo[i + 1];
            const porcentaje = totalVotos > 0 ? Math.round((numVotos / totalVotos) * 100) : 0;
            const barra = '█'.repeat(porcentaje / 5) + '░'.repeat(20 - (porcentaje / 5));
            return `   ${i + 1}. ${op}\n      ${barra} ${numVotos} votos (${porcentaje}%)`;
        }).join('\n');

        return await sock.sendMessage(chatId, {
            text: `📊 *RESULTADOS* 📊\n\n` +
                  `❓ ${encuesta.pregunta}\n\n` +
                  `📋 *Resultados:*\n${resultados}\n\n` +
                  `🗳️ Total de votos: ${totalVotos}`
        }, { quoted: m });
    }

    // .encuesta listar
    if (subcomando === 'listar' || subcomando === 'list') {
        const encuestas = await db.all(
            'SELECT id, pregunta, opciones FROM encuestas WHERE chatId = ?',
            [chatId]
        );

        if (encuestas.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `📊 No hay encuestas activas en este grupo.`
            }, { quoted: m });
        }

        const lista = encuestas.map(e => {
            const opciones = JSON.parse(e.opciones);
            return `• ${e.id}: ${e.pregunta} (${opciones.length} opciones)`;
        }).join('\n');

        return await sock.sendMessage(chatId, {
            text: `📊 *ENCUESTAS ACTIVAS* 📊\n\n${lista}\n\n` +
                  `💡 Usa .encuesta ver <id> para ver resultados`
        }, { quoted: m });
    }

    // Mostrar ayuda general
    return await sock.sendMessage(chatId, {
        text: `📊 *MENÚ DE ENCUESTAS* 📊\n\n` +
              `📝 *Comandos disponibles:*\n\n` +
              `1️⃣ *Crear encuesta:*\n` +
              `   .encuesta crear <pregunta> | <opción1> | <opción2>\n\n` +
              `2️⃣ *Votar:*\n` +
              `   .encuesta votar <id> <número>\n\n` +
              `3️⃣ *Ver resultados:*\n` +
              `   .encuesta ver <id>\n\n` +
              `4️⃣ *Listar encuestas:*\n` +
              `   .encuesta listar\n\n` +
              `💡 *Ejemplo completo:*\n` +
              `   .encuesta crear ¿Mejor anime? | Naruto | One Piece | Bleach`
    }, { quoted: m });
}

export const help = `
Crea y gestiona encuestas en grupos.

📝 *Comandos:*
.encuesta crear <pregunta> | <opción1> | <opción2>
.encuesta votar <id> <número>
.encuesta ver <id>
.encuesta listar

💡 *Ejemplos:*
• .encuesta crear ¿Qué prefieren? | Pizza | Hamburguesa
• .encuesta votar poll_123 1
• .encuesta ver poll_123
`;