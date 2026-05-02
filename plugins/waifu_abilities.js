/**
 * @file Plugin Waifu Abilities - Sistema de habilidades y poderes especiales
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de habilidades especiales, clases, árbol de talentos y poderes únicos
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Importar funciones compartidas desde el core
import { 
  characters, 
  loadCharacters, 
  getWaifuLevel, 
  getWaifuStats,
  getRarezaEmoji,
  logger
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  maxAbilitiesPerWaifu: 8,
  abilityPointsPerLevel: 1,
  maxAbilityLevel: 10,
  unlockLevel: 5, // Nivel mínimo para desbloquear habilidades
  cooldownReductionPerLevel: 0.1, // 10% por nivel
  powerMultiplierPerLevel: 0.15 // 15% por nivel
};

// Sistema de logging
const abilitiesLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[ABILITIES] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[ABILITIES] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[ABILITIES] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[ABILITIES] ❌ ${message}`)
};

// Clases de waifus
const WAIFU_CLASSES = {
  WARRIOR: 'warrior',
  MAGE: 'mage',
  HEALER: 'healer',
  ASSASSIN: 'assassin',
  SUPPORT: 'support',
  TANK: 'tank',
  DPS: 'dps',
  HYBRID: 'hybrid'
};

// Definiciones de clases
const CLASS_DEFINITIONS = {
  [WAIFU_CLASSES.WARRIOR]: {
    name: 'Guerrero',
    emoji: '⚔️',
    description: 'Especialista en combate cuerpo a cuerpo',
    stats: { strength: 2, defense: 1.5, magic: 0.5, speed: 1 },
    abilities: ['sword_strike', 'shield_bash', 'battle_cry', 'berserker_rage']
  },
  [WAIFU_CLASSES.MAGE]: {
    name: 'Mago',
    emoji: '🔮',
    description: 'Maestro de la magia elemental',
    stats: { strength: 0.5, defense: 0.8, magic: 2.5, speed: 1.2 },
    abilities: ['fireball', 'frost_armor', 'teleport', 'meteor_shower']
  },
  [WAIFU_CLASSES.HEALER]: {
    name: 'Sanador',
    emoji: '💚',
    description: 'Experto en magia curativa',
    stats: { strength: 0.8, defense: 1.2, magic: 1.8, speed: 1 },
    abilities: ['heal', 'regenerate', 'divine_protection', 'resurrection']
  },
  [WAIFU_CLASSES.ASSASSIN]: {
    name: 'Asesino',
    emoji: '🗡️',
    description: 'Especialista en ataques sigilosos',
    stats: { strength: 1.5, defense: 0.8, magic: 1, speed: 2 },
    abilities: ['stealth', 'poison_blade', 'shadow_strike', 'instant_kill']
  },
  [WAIFU_CLASSES.SUPPORT]: {
    name: 'Soporte',
    emoji: '🛡️',
    description: 'Proporciona buffs y utilidad al equipo',
    stats: { strength: 0.8, defense: 1.5, magic: 1.5, speed: 1.2 },
    abilities: ['buff_party', 'debuff_enemies', 'barrier', 'team_heal']
  },
  [WAIFU_CLASSES.TANK]: {
    name: 'Tanque',
    emoji: '🛡️',
    description: 'Absorbe daño y protege al equipo',
    stats: { strength: 1.2, defense: 2.5, magic: 0.5, speed: 0.8 },
    abilities: ['taunt', 'iron_wall', 'damage_reduction', 'last_stand']
  },
  [WAIFU_CLASSES.DPS]: {
    name: 'DPS',
    emoji: '🎯',
    description: 'Especialista en daño masivo',
    stats: { strength: 1.8, defense: 0.8, magic: 1.2, speed: 1.5 },
    abilities: ['critical_strike', 'rapid_fire', 'power_shot', 'ultimate_attack']
  },
  [WAIFU_CLASSES.HYBRID]: {
    name: 'Híbrido',
    emoji: '🌟',
    description: 'Balanceado en todas las áreas',
    stats: { strength: 1.2, defense: 1.2, magic: 1.2, speed: 1.2 },
    abilities: ['adaptive_power', 'versatility', 'balance_strike', 'ultimate_form']
  }
};

// Tipos de habilidades
const ABILITY_TYPES = {
  ACTIVE: 'active',
  PASSIVE: 'passive',
  ULTIMATE: 'ultimate',
  BUFF: 'buff',
  DEBUFF: 'debuff'
};

// Definiciones de habilidades
const ABILITY_DEFINITIONS = {
  // Habilidades de Guerrero
  sword_strike: {
    name: 'Golpe de Espada',
    emoji: '⚔️',
    type: ABILITY_TYPES.ACTIVE,
    class: WAIFU_CLASSES.WARRIOR,
    description: 'Ataque básico con espada',
    damage: 100,
    cooldown: 5000,
    manaCost: 10,
    unlockLevel: 1,
    maxLevel: 10
  },
  shield_bash: {
    name: 'Golpe de Escudo',
    emoji: '🛡️',
    type: ABILITY_TYPES.ACTIVE,
    class: WAIFU_CLASSES.WARRIOR,
    description: 'Aturde al enemigo con el escudo',
    damage: 50,
    stun: 2000,
    cooldown: 8000,
    manaCost: 20,
    unlockLevel: 3,
    maxLevel: 8
  },
  battle_cry: {
    name: 'Grito de Batalla',
    emoji: '📢',
    type: ABILITY_TYPES.BUFF,
    class: WAIFU_CLASSES.WARRIOR,
    description: 'Aumenta el ataque del equipo',
    buff: { attack: 1.5 },
    duration: 10000,
    cooldown: 15000,
    manaCost: 30,
    unlockLevel: 5,
    maxLevel: 5
  },
  berserker_rage: {
    name: 'Ría Berserker',
    emoji: '😡',
    type: ABILITY_TYPES.ULTIMATE,
    class: WAIFU_CLASSES.WARRIOR,
    description: 'Aumenta drásticamente el ataque pero reduce defensa',
    buff: { attack: 3, defense: 0.5 },
    duration: 8000,
    cooldown: 30000,
    manaCost: 100,
    unlockLevel: 10,
    maxLevel: 3
  },
  
  // Habilidades de Mago
  fireball: {
    name: 'Bola de Fuego',
    emoji: '🔥',
    type: ABILITY_TYPES.ACTIVE,
    class: WAIFU_CLASSES.MAGE,
    description: 'Lanza una bola de fuego explosiva',
    damage: 150,
    burn: 5000,
    cooldown: 6000,
    manaCost: 25,
    unlockLevel: 1,
    maxLevel: 10
  },
  frost_armor: {
    name: 'Armadura de Hielo',
    emoji: '❄️',
    type: ABILITY_TYPES.BUFF,
    class: WAIFU_CLASSES.MAGE,
    description: 'Crea una armadura de hielo protectora',
    buff: { defense: 2, resistance: 1.5 },
    duration: 12000,
    cooldown: 20000,
    manaCost: 40,
    unlockLevel: 4,
    maxLevel: 6
  },
  teleport: {
    name: 'Teletransporte',
    emoji: '✨',
    type: ABILITY_TYPES.ACTIVE,
    class: WAIFU_CLASSES.MAGE,
    description: 'Se teletransporta a corta distancia',
    cooldown: 8000,
    manaCost: 35,
    unlockLevel: 6,
    maxLevel: 5
  },
  meteor_shower: {
    name: 'Lluvia de Meteoros',
    emoji: '☄️',
    type: ABILITY_TYPES.ULTIMATE,
    class: WAIFU_CLASSES.MAGE,
    description: 'Invoca una lluvia de meteoros devastadora',
    damage: 500,
    area: true,
    cooldown: 45000,
    manaCost: 150,
    unlockLevel: 12,
    maxLevel: 3
  },
  
  // Habilidades de Sanador
  heal: {
    name: 'Sanación',
    emoji: '💚',
    type: ABILITY_TYPES.ACTIVE,
    class: WAIFU_CLASSES.HEALER,
    description: 'Restaura salud al objetivo',
    healing: 200,
    cooldown: 4000,
    manaCost: 20,
    unlockLevel: 1,
    maxLevel: 10
  },
  regenerate: {
    name: 'Regeneración',
    emoji: '🔄',
    type: ABILITY_TYPES.BUFF,
    class: WAIFU_CLASSES.HEALER,
    description: 'Regenera salud continuamente',
    buff: { regeneration: 50 },
    duration: 10000,
    cooldown: 15000,
    manaCost: 45,
    unlockLevel: 5,
    maxLevel: 6
  },
  divine_protection: {
    name: 'Protección Divina',
    emoji: '🛡️',
    type: ABILITY_TYPES.BUFF,
    class: WAIFU_CLASSES.HEALER,
    description: 'Protege de todo daño por un tiempo',
    buff: { invulnerable: true },
    duration: 3000,
    cooldown: 25000,
    manaCost: 80,
    unlockLevel: 8,
    maxLevel: 4
  },
  resurrection: {
    name: 'Resurrección',
    emoji: '✝️',
    type: ABILITY_TYPES.ULTIMATE,
    class: WAIFU_CLASSES.HEALER,
    description: 'Revive a un aliado caído',
    cooldown: 60000,
    manaCost: 200,
    unlockLevel: 15,
    maxLevel: 2
  },
  
  // Habilidades de Asesino
  stealth: {
    name: 'Sigilo',
    emoji: '👤',
    type: ABILITY_TYPES.BUFF,
    class: WAIFU_CLASSES.ASSASSIN,
    description: 'Se vuelve invisible para enemigos',
    buff: { invisible: true, critical: 2 },
    duration: 5000,
    cooldown: 12000,
    manaCost: 30,
    unlockLevel: 2,
    maxLevel: 7
  },
  poison_blade: {
    name: 'Hoja Envenenada',
    emoji: '🩸',
    type: ABILITY_TYPES.ACTIVE,
    class: WAIFU_CLASSES.ASSASSIN,
    description: 'Aplica veneno con cada ataque',
    damage: 80,
    poison: 8000,
    cooldown: 7000,
    manaCost: 25,
    unlockLevel: 4,
    maxLevel: 8
  },
  shadow_strike: {
    name: 'Golpe de Sombra',
    emoji: '🌑',
    type: ABILITY_TYPES.ACTIVE,
    class: WAIFU_CLASSES.ASSASSIN,
    description: 'Ataque desde las sombras',
    damage: 200,
    critical: 3,
    cooldown: 10000,
    manaCost: 50,
    unlockLevel: 7,
    maxLevel: 5
  },
  instant_kill: {
    name: 'Muerte Instantánea',
    emoji: '💀',
    type: ABILITY_TYPES.ULTIMATE,
    class: WAIFU_CLASSES.ASSASSIN,
    description: 'Intenta matar instantáneamente',
    execute: 0.3, // 30% de probabilidad
    cooldown: 40000,
    manaCost: 120,
    unlockLevel: 12,
    maxLevel: 3
  }
};

/**
 * Sistema de habilidades de waifus
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.habilidades':
        await showAbilitiesMenu(sock, m, userId);
        break;
      case '.clase':
        await showClassInfo(sock, m, userId, text);
        break;
      case '.cambiar_clase':
        await changeClass(sock, m, userId, text);
        break;
      case '.arbol_talentos':
        await showTalentTree(sock, m, userId, text);
        break;
      case '.desbloquear_habilidad':
        await unlockAbility(sock, m, userId, text);
        break;
      case '.mejorar_habilidad':
        await upgradeAbility(sock, m, userId, text);
        break;
      case '.usar_habilidad':
        await useAbility(sock, m, userId, text);
        break;
      case '.stats_combate':
        await showCombatStats(sock, m, userId, text);
        break;
      default:
        abilitiesLogger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    abilitiesLogger.error('Error en el sistema de habilidades:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de habilidades. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Muestra el menú principal de habilidades
 */
