/**
 * @file Plugin Casino Games - Sistema de juegos de casino
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema completo de juegos de casino con apuestas y premios
 */

import { db } from './db.js';

// Configuración
const CONFIG = {
  enableLogging: true,
  minBet: 50,
  maxBet: 10000,
  houseEdge: 0.05, // 5% ventaja de la casa
  dailyBonus: 1000,
  maxDailyGames: 100,
  jackpotSeed: 10000
};

// Sistema de logging
const casinoLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[CASINO] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[CASINO] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[CASINO] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[CASINO] ❌ ${message}`)
};

// Funciones principales
export const command = ['.blackjack', '.roulette', '.poker', '.slots', '.lottery', '.dice', '.coinflip', '.jackpot'];
export const alias = ['.veintiuno', '.ruleta', '.poker', '.tragamonedas', '.loteria', '.dados', '.moneda', '.pozo'];
export const description = 'Sistema completo de juegos de casino';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.blackjack':
        await playBlackjack(sock, m, text);
        break;
      case '.roulette':
        await playRoulette(sock, m, text);
        break;
      case '.poker':
        await playPoker(sock, m, text);
        break;
      case '.slots':
        await playSlots(sock, m, text);
        break;
      case '.lottery':
        await playLottery(sock, m, text);
        break;
      case '.dice':
        await playDice(sock, m, text);
        break;
      case '.coinflip':
        await playCoinflip(sock, m, text);
        break;
      case '.jackpot':
        await showJackpot(sock, m);
        break;
      default:
        await showCasinoHelp(sock, m);
    }
  } catch (error) {
    casinoLogger.error('Error en sistema de casino:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de casino. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Blackjack
async function playBlackjack(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const bet = parseInt(args[1]) || 100;

  if (bet < CONFIG.minBet || bet > CONFIG.maxBet) {
    return await sock.sendMessage(chatId, {
      text: `❌ Apuesta inválida. Mínimo: ${CONFIG.minBet}, Máximo: ${CONFIG.maxBet}`
    }, { quoted: m });
  }

  try {
    const balance = await getUserBalance(userId);
    if (balance.total < bet) {
      return await sock.sendMessage(chatId, {
        text: `❌ Saldo insuficiente. Necesitas ${bet} pts, tienes ${balance.total} pts.`
      }, { quoted: m });
    }

    await updateUserBalance(userId, balance.saldo - bet);

    // Simular juego de blackjack
    const playerHand = generateBlackjackHand();
    const dealerHand = generateBlackjackHand();
    
    const playerScore = calculateBlackjackScore(playerHand);
    const dealerScore = calculateBlackjackScore(dealerHand);

    let result = '';
    let winnings = 0;

    if (playerScore > 21) {
      result = '❌ Te pasaste de 21';
    } else if (dealerScore > 21) {
      result = '✅ El crupier se pasó de 21';
      winnings = bet * 2;
    } else if (playerScore > dealerScore) {
      result = '✅ Ganaste';
      winnings = bet * 2;
    } else if (playerScore < dealerScore) {
      result = '❌ Perdiste';
    } else {
      result = '🤝 Empate';
      winnings = bet;
    }

    if (winnings > 0) {
      await updateUserBalance(userId, balance.saldo - bet + winnings);
    }

    let message = `🃏 *BLACKJACK* 🃏\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `💰 Apuesta: ${bet} pts\n\n`;
    message += `🎯 *Tu mano:*\n`;
    playerHand.forEach(card => {
      message += `${getCardEmoji(card)} ${card}\n`;
    });
    message += `📊 Total: ${playerScore}\n\n`;
    message += `🎰 *Mano del crupier:*\n`;
    dealerHand.forEach(card => {
      message += `${getCardEmoji(card)} ${card}\n`;
    });
    message += `📊 Total: ${dealerScore}\n\n`;
    message += `🏆 *Resultado: ${result}*\n`;
    if (winnings > 0) {
      message += `💰 Ganaste: ${winnings} pts`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    await logGame(userId, 'blackjack', bet, winnings);

  } catch (error) {
    casinoLogger.error('Error en blackjack:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al jugar blackjack.'
    }, { quoted: m });
  }
}

