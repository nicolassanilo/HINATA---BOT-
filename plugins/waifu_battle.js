/**
 * @file Plugin Waifu Battle - Sistema de combate entre waifus
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de combate entre waifus separado del plugin principal
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Importar funciones compartidas desde el core
import { 
  characters, 
  loadCharacters, 
  getWaifuLevel, 
  addWaifuExp, 
  getWaifuStats,
  getRarezaEmoji,
  getRarezaBonus,
  getUserBalance,
  updateUserBalance,
  logger
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  battleCooldown: 60 * 60 * 1000, // 1 hora
  maxRounds: 10,
  baseHP: 100,
  expRewards: {
    win: 50,
    lose: 10,
    draw: 25
  },
  damageVariation: {
    min: 0.8,
    max: 1.2
  }
};

// Sistema de logging
const logger = {
  info: (message) => CONFIG.enableLogging && console.log(`[BATTLE] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[BATTLE] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[BATTLE] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[BATTLE] ❌ ${message}`),
  debug: (message) => CONFIG.enableLogging && console.log(`[BATTLE] 🔍 ${message}`)
};

/**
 * Sistema de combate entre waifus
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.batalla':
        await waifuBattle(sock, m, userId, text);
        break;
      default:
        logger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    logger.error('Error en el sistema de combate:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de combate. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Sistema de combate entre waifus
 */
async function waifuBattle(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto del comando.\n\n' +
            '💡 *Formato:* `.batalla <mi_waifu> <oponente>\n' +
            '*Ejemplo:* `.batalla Hinata Hyuga @usuario Mikasa Ackerman`\n\n' +
            '⚔️ Desafía a otro usuario a un combate de waifus'
    }, { quoted: m });
  }
  
  // Parsear argumentos (puede incluir mención)
  const opponentMention = args.find(arg => arg.startsWith('@'));
  const opponentId = opponentMention ? `${opponentMention.slice(1)}@s.whatsapp.net` : null;
  
  if (!opponentId || opponentId === userId) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes mencionar a otro usuario para desafiarlo.\n\n' +
            '*Ejemplo:* `.batalla Hinata Hyuga @usuario Mikasa Ackerman`'
    }, { quoted: m });
  }
  
  // Extraer nombres de waifus
  const myWaifuName = args.slice(0, args.indexOf(opponentMention)).join(' ');
  const opponentWaifuName = args.slice(args.indexOf(opponentMention) + 1).join(' ');
  
  if (!myWaifuName || !opponentWaifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar los nombres de ambas waifus.\n\n' +
            '*Formato:* `.batalla <mi_waifu> @oponente <waifu_oponente>`'
    }, { quoted: m });
  }
  
  // Verificar que ambos usuarios tienen las waifus
  const myWaifu = await validateUserWaifu(userId, myWaifuName);
  const opponentWaifu = await validateUserWaifu(opponentId, opponentWaifuName);
  
  if (!myWaifu.success) {
    return await sock.sendMessage(chatId, { text: `❌ ${myWaifu.message}` }, { quoted: m });
  }
  
  if (!opponentWaifu.success) {
    return await sock.sendMessage(chatId, { text: `❌ ${opponentWaifu.message}` }, { quoted: m });
  }
  
  // Verificar cooldown de combate
  const battleCooldown = await checkBattleCooldown(userId);
  if (!battleCooldown.canBattle) {
    return await sock.sendMessage(chatId, {
      text: `⏰ Debes esperar ${battleCooldown.remainingMinutes} minutos antes de volver a combatir.`
    }, { quoted: m });
  }
  
  // Ejecutar combate
  const battleResult = await executeBattle(myWaifu.character, opponentWaifu.character, userId, opponentId);
  
  // Mostrar resultado del combate
  await displayBattleResult(sock, chatId, m, battleResult, userId, opponentId);
}

/**
 * Valida que un usuario tenga una waifu específica
 */
async function validateUserWaifu(userId, waifuName) {
  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
  const claimedIds = claimed.map(c => c.character_id);
  
  const character = characters.find(c => 
    claimedIds.includes(c.id) &&
    c.name.toLowerCase().includes(waifuName.toLowerCase())
  );
  
  if (!character) {
    return {
      success: false,
      message: `No tienes la waifu "${waifuName}" en tu colección.`
    };
  }
  
  return {
    success: true,
    character
  };
}

/**
 * Verifica el cooldown de combate
 */
