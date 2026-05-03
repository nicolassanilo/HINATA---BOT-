/**
 * @file Plugin Waifu Minigames - Sistema de minijuegos interactivos
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de minijuegos como adivinanzas, quizzes y desafíos
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Importar funciones compartidas desde el core
import { 
  characters, 
  loadCharacters, 
  getWaifuLevel, 
  getRarezaEmoji,
  getUserBalance,
  updateUserBalance,
  getUserWaifus,
  validateUserWaifu,
  logger
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  dailyGames: 3,
  gameCooldown: 30 * 60 * 1000, // 30 minutos entre juegos
  rewardMultiplier: 1.5,
  maxHints: 2,
  difficultyLevels: ['fácil', 'medio', 'difícil']
};

// Sistema de logging
const gamesLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[MINIGAMES] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[MINIGAMES] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[MINIGAMES] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[MINIGAMES] ❌ ${message}`)
};

// Tipos de minijuegos
const GAME_TYPES = {
  ADIVINA_WAIFU: 'adivina_waifu',
  QUIZ_ANIME: 'quiz_anime',
  BINGO_COLECCION: 'bingo_coleccion',
  MEMORIA_WAIFU: 'memoria_waifu',
  MATEMATICAS_WAIFU: 'matematicas_waifu',
  PALABRAS_ANIME: 'palabras_anime',
  TRIVIA_WAIFU: 'trivia_waifu',
  DESAFIO_RAPIDO: 'desafio_rapido'
};

// Base de datos de preguntas y respuestas
const GAME_DATABASE = {
  [GAME_TYPES.ADIVINA_WAIFU]: {
    title: 'Adivina la Waifu',
    description: 'Adivina qué waifu es según las pistas',
    emoji: '🤔',
    questions: [
      {
        id: 1,
        question: 'Soy de la serie "Naruto", tengo pelo azul y soy una kunoichi experta en genjutsu',
        answer: 'Kurenai Yuhi',
        hints: ['Soy la líder del Equipo 8', 'Mi especialidad es el genjutsu'],
        difficulty: 'medio',
        reward: { exp: 25, coins: 100 }
      },
      {
        id: 2,
        question: 'Soy protagonista de "Sword Art Online", uso espada y mi nombre es Asuna',
        answer: 'Asuna Yuuki',
        hints: ['Soy la vicecomandante de los Caballeros de la Sangre', 'Mi habilidad especial es la espada'],
        difficulty: 'fácil',
        reward: { exp: 20, coins: 80 }
      }
    ]
  },
  [GAME_TYPES.QUIZ_ANIME]: {
    title: 'Quiz de Anime',
    description: 'Preguntas sobre animes y personajes',
    emoji: '📝',
    questions: [
      {
        id: 1,
        question: '¿En qué año se estrenó el anime "Attack on Titan"?',
        answer: '2013',
        options: ['2011', '2013', '2015', '2017'],
        hints: ['Fue en la década de 2010', 'Fue 2 años después de 2011'],
        difficulty: 'medio',
        reward: { exp: 30, coins: 150 }
      },
      {
        id: 2,
        question: '¿Cuál es el nombre del protagonista de "My Hero Academia"?',
        answer: 'Izuku Midoriya',
        options: ['Izuku Midoriya', 'Katsuki Bakugo', 'Shoto Todoroki', 'Ochaco Uraraka'],
        hints: ['Es conocido como Deku', 'Originalmente no tenía poder'],
        difficulty: 'fácil',
        reward: { exp: 25, coins: 120 }
      }
    ]
  },
  [GAME_TYPES.TRIVIA_WAIFU]: {
    title: 'Trivia de Waifus',
    description: 'Preguntas específicas sobre waifus',
    emoji: '🎯',
    questions: [
      {
        id: 1,
        question: '¿Cuál es el nombre completo de Zero Two?',
        answer: 'Code 002',
        hints: ['Es su código de piloto', 'Es conocida como "Partner Killer"'],
        difficulty: 'medio',
        reward: { exp: 35, coins: 200 }
      },
      {
        id: 2,
        question: '¿De qué serie es la waifu "Mikasa Ackerman"?',
        answer: 'Attack on Titan',
        hints: ['Es una serie sobre titanes', 'El protagonista es Eren Yeager'],
        difficulty: 'fácil',
        reward: { exp: 20, coins: 100 }
      }
    ]
  }
};

/**
 * Sistema de minijuegos
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.minijuego':
        await showMinigameMenu(sock, m, userId);
        break;
      case '.adivina':
        await startGuessGame(sock, m, userId, text);
        break;
      case '.quiz':
        await startQuizGame(sock, m, userId, text);
        break;
      case '.trivia':
        await startTriviaGame(sock, m, userId, text);
        break;
      case '.respuesta':
        await submitAnswer(sock, m, userId, text);
        break;
      case '.pista':
        await requestHint(sock, m, userId);
        break;
      case '.estadisticas_juegos':
        await showGameStats(sock, m, userId);
        break;
      default:
        gamesLogger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    gamesLogger.error('Error en el sistema de minijuegos:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de minijuegos. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Muestra el menú principal de minijuegos
 */
