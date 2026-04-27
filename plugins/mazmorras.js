/**
 * @file Plugin de Mazmorras - Sistema de exploración PvE
 * @version 1.0.0
 * @author HINATA-BOT
 */

import { db } from './db.js';

export const command = ['.mazmorra', '.dungeon', '.explorar'];

const mazmorras = {
    'bosque': {
        nombre: 'Bosque Oscuro',
        descripcion: 'Un bosque misterioso lleno de criaturas',
        nivelMin: 1,
        enemigos: [
            { nombre: 'Lobo', hp: 30, ataque: 8, recompensa: [20, 50] },
            { nombre: 'Arboleda', hp: 40, ataque: 5, recompensa: [30, 60] },
            { nombre: 'Hada', hp: 25, ataque: 12, recompensa: [40, 80] }
        ]
    },
    'cueva': {
        nombre: 'Cueva del Dragón',
        descripcion: 'Una caverna profunda con un dragón',
        nivelMin: 5,
        enemigos: [
            { nombre: 'Murciélago', hp: 35, ataque: 10, recompensa: [30, 70] },
            { nombre: 'Geiser', hp: 50, ataque: 15, recompensa: [50, 100] },
            { nombre: 'Minotauro', hp: 80, ataque: 20, recompensa: [80, 150] }
        ]
    },
    'castillo': {
        nombre: 'Castillo Encantado',
        descripcion: 'Un castillo abandonado con fantasmas',
        nivelMin: 10,
        enemigos: [
            { nombre: 'Esqueleto', hp: 60, ataque: 18, recompensa: [60, 120] },
            { nombre: 'Fantasma', hp: 45, ataque: 25, recompensa: [70, 140] },
            { nombre: 'Vampiro', hp: 100, ataque: 30, recompensa: [100, 200] }
        ]
    },
    'infierno': {
        nombre: 'Portal del Infierno',
        descripcion: 'El reino de los demonios',
        nivelMin: 20,
        enemigos: [
            { nombre: 'Demonio', hp: 150, ataque: 35, recompensa: [150, 300] },
            { nombre: 'Diablo', hp: 200, ataque: 45, recompensa: [200, 400] },
            { nombre: 'Lucifer', hp: 500, ataque: 80, recompensa: [500, 1000] }
        ]
    }
};