async function showAbilitiesMenu(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userWaifus = await getUserWaifus(userId);
    
    let menuMessage = `⚔️ *SISTEMA DE HABILIDADES* ⚔️\n\n`;
    menuMessage += `👤 *@${userId.split('@')[0]}*\n`;
    menuMessage += `🎯 *Waifus con habilidades:* ${userWaifus.filter(w => w.level >= CONFIG.unlockLevel).length}\n`;
    menuMessage += `📊 *Nivel mínimo para desbloquear:* ${CONFIG.unlockLevel}\n\n`;
    
    menuMessage += `🎯 *Comandos de Habilidades:*\n\n`;
    
    menuMessage += `📚 *Información:*\n`;
    menuMessage += `• \`.clase <waifu>\` - Ver clase de la waifu\n`;
    menuMessage += `• \`.cambiar_clase <waifu> <clase>\` - Cambiar clase\n`;
    menuMessage += `• \`.arbol_talentos <waifu>\` - Ver árbol de talentos\n`;
    menuMessage += `• \`.stats_combate <waifu>\` - Ver estadísticas de combate\n\n`;
    
    menuMessage += `⚡ *Habilidades:*\n`;
    menuMessage += `• \`.desbloquear_habilidad <waifu> <habilidad>\` - Desbloquear\n`;
    menuMessage += `• \`.mejorar_habilidad <waifu> <habilidad>\` - Mejorar\n`;
    menuMessage += `• \`.usar_habilidad <waifu> <habilidad>\` - Usar habilidad\n\n`;
    
    menuMessage += `🎭 *Clases disponibles:*\n`;
    Object.entries(CLASS_DEFINITIONS).forEach(([key, classDef]) => {
      menuMessage += `• ${classDef.emoji} ${classDef.name} - ${classDef.description}\n`;
    });
    
    menuMessage += `\n💡 *Puntos de habilidad:* 1 por nivel después del nivel ${CONFIG.unlockLevel}\n`;
    menuMessage += `⚠️ *Máximo de habilidades:* ${CONFIG.maxAbilitiesPerWaifu} por waifu`;
    
    await sock.sendMessage(chatId, { 
      text: menuMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    abilitiesLogger.error('Error al mostrar menú de habilidades:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el menú de habilidades.'
    }, { quoted: m });
  }
}