async function showMinigameMenu(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    // Obtener datos con manejo de errores seguro
    let dailyGames, userStats;
    
    try {
      dailyGames = await getDailyGamesCount(userId);
    } catch (error) {
      gamesLogger.error('Error obteniendo juegos diarios:', error);
      dailyGames = { used: 0, max: CONFIG.dailyGames };
    }
    
    try {
      userStats = await getUserGameStats(userId);
    } catch (error) {
      gamesLogger.error('Error obteniendo estadísticas:', error);
      userStats = { wins: 0, coins: 0 };
    }
    
    let menuMessage = `🎮 *MENÚ DE MINIJUEGOS* 🎮\n\n`;
    menuMessage += `👤 *@${userId.split('@')[0]}*\n`;
    menuMessage += `📊 *Juegos hoy:* ${dailyGames.used}/${CONFIG.dailyGames}\n`;
    menuMessage += `🏆 *Victorias totales:* ${userStats.wins || 0}\n`;
    menuMessage += `💰 *Monedas ganadas:* ${(userStats.coins || 0).toLocaleString()}\n\n`;
    
    menuMessage += `🎯 *Juegos Disponibles:*\n\n`;
    
    // Verificar que GAME_DATABASE exista y tenga datos
    if (GAME_DATABASE && Object.keys(GAME_DATABASE).length > 0) {
      Object.entries(GAME_DATABASE).forEach(([gameType, gameData]) => {
        if (gameData && gameData.questions && gameData.questions.length > 0) {
          menuMessage += `${gameData.emoji} *${gameData.title}*\n`;
          menuMessage += `📝 ${gameData.description}\n`;
          menuMessage += `🎁 Recompensa: ${gameData.questions[0].reward.exp} EXP, ${gameData.questions[0].reward.coins} 💎\n`;
          menuMessage += `💡 Comando: \`.${gameType.replace('_', '')}\`\n\n`;
        }
      });
    } else {
      menuMessage += `❌ *No hay juegos disponibles en este momento*\n\n`;
    }
    
    menuMessage += `📋 *Cómo jugar:*\n`;
    menuMessage += `• Elige un juego de la lista\n`;
    menuMessage += `• Responde correctamente para ganar\n`;
    menuMessage += `• Usa \`.pista\` si necesitas ayuda\n`;
    menuMessage += `• Usa \`.respuesta <respuesta>\` para responder\n\n`;
    
    menuMessage += `⏰ *Límite diario:* ${CONFIG.dailyGames} juegos\n`;
    menuMessage += `🔄 *Cooldown:* ${CONFIG.gameCooldown / 60000} minutos entre juegos`;
    
    await sock.sendMessage(chatId, { 
      text: menuMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    gamesLogger.error('Error al mostrar menú de minijuegos:', error);
    // Enviar mensaje de error simple pero informativo
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el menú de minijuegos.\n\n💡 *Intenta recargar el bot con .reload*'
    }, { quoted: m });
  }
}