// Ruleta
async function playRoulette(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  
  if (args.length < 3) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.roulette <apuesta> <numero/color>\n*Ejemplo:* `.roulette 100 red` o `.roulette 100 15`'
    }, { quoted: m });
  }

  const bet = parseInt(args[1]);
  const betType = args[2].toLowerCase();

  if (bet < CONFIG.minBet || bet > CONFIG.maxBet) {
    return await sock.sendMessage(chatId, {
      text: `❌ Apuesta inválida. Mínimo: ${CONFIG.minBet}, Máximo: ${CONFIG.maxBet}`
    }, { quoted: m });
  }

  try {
    const balance = await getUserBalance(userId);
    if (balance.total < bet) {
      return await sock.sendMessage(chatId, {
        text: `❌ Saldo insuficiente. Necesitas ${bet} pts, tienes ${balance.total} pts.`
      }, { quoted: m });
    }

    await updateUserBalance(userId, balance.saldo - bet);

    // Generar resultado de la ruleta
    const winningNumber = Math.floor(Math.random() * 37); // 0-36
    const winningColor = winningNumber === 0 ? 'green' : (winningNumber % 2 === 0 ? 'red' : 'black');

    let won = false;
    let winnings = 0;

    if (!isNaN(betType)) {
      // Apuesta a número específico
      if (parseInt(betType) === winningNumber) {
        won = true;
        winnings = bet * 36; // Pago 35:1 + apuesta original
      }
    } else {
      // Apuesta a color
      if (betType === winningColor) {
        won = true;
        winnings = bet * 2; // Pago 1:1 + apuesta original
      }
    }

    if (won) {
      await updateUserBalance(userId, balance.saldo - bet + winnings);
    }

    let message = `🎰 *RULETA* 🎰\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `💰 Apuesta: ${bet} pts en ${betType}\n\n`;
    message += `🎯 *Resultado:*\n`;
    message += `🔢 Número: ${winningNumber}\n`;
    message += `🎨 Color: ${winningColor}\n\n`;
    
    if (won) {
      message += `🏆 *GANASTE!*\n`;
      message += `💰 Premio: ${winnings} pts`;
    } else {
      message += `❌ *Perdiste*\n`;
      message += `💸 Perdiste: ${bet} pts`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    await logGame(userId, 'roulette', bet, winnings);

  } catch (error) {
    casinoLogger.error('Error en ruleta:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al jugar ruleta.'
    }, { quoted: m });
  }
}

// Tragamonedas
async function playSlots(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const bet = parseInt(args[1]) || 50;

  if (bet < CONFIG.minBet || bet > CONFIG.maxBet) {
    return await sock.sendMessage(chatId, {
      text: `❌ Apuesta inválida. Mínimo: ${CONFIG.minBet}, Máximo: ${CONFIG.maxBet}`
    }, { quoted: m });
  }

  try {
    const balance = await getUserBalance(userId);
    if (balance.total < bet) {
      return await sock.sendMessage(chatId, {
        text: `❌ Saldo insuficiente. Necesitas ${bet} pts, tienes ${balance.total} pts.`
      }, { quoted: m });
    }

    await updateUserBalance(userId, balance.saldo - bet);

    // Generar símbolos de las tragamonedas
    const symbols = ['🍒', '🍋', '🍊', '🍇', '🍉', '⭐', '💎', '7️⃣'];
    const reels = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];

    let winnings = 0;
    let result = '';

    // Calcular ganancias
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      // Tres iguales
      if (reels[0] === '7️⃣') {
        winnings = bet * 100; // Jackpot
        result = '🎰 ¡JACKPOT! 🎰';
      } else if (reels[0] === '💎') {
        winnings = bet * 50;
        result = '💎 ¡DIAMANTES! 💎';
      } else if (reels[0] === '⭐') {
        winnings = bet * 25;
        result = '⭐ ¡ESTRELLAS! ⭐';
      } else {
        winnings = bet * 10;
        result = '🍒 ¡FRUTAS! 🍒';
      }
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      // Dos iguales
      winnings = bet * 2;
      result = '✨ Dos iguales';
    } else {
      result = '❌ Sin coincidencias';
    }

    if (winnings > 0) {
      await updateUserBalance(userId, balance.saldo - bet + winnings);
    }

    let message = `🎰 *TRAGAMONEDAS* 🎰\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `💰 Apuesta: ${bet} pts\n\n`;
    message += `🎰 *Resultados:*\n`;
    message += `[ ${reels[0]} ] [ ${reels[1]} ] [ ${reels[2]} ]\n\n`;
    message += `🏆 *${result}*\n`;
    
    if (winnings > 0) {
      message += `💰 Ganaste: ${winnings} pts`;
    } else {
      message += `💸 Perdiste: ${bet} pts`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    await logGame(userId, 'slots', bet, winnings);

  } catch (error) {
    casinoLogger.error('Error en tragamonedas:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al jugar tragamonedas.'
    }, { quoted: m });
  }
}