export async function run(sock, m, { text, args, sender }) {
    const chatId = m.key.remoteJid;
    const userId = m.key.participant || m.key.remoteJid;
    const pushName = m.pushName || 'Usuario';

    const subcomando = args[0]?.toLowerCase();

    // .mazmorra (mostrar mazmorras disponibles)
    if (!subcomando || subcomando === 'listar' || subcomando === 'list') {
        const listaMazmorras = Object.entries(mazmorras).map(([key, m]) => {
            return `• ${key}: ${m.nombre}\n   ${m.descripcion}\n   🔒 Nivel mínimo: ${m.nivelMin}`;
        }).join('\n\n');

        return await sock.sendMessage(chatId, {
            text: `🏰 *MAZMORRAS* 🏰\n\n` +
                  `📋 *Mazmorras disponibles:*\n\n${listaMazmorras}\n\n` +
                  `💡 *Para explorar:* .mazmorra <nombre>\n\n` +
                  `⚠️ *Nota:* Necesitas un personaje (.rpg crear)`
        }, { quoted: m });
    }

    // Verificar que tenga personaje
    const personaje = await db.get(
        'SELECT * FROM rpg_personajes WHERE userId = ?',
        [userId]
    );

    if (!personaje) {
        return await sock.sendMessage(chatId, {
            text: `❌ No tienes un personaje.\n\n` +
                  `Crea uno primero con: .rpg crear <clase>`
        }, { quoted: m });
    }

    // .mazmorra explorar <nombre>
    if (subcomando === 'explorar' || subcomando === 'entrar') {
        const nombreMazmorra = args[1]?.toLowerCase();
        
        if (!nombreMazmorra || !mazmorras[nombreMazmorra]) {
            return await sock.sendMessage(chatId, {
                text: `❌ Mazmorra no encontrada.\n\n` +
                      `📋 *Mazmorras:*\n` +
                      Object.keys(mazmorras).map(k => `   • ${k}`).join('\n')
            }, { quoted: m });
        }

        const mazmorra = mazmorras[nombreMazmorra];

        if (personaje.nivel < mazmorra.nivelMin) {
            return await sock.sendMessage(chatId, {
                text: `🔒 *BLOQUEADO* 🔒\n\n` +
                      `📊 Tu nivel: ${personaje.nivel}\n` +
                      `🔐 Nivel requerido: ${mazmorra.nivelMin}\n\n` +
                      `¡Sube de nivel para entrar!`
            }, { quoted: m });
        }

        // Seleccionar enemigo aleatorio
        const enemigo = mazmorra.enemigos[Math.floor(Math.random() * mazmorra.enemigos.length)];
        
        // Calcular daño
        const dañoPersonaje = Math.max(1, personaje.ataque - Math.floor(enemigo.ataque * 0.3));
        const dañoEnemigo = Math.max(1, enemigo.ataque - Math.floor(personaje.defensa * 0.5));
        
        const turnosPersonaje = Math.ceil(enemigo.hp / dañoPersonaje);
        const turnosEnemigo = Math.ceil(personaje.hp / dañoEnemigo);

        let resultado = '';
        let gano = false;

        if (turnosPersonaje <= turnosEnemigo) {
            gano = true;
            const recompensa = Math.floor(
                Math.random() * (enemigo.recompensa[1] - enemigo.recompensa[0] + 1) + 
                enemigo.recompensa[0]
            );
            const xp = Math.floor(recompensa * 0.8);

            // Actualizar personaje
            let nuevoXp = personaje.xp + xp;
            let nuevoNivel = personaje.nivel;
            let subioNivel = false;

            while (nuevoXp >= nuevoNivel * 100) {
                nuevoXp -= nuevoNivel * 100;
                nuevoNivel++;
                subioNivel = true;
            }

            await db.run(
                `UPDATE rpg_personajes SET 
                    xp = ?, nivel = ?, oro = oro + ?, hp = hp_max 
                 WHERE userId = ?`,
                [nuevoXp, nuevoNivel, recompensa, userId]
            );

            resultado = `🏆 *¡VICTORIA!* 🏆\n\n` +
                `⚔️ Derrotaste a: ${enemigo.nombre}\n\n` +
                `💰 Recompensa: +${recompensa} oro\n` +
                `✨ XP: +${xp}\n` +
                `❤️ HP restaurado`;

            if (subioNivel) {
                resultado += `\n\n🎉 ¡Subiste a nivel ${nuevoNivel}!`;
            }
        } else {
            // Perder
            const dañoRecibido = Math.floor(personaje.hp * 0.3);
            await db.run(
                'UPDATE rpg_personajes SET hp = hp - ? WHERE userId = ?',
                [dañoRecibido, userId]
            );

            resultado = `💀 *DERROTA* 💀\n\n` +
                `⚔️ Enemigo: ${enemigo.nombre}\n` +
                `❤️ Perdiste: ${dañoRecibido} HP\n\n` +
                `💡 Usa .rpg entrenamiento para recuperarte`;
        }

        return await sock.sendMessage(chatId, {
            text: `🏰 *${mazmorra.nombre}* 🏰\n\n` +
                  `👤 Explorador: ${personaje.nombre || pushName}\n\n` +
                  `⚔️ *COMBATE*\n` +
                  `   Tu ataque: ${dañoPersonaje}\n` +
                  `   Ataque enemigo: ${dañoEnemigo}\n\n` +
                  resultado
        }, { quoted: m });
    }

    // .mazmorra estado
    if (subcomando === 'estado' || subcomando === 'stats') {
        return await sock.sendMessage(chatId, {
            text: `🏰 *ESTADO DE MAZMORRAS* 🏰\n\n` +
                  `📊 Exploraciones: ${personaje.exploraciones || 0}\n` +
                  `🏆 Victorias: ${personaje.victorias || 0}\n\n` +
                  `💡 Explora una mazmorra:\n` +
                  `   .mazmorra explorar <nombre>`
        }, { quoted: m });
    }

    // Ayuda
    return await sock.sendMessage(chatId, {
        text: `🏰 *MENÚ DE MAZMORRAS* 🏰\n\n` +
              `📝 *Comandos:*\n\n` +
              `1️⃣ .mazmorra - Ver mazmorras\n` +
              `2️⃣ .mazmorra explorar <nombre> - Entrar\n` +
              `3️⃣ .mazmorra estado - Ver progreso\n\n` +
              `💡 *Ejemplo:*\n` +
              `   .mazmorra explorar bosque`
    }, { quoted: m });
}

export const help = `
Sistema de exploración de mazmorras PvE.

📝 *Comandos:*
.mazmorra → Ver mazmorras disponibles
.mazmorra explorar <nombre> → Entrar en mazmorra
.mazmorra estado → Ver progreso

📋 *Mazmorras:*
• bosque: Nivel 1+ (Lobos, Hadas)
• cueva: Nivel 5+ (Murciélagos, Minotauros)
• castillo: Nivel 10+ (Fantasmas, Vampiros)
• infierno: Nivel 20+ (Demonios)

⚠️ *Requiere:* Personaje creado (.rpg crear)
`;