/**
 * Inicia el juego de adivinar waifu
 */
async function startGuessGame(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  
  try {
    // Verificar límite diario
    const dailyGames = await getDailyGamesCount(userId);
    if (dailyGames.used >= CONFIG.dailyGames) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite diario de juegos.\n\n` +
              `📊 *Juegos hoy:* ${dailyGames.used}/${CONFIG.dailyGames}\n` +
              `⏰ *Vuelve mañana para más juegos!*`
      }, { quoted: m });
    }
    
    // Verificar cooldown
    const cooldown = await checkGameCooldown(userId);
    if (!cooldown.canPlay) {
      return await sock.sendMessage(chatId, {
        text: `⏰ Debes esperar ${cooldown.remainingMinutes} minutos antes de volver a jugar.`
      }, { quoted: m });
    }
    
    // Obtener pregunta aleatoria
    const gameData = GAME_DATABASE[GAME_TYPES.ADIVINA_WAIFU];
    const question = gameData.questions[Math.floor(Math.random() * gameData.questions.length)];
    
    // Guardar juego activo
    await saveActiveGame(userId, GAME_TYPES.ADIVINA_WAIFU, question);
    
    let gameMessage = `${gameData.emoji} *${gameData.title}* ${gameData.emoji}\n\n`;
    gameMessage += `📝 *Pregunta:*\n${question.question}\n\n`;
    gameMessage += `💡 *Comandos disponibles:*\n`;
    gameMessage += `• \`.respuesta <nombre>\` - Responder\n`;
    gameMessage += `• \`.pista\` - Obtener pista (máximo ${CONFIG.maxHints})\n`;
    gameMessage += `• \`.rendirse\` - Abandonar el juego\n\n`;
    gameMessage += `🎁 *Recompensa:* ${question.reward.exp} EXP, ${question.reward.coins} 💎\n`;
    gameMessage += `⭐ *Dificultad:* ${question.difficulty}`;
    
    await sock.sendMessage(chatId, { text: gameMessage }, { quoted: m });
    
    gamesLogger.success(`Usuario ${userId} inició juego de adivinar waifu`);
    
  } catch (error) {
    gamesLogger.error('Error al iniciar juego de adivinar waifu:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al iniciar el juego. Intenta nuevamente.'
    }, { quoted: m });
  }
}

/**
 * Inicia el juego de quiz
 */
async function startQuizGame(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  
  try {
    // Verificar límite diario
    const dailyGames = await getDailyGamesCount(userId);
    if (dailyGames.used >= CONFIG.dailyGames) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite diario de juegos.\n\n` +
              `📊 *Juegos hoy:* ${dailyGames.used}/${CONFIG.dailyGames}`
      }, { quoted: m });
    }
    
    // Verificar cooldown
    const cooldown = await checkGameCooldown(userId);
    if (!cooldown.canPlay) {
      return await sock.sendMessage(chatId, {
        text: `⏰ Debes esperar ${cooldown.remainingMinutes} minutos antes de volver a jugar.`
      }, { quoted: m });
    }
    
    // Obtener pregunta aleatoria
    const gameData = GAME_DATABASE[GAME_TYPES.QUIZ_ANIME];
    const question = gameData.questions[Math.floor(Math.random() * gameData.questions.length)];
    
    // Guardar juego activo
    await saveActiveGame(userId, GAME_TYPES.QUIZ_ANIME, question);
    
    let gameMessage = `${gameData.emoji} *${gameData.title}* ${gameData.emoji}\n\n`;
    gameMessage += `📝 *Pregunta:*\n${question.question}\n\n`;
    
    if (question.options) {
      gameMessage += `🎯 *Opciones:*\n`;
      question.options.forEach((option, index) => {
        gameMessage += `${index + 1}. ${option}\n`;
      });
      gameMessage += `\n💡 *Usa \`.respuesta <número>\` o \`.respuesta <texto>\``;
    } else {
      gameMessage += `💡 *Usa \`.respuesta <respuesta>\``;
    }
    
    gameMessage += `\n\n🎁 *Recompensa:* ${question.reward.exp} EXP, ${question.reward.coins} 💎\n`;
    gameMessage += `⭐ *Dificultad:* ${question.difficulty}`;
    
    await sock.sendMessage(chatId, { text: gameMessage }, { quoted: m });
    
    gamesLogger.success(`Usuario ${userId} inició juego de quiz`);
    
  } catch (error) {
    gamesLogger.error('Error al iniciar juego de quiz:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al iniciar el juego. Intenta nuevamente.'
    }, { quoted: m });
  }
}

