/**
 * @file Plugin de RPG - Sistema de personajes y estadísticas
 * @version 1.0.0
 * @author HINATA-BOT
 */

import { db } from './db.js';

export const command = ['.rpg', '.character', '.personaje'];

const clases = {
    'guerrero': {
        nombre: 'Guerrero',
        descripcion: 'Luchador cuerpo a cuerpo con alta defensa',
        hp: 150,
        ataque: 25,
        defensa: 20,
        velocidad: 10
    },
    'mago': {
        nombre: 'Mago',
        descripcion: 'Usuario de magia con alto daño mágico',
        hp: 80,
        ataque: 35,
        defensa: 8,
        velocidad: 15
    },
    'arquero': {
        nombre: 'Arquero',
        descripcion: 'Combatiente a distancia con alta velocidad',
        hp: 100,
        ataque: 28,
        defensa: 12,
        velocidad: 25
    },
    'asesino': {
        nombre: 'Asesino',
        descripcion: 'Experto en ataques rápidos y críticos',
        hp: 90,
        ataque: 30,
        defensa: 10,
        velocidad: 30
    },
    'curandero': {
        nombre: 'Curandero',
        descripcion: 'Sanador con habilidades de soporte',
        hp: 110,
        ataque: 15,
        defensa: 15,
        velocidad: 12
    }
};

