/**
 * @file Plugin de Economía - Sistema completo de puntos y banco
 * @version 2.0.0
 * @author Mejorado para HINATA-BOT
 */

import { db } from './db.js';

export const command = ['.saldo', '.depositar', '.retirar', '.apostar'];

export async function run(sock, m, { text, command }) {
    const chatId = m.key.remoteJid;
    const userId = m.key.participant || m.key.remoteJid;
    const cantidad = parseInt(text);

    try {
        // Asegurar que el usuario existe en la base de datos
        let usuario = await db.get('SELECT saldo, banco FROM usuarios WHERE chatId = ?', [userId]);
        if (!usuario) {
            await db.run('INSERT INTO usuarios (chatId, saldo, banco) VALUES (?, 100, 0)', [userId]);
            usuario = { saldo: 100, banco: 0 };
        }

        switch (command) {
            case '.saldo':
                const total = usuario.saldo + usuario.banco;
                await sock.sendMessage(chatId, {
                    text: `💰 *SALDO DE ${m.pushName || 'Usuario'}* 💰\n\n` +
                          `┌─━━━━━━━━━━━━━─┐\n` +
                          `│ 💵 En mano: ${usuario.saldo.toLocaleString()} pts\n` +
                          `│ 🏦 En banco: ${usuario.banco.toLocaleString()} pts\n` +
                          `│ 💎 Total: ${total.toLocaleString()} pts\n` +
                          `└─━━━━━━━━━━━━━─┘\n\n` +
                          `💡 Usa .depositar <cantidad> para guardar dinero\n` +
                          `💡 Usa .retirar <cantidad> para sacar dinero`
                }, { quoted: m });
                break;

            case '.depositar':
                if (isNaN(cantidad) || cantidad <= 0) {
                    return await sock.sendMessage(chatId, {
                        text: '❌ Uso correcto: .depositar <cantidad>\n\nEjemplo: .depositar 500'
                    }, { quoted: m });
                }

                if (cantidad > usuario.saldo) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ No tienes suficiente dinero en mano.\n💵 Tienes: ${usuario.saldo.toLocaleString()} puntos`
                    }, { quoted: m });
                }

                const nuevoSaldoDepositar = usuario.saldo - cantidad;
                const nuevoBancoDepositar = usuario.banco + cantidad;

                await db.run('UPDATE usuarios SET saldo = ?, banco = ? WHERE chatId = ?',
                    [nuevoSaldoDepositar, nuevoBancoDepositar, userId]);

                await sock.sendMessage(chatId, {
                    text: `✅ *DEPÓSITO EXITOSO* ✅\n\n` +
                          `💰 Depositaste: ${cantidad.toLocaleString()} puntos\n` +
                          `💵 Saldo actual: ${nuevoSaldoDepositar.toLocaleString()} puntos\n` +
                          `🏦 Banco actual: ${nuevoBancoDepositar.toLocaleString()} puntos`
                }, { quoted: m });
                break;

            case '.retirar':
                if (isNaN(cantidad) || cantidad <= 0) {
                    return await sock.sendMessage(chatId, {
                        text: '❌ Uso correcto: .retirar <cantidad>\n\nEjemplo: .retirar 300'
                    }, { quoted: m });
                }

                if (cantidad > usuario.banco) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ No tienes suficiente dinero en el banco.\n🏦 Tienes: ${usuario.banco.toLocaleString()} puntos`
                    }, { quoted: m });
                }

                const nuevoSaldoRetirar = usuario.saldo + cantidad;
                const nuevoBancoRetirar = usuario.banco - cantidad;

                await db.run('UPDATE usuarios SET saldo = ?, banco = ? WHERE chatId = ?',
                    [nuevoSaldoRetirar, nuevoBancoRetirar, userId]);

                await sock.sendMessage(chatId, {
                    text: `✅ *RETIRO EXITOSO* ✅\n\n` +
                          `💰 Retiraste: ${cantidad.toLocaleString()} puntos\n` +
                          `💵 Saldo actual: ${nuevoSaldoRetirar.toLocaleString()} puntos\n` +
                          `🏦 Banco actual: ${nuevoBancoRetirar.toLocaleString()} puntos`
                }, { quoted: m });
                break;

            case '.apostar':
                if (isNaN(cantidad) || cantidad <= 0) {
                    return await sock.sendMessage(chatId, {
                        text: '❌ Uso correcto: .apostar <cantidad>\n\nEjemplo: .apostar 100'
                    }, { quoted: m });
                }

                if (cantidad > usuario.saldo) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ No tienes suficiente dinero para apostar.\n💵 Tienes: ${usuario.saldo.toLocaleString()} puntos`
                    }, { quoted: m });
                }

                // Sistema de apuestas mejorado
                const resultado = Math.random();
                let multiplicador = 0;
                let mensajeResultado = '';

                if (resultado < 0.4) { // 40% de perder todo
                    multiplicador = 0;
                    mensajeResultado = '❌ ¡Perdiste toda tu apuesta!';
                } else if (resultado < 0.7) { // 30% de ganar el doble
                    multiplicador = 1;
                    mensajeResultado = '🎉 ¡Ganaste el doble de tu apuesta!';
                } else if (resultado < 0.9) { // 20% de ganar triple
                    multiplicador = 2;
                    mensajeResultado = '💎 ¡Ganaste el triple de tu apuesta!';
                } else { // 10% de ganar 5x
                    multiplicador = 4;
                    mensajeResultado = '🏆 ¡JACKPOT! ¡Ganaste 5 veces tu apuesta!';
                }

                const ganancia = cantidad * multiplicador;
                const nuevoSaldoApuesta = usuario.saldo - cantidad + ganancia;

                await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?',
                    [nuevoSaldoApuesta, userId]);

                const emojiResultado = multiplicador > 0 ? '✅' : '❌';
                await sock.sendMessage(chatId, {
                    text: `${emojiResultado} *RESULTADO DE APUESTA* ${emojiResultado}\n\n` +
                          `💰 Apostaste: ${cantidad.toLocaleString()} puntos\n` +
                          `${mensajeResultado}\n` +
                          `${multiplicador > 0 ? `💎 Ganaste: ${ganancia.toLocaleString()} puntos` : `💸 Perdiste: ${cantidad.toLocaleString()} puntos`}\n\n` +
                          `💵 Saldo actual: ${nuevoSaldoApuesta.toLocaleString()} puntos`
                }, { quoted: m });
                break;
        }

    } catch (error) {
        console.error(`Error en comando ${command}:`, error);
        await sock.sendMessage(chatId, {
            text: '❌ Ocurrió un error al procesar tu solicitud económica.'
        }, { quoted: m });
    }
}