/**
 * Inicia el juego de trivia
 */
async function startTriviaGame(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  
  try {
    // Verificar límite diario
    const dailyGames = await getDailyGamesCount(userId);
    if (dailyGames.used >= CONFIG.dailyGames) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite diario de juegos.`
      }, { quoted: m });
    }
    
    // Verificar cooldown
    const cooldown = await checkGameCooldown(userId);
    if (!cooldown.canPlay) {
      return await sock.sendMessage(chatId, {
        text: `⏰ Debes esperar ${cooldown.remainingMinutes} minutos antes de volver a jugar.`
      }, { quoted: m });
    }
    
    // Obtener pregunta aleatoria
    const gameData = GAME_DATABASE[GAME_TYPES.TRIVIA_WAIFU];
    const question = gameData.questions[Math.floor(Math.random() * gameData.questions.length)];
    
    // Guardar juego activo
    await saveActiveGame(userId, GAME_TYPES.TRIVIA_WAIFU, question);
    
    let gameMessage = `${gameData.emoji} *${gameData.title}* ${gameData.emoji}\n\n`;
    gameMessage += `📝 *Pregunta:*\n${question.question}\n\n`;
    gameMessage += `💡 *Usa \`.respuesta <respuesta>\` para responder\n`;
    gameMessage += `🎁 *Recompensa:* ${question.reward.exp} EXP, ${question.reward.coins} 💎\n`;
    gameMessage += `⭐ *Dificultad:* ${question.difficulty}`;
    
    await sock.sendMessage(chatId, { text: gameMessage }, { quoted: m });
    
    gamesLogger.success(`Usuario ${userId} inició juego de trivia`);
    
  } catch (error) {
    gamesLogger.error('Error al iniciar juego de trivia:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al iniciar el juego. Intenta nuevamente.'
    }, { quoted: m });
  }
}

/**
 * Procesa la respuesta del usuario
 */
async function submitAnswer(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const answer = (text || '').split(' ').slice(1).join(' ').trim();
  
  if (!answer) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes proporcionar una respuesta.\n\n💡 *Uso:* `.respuesta <tu respuesta>`'
    }, { quoted: m });
  }
  
  try {
    // Obtener juego activo
    const activeGame = await getActiveGame(userId);
    
    if (!activeGame) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes ningún juego activo.\n\n💡 *Usa \`.minijuego\` para empezar a jugar'
      }, { quoted: m });
    }
    
    const isCorrect = checkAnswer(activeGame.question, answer);
    const gameData = GAME_DATABASE[activeGame.gameType];
    
    if (isCorrect) {
      // Respuesta correcta
      await handleCorrectAnswer(userId, activeGame, chatId, sock, m);
    } else {
      // Respuesta incorrecta
      await handleIncorrectAnswer(userId, activeGame, chatId, sock, m);
    }
    
  } catch (error) {
    gamesLogger.error('Error al procesar respuesta:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al procesar tu respuesta. Intenta nuevamente.'
    }, { quoted: m });
  }
}

/**
 * Proporciona una pista para el juego actual
 */
async function requestHint(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const activeGame = await getActiveGame(userId);
    
    if (!activeGame) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes ningún juego activo.'
      }, { quoted: m });
    }
    
    if (activeGame.hintsUsed >= CONFIG.maxHints) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya has usado todas las pistas disponibles (${CONFIG.maxHints}/${CONFIG.maxHints}).`
      }, { quoted: m });
    }
    
    const hintIndex = activeGame.hintsUsed;
    const hint = activeGame.question.hints[hintIndex];
    
    // Actualizar pistas usadas
    await updateHintsUsed(userId, activeGame.hintsUsed + 1);
    
    let hintMessage = `💡 *PISTA ${hintIndex + 1}/${CONFIG.maxHints}*\n\n`;
    hintMessage += `🔍 ${hint}\n\n`;
    hintMessage += `💡 *Te quedan ${CONFIG.maxHints - (hintIndex + 1)} pistas*`;
    
    await sock.sendMessage(chatId, { text: hintMessage }, { quoted: m });
    
  } catch (error) {
    gamesLogger.error('Error al proporcionar pista:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al obtener pista. Intenta nuevamente.'
    }, { quoted: m });
  }
}