export async function run(sock, m, { text, args, sender }) {
    const chatId = m.key.remoteJid;
    const userId = m.key.participant || m.key.remoteJid;
    const pushName = m.pushName || 'Usuario';

    const subcomando = args[0]?.toLowerCase();

    // .rpg (mostrar estado del personaje)
    if (!subcomando || subcomando === 'stats' || subcomando === 'estado') {
        const personaje = await db.get(
            'SELECT * FROM rpg_personajes WHERE userId = ?',
            [userId]
        );

        if (!personaje) {
            return await sock.sendMessage(chatId, {
                text: `⚔️ *RPG - SISTEMA DE PERSONAJES* ⚔️\n\n` +
                      `¡Bienvenido al sistema RPG!\n\n` +
                      `📝 *Para comenzar:*\n` +
                      `   .rpg crear <clase>\n\n` +
                      `📋 *Clases disponibles:*\n` +
                      Object.entries(clases).map(([k, c]) => 
                          `   • ${k}: ${c.nombre} (HP: ${c.hp}, ATQ: ${c.ataque})`
                      ).join('\n')
            }, { quoted: m });
        }

        const clase = clases[personaje.clase] || clases['guerrero'];
        const nivel = personaje.nivel;
        const xpRequerida = nivel * 100;
        const xpPorcentaje = Math.round((personaje.xp / xpRequerida) * 100);

        return await sock.sendMessage(chatId, {
            text: `⚔️ *PERSONAJE* ⚔️\n\n` +
                  `👤 Nombre: ${personaje.nombre || pushName}\n` +
                  `⚔️ Clase: ${clase.nombre}\n` +
                  `📊 Nivel: ${nivel} (${personaje.xp}/${xpRequerida} XP)\n\n` +
                  `❤️ HP: ${personaje.hp}/${personaje.hp_max}\n` +
                  `⚔️ Ataque: ${personaje.ataque}\n` +
                  `🛡️ Defensa: ${personaje.defensa}\n` +
                  `⚡ Velocidad: ${personaje.velocidad}\n\n` +
                  `💰 Oro: ${personaje.oro.toLocaleString()}\n` +
                  `🏅 Victorias: ${personaje.victorias}\n\n` +
                  `💡 *Comandos:*\n` +
                  `   .rpg crear <clase> - Nuevo personaje\n` +
                  `   .rpg stats - Ver estadísticas\n` +
                  `   .rpg entrenamiento - Ganar XP`
        }, { quoted: m });
    }

    // .rpg crear <clase>
    if (subcomando === 'crear' || subcomando === 'create') {
        const claseElegida = args[1]?.toLowerCase();
        
        if (!claseElegida || !clases[claseElegida]) {
            return await sock.sendMessage(chatId, {
                text: `❌ Clase no válida.\n\n` +
                      `📋 *Clases disponibles:*\n` +
                      Object.entries(clases).map(([k, c]) => 
                          `   • ${k}: ${c.nombre}\n     ${c.descripcion}`
                      ).join('\n\n')
            }, { quoted: m });
        }

        const clase = clases[claseElegida];
        
        // Verificar si ya existe personaje
        const existente = await db.get(
            'SELECT * FROM rpg_personajes WHERE userId = ?',
            [userId]
        );

        if (existente) {
            return await sock.sendMessage(chatId, {
                text: `⚠️ *Ya tienes un personaje.*\n\n` +
                      `Usa .rpg para ver tu personaje actual.`
            }, { quoted: m });
        }

        // Crear personaje
        await db.run(
            `INSERT INTO rpg_personajes (userId, nombre, clase, hp, hp_max, ataque, defensa, velocidad, nivel, xp, oro, victorias, derrotas) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 100, 0, 0)`,
            [userId, pushName, claseElegida, clase.hp, clase.hp, clase.ataque, clase.defensa, clase.velocidad]
        );

        return await sock.sendMessage(chatId, {
            text: `✅ *PERSONAJE CREADO* ✅\n\n` +
                  `👤 Nombre: ${pushName}\n` +
                  `⚔️ Clase: ${clase.nombre}\n\n` +
                  `📊 *Estadísticas:*\n` +
                  `   ❤️ HP: ${clase.hp}\n` +
                  `   ⚔️ Ataque: ${clase.ataque}\n` +
                  `   🛡️ Defensa: ${clase.defensa}\n` +
                  `   ⚡ Velocidad: ${clase.velocidad}\n\n` +
                  `💰 Oro inicial: 100\n\n` +
                  `¡Buena suerte, aventurero!`
        }, { quoted: m });
    }

    // .rpg entrenamiento
    if (subcomando === 'entrenamiento' || subcomando === 'train') {
        const personaje = await db.get(
            'SELECT * FROM rpg_personajes WHERE userId = ?',
            [userId]
        );

        if (!personaje) {
            return await sock.sendMessage(chatId, {
                text: `❌ No tienes un personaje.\n\n` +
                      `Usa .rpg crear <clase> para crear uno.`
            }, { quoted: m });
        }

        // Ganar XP aleatoria
        const xpGanada = Math.floor(Math.random() * 30) + 10;
        let nuevoXp = personaje.xp + xpGanada;
        let nuevoNivel = personaje.nivel;
        let mensajeNivel = '';

        // Subir de nivel
        while (nuevoXp >= nuevoNivel * 100) {
            nuevoXp -= nuevoNivel * 100;
            nuevoNivel++;
            mensajeNivel = `\n\n🎉 ¡SUBISTE A NIVEL ${nuevoNivel}!`;
            
            // Mejoras por nivel
            await db.run(
                `UPDATE rpg_personajes SET 
                    hp_max = hp_max + 10,
                    hp = hp_max + 10,
                    ataque = ataque + 3,
                    defensa = defensa + 2,
                    velocidad = velocidad + 1
                 WHERE userId = ?`,
                [userId]
            );
        }

        await db.run(
            'UPDATE rpg_personajes SET xp = ?, nivel = ? WHERE userId = ?',
            [nuevoXp, nuevoNivel, userId]
        );

        const oroGanado = Math.floor(Math.random() * 20) + 5;
        await db.run(
            'UPDATE rpg_personajes SET oro = oro + ? WHERE userId = ?',
            [oroGanado, userId]
        );

        return await sock.sendMessage(chatId, {
            text: `🏋️ *ENTRENAMIENTO COMPLETADO* 🏋️\n\n` +
                  `👤 ${personaje.nombre || pushName}\n\n` +
                  `✨ XP ganada: +${xpGanada}\n` +
                  `💰 Oro ganado: +${oroGanado}\n` +
                  `📊 Nivel actual: ${nuevoNivel}${mensajeNivel}`
        }, { quoted: m });
    }

    // .rpg ayuda
    return await sock.sendMessage(chatId, {
        text: `⚔️ *MENÚ RPG* ⚔️\n\n` +
              `📝 *Comandos:*\n\n` +
              `1️⃣ .rpg - Ver personaje\n` +
              `2️⃣ .rpg crear <clase> - Crear personaje\n` +
              `3️⃣ .rpg stats - Ver estadísticas\n` +
              `4️⃣ .rpg entrenamiento - Entrenar\n\n` +
              `📋 *Clases:*\n` +
              Object.entries(clases).map(([k, c]) => 
                  `   • ${k}: ${c.nombre}`
              ).join('\n')
    }, { quoted: m });
}

export const help = `
Sistema de RPG con personajes y estadísticas.

📝 *Comandos:*
.rpg → Ver personaje
.rpg crear <clase> → Crear personaje
.rpg stats → Ver estadísticas
.rpg entrenamiento → Ganar XP y oro

📋 *Clases disponibles:*
• guerrero: HP alto, buena defensa
• mago: Alto daño mágico
• arquero: Velocidad alta
• asesino: Críticos altos
• curandero: Habilidades de sanación
`;