// Lotería
async function playLottery(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const ticketCount = parseInt(args[1]) || 1;

  if (ticketCount < 1 || ticketCount > 10) {
    return await sock.sendMessage(chatId, {
      text: '❌ Puedes comprar entre 1 y 10 boletos.'
    }, { quoted: m });
  }

  const ticketPrice = 100;
  const totalCost = ticketCount * ticketPrice;

  try {
    const balance = await getUserBalance(userId);
    if (balance.total < totalCost) {
      return await sock.sendMessage(chatId, {
        text: `❌ Saldo insuficiente. Necesitas ${totalCost} pts para ${ticketCount} boletos.`
      }, { quoted: m });
    }

    await updateUserBalance(userId, balance.saldo - totalCost);

    // Generar números de lotería
    const tickets = [];
    for (let i = 0; i < ticketCount; i++) {
      const numbers = [];
      for (let j = 0; j < 6; j++) {
        numbers.push(Math.floor(Math.random() * 49) + 1);
      }
      tickets.push(numbers.sort((a, b) => a - b));
    }

    // Simular sorteo (en producción sería programado)
    const winningNumbers = [];
    for (let i = 0; i < 6; i++) {
      winningNumbers.push(Math.floor(Math.random() * 49) + 1);
    }
    const sortedWinning = winningNumbers.sort((a, b) => a - b);

    let message = `🎟️ *LOTERÍA* 🎟️\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `💰 Costo: ${totalCost} pts (${ticketCount} boletos)\n\n`;
    message += `🎯 *Números ganadores:*\n`;
    message += `[ ${sortedWinning.join(' - ')} ]\n\n`;
    message += `🎫 *Tus boletos:*\n`;

    let totalWinnings = 0;
    tickets.forEach((ticket, index) => {
      const matches = ticket.filter(num => sortedWinning.includes(num)).length;
      let prize = 0;

      switch (matches) {
        case 6: prize = 1000000; break;
        case 5: prize = 10000; break;
        case 4: prize = 1000; break;
        case 3: prize = 100; break;
        case 2: prize = 10; break;
      }

      if (prize > 0) {
        totalWinnings += prize;
      }

      message += `Boleto ${index + 1}: [ ${ticket.join(' - ')} ] - ${matches} aciertos`;
      if (prize > 0) {
        message += ` 💰 ${prize} pts`;
      }
      message += '\n';
    });

    if (totalWinnings > 0) {
      await updateUserBalance(userId, balance.saldo - totalCost + totalWinnings);
      message += `\n🏆 *Ganancias totales: ${totalWinnings} pts*`;
    } else {
      message += `\n❌ *No ganaste esta vez*`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    await logGame(userId, 'lottery', totalCost, totalWinnings);

  } catch (error) {
    casinoLogger.error('Error en lotería:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al jugar lotería.'
    }, { quoted: m });
  }
}

// Dados
async function playDice(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  
  if (args.length < 3) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.dice <apuesta> <par/impar>\n*Ejemplo:* `.dice 100 par`'
    }, { quoted: m });
  }

  const bet = parseInt(args[1]);
  const betType = args[2].toLowerCase();

  if (bet < CONFIG.minBet || bet > CONFIG.maxBet) {
    return await sock.sendMessage(chatId, {
      text: `❌ Apuesta inválida. Mínimo: ${CONFIG.minBet}, Máximo: ${CONFIG.maxBet}`
    }, { quoted: m });
  }

  if (!['par', 'impar'].includes(betType)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Tipo de apuesta inválido. Usa "par" o "impar".'
    }, { quoted: m });
  }

  try {
    const balance = await getUserBalance(userId);
    if (balance.total < bet) {
      return await sock.sendMessage(chatId, {
        text: `❌ Saldo insuficiente. Necesitas ${bet} pts, tienes ${balance.total} pts.`
      }, { quoted: m });
    }

    await updateUserBalance(userId, balance.saldo - bet);

    // Lanzar dados
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;
    const isEven = total % 2 === 0;

    const won = (betType === 'par' && isEven) || (betType === 'impar' && !isEven);
    const winnings = won ? bet * 2 : 0;

    if (won) {
      await updateUserBalance(userId, balance.saldo - bet + winnings);
    }

    let message = `🎲 *DADOS* 🎲\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `💰 Apuesta: ${bet} pts en ${betType}\n\n`;
    message += `🎯 *Lanzamiento:*\n`;
    message += `🎲 Dado 1: ${dice1}\n`;
    message += `🎲 Dado 2: ${dice2}\n`;
    message += `📊 Total: ${total} (${isEven ? 'par' : 'impar'})\n\n`;
    
    if (won) {
      message += `🏆 *GANASTE!*\n`;
      message += `💰 Premio: ${winnings} pts`;
    } else {
      message += `❌ *Perdiste*\n`;
      message += `💸 Perdiste: ${bet} pts`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    await logGame(userId, 'dice', bet, winnings);

  } catch (error) {
    casinoLogger.error('Error en dados:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al jugar dados.'
    }, { quoted: m });
  }
}