/**
 * Muestra información de la clase de una waifu
 */
async function showClassInfo(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Uso:* `.clase <nombre_waifu>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Obtener información de la clase
    const waifuClass = await getWaifuClass(character.id, userId);
    const level = await getWaifuLevel(character.id, userId);
    const stats = await getWaifuStats(character.id, userId);
    const abilities = await getWaifuAbilities(character.id, userId);
    
    const classDef = CLASS_DEFINITIONS[waifuClass.class] || CLASS_DEFINITIONS[WAIFU_CLASSES.HYBRID];
    const rareza = getRarezaEmoji(character.price);
    
    let classMessage = `🎭 *CLASE DE ${character.name.toUpperCase()}* 🎭\n\n`;
    classMessage += `${rareza} *${character.name}*\n`;
    classMessage += `📺 ${character.anime}\n`;
    classMessage += `⭐ Nivel: ${level}\n`;
    classMessage += `${classDef.emoji} *Clase:* ${classDef.name}\n`;
    classMessage += `📝 ${classDef.description}\n\n`;
    
    classMessage += `📊 *Estadísticas de Combate:*\n`;
    const combatStats = calculateCombatStats(waifuClass, level, stats);
    Object.entries(combatStats).forEach(([stat, value]) => {
      const statName = getStatName(stat);
      classMessage += `• ${statName}: ${value}\n`;
    });
    
    classMessage += `\n⚡ *Habilidades Desbloqueadas:*\n`;
    if (abilities.length === 0) {
      classMessage += `📦 Ninguna habilidad desbloqueada\n`;
      classMessage += `💡 Desbloquea habilidades desde el nivel ${CONFIG.unlockLevel}`;
    } else {
      abilities.forEach((ability, index) => {
        const abilityDef = ABILITY_DEFINITIONS[ability.ability_id];
        if (abilityDef) {
          classMessage += `${index + 1}. ${abilityDef.emoji} *${abilityDef.name}* (Nivel ${ability.level})\n`;
        }
      });
    }
    
    classMessage += `\n💡 *Comandos disponibles:*\n`;
    classMessage += `• \`.cambiar_clase <waifu> <clase>\` - Cambiar clase\n`;
    classMessage += `• \`.arbol_talentos <waifu>\` - Ver árbol de talentos\n`;
    classMessage += `• \`.stats_combate <waifu>\` - Ver estadísticas detalladas`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: classMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: classMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
  } catch (error) {
    abilitiesLogger.error('Error al mostrar información de clase:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la información de la clase.'
    }, { quoted: m });
  }
}

/**
 * Cambia la clase de una waifu
 */
