/**
 * @file Plugin Waifu Evolution - Sistema de evolución y progreso de waifus
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de evolución y progreso de waifus separado del plugin principal
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Importar funciones compartidas desde el core
import { 
  characters, 
  loadCharacters, 
  getWaifuLevel, 
  getWaifuStats,
  getExpProgress,
  getExpForNextLevel,
  getRarezaEmoji
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  maxLevel: 100,
  evolutionStages: [5, 10, 25, 50, 75, 100],
  bonusPerStage: {
    5: { affection: 10, happiness: 10 },
    10: { affection: 20, happiness: 20 },
    25: { affection: 30, happiness: 30 },
    50: { affection: 50, happiness: 50 },
    75: { affection: 70, happiness: 70 },
    100: { affection: 100, happiness: 100 }
  }
};

// Sistema de logging
const logger = {
  info: (message) => CONFIG.enableLogging && console.log(`[EVOLUTION] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[EVOLUTION] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[EVOLUTION] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[EVOLUTION] ❌ ${message}`),
  debug: (message) => CONFIG.enableLogging && console.log(`[EVOLUTION] 🔍 ${message}`)
};

/**
 * Sistema de evolución de waifus
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.evolucion':
        await showEvolution(sock, m, userId, text);
        break;
      default:
        logger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    logger.error('Error en el sistema de evolución:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de evolución. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Muestra información de evolución de una waifu
 */
async function showEvolution(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de tu waifu.\n\n' +
            '💡 *Ejemplo:* `.evolucion Hinata Hyuga`'
    }, { quoted: m });
  }
  
  const characterName = args.join(' ');
  
  // Verificar si el usuario tiene esta waifu
  const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
  const claimedIds = claimed.map(c => c.character_id);
  
  const character = characters.find(c => 
    claimedIds.includes(c.id) &&
    c.name.toLowerCase().includes(characterName.toLowerCase())
  );
  
  if (!character) {
    return await sock.sendMessage(chatId, {
      text: `❌ No tienes a *${characterName}* en tu colección.\n\n` +
            'Usa `.mywaifus` para ver tus waifus.'
    }, { quoted: m });
  }
  
  const level = await getWaifuLevel(character.id, userId);
  const expProgress = await getExpProgress(character.id, userId);
  const stats = await getWaifuStats(character.id, userId);
  
  const rareza = getRarezaEmoji(character.price);
  
  let evolution = `🌟 *Evolución de ${character.name}* 🌟\n\n`;
  evolution += `${rareza} *Nivel Actual:* ${level}\n`;
  evolution += `✨ *Experiencia:* ${expProgress.current}/${expProgress.needed} (${expProgress.progress}%)\n\n`;
  
  // Progreso de experiencia visual
  const progressBar = '█'.repeat(Math.floor(expProgress.progress / 5)) + '░'.repeat(20 - Math.floor(expProgress.progress / 5));
  evolution += `📊 *Progreso:* [${progressBar}] ${expProgress.progress}%\n\n`;
  
  evolution += `📈 *Estadísticas Actuales:*\n`;
  evolution += `❤️ *Afecto:* ${stats.affection}/100\n`;
  evolution += `🍖 *Hambre:* ${stats.hunger}/100\n`;
  evolution += `😊 *Felicidad:* ${stats.happiness}/100\n\n`;
  
  // Próximos niveles
  evolution += `🔮 *Próximos Niveles:*\n`;
  for (let i = 1; i <= 3; i++) {
    const nextLevel = level + i;
    if (nextLevel <= CONFIG.maxLevel) {
      const neededExp = getExpForNextLevel(nextLevel - 1);
      evolution += `• Nivel ${nextLevel}: ${neededExp.toLocaleString()} EXP total\n`;
    }
  }
  
  // Etapas de evolución
  evolution += `\n🎭 *Etapas de Evolución:*\n`;
  CONFIG.evolutionStages.forEach(stage => {
    if (level >= stage) {
      evolution += `✅ Nivel ${stage} - ¡Desbloqueado!\n`;
    } else {
      const expNeeded = getExpForNextLevel(stage - 1);
      evolution += `⏳ Nivel ${stage} - Requiere ${expNeeded.toLocaleString()} EXP\n`;
    }
  });
  
  // Bonificaciones por etapa
  const nextStage = CONFIG.evolutionStages.find(stage => level < stage);
  if (nextStage) {
    const bonus = CONFIG.bonusPerStage[nextStage];
    evolution += `\n🎁 *Próxima Bonificación (Nivel ${nextStage}):*\n`;
    evolution += `❤️ +${bonus.affection} Afecto\n`;
    evolution += `😊 +${bonus.happiness} Felicidad\n`;
  }
  
  await sock.sendMessage(chatId, { text: evolution, mentions: [userId] }, { quoted: m });
}

/**
 * Aplica bonificaciones de evolución al subir de nivel
 */
async function applyEvolutionBonus(characterId, userId, newLevel) {
  // Verificar si el nuevo nivel desbloquea una etapa
  const unlockedStage = CONFIG.evolutionStages.find(stage => newLevel === stage);
  
  if (unlockedStage) {
    const bonus = CONFIG.bonusPerStage[unlockedStage];
    
    await db.run(`
      UPDATE waifu_levels 
      SET affection = MIN(100, affection + ?), 
          happiness = MIN(100, happiness + ?)
      WHERE character_id = ? AND user_id = ?
    `, [bonus.affection, bonus.happiness, characterId, userId]);
    
    logger.success(`Bonificación de evolución aplicada para waifu ${characterId} en nivel ${newLevel}`);
    
    return {
      unlocked: true,
      stage: unlockedStage,
      bonus
    };
  }
  
  return { unlocked: false };
}

/**
 * Calcula estadísticas base según el nivel
 */
function calculateBaseStats(level) {
  return {
    baseAttack: 10 + (level * 2),
    baseDefense: 5 + (level * 1.5),
    baseSpeed: 8 + (level * 1.2),
    baseHP: 100 + (level * 5)
  };
}

/**
 * Obtiene información detallada de evolución
 */
async function getDetailedEvolutionInfo(characterId, userId) {
  const level = await getWaifuLevel(characterId, userId);
  const expProgress = await getExpProgress(characterId, userId);
  const stats = await getWaifuStats(characterId, userId);
  const baseStats = calculateBaseStats(level);
  
  return {
    level,
    expProgress,
    stats,
    baseStats,
    evolutionStages: CONFIG.evolutionStages,
    unlockedStages: CONFIG.evolutionStages.filter(stage => level >= stage),
    nextStage: CONFIG.evolutionStages.find(stage => level < stage),
    maxLevel: CONFIG.maxLevel
  };
}

// Exportar configuración y funciones necesarias
export const command = ['.evolucion'];
export const alias = ['.evol', '.level'];
export const description = 'Sistema de evolución y progreso de waifus';

// Cargar personajes al iniciar
loadCharacters();

export { CONFIG, logger, applyEvolutionBonus, getDetailedEvolutionInfo };