/**
 * Muestra estadísticas de juegos del usuario
 */
async function showGameStats(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userStats = await getUserGameStats(userId);
    const dailyGames = await getDailyGamesCount(userId);
    
    let statsMessage = `📊 *ESTADÍSTICAS DE MINIJUEGOS* 📊\n\n`;
    statsMessage += `👤 *@${userId.split('@')[0]}*\n\n`;
    
    statsMessage += `📈 *Estadísticas Generales:*\n`;
    statsMessage += `• Partidas jugadas: ${userStats.gamesPlayed || 0}\n`;
    statsMessage += `• Victorias: ${userStats.wins || 0}\n`;
    statsMessage += `• Derrotas: ${userStats.losses || 0}\n`;
    statsMessage += `• Tasa de victoria: ${userStats.gamesPlayed > 0 ? Math.round((userStats.wins / userStats.gamesPlayed) * 100) : 0}%\n`;
    statsMessage += `• Racha actual: ${userStats.streak || 0}\n\n`;
    
    statsMessage += `💰 *Recompensas Totales:*\n`;
    statsMessage += `• EXP ganada: ${(userStats.expEarned || 0).toLocaleString()}\n`;
    statsMessage += `• Monedas ganadas: ${(userStats.coins || 0).toLocaleString()}\n\n`;
    
    statsMessage += `📅 *Hoy:*\n`;
    statsMessage += `• Juegos usados: ${dailyGames.used}/${CONFIG.dailyGames}\n`;
    statsMessage += `• Victorias hoy: ${userStats.winsToday || 0}\n\n`;
    
    // Estadísticas por tipo de juego
    statsMessage += `🎮 *Rendimiento por Juego:*\n`;
    Object.entries(GAME_DATABASE).forEach(([gameType, gameData]) => {
      const gameStats = getGameTypeStats(userId, gameType);
      statsMessage += `• ${gameData.emoji} ${gameData.title}: ${gameStats.wins}/${gameStats.played} (${gameStats.winRate}%)\n`;
    });
    
    await sock.sendMessage(chatId, { 
      text: statsMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    gamesLogger.error('Error al mostrar estadísticas de juegos:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar estadísticas.'
    }, { quoted: m });
  }
}

/**
 * Funciones auxiliares
 */