async function changeClass(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.cambiar_clase <nombre_waifu> <clase>`\n' +
            '*Clases:* ' + Object.keys(CLASS_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  const waifuName = args.slice(0, -1).join(' ');
  const classType = args[args.length - 1];
  
  if (!Object.values(WAIFU_CLASSES).includes(classType)) {
    return await sock.sendMessage(chatId, {
      text: `❌ Clase no válida.\n\n` +
            '*Clases disponibles:* ' + Object.keys(CLASS_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    const level = await getWaifuLevel(character.id, userId);
    
    if (level < CONFIG.unlockLevel) {
      return await sock.sendMessage(chatId, {
        text: `❌ ${character.name} necesita ser nivel ${CONFIG.unlockLevel} para cambiar de clase.\n\n` +
              `📊 *Nivel actual:* ${level}`
      }, { quoted: m });
    }
    
    // Cambiar clase
    await db.run(
      'INSERT OR REPLACE INTO waifu_classes (character_id, user_id, class, changed_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [character.id, userId, classType]
    );
    
    // Resetear habilidades
    await db.run('DELETE FROM waifu_abilities WHERE character_id = ? AND user_id = ?', [character.id, userId]);
    
    const classDef = CLASS_DEFINITIONS[classType];
    const rareza = getRarezaEmoji(character.price);
    
    let changeMessage = `🎭 *CLASE CAMBIADA* 🎭\n\n`;
    changeMessage += `${rareza} *${character.name}* ahora es:\n`;
    changeMessage += `${classDef.emoji} *${classDef.name}*\n`;
    changeMessage += `📝 ${classDef.description}\n\n`;
    
    changeMessage += `📊 *Nuevas estadísticas de combate:*\n`;
    const combatStats = calculateCombatStats({ class }, level, await getWaifuStats(character.id, userId));
    Object.entries(combatStats).forEach(([stat, value]) => {
      const statName = getStatName(stat);
      changeMessage += `• ${statName}: ${value}\n`;
    });
    
    changeMessage += `\n⚡ *Habilidades disponibles:*\n`;
    classDef.abilities.forEach((abilityId, index) => {
      const abilityDef = ABILITY_DEFINITIONS[abilityId];
      if (abilityDef) {
        changeMessage += `${index + 1}. ${abilityDef.emoji} ${abilityDef.name} (Nivel ${abilityDef.unlockLevel})\n`;
      }
    });
    
    changeMessage += `\n💡 *Usa \`.desbloquear_habilidad <waifu> <habilidad>\` para desbloquear habilidades`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: changeMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: changeMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
    abilitiesLogger.success(`Clase cambiada - waifu: ${character.name} - clase: ${classType}`);
    
  } catch (error) {
    abilitiesLogger.error('Error al cambiar clase:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cambiar la clase.'
    }, { quoted: m });
  }
}

/**
 * Muestra el árbol de talentos de una waifu
 */
async function showTalentTree(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Uso:* `.arbol_talentos <nombre_waifu>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    const level = await getWaifuLevel(character.id, userId);
    const waifuClass = await getWaifuClass(character.id, userId);
    const abilities = await getWaifuAbilities(character.id, userId);
    const abilityPoints = calculateAbilityPoints(level);
    
    const classDef = CLASS_DEFINITIONS[waifuClass.class] || CLASS_DEFINITIONS[WAIFU_CLASSES.HYBRID];
    const rareza = getRarezaEmoji(character.price);
    
    let treeMessage = `🌳 *ÁRBOL DE TALENTOS* 🌳\n\n`;
    treeMessage += `${rareza} *${character.name}*\n`;
    treeMessage += `📺 ${character.anime}\n`;
    treeMessage += `⭐ Nivel: ${level}\n`;
    treeMessage += `${classDef.emoji} Clase: ${classDef.name}\n`;
    treeMessage += `💎 Puntos de habilidad: ${abilityPoints.available}\n`;
    treeMessage += `⚡ Habilidades desbloqueadas: ${abilities.length}/${CONFIG.maxAbilitiesPerWaifu}\n\n`;
    
    treeMessage += `🎯 *HABILIDADES DISPONIBLES:*\n\n`;
    
    classDef.abilities.forEach((abilityId, index) => {
      const abilityDef = ABILITY_DEFINITIONS[abilityId];
      if (abilityDef) {
        const unlocked = abilities.find(a => a.ability_id === abilityId);
        const canUnlock = level >= abilityDef.unlockLevel && !unlocked && abilityPoints.available > 0;
        
        treeMessage += `${index + 1}. ${abilityDef.emoji} *${abilityDef.name}*\n`;
        treeMessage += `   📝 ${abilityDef.description}\n`;
        treeMessage += `   📊 Tipo: ${getAbilityTypeName(abilityDef.type)}\n`;
        treeMessage += `   ⚡ Daño: ${abilityDef.damage || 'N/A'}\n`;
        treeMessage += `   💎 Costo de maná: ${abilityDef.manaCost}\n`;
        treeMessage += `   ⏰ Cooldown: ${abilityDef.cooldown / 1000}s\n`;
        treeMessage += `   📅 Desbloqueo: Nivel ${abilityDef.unlockLevel}\n`;
        treeMessage += `   📈 Máximo nivel: ${abilityDef.maxLevel}\n`;
        
        if (unlocked) {
          treeMessage += `   ✅ Desbloqueada (Nivel ${unlocked.level})\n`;
        } else if (canUnlock) {
          treeMessage += `   🔓 Disponible para desbloquear\n`;
        } else if (level < abilityDef.unlockLevel) {
          treeMessage += `   🔒 Requiere nivel ${abilityDef.unlockLevel}\n`;
        } else {
          treeMessage += `   ❌ No hay puntos disponibles\n`;
        }
        
        treeMessage += `\n`;
      }
    });
    
    treeMessage += `💡 *Comandos disponibles:*\n`;
    treeMessage += `• \`.desbloquear_habilidad <waifu> <habilidad>\` - Desbloquear\n`;
    treeMessage += `• \`.mejorar_habilidad <waifu> <habilidad>\` - Mejorar\n`;
    treeMessage += `• \`.usar_habilidad <waifu> <habilidad>\` - Usar\n\n`;
    treeMessage += `📊 *Puntos de habilidad:* 1 por nivel después del nivel ${CONFIG.unlockLevel}`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: treeMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: treeMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
  } catch (error) {
    abilitiesLogger.error('Error al mostrar árbol de talentos:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el árbol de talentos.'
    }, { quoted: m });
  }
}

