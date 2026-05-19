/**
 * @file Plugin Trivia Avanzada - Sistema de trivia con categorías y rankings
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de trivia avanzado con múltiples categorías, dificultades y modo multijugador
 */

import { db } from './db.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  answerTime: 30, // segundos para responder
  hintTime: 15, // segundos para mostrar pista
  maxHints: 2,
  pointsPerCorrect: {
    easy: 10,
    medium: 20,
    hard: 30,
    expert: 50
  },
  bonusPoints: {
    speed: 5, // bonus por respuesta rápida
    streak: 10, // bonus por racha
    perfect: 25 // bonus por respuesta perfecta
  },
  cooldown: 5 * 60 * 1000, // 5 minutos entre partidas
  maxQuestionsPerGame: 10
};

// Sistema de logging
const triviaLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[TRIVIA] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[TRIVIA] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[TRIVIA] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[TRIVIA] ❌ ${message}`)
};

// Categorías de trivia
const CATEGORIES = {
  ANIME: {
    id: 'anime',
    name: 'Anime',
    emoji: '🎌',
    description: 'Preguntas sobre anime, manga y cultura japonesa'
  },
  MUSIC: {
    id: 'music',
    name: 'Música',
    emoji: '🎵',
    description: 'Preguntas sobre música, artistas y canciones'
  },
  SCIENCE: {
    id: 'science',
    name: 'Ciencia',
    emoji: '🔬',
    description: 'Preguntas sobre ciencia, tecnología y descubrimientos'
  },
  HISTORY: {
    id: 'history',
    name: 'Historia',
    emoji: '📜',
    description: 'Preguntas sobre eventos históricos y figuras importantes'
  },
  GEOGRAPHY: {
    id: 'geography',
    name: 'Geografía',
    emoji: '🌍',
    description: 'Preguntas sobre países, capitales y lugares del mundo'
  },
  TECHNOLOGY: {
    id: 'technology',
    name: 'Tecnología',
    emoji: '💻',
    description: 'Preguntas sobre tecnología, programación y gadgets'
  },
  SPORTS: {
    id: 'sports',
    name: 'Deportes',
    emoji: '⚽',
    description: 'Preguntas sobre deportes, atletas y competiciones'
  },
  ART: {
    id: 'art',
    name: 'Arte',
    emoji: '🎨',
    description: 'Preguntas sobre arte, literatura y cultura'
  },
  MOVIES: {
    id: 'movies',
    name: 'Cine',
    emoji: '🎬',
    description: 'Preguntas sobre películas, actores y directores'
  },
  GENERAL: {
    id: 'general',
    name: 'General',
    emoji: '🧠',
    description: 'Preguntas de cultura general'
  }
};

// Niveles de dificultad
const DIFFICULTIES = {
  EASY: { id: 'easy', name: 'Fácil', emoji: '🟢', multiplier: 1 },
  MEDIUM: { id: 'medium', name: 'Medio', emoji: '🟡', multiplier: 1.5 },
  HARD: { id: 'hard', name: 'Difícil', emoji: '🟠', multiplier: 2 },
  EXPERT: { id: 'expert', name: 'Experto', emoji: '🔴', multiplier: 3 }
};

// Base de datos de preguntas (ejemplo)
const QUESTIONS = {
  anime: [
    {
      question: "¿Cuál es el nombre del protagonista de 'Dragon Ball'?",
      options: ["Vegeta", "Goku", "Piccolo", "Gohan"],
      correct: 1,
      difficulty: "easy",
      hint: "Es un Saiyajin criado en la Tierra"
    },
    {
      question: "¿En qué año se estrenó 'Attack on Titan'?",
      options: ["2010", "2013", "2015", "2017"],
      correct: 1,
      difficulty: "medium",
      hint: "Fue en la década de 2010"
    },
    {
      question: "¿Quién es el creador de 'One Piece'?",
      options: ["Masashi Kishimoto", "Eiichiro Oda", "Tite Kubo", "Akira Toriyama"],
      correct: 1,
      difficulty: "easy",
      hint: "También creó 'Romance Dawn'"
    }
  ],
  music: [
    {
      question: "¿Quién es conocido como el 'Rey del Pop'?",
      options: ["Elvis Presley", "Michael Jackson", "Prince", "Freddie Mercury"],
      correct: 1,
      difficulty: "easy",
      hint: "Popularizó el 'moonwalk'"
    },
    {
      question: "¿En qué género musical se clasifica el reggaetón?",
      options: ["Rock", "Jazz", "Urbano/Latino", "Clásica"],
      correct: 2,
      difficulty: "easy",
      hint: "Originario de Puerto Rico"
    }
  ],
  science: [
    {
      question: "¿Cuál es el elemento químico más abundante en el universo?",
      options: ["Oxígeno", "Carbono", "Hidrógeno", "Helio"],
      correct: 2,
      difficulty: "medium",
      hint: "Su símbolo es H"
    },
    {
      question: "¿Quién formuló la teoría de la relatividad?",
      options: ["Isaac Newton", "Albert Einstein", "Galileo Galilei", "Nikola Tesla"],
      correct: 1,
      difficulty: "easy",
      hint: "Nació en Alemania"
    }
  ],
  history: [
    {
      question: "¿En qué año cayó el Muro de Berlín?",
      options: ["1987", "1989", "1991", "1993"],
      correct: 1,
      difficulty: "medium",
      hint: "Fue a finales de los años 80"
    },
    {
      question: "¿Quién fue el primer presidente de los Estados Unidos?",
      options: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"],
      correct: 2,
      difficulty: "easy",
      hint: "Su cara está en el billete de $1"
    }
  ],
  geography: [
    {
      question: "¿Cuál es el país más grande del mundo por área?",
      options: ["China", "Estados Unidos", "Canadá", "Rusia"],
      correct: 3,
      difficulty: "easy",
      hint: "Se extiende sobre dos continentes"
    },
    {
      question: "¿Cuál es la capital de Australia?",
      options: ["Sídney", "Melbourne", "Canberra", "Perth"],
      correct: 2,
      difficulty: "medium",
      hint: "No es la ciudad más conocida"
    }
  ],
  technology: [
    {
      question: "¿Quién fundó Microsoft?",
      options: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Jeff Bezos"],
      correct: 1,
      difficulty: "easy",
      hint: "Es conocido por su filantropía"
    },
    {
      question: "¿En qué año se lanzó el primer iPhone?",
      options: ["2005", "2007", "2009", "2010"],
      correct: 1,
      difficulty: "medium",
      hint: "Fue presentado por Steve Jobs"
    }
  ],
  sports: [
    {
      question: "¿Cuántos jugadores tiene un equipo de fútbol?",
      options: ["9", "10", "11", "12"],
      correct: 2,
      difficulty: "easy",
      hint: "Incluyendo el portero"
    },
    {
      question: "¿En qué deporte se usa un 'dunk'?",
      options: ["Voleibol", "Baloncesto", "Tenis", "Béisbol"],
      correct: 1,
      difficulty: "easy",
      hint: "Michael Jordan lo hacía"
    }
  ],
  art: [
    {
      question: "¿Quién pintó la 'Mona Lisa'?",
      options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
      correct: 2,
      difficulty: "easy",
      hint: "También pintó 'La Última Cena'"
    },
    {
      question: "¿Quién escribió 'Don Quijote de la Mancha'?",
      options: ["Gabriel García Márquez", "Miguel de Cervantes", "Jorge Luis Borges", "Pablo Neruda"],
      correct: 1,
      difficulty: "easy",
      hint: "Era español"
    }
  ],
  movies: [
    {
      question: "¿Cuál fue la primera película de Disney?",
      options: ["Pinocho", "Blancanieves", "Fantasía", "Dumbo"],
      correct: 1,
      difficulty: "medium",
      hint: "Estrenada en 1937"
    },
    {
      question: "¿Quién dirigió 'Titanic'?",
      options: ["Steven Spielberg", "James Cameron", "Christopher Nolan", "Martin Scorsese"],
      correct: 1,
      difficulty: "easy",
      hint: "También dirigió 'Avatar'"
    }
  ],
  general: [
    {
      question: "¿Cuál es el planeta más cercano al Sol?",
      options: ["Venus", "Marte", "Mercurio", "Tierra"],
      correct: 2,
      difficulty: "easy",
      hint: "Es el más pequeño del sistema solar"
    },
    {
      question: "¿Cuántos continentes hay en el mundo?",
      options: ["5", "6", "7", "8"],
      correct: 2,
      difficulty: "easy",
      hint: "Depende del modelo educativo"
    }
  ]
};

// Almacenamiento de juegos activos
const activeGames = new Map();
const userCooldowns = new Map();

// Funciones auxiliares
function getRandomQuestion(category, difficulty = null) {
  const categoryQuestions = QUESTIONS[category] || QUESTIONS.general;
  let availableQuestions = difficulty 
    ? categoryQuestions.filter(q => q.difficulty === difficulty)
    : categoryQuestions;
  
  if (availableQuestions.length === 0) {
    availableQuestions = categoryQuestions;
  }
  
  return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function getUserTriviaStats(userId) {
  try {
    const stats = await db.get(
      'SELECT * FROM trivia_stats WHERE user_id = ?',
      [userId]
    );
    return stats || {
      user_id: userId,
      games_played: 0,
      correct_answers: 0,
      total_answers: 0,
      total_points: 0,
      best_streak: 0,
      current_streak: 0
    };
  } catch (error) {
    triviaLogger.error('Error al obtener estadísticas:', error);
    return null;
  }
}

async function updateTriviaStats(userId, correct, points, streak) {
  try {
    const stats = await getUserTriviaStats(userId);
    
    const newStats = {
      games_played: stats.games_played + 1,
      correct_answers: stats.correct_answers + (correct ? 1 : 0),
      total_answers: stats.total_answers + 1,
      total_points: stats.total_points + points,
      best_streak: Math.max(stats.best_streak, streak),
      current_streak: correct ? streak + 1 : 0
    };
    
    await db.run(`
      INSERT INTO trivia_stats (user_id, games_played, correct_answers, total_answers, total_points, best_streak, current_streak)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        games_played = games_played + 1,
        correct_answers = correct_answers + ?,
        total_answers = total_answers + 1,
        total_points = total_points + ?,
        best_streak = MAX(best_streak, ?),
        current_streak = ?
    `, [userId, newStats.games_played, newStats.correct_answers, newStats.total_answers, 
        newStats.total_points, newStats.best_streak, newStats.current_streak,
        correct ? 1 : 0, points, Math.max(stats.best_streak, streak), correct ? streak + 1 : 0]);
    
    return newStats;
  } catch (error) {
    triviaLogger.error('Error al actualizar estadísticas:', error);
    return null;
  }
}

async function awardUserPoints(userId, points) {
  try {
    await db.run('UPDATE usuarios SET saldo = saldo + ? WHERE chatId = ?', [points, userId]);
    return true;
  } catch (error) {
    triviaLogger.error('Error al otorgar puntos:', error);
    return false;
  }
}

async function initializeTriviaTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS trivia_stats (
        user_id TEXT PRIMARY KEY,
        games_played INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        total_answers INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS trivia_leaderboard (
        user_id TEXT PRIMARY KEY,
        username TEXT,
        total_points INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        accuracy REAL DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    triviaLogger.success('Tablas de trivia inicializadas');
  } catch (error) {
    triviaLogger.error('Error al inicializar tablas:', error);
  }
}

// Funciones principales del juego
async function startTriviaGame(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  
  // Verificar cooldown
  const lastGame = userCooldowns.get(userId);
  if (lastGame && Date.now() - lastGame < CONFIG.cooldown) {
    const remaining = Math.ceil((CONFIG.cooldown - (Date.now() - lastGame)) / 1000);
    return await sock.sendMessage(chatId, {
      text: `⏱️ *Debes esperar ${remaining} segundos antes de jugar otra partida*`
    }, { quoted: m });
  }
  
  // Parsear argumentos
  const args = text.split(' ').filter(arg => arg);
  let category = 'general';
  let difficulty = null;
  let questionCount = 5;
  
  for (const arg of args) {
    const lowerArg = arg.toLowerCase();
    if (Object.values(CATEGORIES).some(cat => cat.id === lowerArg)) {
      category = lowerArg;
    } else if (Object.values(DIFFICULTIES).some(diff => diff.id === lowerArg)) {
      difficulty = lowerArg;
    } else if (!isNaN(parseInt(arg))) {
      questionCount = Math.min(parseInt(arg), CONFIG.maxQuestionsPerGame);
    }
  }
  
  // Crear juego
  const gameId = `${chatId}_${Date.now()}`;
  const game = {
    id: gameId,
    chatId,
    userId,
    category,
    difficulty,
    questions: [],
    currentQuestion: 0,
    score: 0,
    streak: 0,
    correctAnswers: 0,
    startTime: Date.now(),
    hintsUsed: 0
  };
  
  // Generar preguntas
  for (let i = 0; i < questionCount; i++) {
    const question = getRandomQuestion(category, difficulty);
    if (question) {
      game.questions.push({
        ...question,
        options: shuffleArray(question.options)
      });
    }
  }
  
  if (game.questions.length === 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ *No hay preguntas disponibles para esta categoría*'
    }, { quoted: m });
  }
  
  activeGames.set(gameId, game);
  userCooldowns.set(userId, Date.now());
  
  // Mostrar información del juego
  const categoryInfo = CATEGORIES[category.toUpperCase()] || CATEGORIES.GENERAL;
  const difficultyInfo = difficulty ? DIFFICULTIES[difficulty.toUpperCase()] : null;
  
  let gameInfo = `🎮 *TRIVIA AVANZADA* 🎮\n\n`;
  gameInfo += `📚 *Categoría:* ${categoryInfo.emoji} ${categoryInfo.name}\n`;
  if (difficultyInfo) {
    gameInfo += `🎯 *Dificultad:* ${difficultyInfo.emoji} ${difficultyInfo.name}\n`;
  }
  gameInfo += `❓ *Preguntas:* ${game.questions.length}\n`;
  gameInfo += `⏱️ *Tiempo por pregunta:* ${CONFIG.answerTime}s\n\n`;
  gameInfo += `🚀 *¡Comenzando en 3 segundos...*`;
  
  await sock.sendMessage(chatId, { text: gameInfo }, { quoted: m });
  
  // Iniciar primera pregunta después de 3 segundos
  setTimeout(() => askQuestion(sock, game), 3000);
}

async function askQuestion(sock, game) {
  if (game.currentQuestion >= game.questions.length) {
    return endGame(sock, game);
  }
  
  const question = game.questions[game.currentQuestion];
  const difficultyInfo = DIFFICULTIES[question.difficulty.toUpperCase()];
  const categoryInfo = CATEGORIES[game.category.toUpperCase()] || CATEGORIES.GENERAL;
  
  let questionText = `❓ *PREGUNTA ${game.currentQuestion + 1}/${game.questions.length}* ❓\n\n`;
  questionText += `${categoryInfo.emoji} ${categoryInfo.name} | ${difficultyInfo.emoji} ${difficultyInfo.name}\n\n`;
  questionText += `📝 ${question.question}\n\n`;
  
  question.options.forEach((option, index) => {
    questionText += `${index + 1}. ${option}\n`;
  });
  
  questionText += `\n⏱️ *Tienes ${CONFIG.answerTime} segundos*`;
  questionText += `\n💡 *Usa .pista para obtener una ayuda*`;
  
  await sock.sendMessage(game.chatId, { text: questionText });
  
  // Configurar timeout para respuesta
  game.answerTimeout = setTimeout(() => {
    handleTimeout(sock, game);
  }, CONFIG.answerTime * 1000);
  
  // Configurar timeout para pista
  game.hintTimeout = setTimeout(() => {
    if (game.hintsUsed < CONFIG.maxHints) {
      showHint(sock, game, question);
    }
  }, CONFIG.hintTime * 1000);
}

async function showHint(sock, game, question) {
  if (game.hintsUsed >= CONFIG.maxHints) return;
  
  game.hintsUsed++;
  const hintText = `💡 *PISTA ${game.hintsUsed}/${CONFIG.maxHints}*\n\n`;
  hintText += `🔍 ${question.hint}\n\n`;
  hintText += `⏱️ *Te quedan ${CONFIG.answerTime - CONFIG.hintTime} segundos*`;
  
  await sock.sendMessage(game.chatId, { text: hintText });
}

async function handleAnswer(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  
  // Buscar juego activo en este chat
  let game = null;
  for (const [gameId, activeGame] of activeGames) {
    if (activeGame.chatId === chatId) {
      game = activeGame;
      break;
    }
  }
  
  if (!game) {
    return await sock.sendMessage(chatId, {
      text: '❌ *No hay ningún juego de trivia activo en este chat*\n\n💡 Usa .trivia para comenzar una partida'
    }, { quoted: m });
  }
  
  if (game.userId !== userId) {
    return await sock.sendMessage(chatId, {
      text: '❌ *Este juego fue iniciado por otro usuario*\n\n💡 Inicia tu propia partida con .trivia'
    }, { quoted: m });
  }
  
  // Cancelar timeouts
  if (game.answerTimeout) clearTimeout(game.answerTimeout);
  if (game.hintTimeout) clearTimeout(game.hintTimeout);
  
  const question = game.questions[game.currentQuestion];
  const answerIndex = parseInt(text) - 1;
  
  if (isNaN(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) {
    await sock.sendMessage(chatId, {
      text: '❌ *Respuesta inválida*\n\n💡 Debes elegir un número entre 1 y ' + question.options.length
    }, { quoted: m });
    
    // Reanudar timeout
    game.answerTimeout = setTimeout(() => handleTimeout(sock, game), (CONFIG.answerTime - 10) * 1000);
    return;
  }
  
  const isCorrect = answerIndex === question.correct;
  const timeTaken = (Date.now() - game.startTime) / 1000;
  
  let points = 0;
  let feedback = '';
  
  if (isCorrect) {
    const basePoints = CONFIG.pointsPerCorrect[question.difficulty];
    const difficultyMultiplier = DIFFICULTIES[question.difficulty.toUpperCase()].multiplier;
    
    points = Math.floor(basePoints * difficultyMultiplier);
    
    // Bonus por velocidad
    if (timeTaken < 10) {
      points += CONFIG.bonusPoints.speed;
    }
    
    // Bonus por racha
    game.streak++;
    if (game.streak >= 3) {
      points += CONFIG.bonusPoints.streak;
    }
    
    game.score += points;
    game.correctAnswers++;
    
    feedback = `✅ *¡CORRECTO!* ✅\n\n`;
    feedback += `🎉 *+${points} puntos*\n`;
    feedback += `🔥 *Racha: ${game.streak}*\n`;
    feedback += `⏱️ *Tiempo: ${Math.floor(timeTaken)}s*\n`;
    
    // Otorgar puntos al usuario
    await awardUserPoints(userId, points);
  } else {
    game.streak = 0;
    
    feedback = `❌ *INCORRECTO* ❌\n\n`;
    feedback += `💔 *La respuesta correcta era: ${question.options[question.correct]}*\n`;
    feedback += `🔥 *Racha perdida*\n`;
  }
  
  await sock.sendMessage(chatId, { text: feedback });
  
  // Actualizar estadísticas
  await updateTriviaStats(userId, isCorrect, points, game.streak);
  
  // Siguiente pregunta
  game.currentQuestion++;
  setTimeout(() => askQuestion(sock, game), 2000);
}

async function handleTimeout(sock, game) {
  const question = game.questions[game.currentQuestion];
  
  game.streak = 0;
  
  const timeoutText = `⏱️ *TIEMPO AGOTADO* ⏱️\n\n`;
  timeoutText += `💔 *La respuesta correcta era: ${question.options[question.correct]}*\n`;
  timeoutText += `🔥 *Racha perdida*\n`;
  
  await sock.sendMessage(game.chatId, { text: timeoutText });
  
  // Actualizar estadísticas
  await updateTriviaStats(game.userId, false, 0, 0);
  
  // Siguiente pregunta
  game.currentQuestion++;
  setTimeout(() => askQuestion(sock, game), 2000);
}

async function endGame(sock, game) {
  const stats = await getUserTriviaStats(game.userId);
  const accuracy = game.questions.length > 0 
    ? Math.round((game.correctAnswers / game.questions.length) * 100) 
    : 0;
  
  let endText = `🏁 *FIN DEL JUEGO* 🏁\n\n`;
  endText += `📊 *RESULTADOS:*\n\n`;
  endText += `✅ *Respuestas correctas:* ${game.correctAnswers}/${game.questions.length}\n`;
  endText += `📈 *Precisión:* ${accuracy}%\n`;
  endText += `💰 *Puntos ganados:* ${game.score}\n`;
  endText += `🔥 *Mejor racha:* ${stats.best_streak}\n`;
  endText += `🎮 *Total de juegos:* ${stats.games_played}\n\n`;
  
  if (accuracy >= 80) {
    endText += `🌟 *¡Excelente desempeño!*\n`;
  } else if (accuracy >= 60) {
    endText += `👍 *¡Buen trabajo!*\n`;
  } else if (accuracy >= 40) {
    endText += `📚 *Sigue practicando*\n`;
  } else {
    endText += `💪 *¡No te rindas!*\n`;
  }
  
  endText += `\n💡 *Usa .trivia_ranking para ver el leaderboard*`;
  
  await sock.sendMessage(game.chatId, { text: endText });
  
  // Eliminar juego activo
  activeGames.delete(game.id);
  
  // Actualizar leaderboard
  await updateLeaderboard(game.userId, m.pushName || 'Usuario', game.score, stats.games_played, accuracy);
}

async function updateLeaderboard(userId, username, points, gamesPlayed, accuracy) {
  try {
    await db.run(`
      INSERT INTO trivia_leaderboard (user_id, username, total_points, games_played, accuracy)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        username = ?,
        total_points = total_points + ?,
        games_played = games_played + ?,
        accuracy = ?,
        last_updated = CURRENT_TIMESTAMP
    `, [userId, username, points, gamesPlayed, accuracy, username, points, gamesPlayed, accuracy]);
  } catch (error) {
    triviaLogger.error('Error al actualizar leaderboard:', error);
  }
}

async function showLeaderboard(sock, m) {
  const chatId = m.key.remoteJid;
  
  try {
    const leaderboard = await db.all(`
      SELECT user_id, username, total_points, games_played, accuracy
      FROM trivia_leaderboard
      ORDER BY total_points DESC
      LIMIT 10
    `);
    
    if (leaderboard.length === 0) {
      return await sock.sendMessage(chatId, {
        text: '📊 *LEADERBOARD VACÍO*\n\n💡 ¡Sé el primero en jugar trivia!'
      }, { quoted: m });
    }
    
    let leaderboardText = `🏆 *LEADERBOARD DE TRIVIA* 🏆\n\n`;
    
    leaderboard.forEach((entry, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      leaderboardText += `${medal} *${entry.username}*\n`;
      leaderboardText += `   💰 ${entry.total_points.toLocaleString()} pts\n`;
      leaderboardText += `   🎮 ${entry.games_played} juegos | 📈 ${entry.accuracy}%\n\n`;
    });
    
    leaderboardText += `💡 *Usa .trivia_stats para ver tus estadísticas*`;
    
    await sock.sendMessage(chatId, { text: leaderboardText }, { quoted: m });
  } catch (error) {
    triviaLogger.error('Error al mostrar leaderboard:', error);
    await sock.sendMessage(chatId, {
      text: '❌ *Error al cargar el leaderboard*'
    }, { quoted: m });
  }
}

async function showUserStats(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  const stats = await getUserTriviaStats(userId);
  
  if (!stats) {
    return await sock.sendMessage(chatId, {
      text: '❌ *No tienes estadísticas de trivia aún*\n\n💡 ¡Juega una partida con .trivia!'
    }, { quoted: m });
  }
  
  const accuracy = stats.total_answers > 0 
    ? Math.round((stats.correct_answers / stats.total_answers) * 100) 
    : 0;
  
  let statsText = `📊 *TUS ESTADÍSTICAS* 📊\n\n`;
  statsText += `🎮 *Juegos jugados:* ${stats.games_played}\n`;
  statsText += `✅ *Respuestas correctas:* ${stats.correct_answers}/${stats.total_answers}\n`;
  statsText += `📈 *Precisión:* ${accuracy}%\n`;
  statsText += `💰 *Puntos totales:* ${stats.total_points.toLocaleString()}\n`;
  statsText += `🔥 *Mejor racha:* ${stats.best_streak}\n`;
  statsText += `🎯 *Racha actual:* ${stats.current_streak}\n\n`;
  
  if (accuracy >= 80) {
    statsText += `🌟 *¡Eres un experto en trivia!*`;
  } else if (accuracy >= 60) {
    statsText += `👍 *¡Buen nivel!*`;
  } else if (accuracy >= 40) {
    statsText += `📚 *Sigue practicando*`;
  } else {
    statsText += `💪 *¡Cada vez mejor!*`;
  }
  
  await sock.sendMessage(chatId, { text: statsText }, { quoted: m });
}

async function showCategories(sock, m) {
  const chatId = m.key.remoteJid;
  
  let categoriesText = `📚 *CATEGORÍAS DE TRIVIA* 📚\n\n`;
  
  Object.values(CATEGORIES).forEach(category => {
    categoriesText += `${category.emoji} *${category.name}*\n`;
    categoriesText += `   ${category.description}\n`;
    categoriesText += `   ID: .trivia ${category.id}\n\n`;
  });
  
  categoriesText += `🎯 *DIFICULTADES:*\n`;
  Object.values(DIFFICULTIES).forEach(diff => {
    categoriesText += `${diff.emoji} ${diff.name} (x${diff.multiplier})\n`;
  });
  
  categoriesText += `\n💡 *Uso: .trivia [categoría] [dificultad] [número de preguntas]*`;
  categoriesText += `\n💡 *Ejemplo: .trivia anime medium 5*`;
  
  await sock.sendMessage(chatId, { text: categoriesText }, { quoted: m });
}

// Función principal
export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  
  try {
    switch (command) {
      case '.trivia':
        await startTriviaGame(sock, m, userId, text);
        break;
      case '.trivia_answer':
        await handleAnswer(sock, m, userId, text);
        break;
      case '.pista':
        // Manejar solicitud de pista
        break;
      case '.trivia_ranking':
        await showLeaderboard(sock, m);
        break;
      case '.trivia_stats':
        await showUserStats(sock, m, userId);
        break;
      case '.trivia_categories':
        await showCategories(sock, m);
        break;
      default:
        // Manejar respuestas numéricas en juegos activos
        if (/^\d+$/.test(text.trim())) {
          await handleAnswer(sock, m, userId, text.trim());
        }
    }
  } catch (error) {
    triviaLogger.error('Error en sistema de trivia:', error);
    await sock.sendMessage(chatId, {
      text: '❌ *Ocurrió un error en el sistema de trivia*'
    }, { quoted: m });
  }
}

// Exportar comandos
export const command = ['.trivia', '.trivia_answer', '.pista', '.trivia_ranking', '.trivia_stats', '.trivia_categories'];
export const alias = ['.trivia', '.respuesta', '.hint', '.ranking', '.estadisticas', '.categorias'];
export const description = 'Sistema de trivia avanzado con múltiples categorías y rankings';

// Inicializar tablas al cargar
initializeTriviaTables();
