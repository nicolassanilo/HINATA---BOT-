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
                // Función mejorada para manejar diferentes formatos de cantidad
                let cantidadDepositar = 0;
                
                // Si no se proporciona cantidad, mostrar opciones
                if (!text || text.trim() === '') {
                    return await sock.sendMessage(chatId, {
                        text: `💰 *OPCIONES DE DEPÓSITO* 💰\n\n` +
                              `📋 *Formas de depositar:*\n\n` +
                              `💵 **Cantidad específica:**\n` +
                              `   .depositar 500\n` +
                              `   .depositar 1000\n` +
                              `   .depositar 5000\n\n` +
                              `🎯 **Depósitos rápidos:**\n` +
                              `   .depositar todo - Depositar todo tu saldo\n` +
                              `   .depositar mitad - Depositar la mitad\n` +
                              `   .depositar 25% - Depositar 25%\n` +
                              `   .depositar 50% - Depositar 50%\n` +
                              `   .depositar 75% - Depositar 75%\n\n` +
                              `📊 **Tu saldo actual:** ${usuario.saldo.toLocaleString()} pts\n\n` +
                              `💡 *Ejemplo:* .depositar 1000`
                    }, { quoted: m });
                }
                
                // Procesar diferentes tipos de cantidad
                const textoLower = text.toLowerCase().trim();
                
                if (textoLower === 'todo' || textoLower === 'all') {
                    cantidadDepositar = usuario.saldo;
                } else if (textoLower === 'mitad' || textoLower === 'half') {
                    cantidadDepositar = Math.floor(usuario.saldo / 2);
                } else if (textoLower.includes('%')) {
                    // Depósito porcentual
                    const porcentaje = parseFloat(textoLower.replace('%', ''));
                    if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
                        return await sock.sendMessage(chatId, {
                            text: '❌ Porcentaje inválido. Usa un número entre 1 y 100.\n\nEjemplo: .depositar 50%'
                        }, { quoted: m });
                    }
                    cantidadDepositar = Math.floor(usuario.saldo * (porcentaje / 100));
                } else if (textoLower === 'mitad') {
                    cantidadDepositar = Math.floor(usuario.saldo / 2);
                } else if (textoLower === 'quarter' || textoLower === 'cuarto') {
                    cantidadDepositar = Math.floor(usuario.saldo / 4);
                } else {
                    // Cantidad numérica específica
                    cantidadDepositar = parseInt(text);
                    
                    if (isNaN(cantidadDepositar) || cantidadDepositar <= 0) {
                        return await sock.sendMessage(chatId, {
                            text: '❌ Uso correcto: .depositar <cantidad>\n\n💡 **Opciones disponibles:**\n• .depositar 500\n• .depositar todo\n• .depositar 50%\n• .depositar mitad\n\n📊 Tu saldo: ' + usuario.saldo.toLocaleString() + ' pts'
                        }, { quoted: m });
                    }
                }
                
                // Validaciones finales
                if (cantidadDepositar <= 0) {
                    return await sock.sendMessage(chatId, {
                        text: '❌ La cantidad a depositar debe ser mayor a 0.\n\n💡 Tu saldo actual: ' + usuario.saldo.toLocaleString() + ' pts'
                    }, { quoted: m });
                }
                
                if (cantidadDepositar > usuario.saldo) {
                    return await sock.sendMessage(chatId, {
                        text: `❌ No tienes suficiente dinero en mano.\n💵 Saldo disponible: ${usuario.saldo.toLocaleString()} pts\n💰 Intentas depositar: ${cantidadDepositar.toLocaleString()} pts`
                    }, { quoted: m });
                }
                
                // Realizar depósito
                const nuevoSaldoDepositar = usuario.saldo - cantidadDepositar;
                const nuevoBancoDepositar = usuario.banco + cantidadDepositar;
                const porcentajeDepositado = ((cantidadDepositar / (usuario.saldo + cantidadDepositar)) * 100).toFixed(1);

                await db.run('UPDATE usuarios SET saldo = ?, banco = ? WHERE chatId = ?',
                    [nuevoSaldoDepositar, nuevoBancoDepositar, userId]);

                // Mensaje de éxito con formato mejorado
                let mensajeTipo = '';
                if (textoLower === 'todo' || textoLower === 'all') {
                    mensajeTipo = '💎 *DEPÓSITO COMPLETO*';
                } else if (textoLower.includes('%')) {
                    mensajeTipo = `📊 *DEPÓSITO PORCENTUAL (${textoLower})*`;
                } else if (textoLower === 'mitad' || textoLower === 'half') {
                    mensajeTipo = '⚖️ *DEPÓSITO DE LA MITAD*';
                } else {
                    mensajeTipo = '💰 *DEPÓSITO EXITOSO*';
                }

                await sock.sendMessage(chatId, {
                    text: `${mensajeTipo} ${mensajeTipo.includes('COMPLETO') ? '💎' : '✅'}\n\n` +
                          `💰 Cantidad depositada: ${cantidadDepositar.toLocaleString()} pts\n` +
                          `📊 Porcentaje del total: ${porcentajeDepositado}%\n` +
                          `💵 Saldo actual: ${nuevoSaldoDepositar.toLocaleString()} pts\n` +
                          `🏦 Banco actual: ${nuevoBancoDepositar.toLocaleString()} pts\n\n` +
                          `💎 Total acumulado: ${(nuevoSaldoDepositar + nuevoBancoDepositar).toLocaleString()} pts`
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