/**
 * Desbloquea una habilidad
 */
async function unlockAbility(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.desbloquear_habilidad <nombre_waifu> <habilidad>`\n' +
            '*Ejemplo:* `.desbloquear_habilidad Hinata Hyuga sword_strike`'
    }, { quoted: m });
  }
  
  const waifuName = args.slice(0, -1).join(' ');
  const abilityId = args[args.length - 1];
  
  if (!ABILITY_DEFINITIONS[abilityId]) {
    return await sock.sendMessage(chatId, {
      text: `❌ Habilidad no válida.\n\n` +
            '*Habilidades disponibles:* ' + Object.keys(ABILITY_DEFINITIONS).join(', ')
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    const level = await getWaifuLevel(character.id, userId);
    const waifuClass = await getWaifuClass(character.id, userId);
    const abilityDef = ABILITY_DEFINITIONS[abilityId];
    
    // Verificar si la habilidad es compatible con la clase
    if (waifuClass.class !== abilityDef.class && waifuClass.class !== WAIFU_CLASSES.HYBRID) {
      return await sock.sendMessage(chatId, {
        text: `❌ La habilidad "${abilityDef.name}" no es compatible con la clase actual.\n\n` +
              `🎭 *Clase actual:* ${CLASS_DEFINITIONS[waifuClass.class].name}\n` +
              `⚡ *Clase requerida:* ${CLASS_DEFINITIONS[abilityDef.class].name}\n` +
              `💡 *Usa \`.cambiar_clase\` para cambiar de clase`
      }, { quoted: m });
    }
    
    // Verificar nivel requerido
    if (level < abilityDef.unlockLevel) {
      return await sock.sendMessage(chatId, {
        text: `❌ ${character.name} necesita ser nivel ${abilityDef.unlockLevel} para desbloquear esta habilidad.\n\n` +
              `📊 *Nivel actual:* ${level}`
      }, { quoted: m });
    }
    
    // Verificar si ya está desbloqueada
    const existingAbility = await db.get(
      'SELECT * FROM waifu_abilities WHERE character_id = ? AND user_id = ? AND ability_id = ?',
      [character.id, userId, abilityId]
    );
    
    if (existingAbility) {
      return await sock.sendMessage(chatId, {
        text: `❌ La habilidad "${abilityDef.name}" ya está desbloqueada (Nivel ${existingAbility.level}).`
      }, { quoted: m });
    }
    
    // Verificar límite de habilidades
    const currentAbilities = await getWaifuAbilities(character.id, userId);
    if (currentAbilities.length >= CONFIG.maxAbilitiesPerWaifu) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite de ${CONFIG.maxAbilitiesPerWaifu} habilidades.`
      }, { quoted: m });
    }
    
    // Verificar puntos de habilidad
    const abilityPoints = calculateAbilityPoints(level);
    if (abilityPoints.available <= 0) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes puntos de habilidad disponibles.\n\n` +
              `💎 *Puntos disponibles:* ${abilityPoints.available}\n` +
              `📊 *Siguiente punto:* Nivel ${abilityPoints.nextLevel}`
      }, { quoted: m });
    }
    
    // Desbloquear habilidad
    await db.run(
      'INSERT INTO waifu_abilities (character_id, user_id, ability_id, level, unlocked_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)',
      [character.id, userId, abilityId]
    );
    
    const rareza = getRarezaEmoji(character.price);
    
    let unlockMessage = `🔓 *HABILIDAD DESBLOQUEADA* 🔓\n\n`;
    unlockMessage += `${rareza} *${character.name}* ha desbloqueado:\n`;
    unlockMessage += `${abilityDef.emoji} *${abilityDef.name}*\n`;
    unlockMessage += `📝 ${abilityDef.description}\n`;
    unlockMessage += `📊 Tipo: ${getAbilityTypeName(abilityDef.type)}\n`;
    unlockMessage += `⚡ Daño: ${abilityDef.damage || 'N/A'}\n`;
    unlockMessage += `💎 Costo de maná: ${abilityDef.manaCost}\n`;
    unlockMessage += `⏰ Cooldown: ${abilityDef.cooldown / 1000}s\n`;
    unlockMessage += `📈 Nivel actual: 1/${abilityDef.maxLevel}\n\n`;
    
    unlockMessage += `💡 *Usa \`.usar_habilidad <waifu> <habilidad>\` para usarla*\n`;
    unlockMessage += `💎 *Usa \`.mejorar_habilidad <waifu> <habilidad>\` para mejorarla`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: unlockMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: unlockMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
    abilitiesLogger.success(`Habilidad desbloqueada - waifu: ${character.name} - habilidad: ${abilityId}`);
    
  } catch (error) {
    abilitiesLogger.error('Error al desbloquear habilidad:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al desbloquear la habilidad.'
    }, { quoted: m });
  }
}

/**
 * Mejora una habilidad
 */