// Moneda
async function playCoinflip(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  
  if (args.length < 3) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.coinflip <apuesta> <cara/cruz>\n*Ejemplo:* `.coinflip 100 cara`'
    }, { quoted: m });
  }

  const bet = parseInt(args[1]);
  const betType = args[2].toLowerCase();

  if (bet < CONFIG.minBet || bet > CONFIG.maxBet) {
    return await sock.sendMessage(chatId, {
      text: `❌ Apuesta inválida. Mínimo: ${CONFIG.minBet}, Máximo: ${CONFIG.maxBet}`
    }, { quoted: m });
  }

  if (!['cara', 'cruz'].includes(betType)) {
    return await sock.sendMessage(chatId, {
      text: '❌ Tipo de apuesta inválido. Usa "cara" o "cruz".'
    }, { quoted: m });
  }

  try {
    const balance = await getUserBalance(userId);
    if (balance.total < bet) {
      return await sock.sendMessage(chatId, {
        text: `❌ Saldo insuficiente. Necesitas ${bet} pts, tienes ${balance.total} pts.`
      }, { quoted: m });
    }

    await updateUserBalance(userId, balance.saldo - bet);

    // Lanzar moneda
    const result = Math.random() < 0.5 ? 'cara' : 'cruz';
    const won = result === betType;
    const winnings = won ? bet * 2 : 0;

    if (won) {
      await updateUserBalance(userId, balance.saldo - bet + winnings);
    }

    let message = `🪙 *MONEDA* 🪙\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `💰 Apuesta: ${bet} pts en ${betType}\n\n`;
    message += `🎯 *Resultado:*\n`;
    message += `🪙 Salio: ${result}\n\n`;
    
    if (won) {
      message += `🏆 *GANASTE!*\n`;
      message += `💰 Premio: ${winnings} pts`;
    } else {
      message += `❌ *Perdiste*\n`;
      message += `💸 Perdiste: ${bet} pts`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    await logGame(userId, 'coinflip', bet, winnings);

  } catch (error) {
    casinoLogger.error('Error en moneda:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al jugar moneda.'
    }, { quoted: m });
  }
}

// Mostrar jackpot
async function showJackpot(sock, m) {
  const chatId = m.key.remoteJid;
  
  try {
    const jackpot = await getCurrentJackpot();
    const topPlayers = await getTopCasinoPlayers(5);

    let message = `💰 *JACKPOT DEL CASINO* 💰\n\n`;
    message += `🎰 *Jackpot actual: ${jackpot.toLocaleString()} pts*\n\n`;
    
    message += `🏆 *Top jugadores:*\n`;
    topPlayers.forEach((player, index) => {
      message += `${index + 1}. @${player.user_id.split('@')[0]} - ${player.total_winnings.toLocaleString()} pts\n`;
    });
    
    message += `\n💡 *Cómo ganar el jackpot:*\n`;
    message += `• Tres 7️⃣ en las tragamonedas\n`;
    message += `• Blackjack perfecto (21 con 2 cartas)\n`;
    message += `• 6 aciertos en la lotería\n\n`;
    
    message += `📊 *Estadísticas del casino:*\n`;
    message += `• Total apostado hoy: ${await getTotalBetToday().toLocaleString()} pts\n`;
    message += `• Total ganado hoy: ${await getTotalWonToday().toLocaleString()} pts\n`;
    message += `• Jugadores activos hoy: ${await getActivePlayersToday()}`;

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    casinoLogger.error('Error mostrando jackpot:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar información del jackpot.'
    }, { quoted: m });
  }
}

// Mostrar ayuda
async function showCasinoHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `🎰 *SISTEMA DE CASINO* 🎰\n\n`;
  message += `💡 *Juegos disponibles:*\n\n`;
  
  message += `🃏 *Blackjack:*\n`;
  message += `• \`.blackjack <apuesta>\` - Jugar 21\n`;
  message += `• Objetivo: Acercarse a 21 sin pasarse\n\n`;
  
  message += `🎰 *Ruleta:*\n`;
  message += `• \`.roulette <apuesta> <numero/color>\` - Apostar\n`;
  message += `• Colores: red/black, Números: 0-36\n\n`;
  
  message += `🎰 *Tragamonedas:*\n`;
  message += `• \`.slots <apuesta>\` - Girar\n`;
  message += `• Tres iguales = premio\n\n`;
  
  message += `🎟️ *Lotería:*\n`;
  message += `• \`.lottery <boletos>\` - Comprar boletos\n`;
  message += `• 6 números del 1-49\n\n`;
  
  message += `🎲 *Dados:*\n`;
  message += `• \`.dice <apuesta> <par/impar>\` - Apostar\n`;
  message += `• Dos dados, suma total\n\n`;
  
  message += `🪙 *Moneda:*\n`;
  message += `• \`.coinflip <apuesta> <cara/cruz>\` - Apostar\n`;
  message += `• 50/50 de probabilidad\n\n`;
  
  message += `💰 *Límites:*\n`;
  message += `• Apuesta mínima: ${CONFIG.minBet} pts\n`;
  message += `• Apuesta máxima: ${CONFIG.maxBet} pts\n`;
  message += `• Ventaja de la casa: ${CONFIG.houseEdge * 100}%\n\n`;
  
  message += `🏆 *Jackpot:*\n`;
  message += `• \`.jackpot\` - Ver jackpot actual\n`;
  message += `• Se acumula con cada juego\n`;
  message += `• Premios especiales disponibles`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones auxiliares
async function getUserBalance(userId) {
  try {
    const user = await db.get('SELECT saldo, banco FROM usuarios WHERE chatId = ?', [userId]);
    if (!user) {
      await db.run('INSERT INTO usuarios (chatId, saldo, banco) VALUES (?, 100, 0)', [userId]);
      return { saldo: 100, banco: 0, total: 100 };
    }
    return {
      saldo: user.saldo || 0,
      banco: user.banco || 0,
      total: (user.saldo || 0) + (user.banco || 0)
    };
  } catch (error) {
    casinoLogger.error('Error obteniendo saldo:', error);
    return { saldo: 0, banco: 0, total: 0 };
  }
}

async function updateUserBalance(userId, newBalance) {
  try {
    await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
    return true;
  } catch (error) {
    casinoLogger.error('Error actualizando saldo:', error);
    return false;
  }
}

function generateBlackjackHand() {
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const hand = [];
  
  for (let i = 0; i < 2; i++) {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    hand.push(`${rank}${suit}`);
  }
  
  return hand;
}

function calculateBlackjackScore(hand) {
  let score = 0;
  let aces = 0;
  
  hand.forEach(card => {
    const rank = card.replace(/[♠️♥️♦️♣️]/g, '');
    if (rank === 'A') {
      aces++;
      score += 11;
    } else if (['K', 'Q', 'J'].includes(rank)) {
      score += 10;
    } else {
      score += parseInt(rank);
    }
  });
  
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  
  return score;
}

function getCardEmoji(card) {
  const suit = card[card.length - 1];
  return suit;
}

async function logGame(userId, game, bet, winnings) {
  try {
    await db.run(`
      INSERT INTO casino_games (user_id, game, bet, winnings, timestamp)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, game, bet, winnings]);
  } catch (error) {
    casinoLogger.error('Error registrando juego:', error);
  }
}

async function getCurrentJackpot() {
  try {
    const result = await db.get('SELECT amount FROM casino_jackpot WHERE id = 1');
    return result ? result.amount : CONFIG.jackpotSeed;
  } catch (error) {
    casinoLogger.error('Error obteniendo jackpot:', error);
    return CONFIG.jackpotSeed;
  }
}

async function getTopCasinoPlayers(limit = 5) {
  try {
    return await db.all(`
      SELECT user_id, SUM(winnings) as total_winnings 
      FROM casino_games 
      GROUP BY user_id 
      ORDER BY total_winnings DESC 
      LIMIT ?
    `, [limit]);
  } catch (error) {
    casinoLogger.error('Error obteniendo top jugadores:', error);
    return [];
  }
}

async function getTotalBetToday() {
  try {
    const result = await db.get(`
      SELECT SUM(bet) as total FROM casino_games 
      WHERE date(timestamp) = date('now')
    `);
    return result ? result.total : 0;
  } catch (error) {
    casinoLogger.error('Error obteniendo total apostado hoy:', error);
    return 0;
  }
}

async function getTotalWonToday() {
  try {
    const result = await db.get(`
      SELECT SUM(winnings) as total FROM casino_games 
      WHERE date(timestamp) = date('now')
    `);
    return result ? result.total : 0;
  } catch (error) {
    casinoLogger.error('Error obteniendo total ganado hoy:', error);
    return 0;
  }
}

async function getActivePlayersToday() {
  try {
    const result = await db.get(`
      SELECT COUNT(DISTINCT user_id) as count FROM casino_games 
      WHERE date(timestamp) = date('now')
    `);
    return result ? result.count : 0;
  } catch (error) {
    casinoLogger.error('Error obteniendo jugadores activos hoy:', error);
    return 0;
  }
}

// Inicializar tablas
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS casino_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        game TEXT,
        bet INTEGER,
        winnings INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS casino_jackpot (
        id INTEGER PRIMARY KEY,
        amount INTEGER DEFAULT 10000
      )
    `);
    
    // Inicializar jackpot si no existe
    await db.run(`
      INSERT OR IGNORE INTO casino_jackpot (id, amount) VALUES (1, ?)
    `, [CONFIG.jackpotSeed]);
    
    casinoLogger.success('Tablas de casino inicializadas');
  } catch (error) {
    casinoLogger.error('Error inicializando tablas:', error);
  }
}

// Inicializar sistema
initializeTables();

// Exportar funciones para compatibilidad
export { 
  CONFIG,
  casinoLogger,
  getUserBalance,
  updateUserBalance,
  getCurrentJackpot
};