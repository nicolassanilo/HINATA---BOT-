/**
 * @file Plugin de Trabajos - Sistema de trabajos con recompensas
 * @version 1.0.0
 * @author HINATA-BOT
 */

import { db } from './db.js';

export const command = ['.trabajar', '.work', '.empleo'];

const trabajos = {
    'cajero': {
        nombre: 'Cajero',
        descripcion: 'Trabaja en una caja registradora',
        salario: [50, 150],
        tiempo: 30, // segundos
        nivel: 1
    },
    'mesero': {
        nombre: 'Mesero',
        descripcion: 'Sirve mesas en un restaurante',
        salario: [80, 200],
        tiempo: 45,
        nivel: 1
    },
    'programador': {
        nombre: 'Programador',
        descripcion: 'Escribe código para empresas',
        salario: [200, 500],
        tiempo: 60,
        nivel: 3
    },
    'medico': {
        nombre: 'Médico',
        descripcion: 'Atiende pacientes en hospital',
        salario: [300, 700],
        tiempo: 90,
        nivel: 5
    },
    'abogado': {
        nombre: 'Abogado',
        descripcion: 'Defiende clientes en tribunales',
        salario: [400, 900],
        tiempo: 120,
        nivel: 7
    },
    'empresario': {
        nombre: 'Empresario',
        descripcion: 'Gestiona tu propia empresa',
        salario: [500, 1500],
        tiempo: 180,
        nivel: 10
    }
};

export async function run(sock, m, { text, args, sender }) {
    const chatId = m.key.remoteJid;
    const userId = m.key.participant || m.key.remoteJid;
    const pushName = m.pushName || 'Usuario';

    const subcomando = args[0]?.toLowerCase();

    // .trabajar (mostrar trabajos disponibles)
    if (!subcomando || subcomando === 'listar' || subcomando === 'jobs') {
        const listaTrabajos = Object.entries(trabajos).map(([key, t]) => {
            const nivel = t.nivel;
            return `• ${key}: ${t.nombre} (Lv. ${nivel})\n   💰: ${t.salario[0]}-${t.salario[1]} pts\n   ⏱️: ${t.tiempo}s`;
        }).join('\n\n');

        return await sock.sendMessage(chatId, {
            text: `💼 *TRABAJOS DISPONIBLES* 💼\n\n` +
                  `📋 *Trabajos:*\n\n${listaTrabajos}\n\n` +
                  `💡 *Para trabajar:* .trabajar <trabajo>\n\n` +
                  `📝 *Ejemplo:* .trabajar mesero`
        }, { quoted: m });
    }

    // .trabajar <tipo>
    const trabajo = trabajos[subcomando];
    
    if (!trabajo) {
        return await sock.sendMessage(chatId, {
            text: `❌ Trabajo no válido.\n\n` +
                  `💼 Usa .trabajar para ver los trabajos disponibles.`
        }, { quoted: m });
    }

    // Verificar cooldown
    const cooldownKey = `trabajo_${userId}_${subcomando}`;
    const ultimoTrabajo = await db.get(
        'SELECT valor FROM cooldowns WHERE clave = ?',
        [cooldownKey]
    );

    if (ultimoTrabajo) {
        const tiempoPasado = Date.now() - parseInt(ultimoTrabajo.valor);
        const tiempoRestante = (trabajo.tiempo * 1000) - tiempoPasado;
        
        if (tiempoRestante > 0) {
            const segundosRestantes = Math.ceil(tiempoRestante / 1000);
            return await sock.sendMessage(chatId, {
                text: `⏳ *EN COOLDOWN* ⏳\n\n` +
                      `💼 Trabajo: ${trabajo.nombre}\n` +
                      `⏱️ Espera: ${segundosRestantes} segundos\n\n` +
                      `💡 Intenta de nuevo en unos segundos.`
            }, { quoted: m });
        }
    }

    // Realizar trabajo
    const salario = Math.floor(
        Math.random() * (trabajo.salario[1] - trabajo.salario[0] + 1) + 
        trabajo.salario[0]
    );

    // Obtener usuario actual
    let usuario = await db.get('SELECT saldo FROM usuarios WHERE chatId = ?', [userId]);
    if (!usuario) {
        await db.run('INSERT INTO usuarios (chatId, saldo, banco) VALUES (?, 100, 0)', [userId]);
        usuario = { saldo: 100 };
    }

    // Agregar salario
    const nuevoSaldo = usuario.saldo + salario;
    await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [nuevoSaldo, userId]);

    // Guardar cooldown
    await db.run(
        'INSERT OR REPLACE INTO cooldowns (clave, valor, tiempo) VALUES (?, ?, ?)',
        [cooldownKey, Date.now().toString(), trabajo.tiempo]
    );

    // Mensaje de éxito
    const mensajesExito = [
        `¡Excelente trabajo!`,
        `¡Buen día de trabajo!`,
        `¡Muy bien!`,
        `¡Buena ganancia!`,
        `¡Otro día productive!`
    ];
    const mensaje = mensajesExito[Math.floor(Math.random() * mensajesExito.length)];

    await sock.sendMessage(chatId, {
        text: `💼 *TRABAJO COMPLETADO* 💼\n\n` +
              `👤 Trabajador: ${pushName}\n` +
              `💼 Trabajo: ${trabajo.nombre}\n` +
              `📝 ${trabajo.descripcion}\n\n` +
              `💰 *Ganancia:* +${salario} puntos\n` +
              `💵 Saldo actual: ${nuevoSaldo.toLocaleString()} pts\n\n` +
              `⏱️ Cooldown: ${trabajo.tiempo} segundos\n\n` +
              `✨ ${mensaje}`
    }, { quoted: m });
}

export const help = `
Sistema de trabajos con recompensas en puntos.

📝 *Comandos:*
.trabajar → Ver trabajos disponibles
.trabajar <trabajo> → Realizar trabajo

📋 *Trabajos disponibles:*
• cajero: Lv.1 - 50-150 pts (30s)
• mesero: Lv.1 - 80-200 pts (45s)
• programador: Lv.3 - 200-500 pts (60s)
• medico: Lv.5 - 300-700 pts (90s)
• abogado: Lv.7 - 400-900 pts (120s)
• empresario: Lv.10 - 500-1500 pts (180s)

💡 *Ejemplo:*
.trabajar mesero
`;