async function upgradeAbility(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.mejorar_habilidad <nombre_waifu> <habilidad>`'
    }, { quoted: m });
  }
  
  const waifuName = args.slice(0, -1).join(' ');
  const abilityId = args[args.length - 1];
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    const level = await getWaifuLevel(character.id, userId);
    const abilityDef = ABILITY_DEFINITIONS[abilityId];
    
    if (!abilityDef) {
      return await sock.sendMessage(chatId, {
        text: `❌ Habilidad no válida.`
      }, { quoted: m });
    }
    
    // Verificar si la habilidad está desbloqueada
    const existingAbility = await db.get(
      'SELECT * FROM waifu_abilities WHERE character_id = ? AND user_id = ? AND ability_id = ?',
      [character.id, userId, abilityId]
    );
    
    if (!existingAbility) {
      return await sock.sendMessage(chatId, {
        text: `❌ La habilidad "${abilityDef.name}" no está desbloqueada.\n\n` +
              `💡 *Usa \`.desbloquear_habilidad <waifu> <habilidad>\` primero`
      }, { quoted: m });
    }
    
    // Verificar si ya está al máximo
    if (existingAbility.level >= abilityDef.maxLevel) {
      return await sock.sendMessage(chatId, {
        text: `❌ La habilidad "${abilityDef.name}" ya está al nivel máximo (${abilityDef.maxLevel}).`
      }, { quoted: m });
    }
    
    // Verificar puntos de habilidad
    const abilityPoints = calculateAbilityPoints(level);
    if (abilityPoints.available <= 0) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes puntos de habilidad disponibles.\n\n` +
              `💎 *Puntos disponibles:* ${abilityPoints.available}\n` +
              `📊 *Siguiente punto:* Nivel ${abilityPoints.nextLevel}`
      }, { quoted: m });
    }
    
    // Mejorar habilidad
    await db.run(
      'UPDATE waifu_abilities SET level = level + 1, upgraded_at = CURRENT_TIMESTAMP WHERE character_id = ? AND user_id = ? AND ability_id = ?',
      [character.id, userId, abilityId]
    );
    
    const newLevel = existingAbility.level + 1;
    const rareza = getRarezaEmoji(character.price);
    
    let upgradeMessage = `⬆️ *HABILIDAD MEJORADA* ⬆️\n\n`;
    upgradeMessage += `${rareza} *${character.name}* ha mejorado:\n`;
    upgradeMessage += `${abilityDef.emoji} *${abilityDef.name}*\n`;
    upgradeMessage += `📈 Nivel anterior: ${existingAbility.level}\n`;
    upgradeMessage += `📈 Nuevo nivel: ${newLevel}/${abilityDef.maxLevel}\n\n`;
    
    // Calcular mejoras
    const damageBonus = Math.floor((abilityDef.damage || 0) * 0.15 * newLevel);
    const cooldownReduction = Math.floor(abilityDef.cooldown * 0.1 * newLevel);
    const manaCostReduction = Math.floor(abilityDef.manaCost * 0.05 * newLevel);
    
    upgradeMessage += `✨ *Mejoras obtenidas:*\n`;
    if (damageBonus > 0) {
      upgradeMessage += `• Daño: +${damageBonus}\n`;
    }
    if (cooldownReduction > 0) {
      upgradeMessage += `• Cooldown: -${cooldownReduction}ms\n`;
    }
    if (manaCostReduction > 0) {
      upgradeMessage += `• Costo de maná: -${manaCostReduction}\n`;
    }
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: upgradeMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: upgradeMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
    abilitiesLogger.success(`Habilidad mejorada - waifu: ${character.name} - habilidad: ${abilityId} - nivel: ${newLevel}`);
    
  } catch (error) {
    abilitiesLogger.error('Error al mejorar habilidad:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al mejorar la habilidad.'
    }, { quoted: m });
  }
}

/**
 * Usa una habilidad
 */
async function useAbility(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.usar_habilidad <nombre_waifu> <habilidad>`'
    }, { quoted: m });
  }
  
  const waifuName = args.slice(0, -1).join(' ');
  const abilityId = args[args.length - 1];
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    const abilityDef = ABILITY_DEFINITIONS[abilityId];
    
    if (!abilityDef) {
      return await sock.sendMessage(chatId, {
        text: `❌ Habilidad no válida.`
      }, { quoted: m });
    }
    
    // Verificar si la habilidad está desbloqueada
    const existingAbility = await db.get(
      'SELECT * FROM waifu_abilities WHERE character_id = ? AND user_id = ? AND ability_id = ?',
      [character.id, userId, abilityId]
    );
    
    if (!existingAbility) {
      return await sock.sendMessage(chatId, {
        text: `❌ La habilidad "${abilityDef.name}" no está desbloqueada.`
      }, { quoted: m });
    }
    
    // Verificar cooldown
    const lastUse = await db.get(
      'SELECT * FROM ability_usage WHERE character_id = ? AND user_id = ? AND ability_id = ? ORDER BY used_at DESC LIMIT 1',
      [character.id, userId, abilityId]
    );
    
    if (lastUse) {
      const timeSince = Date.now() - new Date(lastUse.used_at).getTime();
      const cooldown = abilityDef.cooldown - Math.floor(abilityDef.cooldown * 0.1 * (existingAbility.level - 1));
      
      if (timeSince < cooldown) {
        const remaining = Math.ceil((cooldown - timeSince) / 1000);
        return await sock.sendMessage(chatId, {
          text: `⏰ La habilidad "${abilityDef.name}" está en cooldown.\n\n` +
                `⏳ Tiempo restante: ${remaining}s`
        }, { quoted: m });
      }
    }
    
    // Usar habilidad
    const result = await executeAbility(character, existingAbility, abilityDef);
    
    // Registrar uso
    await db.run(
      'INSERT INTO ability_usage (character_id, user_id, ability_id, used_at, result) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)',
      [character.id, userId, abilityId, JSON.stringify(result)]
    );
    
    const rareza = getRarezaEmoji(character.price);
    
    let useMessage = `⚡ *HABILIDAD USADA* ⚡\n\n`;
    useMessage += `${rareza} *${character.name}* usó:\n`;
    useMessage += `${abilityDef.emoji} *${abilityDef.name}*\n`;
    useMessage += `📊 Nivel: ${existingAbility.level}\n`;
    useMessage += `📝 ${abilityDef.description}\n\n`;
    
    useMessage += `🎯 *Resultado:*\n`;
    if (result.damage) {
      useMessage += `• Daño causado: ${result.damage}\n`;
    }
    if (result.healing) {
      useMessage += `• Sanación: ${result.healing}\n`;
    }
    if (result.buffs) {
      useMessage += `• Buffs aplicados: ${Object.keys(result.buffs).join(', ')}\n`;
    }
    
    useMessage += `\n⏰ *Cooldown:* ${abilityDef.cooldown / 1000}s\n`;
    useMessage += `💎 *Costo de maná:* ${abilityDef.manaCost}`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: useMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: useMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
    abilitiesLogger.success(`Habilidad usada - waifu: ${character.name} - habilidad: ${abilityId}`);
    
  } catch (error) {
    abilitiesLogger.error('Error al usar habilidad:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al usar la habilidad.'
    }, { quoted: m });
  }
}

