/**
 * @file Plugin RPG Minigames - Sistema de minijuegos RPG con aventuras de texto
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de minijuegos RPG con aventuras interactivas, clases, combate e integración con waifus
 */

import { db } from './db.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  maxLevel: 50,
  baseHP: 100,
  baseMP: 50,
  adventureCooldown: 30 * 60 * 1000, // 30 minutos
  combatCooldown: 10 * 60 * 1000, // 10 minutos
  maxPartySize: 4,
  expMultiplier: 1.0,
  goldMultiplier: 1.0
};

// Sistema de logging
const rpgLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[RPG] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[RPG] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[RPG] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[RPG] ❌ ${message}`)
};

// Clases de personaje RPG
const RPG_CLASSES = {
  WARRIOR: {
    id: 'warrior',
    name: 'Guerrero',
    emoji: '⚔️',
    description: 'Maestro del combate cuerpo a cuerpo',
    baseStats: { hp: 120, mp: 30, attack: 15, defense: 12, magic: 5, speed: 8 },
    growth: { hp: 12, mp: 3, attack: 2, defense: 2, magic: 1, speed: 1 },
    skills: ['golpe_fuerte', 'proteger', 'furia_berserker']
  },
  MAGE: {
    id: 'mage',
    name: 'Mago',
    emoji: '🔮',
    description: 'Maestro de la magia elemental',
    baseStats: { hp: 70, mp: 100, attack: 5, defense: 6, magic: 18, speed: 10 },
    growth: { hp: 7, mp: 10, attack: 1, defense: 1, magic: 2, speed: 1 },
    skills: ['bola_fuego', 'escudo_magico', 'tormenta_hielo']
  },
  HEALER: {
    id: 'healer',
    name: 'Sanador',
    emoji: '💚',
    description: 'Maestro de la curación y apoyo',
    baseStats: { hp: 80, mp: 90, attack: 6, defense: 8, magic: 15, speed: 9 },
    growth: { hp: 8, mp: 9, attack: 1, defense: 1, magic: 2, speed: 1 },
    skills: ['curar', 'bendicion', 'resurreccion']
  },
  ROGUE: {
    id: 'rogue',
    name: 'Pícaro',
    emoji: '🗡️',
    description: 'Maestro del sigilo y críticos',
    baseStats: { hp: 85, mp: 50, attack: 12, defense: 7, magic: 8, speed: 15 },
    growth: { hp: 8, mp: 5, attack: 2, defense: 1, magic: 1, speed: 2 },
    skills: ['golpe_critico', 'esconderse', 'robar']
  },
  RANGER: {
    id: 'ranger',
    name: 'Arquero',
    emoji: '🏹',
    description: 'Maestro del combate a distancia',
    baseStats: { hp: 90, mp: 60, attack: 14, defense: 8, magic: 7, speed: 12 },
    growth: { hp: 9, mp: 6, attack: 2, defense: 1, magic: 1, speed: 1 },
    skills: ['disparo_preciso', 'trampa', 'rastrear']
  },
  PALADIN: {
    id: 'paladin',
    name: 'Paladín',
    emoji: '🛡️',
    description: 'Guerrero sagrado con magia divina',
    baseStats: { hp: 110, mp: 70, attack: 12, defense: 14, magic: 10, speed: 7 },
    growth: { hp: 11, mp: 7, attack: 2, defense: 2, magic: 1, speed: 1 },
    skills: ['golpe_sagrado', 'aura_proteccion', 'juicio_divino']
  }
};

// Aventuras de texto interactivas
const ADVENTURES = {
  FOREST_MYSTERY: {
    id: 'forest_mystery',
    name: 'Misterio del Bosque',
    emoji: '🌲',
    difficulty: 'easy',
    minLevel: 1,
    description: 'Investiga extrañas desapariciones en el bosque antiguo',
    type: 'investigation',
    rewards: { exp: 100, gold: 50, items: ['pocion_curacion'] },
    stages: [
      {
        id: 'entrance',
        text: 'Te encuentras en la entrada del Bosque Antiguo. Los árboles susurran misterios y el camino se divide en tres direcciones.',
        choices: [
          { text: 'Tomar el camino iluminado', next: 'sunny_path', requirement: null },
          { text: 'Explorar la senda oscura', next: 'dark_path', requirement: { stat: 'courage', value: 5 } },
          { text: 'Buscar pistas en el área', next: 'investigate', skill: 'perception' }
        ]
      },
      {
        id: 'sunny_path',
        text: 'El camino iluminado te lleva a un claro donde encuentras un herido pidiendo ayuda.',
        choices: [
          { text: 'Ayudar al herido', next: 'help_injured', reward: { exp: 20, reputation: 10 } },
          { text: 'Ignorar y continuar', next: 'continue_path', penalty: { reputation: -5 } }
        ]
      },
      {
        id: 'dark_path',
        text: 'La senda oscura está llena de criaturas sombrías. Un lobo gigante bloquea tu camino.',
        choices: [
          { text: 'Combatir', next: 'combat_wolf', type: 'combat', enemy: 'giant_wolf' },
          { text: 'Intentar distraerlo', next: 'distract_wolf', skill: 'stealth' },
          { text: 'Huir', next: 'flee_path', penalty: { exp: -10 } }
        ]
      }
    ]
  },
  DRAGON_LAIR: {
    id: 'dragon_lair',
    name: 'Guarida del Dragón',
    emoji: '🐉',
    difficulty: 'hard',
    minLevel: 20,
    description: 'Enfrenta al dragón antiguo que aterroriza el reino',
    type: 'boss',
    rewards: { exp: 500, gold: 300, items: ['escama_dragón', 'espada_legendaria'] },
    stages: [
      {
        id: 'entrance',
        text: 'Las puertas de la guarida del dragón se ante ti. El calor es intenso y escuchas rugidos distantes.',
        choices: [
          { text: 'Entrar con valentía', next: 'main_hall', requirement: { stat: 'courage', value: 15 } },
          { text: 'Preparar estrategia', next: 'prepare_strategy', skill: 'tactics' },
          { text: 'Buscar entrada alternativa', next: 'secret_entrance', skill: 'perception' }
        ]
      },
      {
        id: 'main_hall',
        text: 'El gran salón está lleno de tesoros, pero el dragón duerme en el centro.',
        choices: [
          { text: 'Atacar mientras duerme', next: 'sneak_attack', skill: 'stealth' },
          { text: 'Despertarlo con honor', next: 'honorable_combat', reward: { reputation: 20 } },
          { text: 'Robar y huir', next: 'steal_treasure', skill: 'thievery' }
        ]
      }
    ]
  },
  HAUNTED_CASTLE: {
    id: 'haunted_castle',
    name: 'Castillo Embrujado',
    emoji: '🏰',
    difficulty: 'medium',
    minLevel: 10,
    description: 'Explora el castillo maldito y descubre su secreto',
    type: 'exploration',
    rewards: { exp: 250, gold: 150, items: ['amuleto_fantasma'] },
    stages: [
      {
        id: 'gates',
        text: 'Las puertas del castillo se abren solas. Un frío recorre tu espina.',
        choices: [
          { text: 'Entrar decididamente', next: 'courtyard', requirement: { stat: 'courage', value: 8 } },
          { text: 'Observar desde fuera', next: 'observe_outside', skill: 'perception' }
        ]
      }
    ]
  }
};

// Enemigos para combate
const ENEMIES = {
  GIANT_WOLF: {
    id: 'giant_wolf',
    name: 'Lobo Gigante',
    emoji: '🐺',
    level: 5,
    stats: { hp: 80, attack: 15, defense: 8, speed: 18 },
    skills: ['mordisco', 'aullido'],
    rewards: { exp: 50, gold: 25 }
  },
  DRAGON: {
    id: 'dragon',
    name: 'Dragón Antiguo',
    emoji: '🐉',
    level: 25,
    stats: { hp: 500, attack: 40, defense: 25, speed: 15 },
    skills: ['aliento_fuego', 'garras', 'cola_dragón'],
    rewards: { exp: 300, gold: 200 }
  },
  GHOST: {
    id: 'ghost',
    name: 'Fantasma',
    emoji: '👻',
    level: 12,
    stats: { hp: 60, attack: 20, defense: 5, speed: 20 },
    skills: ['toque_letal', 'desvanecer'],
    rewards: { exp: 80, gold: 40 }
  }
};

// Almacenamiento de juegos activos
const activeAdventures = new Map();
const userCooldowns = new Map();
const rpgCharacters = new Map();

// Funciones auxiliares
function calculateStats(baseStats, growth, level) {
  const stats = { ...baseStats };
  Object.keys(growth).forEach(stat => {
    stats[stat] = baseStats[stat] + (growth[stat] * (level - 1));
  });
  return stats;
}

async function getUserRPGCharacter(userId) {
  try {
    const character = await db.get(
      'SELECT * FROM rpg_characters WHERE user_id = ?',
      [userId]
    );
    
    if (!character) {
      return null;
    }
    
    const classInfo = RPG_CLASSES[character.class.toUpperCase()];
    const stats = calculateStats(classInfo.baseStats, classInfo.growth, character.level);
    
    return {
      ...character,
      stats,
      classInfo
    };
  } catch (error) {
    rpgLogger.error('Error al obtener personaje RPG:', error);
    return null;
  }
}

async function createRPGCharacter(userId, className, characterName) {
  try {
    const classInfo = RPG_CLASSES[className.toUpperCase()];
    if (!classInfo) {
      return { success: false, message: 'Clase no válida' };
    }
    
    const stats = calculateStats(classInfo.baseStats, classInfo.growth, 1);
    
    await db.run(`
      INSERT INTO rpg_characters (user_id, name, class, level, hp, mp, exp, gold, inventory, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 100, '[]', CURRENT_TIMESTAMP)
    `, [userId, characterName, className, stats.hp, stats.mp]);
    
    return { success: true, message: `Personaje ${characterName} creado como ${classInfo.emoji} ${classInfo.name}` };
  } catch (error) {
    rpgLogger.error('Error al crear personaje RPG:', error);
    return { success: false, message: 'Error al crear personaje' };
  }
}

async function initializeRPGTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS rpg_characters (
        user_id TEXT PRIMARY KEY,
        name TEXT,
        class TEXT,
        level INTEGER DEFAULT 1,
        hp INTEGER DEFAULT 100,
        mp INTEGER DEFAULT 50,
        exp INTEGER DEFAULT 0,
        gold INTEGER DEFAULT 100,
        inventory TEXT DEFAULT '[]',
        skills TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_played DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS rpg_adventures (
        user_id TEXT,
        adventure_id TEXT,
        current_stage TEXT,
        progress TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        PRIMARY KEY (user_id, adventure_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS rpg_combat_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        enemy_id TEXT,
        result TEXT,
        exp_gained INTEGER,
        gold_gained INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    rpgLogger.success('Tablas RPG inicializadas');
  } catch (error) {
    rpgLogger.error('Error al inicializar tablas RPG:', error);
  }
}

async function showRPGMenu(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  const character = await getUserRPGCharacter(userId);
  
  let menuText = `⚔️ *SISTEMA RPG* ⚔️\n\n`;
  
  if (!character) {
    menuText += `📝 *Crea tu personaje para comenzar*\n\n`;
    menuText += `💡 *Clases disponibles:*\n\n`;
    
    Object.values(RPG_CLASSES).forEach(cls => {
      menuText += `${cls.emoji} *${cls.name}*\n`;
      menuText += `   ${cls.description}\n`;
      menuText += `   HP: ${cls.baseStats.hp} | MP: ${cls.baseStats.mp}\n`;
      menuText += `   ATK: ${cls.baseStats.attack} | DEF: ${cls.baseStats.defense}\n\n`;
    });
    
    menuText += `💡 *Usa .rpg_crear [clase] [nombre] para crear tu personaje*`;
  } else {
    menuText += `👤 *${character.name}* - ${character.classInfo.emoji} ${character.classInfo.name}\n`;
    menuText += `📊 Nivel: ${character.level} | EXP: ${character.exp}\n`;
    menuText += `❤️ HP: ${character.stats.hp}/${character.stats.hp}\n`;
    menuText += `💙 MP: ${character.stats.mp}/${character.stats.mp}\n`;
    menuText += `💰 Oro: ${character.gold}\n\n`;
    
    menuText += `📋 *Comandos disponibles:*\n`;
    menuText += `• .rpg_aventuras - Ver aventuras disponibles\n`;
    menuText += `• .rpg_status - Ver estado completo\n`;
    menuText += `• .rpg_inventario - Ver inventario\n`;
    menuText += `• .rpg_combate - Iniciar combate\n`;
  }
  
  await sock.sendMessage(chatId, { text: menuText }, { quoted: m });
}

async function createCharacter(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  
  const args = text.trim().split(' ');
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Uso incorrecto*\n\n💡 .rpg_crear [clase] [nombre]\n\n💡 Clases: warrior, mage, healer, rogue, ranger, paladin'
    }, { quoted: m });
  }
  
  const className = args[0];
  const characterName = args.slice(1).join(' ');
  
  const existing = await getUserRPGCharacter(userId);
  if (existing) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Ya tienes un personaje RPG*\n\n💡 Usa .rpg_status para ver tu personaje'
    }, { quoted: m });
  }
  
  const result = await createRPGCharacter(userId, className, characterName);
  
  if (result.success) {
    await sock.sendMessage(chatId, {
      text: `✅ *${result.message}*\n\n💡 Usa .rpg_status para ver tu personaje`
    }, { quoted: m });
  } else {
    await sock.sendMessage(chatId, {
      text: `❌ *${result.message}*`
    }, { quoted: m });
  }
}

async function showCharacterStatus(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  const character = await getUserRPGCharacter(userId);
  if (!character) {
    return await sock.sendMessage(chatId, {
      text: '❌ *No tienes un personaje RPG*\n\n💡 Usa .rpg_crear [clase] [nombre] para crear uno'
    }, { quoted: m });
  }
  
  let statusText = `👤 *FICHA DE PERSONAJE* 👤\n\n`;
  statusText += `📛 *Nombre:* ${character.name}\n`;
  statusText += `${character.classInfo.emoji} *Clase:* ${character.classInfo.name}\n`;
  statusText += `📊 *Nivel:* ${character.level}\n`;
  statusText += `✨ *EXP:* ${character.exp}/${character.level * 100}\n\n`;
  
  statusText += `📈 *Estadísticas:*\n`;
  statusText += `❤️ HP: ${character.stats.hp}\n`;
  statusText += `💙 MP: ${character.stats.mp}\n`;
  statusText += `⚔️ ATK: ${character.stats.attack}\n`;
  statusText += `🛡️ DEF: ${character.stats.defense}\n`;
  statusText += `🔮 MAG: ${character.stats.magic}\n`;
  statusText += `💨 SPD: ${character.stats.speed}\n\n`;
  
  statusText += `💰 *Oro:* ${character.gold}\n`;
  statusText += `📅 *Creado:* ${new Date(character.created_at).toLocaleDateString()}`;
  
  await sock.sendMessage(chatId, { text: statusText }, { quoted: m });
}

async function showAdventures(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  const character = await getUserRPGCharacter(userId);
  if (!character) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Necesitas un personaje RPG para aventuras*'
    }, { quoted: m });
  }
  
  let adventuresText = `🗺️ *AVENTURAS DISPONIBLES* 🗺️\n\n`;
  adventuresText += `👤 *Nivel actual:* ${character.level}\n\n`;
  
  Object.values(ADVENTURES).forEach(adventure => {
    const canPlay = character.level >= adventure.minLevel;
    const status = canPlay ? '✅' : '🔒';
    const difficultyEmoji = adventure.difficulty === 'easy' ? '🟢' : 
                          adventure.difficulty === 'medium' ? '🟡' : '🔴';
    
    adventuresText += `${status} ${adventure.emoji} *${adventure.name}*\n`;
    adventuresText += `   ${difficultyEmoji} Dificultad: ${adventure.difficulty}\n`;
    adventuresText += `   📊 Nivel mínimo: ${adventure.minLevel}\n`;
    adventuresText += `   📝 ${adventure.description}\n`;
    adventuresText += `   🎁 EXP: ${adventure.rewards.exp} | Oro: ${adventure.rewards.gold}\n\n`;
  });
  
  adventuresText += `💡 *Usa .rpg_iniciar [aventura] para comenzar una aventura`;
  
  await sock.sendMessage(chatId, { text: adventuresText }, { quoted: m });
}

async function startAdventure(sock, m, userId, adventureId) {
  const chatId = m.key.remoteJid;
  
  const character = await getUserRPGCharacter(userId);
  if (!character) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Necesitas un personaje RPG para aventuras*'
    }, { quoted: m });
  }
  
  const adventure = ADVENTURES[adventureId.toUpperCase()];
  if (!adventure) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Aventura no encontrada*\n\n💡 Usa .rpg_aventuras para ver las disponibles'
    }, { quoted: m });
  }
  
  if (character.level < adventure.minLevel) {
    return await sock.sendMessage(chatId, {
      text: `❌ *Nivel insuficiente*\n\n💡 Necesitas nivel ${adventure.minLevel} para esta aventura`
    }, { quoted: m });
  }
  
  // Verificar cooldown
  const lastAdventure = userCooldowns.get(userId);
  if (lastAdventure && Date.now() - lastAdventure < CONFIG.adventureCooldown) {
    const remaining = Math.ceil((CONFIG.adventureCooldown - (Date.now() - lastAdventure)) / 1000 / 60);
    return await sock.sendMessage(chatId, {
      text: `⏱️ *Debes esperar ${remaining} minutos antes de otra aventura*`
    }, { quoted: m });
  }
  
  // Iniciar aventura
  const gameId = `${userId}_${Date.now()}`;
  const game = {
    id: gameId,
    userId,
    adventure,
    currentStage: adventure.stages[0],
    character,
    startTime: Date.now()
  };
  
  activeAdventures.set(gameId, game);
  userCooldowns.set(userId, Date.now());
  
  // Mostrar primera etapa
  await showAdventureStage(sock, m, game);
}

async function showAdventureStage(sock, m, game) {
  const chatId = m.key.remoteJid;
  const stage = game.currentStage;
  
  let stageText = `📖 *${game.adventure.emoji} ${game.adventure.name}* 📖\n\n`;
  stageText += `${stage.text}\n\n`;
  stageText += `🔮 *Elige tu acción:*\n\n`;
  
  stage.choices.forEach((choice, index) => {
    let requirementText = '';
    if (choice.requirement) {
      requirementText = ` [Req: ${choice.requirement.stat} ${choice.requirement.value}]`;
    }
    if (choice.skill) {
      requirementText = ` [Habilidad: ${choice.skill}]`;
    }
    
    stageText += `${index + 1}. ${choice.text}${requirementText}\n`;
  });
  
  stageText += `\n💡 *Responde con el número de tu elección*`;
  
  await sock.sendMessage(chatId, { text: stageText }, { quoted: m });
}

async function handleAdventureChoice(sock, m, userId, choiceNumber) {
  const chatId = m.key.remoteJid;
  
  // Buscar aventura activa del usuario
  let game = null;
  for (const [gameId, activeGame] of activeAdventures) {
    if (activeGame.userId === userId) {
      game = activeGame;
      break;
    }
  }
  
  if (!game) {
    return await sock.sendMessage(chatId, {
      text: '❌ *No tienes ninguna aventura activa*\n\n💡 Usa .rpg_iniciar [aventura] para comenzar'
    }, { quoted: m });
  }
  
  const stage = game.currentStage;
  const choice = stage.choices[choiceNumber - 1];
  
  if (!choice) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Opción no válida*\n\n💡 Elige un número entre 1 y ' + stage.choices.length
    }, { quoted: m });
  }
  
  // Verificar requisitos
  if (choice.requirement) {
    const statValue = game.character.stats[choice.requirement.stat] || 0;
    if (statValue < choice.requirement.value) {
      return await sock.sendMessage(chatId, {
        text: `❌ *No cumples los requisitos*\n\n💡 Necesitas ${choice.requirement.stat} ${choice.requirement.value}`
      }, { quoted: m });
    }
  }
  
  // Procesar elección
  let resultText = '';
  
  if (choice.reward) {
    // Otorgar recompensas
    if (choice.reward.exp) {
      await addCharacterExp(userId, choice.reward.exp);
      resultText += `✨ +${choice.reward.exp} EXP\n`;
    }
    if (choice.reward.gold) {
      await addCharacterGold(userId, choice.reward.gold);
      resultText += `💰 +${choice.reward.gold} Oro\n`;
    }
  }
  
  if (choice.penalty) {
    // Aplicar penalizaciones
    if (choice.penalty.exp) {
      await addCharacterExp(userId, choice.penalty.exp);
      resultText += `💔 ${choice.penalty.exp} EXP\n`;
    }
  }
  
  if (choice.type === 'combat') {
    // Iniciar combate
    return await startCombat(sock, m, userId, choice.enemy);
  }
  
  if (choice.next) {
    // Buscar siguiente etapa
    const nextStage = game.adventure.stages.find(s => s.id === choice.next);
    if (nextStage) {
      game.currentStage = nextStage;
      
      let responseText = resultText ? `🎁 *Recompensas:*\n${resultText}\n\n` : '';
      responseText += `➡️ *Continuando a la siguiente etapa...*`;
      
      await sock.sendMessage(chatId, { text: responseText }, { quoted: m });
      setTimeout(() => showAdventureStage(sock, m, game), 2000);
    } else {
      // Fin de la aventura
      await completeAdventure(sock, m, game);
    }
  }
}

async function startCombat(sock, m, userId, enemyId) {
  const chatId = m.key.remoteJid;
  
  const character = await getUserRPGCharacter(userId);
  const enemy = ENEMIES[enemyId.toUpperCase()];
  
  if (!enemy) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Enemigo no encontrado*'
    }, { quoted: m });
  }
  
  let combatText = `⚔️ *¡COMBATE!* ⚔️\n\n`;
  combatText += `👤 *${character.name} (Nvl ${character.level})*\n`;
  combatText += `❤️ HP: ${character.stats.hp}\n`;
  combatText += `⚔️ ATK: ${character.stats.attack}\n\n`;
  combatText += `${enemy.emoji} *${enemy.name} (Nvl ${enemy.level})*\n`;
  combatText += `❤️ HP: ${enemy.stats.hp}\n`;
  combatText += `⚔️ ATK: ${enemy.stats.attack}\n\n`;
  combatText += `🎯 *Acciones:*\n`;
  combatText += `1. Atacar\n`;
  combatText += `2. Habilidad especial\n`;
  combatText += `3. Defender\n`;
  combatText += `4. Huir`;
  
  await sock.sendMessage(chatId, { text: combatText }, { quoted: m });
  
  // Aquí se implementaría la lógica completa de combate
  // Por simplicidad, simulamos un resultado
  const playerRoll = Math.random() * character.stats.attack;
  const enemyRoll = Math.random() * enemy.stats.attack;
  
  setTimeout(async () => {
    if (playerRoll > enemyRoll) {
      const rewards = enemy.rewards;
      await addCharacterExp(userId, rewards.exp);
      await addCharacterGold(userId, rewards.gold);
      
      let winText = `🎉 *¡VICTORIA!* 🎉\n\n`;
      winText += `Has derrotado al ${enemy.emoji} ${enemy.name}!\n\n`;
      winText += `🎁 *Recompensas:*\n`;
      winText += `✨ +${rewards.exp} EXP\n`;
      winText += `💰 +${rewards.gold} Oro\n`;
      
      await sock.sendMessage(chatId, { text: winText }, { quoted: m });
    } else {
      let loseText = `💀 *DERROTA* 💀\n\n`;
      loseText += `El ${enemy.emoji} ${enemy.name} te ha derrotado...\n`;
      loseText += `💔 Pierdes 10 EXP`;
      
      await addCharacterExp(userId, -10);
      await sock.sendMessage(chatId, { text: loseText }, { quoted: m });
    }
  }, 3000);
}

async function completeAdventure(sock, m, game) {
  const chatId = m.key.remoteJid;
  const rewards = game.adventure.rewards;
  
  await addCharacterExp(game.userId, rewards.exp);
  await addCharacterGold(game.userId, rewards.gold);
  
  let completeText = `🎉 *¡AVENTURA COMPLETADA!* 🎉\n\n`;
  completeText += `${game.adventure.emoji} ${game.adventure.name}\n\n`;
  completeText += `🎁 *Recompensas:*\n`;
  completeText += `✨ +${rewards.exp} EXP\n`;
  completeText += `💰 +${rewards.gold} Oro\n`;
  
  if (rewards.items && rewards.items.length > 0) {
    completeText += `🎦 Items: ${rewards.items.join(', ')}\n`;
  }
  
  await sock.sendMessage(chatId, { text: completeText }, { quoted: m });
  
  // Eliminar aventura activa
  activeAdventures.delete(game.id);
}

async function addCharacterExp(userId, exp) {
  try {
    await db.run('UPDATE rpg_characters SET exp = exp + ? WHERE user_id = ?', [exp, userId]);
    
    // Verificar si subió de nivel
    const character = await getUserRPGCharacter(userId);
    const expNeeded = character.level * 100;
    
    if (character.exp >= expNeeded && character.level < CONFIG.maxLevel) {
      const newLevel = character.level + 1;
      const classInfo = RPG_CLASSES[character.class.toUpperCase()];
      const newStats = calculateStats(classInfo.baseStats, classInfo.growth, newLevel);
      
      await db.run(`
        UPDATE rpg_characters 
        SET level = ?, exp = exp - ?, hp = ?, mp = ?
        WHERE user_id = ?
      `, [newLevel, expNeeded, newStats.hp, newStats.mp, userId]);
      
      return { leveledUp: true, newLevel };
    }
    
    return { leveledUp: false };
  } catch (error) {
    rpgLogger.error('Error al añadir EXP:', error);
    return { leveledUp: false };
  }
}

async function addCharacterGold(userId, gold) {
  try {
    await db.run('UPDATE rpg_characters SET gold = gold + ? WHERE user_id = ?', [gold, userId]);
    return true;
  } catch (error) {
    rpgLogger.error('Error al añadir oro:', error);
    return false;
  }
}

// Función principal
export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  try {
    switch (command) {
      case '.rpg':
      case '.rpg_menu':
        await showRPGMenu(sock, m);
        break;
        
      case '.rpg_crear':
        await createCharacter(sock, m, userId, text);
        break;
        
      case '.rpg_status':
        await showCharacterStatus(sock, m, userId);
        break;
        
      case '.rpg_aventuras':
        await showAdventures(sock, m, userId);
        break;
        
      case '.rpg_iniciar':
        await startAdventure(sock, m, userId, text.trim());
        break;
        
      case '.rpg_combate':
        await startCombat(sock, m, userId, text.trim());
        break;
        
      default:
        // Manejar respuestas numéricas en aventuras activas
        if (/^\d+$/.test(text.trim())) {
          await handleAdventureChoice(sock, m, userId, parseInt(text.trim()));
        } else {
          await sock.sendMessage(chatId, {
            text: '❌ *Comando no reconocido*\n\n💡 Usa .rpg para ver el menú principal'
          }, { quoted: m });
        }
    }
  } catch (error) {
    rpgLogger.error('Error en sistema RPG:', error);
    await sock.sendMessage(chatId, {
      text: '❌ *Ocurrió un error en el sistema RPG*'
    }, { quoted: m });
  }
}

// Exportar comandos
export const command = ['.rpg', '.rpg_crear', '.rpg_status', '.rpg_aventuras', '.rpg_iniciar', '.rpg_combate'];
export const alias = ['.rpg_menu', '.create_rpg', '.rpg_stats', '.adventures', '.start_adventure', '.rpg_fight'];
export const description = 'Sistema de minijuegos RPG con aventuras interactivas y combate';

// Inicializar tablas al cargar
initializeRPGTables();