async function checkBattleCooldown(userId) {
  const lastBattle = await db.get(
    'SELECT last_battle FROM user_battle_stats WHERE user_id = ?',
    [userId]
  );
  
  if (lastBattle) {
    const timeSince = Date.now() - new Date(lastBattle.last_battle).getTime();
    if (timeSince < CONFIG.battleCooldown) {
      const remaining = Math.ceil((CONFIG.battleCooldown - timeSince) / 60000);
      return {
        canBattle: false,
        remainingMinutes: remaining
      };
    }
  }
  
  return { canBattle: true };
}

/**
 * Ejecuta un combate entre dos waifus
 */
async function executeBattle(waifu1, waifu2, userId1, userId2) {
  // Obtener estadísticas de combate
  const stats1 = await getBattleStats(waifu1.id, userId1);
  const stats2 = await getBattleStats(waifu2.id, userId2);
  
  // Calcular poder de combate
  const power1 = calculateBattlePower(waifu1, stats1);
  const power2 = calculateBattlePower(waifu2, stats2);
  
  // Simulación de combate con elementos aleatorios
  const rounds = [];
  let hp1 = CONFIG.baseHP;
  let hp2 = CONFIG.baseHP;
  let currentRound = 1;
  
  while (hp1 > 0 && hp2 > 0 && currentRound <= CONFIG.maxRounds) {
    const damage1 = Math.max(5, Math.floor(power1 * (CONFIG.damageVariation.min + Math.random() * (CONFIG.damageVariation.max - CONFIG.damageVariation.min)) - (stats2.defense * 0.1)));
    const damage2 = Math.max(5, Math.floor(power2 * (CONFIG.damageVariation.min + Math.random() * (CONFIG.damageVariation.max - CONFIG.damageVariation.min)) - (stats1.defense * 0.1)));
    
    hp2 -= damage1;
    hp1 -= damage2;
    
    rounds.push({
      round: currentRound,
      attacker1: damage1,
      attacker2: damage2,
      hp1: Math.max(0, hp1),
      hp2: Math.max(0, hp2)
    });
    
    currentRound++;
  }
  
  // Determinar ganador
  const winner = hp1 > hp2 ? 1 : (hp2 > hp1 ? 2 : 0); // 0 = empate
  
  // Actualizar estadísticas y dar recompensas
  const expReward1 = winner === 1 ? CONFIG.expRewards.win : (winner === 0 ? CONFIG.expRewards.draw : CONFIG.expRewards.lose);
  const expReward2 = winner === 2 ? CONFIG.expRewards.win : (winner === 0 ? CONFIG.expRewards.draw : CONFIG.expRewards.lose);
  
  await addWaifuExp(waifu1.id, userId1, expReward1);
  await addWaifuExp(waifu2.id, userId2, expReward2);
  
  // Actualizar cooldown y estadísticas
  await updateBattleStats(userId1, winner === 1);
  await updateBattleStats(userId2, winner === 2);
  
  logger.success(`Combate completado: ${waifu1.name} vs ${waifu2.name}, ganador: ${winner === 1 ? waifu1.name : (winner === 2 ? waifu2.name : 'Empate')}`);
  
  return {
    waifu1,
    waifu2,
    userId1,
    userId2,
    rounds,
    winner,
    finalHp1: Math.max(0, hp1),
    finalHp2: Math.max(0, hp2),
    expReward1,
    expReward2
  };
}

/**
 * Actualiza estadísticas de combate del usuario
 */
async function updateBattleStats(userId, won) {
  const currentStats = await db.get(
    'SELECT battles_won, battles_lost, battles_total FROM user_battle_stats WHERE user_id = ?',
    [userId]
  );
  
  if (currentStats) {
    await db.run(`
      UPDATE user_battle_stats 
      SET last_battle = CURRENT_TIMESTAMP,
          battles_won = battles_won + ?,
          battles_lost = battles_lost + ?,
          battles_total = battles_total + 1
      WHERE user_id = ?
    `, [won ? 1 : 0, won ? 0 : 1, userId]);
  } else {
    await db.run(`
      INSERT INTO user_battle_stats (user_id, last_battle, battles_won, battles_lost, battles_total)
      VALUES (?, CURRENT_TIMESTAMP, ?, ?, 1)
    `, [userId, won ? 1 : 0, won ? 0 : 1]);
  }
}

/**
 * Obtiene estadísticas de combate de una waifu
 */