/**
 * Muestra estadísticas de combate
 */
async function showCombatStats(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const waifuName = args.join(' ');
  
  if (!waifuName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la waifu.\n\n' +
            '💡 *Uso:* `.stats_combate <nombre_waifu>`'
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    const level = await getWaifuLevel(character.id, userId);
    const stats = await getWaifuStats(character.id, userId);
    const waifuClass = await getWaifuClass(character.id, userId);
    const abilities = await getWaifuAbilities(character.id, userId);
    
    const classDef = CLASS_DEFINITIONS[waifuClass.class] || CLASS_DEFINITIONS[WAIFU_CLASSES.HYBRID];
    const rareza = getRarezaEmoji(character.price);
    
    let statsMessage = `📊 *ESTADÍSTICAS DE COMBATE* 📊\n\n`;
    statsMessage += `${rareza} *${character.name}*\n`;
    statsMessage += `📺 ${character.anime}\n`;
    statsMessage += `⭐ Nivel: ${level}\n`;
    statsMessage += `${classDef.emoji} Clase: ${classDef.name}\n\n`;
    
    statsMessage += `📈 *ESTADÍSTICAS BASE:*\n`;
    const combatStats = calculateCombatStats(waifuClass, level, stats);
    Object.entries(combatStats).forEach(([stat, value]) => {
      const statName = getStatName(stat);
      statsMessage += `• ${statName}: ${value}\n`;
    });
    
    statsMessage += `\n⚡ *HABILIDADES ACTIVAS:*\n`;
    if (abilities.length === 0) {
      statsMessage += `📦 Ninguna habilidad desbloqueada\n`;
    } else {
      abilities.forEach((ability, index) => {
        const abilityDef = ABILITY_DEFINITIONS[ability.ability_id];
        if (abilityDef) {
          const damage = abilityDef.damage ? Math.floor(abilityDef.damage * (1 + 0.15 * (ability.level - 1))) : 'N/A';
          const cooldown = abilityDef.cooldown - Math.floor(abilityDef.cooldown * 0.1 * (ability.level - 1));
          statsMessage += `${index + 1}. ${abilityDef.emoji} ${abilityDef.name}\n`;
          statsMessage += `   📊 Nivel: ${ability.level}\n`;
          statsMessage += `   ⚡ Daño: ${damage}\n`;
          statsMessage += `   ⏰ Cooldown: ${cooldown / 1000}s\n`;
          statsMessage += `   💎 Maná: ${abilityDef.manaCost}\n\n`;
        }
      });
    }
    
    statsMessage += `🎯 *POTENCIAL TOTAL:*\n`;
    const totalPower = calculateTotalPower(combatStats, abilities);
    statsMessage += `• Poder de combate: ${totalPower}\n`;
    statsMessage += `• Calificación: ${getPowerRating(totalPower)}\n\n`;
    
    statsMessage += `💡 *Mejora tus estadísticas:*\n`;
    statsMessage += `• Sube de nivel con interacciones\n`;
    statsMessage += `• Desbloquea nuevas habilidades\n`;
    statsMessage += `• Mejora las habilidades existentes`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: statsMessage,
        mentions: [userId]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: statsMessage, 
        mentions: [userId] 
      }, { quoted: m });
    }
    
  } catch (error) {
    abilitiesLogger.error('Error al mostrar estadísticas de combate:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las estadísticas de combate.'
    }, { quoted: m });
  }
}

/**
 * Funciones auxiliares
 */
async function getUserWaifus(userId) {
  try {
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    return characters.filter(c => claimedIds.includes(c.id));
  } catch (error) {
    abilitiesLogger.error('Error al obtener waifus de usuario:', error);
    return [];
  }
}

async function getWaifuClass(characterId, userId) {
  try {
    const waifuClass = await db.get(
      'SELECT * FROM waifu_classes WHERE character_id = ? AND user_id = ?',
      [characterId, userId]
    );
    
    if (!waifuClass) {
      // Asignar clase híbrida por defecto
      await db.run(
        'INSERT INTO waifu_classes (character_id, user_id, class, changed_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [characterId, userId, WAIFU_CLASSES.HYBRID]
      );
      return { class: WAIFU_CLASSES.HYBRID };
    }
    
    return waifuClass;
  } catch (error) {
    abilitiesLogger.error('Error al obtener clase de waifu:', error);
    return { class: WAIFU_CLASSES.HYBRID };
  }
}