async function saveActiveGame(userId, gameType, question) {
  try {
    await db.run(`
      INSERT OR REPLACE INTO active_games 
      (user_id, game_type, question_id, question, answer, hints_used, start_time)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, gameType, question.id, JSON.stringify(question), question.answer, 0]);
  } catch (error) {
    gamesLogger.error('Error al guardar juego activo:', error);
  }
}

async function getActiveGame(userId) {
  try {
    const game = await db.get(
      'SELECT * FROM active_games WHERE user_id = ?',
      [userId]
    );
    
    if (game) {
      return {
        gameType: game.game_type,
        question: JSON.parse(game.question),
        answer: game.answer,
        hintsUsed: game.hints_used,
        startTime: game.start_time
      };
    }
    
    return null;
  } catch (error) {
    gamesLogger.error('Error al obtener juego activo:', error);
    return null;
  }
}

function checkAnswer(question, userAnswer) {
  const correctAnswer = question.answer.toLowerCase().trim();
  const providedAnswer = userAnswer.toLowerCase().trim();
  
  // Verificar si es opción numérica (para quiz)
  if (question.options) {
    const optionIndex = parseInt(userAnswer) - 1;
    if (optionIndex >= 0 && optionIndex < question.options.length) {
      return question.options[optionIndex].toLowerCase() === correctAnswer;
    }
  }
  
  // Comparación directa
  return correctAnswer === providedAnswer;
}

async function handleCorrectAnswer(userId, activeGame, chatId, sock, m) {
  try {
    // Eliminar juego activo
    await db.run('DELETE FROM active_games WHERE user_id = ?', [userId]);
    
    // Actualizar estadísticas
    await updateGameStats(userId, true, activeGame.question.reward);
    
    // Actualizar juegos diarios
    await incrementDailyGames(userId);
    
    let successMessage = `🎉 *¡RESPUESTA CORRECTA!* 🎉\n\n`;
    successMessage += `✅ La respuesta correcta era: *${activeGame.answer}*\n`;
    successMessage += `🎁 *Has ganado:*\n`;
    successMessage += `• ${activeGame.question.reward.exp} EXP\n`;
    successMessage += `• ${activeGame.question.reward.coins} 💎\n\n`;
    successMessage += `🏆 *¡Felicidades, @${userId.split('@')[0]}!*`;
    
    await sock.sendMessage(chatId, { 
      text: successMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    gamesLogger.success(`Usuario ${userId} respondió correctamente`);
    
  } catch (error) {
    gamesLogger.error('Error al manejar respuesta correcta:', error);
  }
}

async function handleIncorrectAnswer(userId, activeGame, chatId, sock, m) {
  try {
    let incorrectMessage = `❌ *RESPUESTA INCORRECTA*\n\n`;
    incorrectMessage += `💡 *Tu respuesta:* "${(text || '').split(' ').slice(1).join(' ')}"\n`;
    incorrectMessage += `🎯 *La respuesta correcta era:* ${activeGame.answer}\n\n`;
    incorrectMessage += `💡 *No te desanimes! Inténtalo de nuevo en el próximo juego.*`;
    
    // Eliminar juego activo
    await db.run('DELETE FROM active_games WHERE user_id = ?', [userId]);
    
    // Actualizar estadísticas
    await updateGameStats(userId, false, {});
    
    await sock.sendMessage(chatId, { text: incorrectMessage }, { quoted: m });
    
    gamesLogger.info(`Usuario ${userId} respondió incorrectamente`);
    
  } catch (error) {
    gamesLogger.error('Error al manejar respuesta incorrecta:', error);
  }
}

async function getDailyGamesCount(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const stats = await db.get(
      'SELECT COUNT(*) as used FROM daily_games WHERE user_id = ? AND date = ?',
      [userId, today]
    );
    return { used: stats.used || 0, max: CONFIG.dailyGames };
  } catch (error) {
    gamesLogger.error('Error al obtener juegos diarios:', error);
    return { used: 0, max: CONFIG.dailyGames };
  }
}

async function checkGameCooldown(userId) {
  try {
    const lastGame = await db.get(
      'SELECT start_time FROM active_games WHERE user_id = ?',
      [userId]
    );
    
    if (!lastGame) {
      return { canPlay: true };
    }
    
    const now = Date.now();
    const lastGameTime = new Date(lastGame.start_time).getTime();
    const timeSince = now - lastGameTime;
    
    if (timeSince < CONFIG.gameCooldown) {
      const remaining = Math.ceil((CONFIG.gameCooldown - timeSince) / 60000);
      return { canPlay: false, remainingMinutes: remaining };
    }
    
    return { canPlay: true };
  } catch (error) {
    gamesLogger.error('Error al verificar cooldown:', error);
    return { canPlay: true };
  }
}

async function updateGameStats(userId, won, rewards) {
  try {
    await db.run(`
      INSERT INTO game_stats (user_id, games_played, wins, losses, exp_earned, coins, streak)
      VALUES (?, 1, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        games_played = games_played + 1,
        wins = wins + ?,
        losses = losses + ?,
        exp_earned = exp_earned + ?,
        coins = coins + ?,
        streak = CASE WHEN ? THEN streak + 1 ELSE 0 END
    `, [
      userId,
      won ? 1 : 0,
      won ? 0 : 1,
      rewards.exp || 0,
      rewards.coins || 0,
      won ? 1 : 0,
      won ? 0 : 1,
      rewards.exp || 0,
      rewards.coins || 0,
      won
    ]);
  } catch (error) {
    gamesLogger.error('Error al actualizar estadísticas de juego:', error);
  }
}

async function incrementDailyGames(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    await db.run(
      'INSERT OR IGNORE INTO daily_games (user_id, date, games_used) VALUES (?, ?, 0)',
      [userId, today]
    );
    await db.run(
      'UPDATE daily_games SET games_used = games_used + 1 WHERE user_id = ? AND date = ?',
      [userId, today]
    );
  } catch (error) {
    gamesLogger.error('Error al incrementar juegos diarios:', error);
  }
}

async function getUserGameStats(userId) {
  try {
    const stats = await db.get(
      'SELECT * FROM game_stats WHERE user_id = ?',
      [userId]
    );
    return stats || { gamesPlayed: 0, wins: 0, losses: 0, expEarned: 0, coins: 0, streak: 0 };
  } catch (error) {
    gamesLogger.error('Error al obtener estadísticas de usuario:', error);
    return { gamesPlayed: 0, wins: 0, losses: 0, expEarned: 0, coins: 0, streak: 0 };
  }
}

function getGameTypeStats(userId, gameType) {
  // Esta función podría implementarse con estadísticas más detalladas por tipo de juego
  return { played: 0, wins: 0, winRate: 0 };
}

async function updateHintsUsed(userId, hintsUsed) {
  try {
    await db.run(
      'UPDATE active_games SET hints_used = ? WHERE user_id = ?',
      [hintsUsed, userId]
    );
  } catch (error) {
    gamesLogger.error('Error al actualizar pistas usadas:', error);
  }
}

// Inicializar tablas de minijuegos
async function initializeGameTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS active_games (
        user_id TEXT PRIMARY KEY,
        game_type TEXT NOT NULL,
        question_id INTEGER,
        question TEXT,
        answer TEXT,
        hints_used INTEGER DEFAULT 0,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS game_stats (
        user_id TEXT PRIMARY KEY,
        games_played INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        exp_earned INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS daily_games (
        user_id TEXT,
        date TEXT,
        games_used INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, date)
      )
    `);
    
    gamesLogger.success('Tablas de minijuegos inicializadas');
  } catch (error) {
    gamesLogger.error('Error al inicializar tablas de minijuegos:', error);
  }
}

// Exportar configuración y funciones necesarias
export const command = ['.minijuego', '.adivina', '.quiz', '.trivia', '.respuesta', '.pista', '.estadisticas_juegos'];
export const alias = ['.minigame', '.guess', '.quiz_game', '.answer', '.hint', '.game_stats'];
export const description = 'Sistema de minijuegos interactivos con recompensas';

// Inicializar sistema al iniciar
(async () => {
  try {
    // Asegurar que las tablas existan
    await initializeGameTables();
    // Cargar personajes
    await loadCharacters();
    gamesLogger.success('Sistema de minijuegos inicializado correctamente');
  } catch (error) {
    gamesLogger.error('Error inicializando sistema de minijuegos:', error);
  }
})();

export { CONFIG, gamesLogger, GAME_TYPES, GAME_DATABASE };