async function getBattleStats(characterId, userId) {
  const level = await getWaifuLevel(characterId, userId);
  const stats = await getWaifuStats(characterId, userId);
  
  return {
    level,
    attack: Math.floor(10 + level * 2 + stats.affection * 0.1),
    defense: Math.floor(5 + level * 1.5 + stats.happiness * 0.05),
    speed: Math.floor(8 + level * 1.2 + (100 - stats.hunger) * 0.05),
    hp: CONFIG.baseHP + level * 5
  };
}

/**
 * Calcula el poder de combate total
 */
function calculateBattlePower(waifu, stats) {
  const rarityBonus = getRarezaBonus(waifu.price);
  const basePower = (stats.attack * 2) + stats.defense + (stats.speed * 0.5);
  return Math.floor(basePower * rarityBonus);
}

/**
 * Muestra el resultado del combate
 */
async function displayBattleResult(sock, chatId, m, result, userId1, userId2) {
  const { waifu1, waifu2, rounds, winner, finalHp1, finalHp2, expReward1, expReward2 } = result;
  
  let battleReport = `⚔️ *BATALLA DE WAIFUS* ⚔️\n\n`;
  battleReport += `${getRarezaEmoji(waifu1.price)} *${waifu1.name}* vs ${getRarezaEmoji(waifu2.price)} *${waifu2.name}*\n\n`;
  
  // Resumen de rondas
  battleReport += `📜 *Resumen del Combate:*\n`;
  rounds.forEach((round, index) => {
    if (index < 3 || index === rounds.length - 1) { // Mostrar primeras 3 y última ronda
      battleReport += `Ronda ${round.round}: ${waifu1.name} (-${round.attacker1}) HP: ${round.hp1} | ${waifu2.name} (-${round.attacker2}) HP: ${round.hp2}\n`;
    } else if (index === 3 && rounds.length > 4) {
      battleReport += `...\n`;
    }
  });
  
  battleReport += `\n🏆 *Resultado Final:*\n`;
  
  if (winner === 1) {
    battleReport += `🎉 *${waifu1.name} (@${userId1.split('@')[0]}) ha ganado!*\n`;
    battleReport += `💔 ${waifu2.name} (@${userId2.split('@')[0]}) ha sido derrotada.\n\n`;
    battleReport += `🎁 *Recompensas:*\n`;
    battleReport += `• ${waifu1.name}: +${expReward1} EXP\n`;
    battleReport += `• ${waifu2.name}: +${expReward2} EXP`;
  } else if (winner === 2) {
    battleReport += `🎉 *${waifu2.name} (@${userId2.split('@')[0]}) ha ganado!*\n`;
    battleReport += `💔 ${waifu1.name} (@${userId1.split('@')[0]}) ha sido derrotada.\n\n`;
    battleReport += `🎁 *Recompensas:*\n`;
    battleReport += `• ${waifu2.name}: +${expReward2} EXP\n`;
    battleReport += `• ${waifu1.name}: +${expReward1} EXP`;
  } else {
    battleReport += `🤝 *¡EMPATE!*\n\n`;
    battleReport += `Ambas waifus han demostrado gran poder.\n\n`;
    battleReport += `🎁 *Recompensas:*\n`;
    battleReport += `• ${waifu1.name}: +${expReward1} EXP\n`;
    battleReport += `• ${waifu2.name}: +${expReward2} EXP`;
  }
  
  battleReport += `\n\n⏰ *Cooldown:* 1 hora para volver a combatir`;
  
  await sock.sendMessage(chatId, { 
    text: battleReport, 
    mentions: [userId1, userId2] 
  }, { quoted: m });
}

/**
 * Obtiene estadísticas generales de combate de un usuario
 */
async function getUserBattleStats(userId) {
  const stats = await db.get(
    'SELECT battles_won, battles_lost, battles_total FROM user_battle_stats WHERE user_id = ?',
    [userId]
  );
  
  if (!stats) {
    return {
      total: 0,
      won: 0,
      lost: 0,
      winRate: 0
    };
  }
  
  return {
    total: stats.battles_total || 0,
    won: stats.battles_won || 0,
    lost: stats.battles_lost || 0,
    winRate: stats.battles_total > 0 ? Math.round((stats.battles_won / stats.battles_total) * 100) : 0
  };
}

// Exportar configuración y funciones necesarias
export const command = ['.batalla'];
export const alias = ['.battle', '.fight'];
export const description = 'Sistema de combate entre waifus';

// Cargar personajes al iniciar
loadCharacters();

export { CONFIG, logger, getUserBattleStats };