async function getWaifuAbilities(characterId, userId) {
  try {
    const abilities = await db.all(
      'SELECT * FROM waifu_abilities WHERE character_id = ? AND user_id = ?',
      [characterId, userId]
    );
    return abilities;
  } catch (error) {
    abilitiesLogger.error('Error al obtener habilidades de waifu:', error);
    return [];
  }
}

function calculateCombatStats(waifuClass, level, stats) {
  const classDef = CLASS_DEFINITIONS[waifuClass.class] || CLASS_DEFINITIONS[WAIFU_CLASSES.HYBRID];
  const levelMultiplier = 1 + (level - 1) * 0.1;
  
  const combatStats = {
    hp: Math.floor(100 * levelMultiplier),
    attack: Math.floor(50 * classDef.stats.strength * levelMultiplier),
    defense: Math.floor(30 * classDef.stats.defense * levelMultiplier),
    magic: Math.floor(40 * classDef.stats.magic * levelMultiplier),
    speed: Math.floor(60 * classDef.stats.speed * levelMultiplier),
    mana: Math.floor(50 * levelMultiplier),
    critical: Math.floor(10 + level * 2),
    dodge: Math.floor(5 + level)
  };
  
  // Aplicar bonificaciones de stats
  if (stats.affection > 50) {
    combatStats.attack = Math.floor(combatStats.attack * 1.2);
  }
  if (stats.happiness > 50) {
    combatStats.speed = Math.floor(combatStats.speed * 1.1);
  }
  
  return combatStats;
}

function calculateAbilityPoints(level) {
  if (level < CONFIG.unlockLevel) {
    return { available: 0, used: 0, nextLevel: CONFIG.unlockLevel };
  }
  
  const totalPoints = (level - CONFIG.unlockLevel + 1) * CONFIG.abilityPointsPerLevel;
  const usedPoints = 0; // Esto debería calcularse desde la base de datos
  
  return {
    available: totalPoints - usedPoints,
    used: usedPoints,
    total: totalPoints,
    nextLevel: level + 1
  };
}

function calculateTotalPower(combatStats, abilities) {
  let power = 0;
  
  // Calcular poder base
  power += combatStats.hp * 0.5;
  power += combatStats.attack * 2;
  power += combatStats.defense * 1.5;
  power += combatStats.magic * 1.8;
  power += combatStats.speed * 1.2;
  power += combatStats.critical * 3;
  power += combatStats.dodge * 2;
  
  // Añadir poder de habilidades
  abilities.forEach(ability => {
    const abilityDef = ABILITY_DEFINITIONS[ability.ability_id];
    if (abilityDef) {
      power += (abilityDef.damage || 0) * ability.level;
      power += abilityDef.maxLevel * 10;
    }
  });
  
  return Math.floor(power);
}

function getPowerRating(power) {
  if (power < 500) return '⭐ Novato';
  if (power < 1000) return '⭐⭐ Aprendiz';
  if (power < 2000) return '⭐⭐⭐ Experto';
  if (power < 3500) return '⭐⭐⭐⭐ Maestro';
  if (power < 5000) return '⭐⭐⭐⭐⭐ Leyenda';
  return '👑 Divino';
}

function getStatName(stat) {
  const statNames = {
    hp: 'HP',
    attack: 'Ataque',
    defense: 'Defensa',
    magic: 'Magia',
    speed: 'Velocidad',
    mana: 'Maná',
    critical: 'Crítico',
    dodge: 'Esquiva'
  };
  return statNames[stat] || stat;
}

function getAbilityTypeName(type) {
  const typeNames = {
    active: 'Activa',
    passive: 'Pasiva',
    ultimate: 'Definitiva',
    buff: 'Buff',
    debuff: 'Debuff'
  };
  return typeNames[type] || type;
}

async function executeAbility(character, ability, abilityDef) {
  const result = {
    damage: 0,
    healing: 0,
    buffs: {},
    success: true
  };
  
  // Calcular efectos según el nivel
  const levelMultiplier = 1 + 0.15 * (ability.level - 1);
  
  if (abilityDef.damage) {
    result.damage = Math.floor(abilityDef.damage * levelMultiplier);
  }
  
  if (abilityDef.healing) {
    result.healing = Math.floor(abilityDef.healing * levelMultiplier);
  }
  
  if (abilityDef.buff) {
    result.buffs = abilityDef.buff;
  }
  
  return result;
}

// Inicializar tablas de habilidades
async function initializeAbilityTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS waifu_classes (
        character_id INTEGER,
        user_id TEXT,
        class TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (character_id, user_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS waifu_abilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        user_id TEXT,
        ability_id TEXT,
        level INTEGER DEFAULT 1,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        upgraded_at DATETIME,
        UNIQUE(character_id, user_id, ability_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS ability_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        user_id TEXT,
        ability_id TEXT,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        result TEXT
      )
    `);
    
    abilitiesLogger.success('Tablas de habilidades inicializadas');
  } catch (error) {
    abilitiesLogger.error('Error al inicializar tablas de habilidades:', error);
  }
}

// Exportar configuración y funciones necesarias
export const command = ['.habilidades', '.clase', '.cambiar_clase', '.arbol_talentos', '.desbloquear_habilidad', '.mejorar_habilidad', '.usar_habilidad', '.stats_combate'];
export const alias = ['.abilities', '.class', '.change_class', '.talent_tree', '.unlock_ability', '.upgrade_ability', '.use_ability', '.combat_stats'];
export const description = 'Sistema de habilidades especiales y clases de waifus';

// Inicializar sistema
initializeAbilityTables();
loadCharacters();

export { CONFIG, abilitiesLogger, WAIFU_CLASSES, ABILITY_TYPES, CLASS_DEFINITIONS, ABILITY_DEFINITIONS };
