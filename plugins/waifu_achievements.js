/**
 * @file Plugin Waifu Achievements - Sistema de logros y trofeos
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de logros, trofeos, marcas personales y salón de la fama
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
  maxActiveAchievements: 50,
  achievementPointsPerLevel: 10,
  badgeDisplayLimit: 5,
  leaderboardSize: 10,
  notificationCooldown: 5 * 60 * 1000 // 5 minutos
};

// Sistema de logging
const achievementsLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[ACHIEVEMENTS] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[ACHIEVEMENTS] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[ACHIEVEMENTS] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[ACHIEVEMENTS] ❌ ${message}`)
};

// Categorías de logros
const ACHIEVEMENT_CATEGORIES = {
  COLLECTION: 'collection',
  BATTLE: 'battle',
  SOCIAL: 'social',
  ECONOMY: 'economy',
  CUSTOMIZATION: 'customization',
  EVENTS: 'events',
  MINIGAMES: 'minigames',
  MILESTONES: 'milestones',
  SPECIAL: 'special'
};

// Tipos de logros
const ACHIEVEMENT_TYPES = {
  PROGRESSION: 'progression',
  ACCUMULATION: 'accumulation',
  STREAK: 'streak',
  TIME_BASED: 'time_based',
  COMPLETION: 'completion',
  RANKING: 'ranking',
  EXPLORATION: 'exploration',
  MASTERY: 'mastery'
};

// Definiciones de logros
const ACHIEVEMENT_DEFINITIONS = {
  // Logros de Colección
  first_waifu: {
    id: 'first_waifu',
    name: 'Primera Waifu',
    emoji: '🌟',
    category: ACHIEVEMENT_CATEGORIES.COLLECTION,
    type: ACHIEVEMENT_TYPES.PROGRESSION,
    description: 'Reclama tu primera waifu',
    requirement: 'Reclamar 1 waifu',
    points: 10,
    reward: { coins: 100, exp: 50 },
    condition: { type: 'waifu_count', value: 1 },
    hidden: false
  },
  waifu_collector_10: {
    id: 'waifu_collector_10',
    name: 'Coleccionista Principiante',
    emoji: '📚',
    category: ACHIEVEMENT_CATEGORIES.COLLECTION,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Colecciona 10 waifus diferentes',
    requirement: 'Tener 10 waifus',
    points: 25,
    reward: { coins: 500, exp: 200 },
    condition: { type: 'waifu_count', value: 10 },
    hidden: false
  },
  waifu_collector_50: {
    id: 'waifu_collector_50',
    name: 'Coleccionista Experto',
    emoji: '📖',
    category: ACHIEVEMENT_CATEGORIES.COLLECTION,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Colecciona 50 waifus diferentes',
    requirement: 'Tener 50 waifus',
    points: 100,
    reward: { coins: 2500, exp: 1000, badge: 'expert_collector' },
    condition: { type: 'waifu_count', value: 50 },
    hidden: false
  },
  rare_hunter: {
    id: 'rare_hunter',
    name: 'Cazador de Rarezas',
    emoji: '💎',
    category: ACHIEVEMENT_CATEGORIES.COLLECTION,
    type: ACHIEVEMENT_TYPES.COMPLETION,
    description: 'Colecciona 5 waifus raras o superiores',
    requirement: 'Tener 5 waifus raras+',
    points: 50,
    reward: { coins: 1000, exp: 500 },
    condition: { type: 'rare_waifus', value: 5 },
    hidden: false
  },
  anime_master: {
    id: 'anime_master',
    name: 'Maestro del Anime',
    emoji: '🎬',
    category: ACHIEVEMENT_CATEGORIES.COLLECTION,
    type: ACHIEVEMENT_TYPES.COMPLETION,
    description: 'Colecciona waifus de 10 animes diferentes',
    requirement: 'Waifus de 10 animes',
    points: 75,
    reward: { coins: 1500, exp: 750 },
    condition: { type: 'anime_variety', value: 10 },
    hidden: false
  },
  
  // Logros de Batalla
  first_battle: {
    id: 'first_battle',
    name: 'Primera Batalla',
    emoji: '⚔️',
    category: ACHIEVEMENT_CATEGORIES.BATTLE,
    type: ACHIEVEMENT_TYPES.PROGRESSION,
    description: 'Participa en tu primera batalla',
    requirement: 'Participar en 1 batalla',
    points: 15,
    reward: { coins: 150, exp: 75 },
    condition: { type: 'battle_count', value: 1 },
    hidden: false
  },
  battle_veteran: {
    id: 'battle_veteran',
    name: 'Veterano de Batalla',
    emoji: '🛡️',
    category: ACHIEVEMENT_CATEGORIES.BATTLE,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Participa en 100 batallas',
    requirement: '100 batallas',
    points: 150,
    reward: { coins: 3000, exp: 1500 },
    condition: { type: 'battle_count', value: 100 },
    hidden: false
  },
  battle_champion: {
    id: 'battle_champion',
    name: 'Campeón de Batalla',
    emoji: '🏆',
    category: ACHIEVEMENT_CATEGORIES.BATTLE,
    type: ACHIEVEMENT_TYPES.RANKING,
    description: 'Gana 50 batallas',
    requirement: '50 victorias',
    points: 200,
    reward: { coins: 5000, exp: 2500, badge: 'battle_champion' },
    condition: { type: 'battle_wins', value: 50 },
    hidden: false
  },
  undefeated_streak: {
    id: 'undefeated_streak',
    name: 'Invicto',
    emoji: '🔥',
    category: ACHIEVEMENT_CATEGORIES.BATTLE,
    type: ACHIEVEMENT_TYPES.STREAK,
    description: 'Gana 10 batallas seguidas',
    requirement: '10 victorias seguidas',
    points: 100,
    reward: { coins: 2000, exp: 1000 },
    condition: { type: 'win_streak', value: 10 },
    hidden: false
  },
  
  // Logros Sociales
  social_butterfly: {
    id: 'social_butterfly',
    name: 'Mariposa Social',
    emoji: '🦋',
    category: ACHIEVEMENT_CATEGORIES.SOCIAL,
    type: ACHIEVEMENT_TYPES.PROGRESSION,
    description: 'Agrega tu primer amigo',
    requirement: '1 amigo',
    points: 20,
    reward: { coins: 200, exp: 100 },
    condition: { type: 'friend_count', value: 1 },
    hidden: false
  },
  friend_network: {
    id: 'friend_network',
    name: 'Red de Amigos',
    emoji: '👥',
    category: ACHIEVEMENT_CATEGORIES.SOCIAL,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Tiene 20 amigos',
    requirement: '20 amigos',
    points: 80,
    reward: { coins: 1600, exp: 800 },
    condition: { type: 'friend_count', value: 20 },
    hidden: false
  },
  gift_giver: {
    id: 'gift_giver',
    name: 'Generoso',
    emoji: '🎁',
    category: ACHIEVEMENT_CATEGORIES.SOCIAL,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Envía 50 regalos',
    requirement: '50 regalos enviados',
    points: 60,
    reward: { coins: 1200, exp: 600 },
    condition: { type: 'gifts_sent', value: 50 },
    hidden: false
  },
  party_host: {
    id: 'party_host',
    name: 'Anfitrión de Fiestas',
    emoji: '🎉',
    category: ACHIEVEMENT_CATEGORIES.SOCIAL,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Organiza 10 fiestas',
    requirement: '10 fiestas',
    points: 70,
    reward: { coins: 1400, exp: 700 },
    condition: { type: 'parties_hosted', value: 10 },
    hidden: false
  },
  
  // Logros Económicos
  first_purchase: {
    id: 'first_purchase',
    name: 'Comprador Principiante',
    emoji: '💰',
    category: ACHIEVEMENT_CATEGORIES.ECONOMY,
    type: ACHIEVEMENT_TYPES.PROGRESSION,
    description: 'Compra tu primera waifu',
    requirement: '1 compra',
    points: 15,
    reward: { coins: 100, exp: 50 },
    condition: { type: 'purchases_made', value: 1 },
    hidden: false
  },
  wealthy_collector: {
    id: 'wealthy_collector',
    name: 'Coleccionista Adinerado',
    emoji: '💎',
    category: ACHIEVEMENT_CATEGORIES.ECONOMY,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Gasta 100,000 💎 en waifus',
    requirement: '100,000 💎 gastados',
    points: 120,
    reward: { coins: 5000, exp: 2500 },
    condition: { type: 'total_spent', value: 100000 },
    hidden: false
  },
  market_trader: {
    id: 'market_trader',
    name: 'Comerciante del Mercado',
    emoji: '🏪',
    category: ACHIEVEMENT_CATEGORIES.ECONOMY,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Realiza 50 transacciones en el mercado',
    requirement: '50 transacciones',
    points: 90,
    reward: { coins: 3000, exp: 1500 },
    condition: { type: 'market_transactions', value: 50 },
    hidden: false
  },
  auction_winner: {
    id: 'auction_winner',
    name: 'Ganador de Subastas',
    emoji: '🏛️',
    category: ACHIEVEMENT_CATEGORIES.ECONOMY,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Gana 10 subastas',
    requirement: '10 subastas ganadas',
    points: 100,
    reward: { coins: 4000, exp: 2000 },
    condition: { type: 'auctions_won', value: 10 },
    hidden: false
  },
  
  // Logros de Personalización
  fashion_designer: {
    id: 'fashion_designer',
    name: 'Diseñador de Moda',
    emoji: '👗',
    category: ACHIEVEMENT_CATEGORIES.CUSTOMIZATION,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Compra 20 outfits diferentes',
    requirement: '20 outfits',
    points: 80,
    reward: { coins: 2000, exp: 1000 },
    condition: { type: 'outfits_owned', value: 20 },
    hidden: false
  },
  interior_decorator: {
    id: 'interior_decorator',
    name: 'Decorador de Interiores',
    emoji: '🏠',
    category: ACHIEVEMENT_CATEGORIES.CUSTOMIZATION,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Decora 15 cuartos de waifus',
    requirement: '15 cuartos decorados',
    points: 70,
    reward: { coins: 1500, exp: 750 },
    condition: { type: 'rooms_decorated', value: 15 },
    hidden: false
  },
  photographer: {
    id: 'photographer',
    name: 'Fotógrafo',
    emoji: '📸',
    category: ACHIEVEMENT_CATEGORIES.CUSTOMIZATION,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Toma 50 fotos de waifus',
    requirement: '50 fotos',
    points: 60,
    reward: { coins: 1200, exp: 600 },
    condition: { type: 'photos_taken', value: 50 },
    hidden: false
  },
  
  // Logros de Eventos
  event_participant: {
    id: 'event_participant',
    name: 'Participante Activo',
    emoji: '🎊',
    category: ACHIEVEMENT_CATEGORIES.EVENTS,
    type: ACHIEVEMENT_TYPES.PROGRESSION,
    description: 'Participa en tu primer evento',
    requirement: '1 evento',
    points: 25,
    reward: { coins: 500, exp: 250 },
    condition: { type: 'events_participated', value: 1 },
    hidden: false
  },
  event_enthusiast: {
    id: 'event_enthusiast',
    name: 'Entusiasta de Eventos',
    emoji: '🎉',
    category: ACHIEVEMENT_CATEGORIES.EVENTS,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Participa en 20 eventos',
    requirement: '20 eventos',
    points: 150,
    reward: { coins: 4000, exp: 2000 },
    condition: { type: 'events_participated', value: 20 },
    hidden: false
  },
  
  // Logros de Minijuegos
  game_master: {
    id: 'game_master',
    name: 'Maestro de Juegos',
    emoji: '🎮',
    category: ACHIEVEMENT_CATEGORIES.MINIGAMES,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Juega 100 minijuegos',
    requirement: '100 juegos',
    points: 100,
    reward: { coins: 2500, exp: 1250 },
    condition: { type: 'games_played', value: 100 },
    hidden: false
  },
  quiz_champion: {
    id: 'quiz_champion',
    name: 'Campeón de Quizzes',
    emoji: '🧠',
    category: ACHIEVEMENT_CATEGORIES.MINIGAMES,
    type: ACHIEVEMENT_TYPES.ACCUMULATION,
    description: 'Gana 50 quizzes',
    requirement: '50 quizzes ganados',
    points: 80,
    reward: { coins: 2000, exp: 1000 },
    condition: { type: 'quizzes_won', value: 50 },
    hidden: false
  },
  
  // Logros de Hitos
  level_10: {
    id: 'level_10',
    name: 'Nivel 10',
    emoji: '📈',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    type: ACHIEVEMENT_TYPES.PROGRESSION,
    description: 'Alcanza el nivel 10 con cualquier waifu',
    requirement: 'Waifu nivel 10',
    points: 30,
    reward: { coins: 300, exp: 150 },
    condition: { type: 'max_waifu_level', value: 10 },
    hidden: false
  },
  level_50: {
    id: 'level_50',
    name: 'Maestro de Niveles',
    emoji: '⭐',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    type: ACHIEVEMENT_TYPES.PROGRESSION,
    description: 'Alcanza el nivel 50 con cualquier waifu',
    requirement: 'Waifu nivel 50',
    points: 100,
    reward: { coins: 2000, exp: 1000 },
    condition: { type: 'max_waifu_level', value: 50 },
    hidden: false
  },
  level_100: {
    id: 'level_100',
    name: 'Leyenda de Niveles',
    emoji: '👑',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    type: ACHIEVEMENT_TYPES.PROGRESSION,
    description: 'Alcanza el nivel 100 con cualquier waifu',
    requirement: 'Waifu nivel 100',
    points: 200,
    reward: { coins: 10000, exp: 5000, badge: 'level_master' },
    condition: { type: 'max_waifu_level', value: 100 },
    hidden: false
  },
  
  // Logros Especiales
  early_adopter: {
    id: 'early_adopter',
    name: 'Adoptador Temprano',
    emoji: '🌅',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    type: ACHIEVEMENT_TYPES.TIME_BASED,
    description: 'Regístrate durante la primera semana',
    requirement: 'Registro temprano',
    points: 50,
    reward: { coins: 1000, exp: 500, badge: 'early_adopter' },
    condition: { type: 'early_registration', value: true },
    hidden: true
  },
  dedication_master: {
    id: 'dedication_master',
    name: 'Maestro de la Dedicación',
    emoji: '💪',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    type: ACHIEVEMENT_TYPES.STREAK,
    description: 'Interactúa con waifus por 30 días seguidos',
    requirement: '30 días seguidos',
    points: 150,
    reward: { coins: 5000, exp: 2500 },
    condition: { type: 'daily_streak', value: 30 },
    hidden: false
  }
};

/**
 * Sistema de logros y trofeos
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.logros':
        await showAchievements(sock, m, userId);
        break;
      case '.progreso_logros':
        await showAchievementProgress(sock, m, userId);
        break;
      case '.salon_fama':
        await showHallOfFame(sock, m, userId);
        break;
      case '.marcas':
        await showPersonalRecords(sock, m, userId);
        break;
      case '.estadisticas_logros':
        await showAchievementStats(sock, m, userId);
        break;
      case '.reclamar_premio':
        await claimReward(sock, m, userId, text);
        break;
      case '.logros_globales':
        await showGlobalAchievements(sock, m, userId);
        break;
      default:
        achievementsLogger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    achievementsLogger.error('Error en el sistema de logros:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de logros. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Muestra los logros del usuario
 */
async function showAchievements(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userAchievements = await getUserAchievements(userId);
    const totalPoints = userAchievements.reduce((sum, a) => sum + ACHIEVEMENT_DEFINITIONS[a.achievement_id]?.points || 0, 0);
    const unlockedCount = userAchievements.length;
    const totalCount = Object.keys(ACHIEVEMENT_DEFINITIONS).length;
    
    let achievementsMessage = `🏆 *LOGROS DESBLOQUEADOS* 🏆\n\n`;
    achievementsMessage += `👤 *@${userId.split('@')[0]}*\n`;
    achievementsMessage += `⭐ *Puntos totales:* ${totalPoints.toLocaleString()}\n`;
    achievementsMessage += `🏆 *Logros:* ${unlockedCount}/${totalCount}\n`;
    achievementsMessage += `📊 *Progreso:* ${Math.round((unlockedCount / totalCount) * 100)}%\n\n`;
    
    // Agrupar por categorías
    const achievementsByCategory = {};
    userAchievements.forEach(achievement => {
      const def = ACHIEVEMENT_DEFINITIONS[achievement.achievement_id];
      if (def) {
        if (!achievementsByCategory[def.category]) {
          achievementsByCategory[def.category] = [];
        }
        achievementsByCategory[def.category].push({ ...achievement, ...def });
      }
    });
    
    // Mostrar logros por categorías
    Object.entries(achievementsByCategory).forEach(([category, achievements]) => {
      const categoryName = getCategoryName(category);
      achievementsMessage += `${getCategoryEmoji(category)} *${categoryName}*\n`;
      
      achievements.forEach((achievement, index) => {
        achievementsMessage += `${index + 1}. ${achievement.emoji} *${achievement.name}*\n`;
        achievementsMessage += `   📝 ${achievement.description}\n`;
        achievementsMessage += `   ⭐ ${achievement.points} puntos\n`;
        achievementsMessage += `   📅 Desbloqueado: ${new Date(achievement.unlocked_at).toLocaleDateString()}\n\n`;
      });
    });
    
    if (unlockedCount === 0) {
      achievementsMessage += `📦 *No tienes logros desbloqueados*\n\n`;
      achievementsMessage += `💡 *Usa \`.progreso_logros\` para ver tu progreso\n`;
      achievementsMessage += `🎯 *Completa actividades para desbloquear logros`;
    }
    
    achievementsMessage += `💡 *Comandos disponibles:*\n`;
    achievementsMessage += `• \`.progreso_logros\` - Ver progreso de logros\n`;
    achievementsMessage += `• \`.salon_fama\` - Ver salón de la fama\n`;
    achievementsMessage += `• \`.marcas\` - Ver marcas personales\n`;
    achievementsMessage += `• \`.reclamar_premio <logro>\` - Reclamar premio`;
    
    await sock.sendMessage(chatId, { 
      text: achievementsMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    achievementsLogger.error('Error al mostrar logros:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar los logros.'
    }, { quoted: m });
  }
}

/**
 * Muestra el progreso de logros
 */
async function showAchievementProgress(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userAchievements = await getUserAchievements(userId);
    const userStats = await getUserStats(userId);
    
    let progressMessage = `📊 *PROGRESO DE LOGROS* 📊\n\n`;
    progressMessage += `👤 *@${userId.split('@')[0]}*\n`;
    progressMessage += `🏆 *Logros desbloqueados:* ${userAchievements.length}/${Object.keys(ACHIEVEMENT_DEFINITIONS).length}\n\n`;
    
    // Mostrar progreso por categorías
    Object.values(ACHIEVEMENT_CATEGORIES).forEach(category => {
      const categoryName = getCategoryName(category);
      const categoryAchievements = Object.values(ACHIEVEMENT_DEFINITIONS).filter(a => a.category === category);
      const unlockedInCategory = userAchievements.filter(a => {
        const def = ACHIEVEMENT_DEFINITIONS[a.achievement_id];
        return def && def.category === category;
      });
      
      progressMessage += `${getCategoryEmoji(category)} *${categoryName}*\n`;
      progressMessage += `   📊 Progreso: ${unlockedInCategory.length}/${categoryAchievements.length}\n`;
      
      // Mostrar próximos logros a desbloquear
      const nextAchievements = categoryAchievements.filter(def => {
        return !userAchievements.find(a => a.achievement_id === def.id);
      }).slice(0, 3);
      
      if (nextAchievements.length > 0) {
        progressMessage += `   🎯 *Próximos logros:*\n`;
        nextAchievements.forEach((achievement, index) => {
          const progress = calculateProgress(userId, achievement);
          progressMessage += `     ${index + 1}. ${achievement.emoji} ${achievement.name} (${progress}%)\n`;
        });
      }
      
      progressMessage += `\n`;
    });
    
    // Estadísticas generales
    progressMessage += `📈 *ESTADÍSTICAS GENERALES:*\n`;
    progressMessage += `• Waifus: ${userStats.waifuCount || 0}\n`;
    progressMessage += `• Batallas: ${userStats.battleCount || 0}\n`;
    progressMessage += `• Amigos: ${userStats.friendCount || 0}\n`;
    progressMessage += `• Dinero gastado: ${(userStats.totalSpent || 0).toLocaleString()} 💎\n\n`;
    
    progressMessage += `💡 *Consejos para desbloquear más logros:*\n`;
    progressMessage += `• Colecciona más waifus\n`;
    progressMessage += `• Participa en batallas\n`;
    progressMessage += `• Haz amigos y participa en eventos\n`;
    progressMessage += `• Personaliza tus waifus`;
    
    await sock.sendMessage(chatId, { 
      text: progressMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    achievementsLogger.error('Error al mostrar progreso de logros:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el progreso de logros.'
    }, { quoted: m });
  }
}

/**
 * Muestra el salón de la fama
 */
async function showHallOfFame(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const leaderboard = await getLeaderboard();
    const userRank = await getUserRank(userId);
    const userPoints = await getUserTotalPoints(userId);
    
    let hallMessage = `🏛️ *SALÓN DE LA FAMA* 🏛️\n\n`;
    hallMessage += `👤 *@${userId.split('@')[0]}*\n`;
    hallMessage += `🏆 *Tu puesto:* ${userRank || 'N/A'}\n`;
    hallMessage += `⭐ *Tus puntos:* ${userPoints.toLocaleString()}\n\n`;
    
    hallMessage += `🏆 *TOP ${CONFIG.leaderboardSize} JUGADORES:*\n\n`;
    
    leaderboard.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      hallMessage += `${medal} *@${player.username.split('@')[0]}*\n`;
      hallMessage += `   ⭐ ${player.points.toLocaleString()} puntos\n`;
      hallMessage += `   🏆 ${player.achievements} logros\n\n`;
    });
    
    hallMessage += `💡 *Sube en el ranking desbloqueando más logros*\n`;
    hallMessage += `🎯 *Cada logro te da puntos para el ranking*\n`;
    hallMessage += `⏰ *El ranking se actualiza diariamente`;
    
    await sock.sendMessage(chatId, { 
      text: hallMessage, 
      mentions: [userId, ...leaderboard.map(p => p.username)] 
    }, { quoted: m });
    
  } catch (error) {
    achievementsLogger.error('Error al mostrar salón de la fama:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el salón de la fama.'
    }, { quoted: m });
  }
}

/**
 * Muestra marcas personales
 */
async function showPersonalRecords(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const records = await getPersonalRecords(userId);
    
    let recordsMessage = `🎯 *MARCAS PERSONALES* 🎯\n\n`;
    recordsMessage += `👤 *@${userId.split('@')[0]}*\n\n`;
    
    recordsMessage += `📊 *TUS RÉCORDS:*\n\n`;
    
    if (records.length === 0) {
      recordsMessage += `📦 *No tienes récords registrados*\n\n`;
      recordsMessage += `💡 *Juga más para establecer récords*`;
    } else {
      records.forEach((record, index) => {
        const emoji = getRecordEmoji(record.type);
        recordsMessage += `${index + 1}. ${emoji} *${record.name}*\n`;
        recordsMessage += `   📊 Valor: ${record.value}\n`;
        recordsMessage += `   📅 Fecha: ${new Date(record.date).toLocaleDateString()}\n\n`;
      });
    }
    
    recordsMessage += `💡 *Comandos disponibles:*\n`;
    recordsMessage += `• \`.logros\` - Ver tus logros\n`;
    recordsMessage += `• \`.progreso_logros\` - Ver tu progreso\n`;
    recordsMessage += `• \`.salon_fama\` - Ver ranking global`;
    
    await sock.sendMessage(chatId, { 
      text: recordsMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    achievementsLogger.error('Error al mostrar marcas personales:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las marcas personales.'
    }, { quoted: m });
  }
}

/**
 * Muestra estadísticas de logros
 */
async function showAchievementStats(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userAchievements = await getUserAchievements(userId);
    const userStats = await getUserStats(userId);
    const globalStats = await getGlobalStats();
    
    let statsMessage = `📊 *ESTADÍSTICAS DE LOGROS* 📊\n\n`;
    statsMessage += `👤 *@${userId.split('@')[0]}*\n\n`;
    
    statsMessage += `🎯 *TUS ESTADÍSTICAS:*\n`;
    statsMessage += `• Logros desbloqueados: ${userAchievements.length}\n`;
    statsMessage += `• Puntos totales: ${userAchievements.reduce((sum, a) => sum + (ACHIEVEMENT_DEFINITIONS[a.achievement_id]?.points || 0), 0)}\n`;
    statsMessage += `• Categorías completadas: ${await getCompletedCategories(userId)}\n`;
    statsMessage += `• Logros ocultos encontrados: ${userAchievements.filter(a => ACHIEVEMENT_DEFINITIONS[a.achievement_id]?.hidden).length}\n\n`;
    
    statsMessage += `📈 *ACTIVIDAD RECIENTE:*\n`;
    statsMessage += `• Waifus: ${userStats.waifuCount || 0}\n`;
    statsMessage += `• Batallas: ${userStats.battleCount || 0}\n`;
    statsMessage += `• Victorias: ${userStats.battleWins || 0}\n`;
    statsMessage += `• Amigos: ${userStats.friendCount || 0}\n`;
    statsMessage += `• Dinero gastado: ${(userStats.totalSpent || 0).toLocaleString()} 💎\n\n`;
    
    statsMessage += `🌍 *ESTADÍSTICAS GLOBALES:*\n`;
    statsMessage += `• Total de jugadores: ${globalStats.totalPlayers}\n`;
    statsMessage += `• Logros desbloqueados: ${globalStats.totalAchievements}\n`;
    statsMessage += `• Promedio de logros por jugador: ${Math.round(globalStats.totalAchievements / globalStats.totalPlayers)}\n`;
    statsMessage += `• Logro más común: ${globalStats.mostCommonAchievement}\n`;
    statsMessage += `• Categoría más popular: ${getCategoryName(globalStats.mostPopularCategory)}\n\n`;
    
    statsMessage += `💡 *Mejora tus estadísticas:*\n`;
    statsMessage += `• Desbloquea más logros\n`;
    statsMessage += `• Participa en diferentes actividades\n`;
    statsMessage += `• Completa logros de todas las categorías`;
    
    await sock.sendMessage(chatId, { 
      text: statsMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    achievementsLogger.error('Error al mostrar estadísticas de logros:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las estadísticas de logros.'
    }, { quoted: m });
  }
}

/**
 * Reclama un premio de logro
 */
async function claimReward(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const achievementId = args[0];
  
  if (!achievementId) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el ID del logro.\n\n' +
            '💡 *Uso:* `.reclamar_premio <id_logro>`\n' +
            '*Ejemplo:* `.reclamar_premio first_waifu`'
    }, { quoted: m });
  }
  
  try {
    const achievementDef = ACHIEVEMENT_DEFINITIONS[achievementId];
    
    if (!achievementDef) {
      return await sock.sendMessage(chatId, {
        text: `❌ Logro no válido.\n\n` +
              '*Usa \`.logros\` para ver tus logros disponibles*'
      }, { quoted: m });
    }
    
    // Verificar si el usuario tiene el logro
    const userAchievement = await db.get(
      'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
      [userId, achievementId]
    );
    
    if (!userAchievement) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes desbloqueado el logro "${achievementDef.name}".`
      }, { quoted: m });
    }
    
    // Verificar si ya se reclamó el premio
    if (userAchievement.reward_claimed) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya reclamaste el premio del logro "${achievementDef.name}".`
      }, { quoted: m });
    }
    
    // Dar el premio
    const reward = achievementDef.reward;
    let rewardMessage = `🎁 *PREMIO RECLAMADO* 🎁\n\n`;
    rewardMessage += `👤 *@${userId.split('@')[0]}*\n`;
    rewardMessage += `🏆 *Logro:* ${achievementDef.emoji} ${achievementDef.name}\n\n`;
    rewardMessage += `💝 *Premio recibido:*\n`;
    
    if (reward.coins) {
      await updateUserBalance(userId, reward.coins);
      rewardMessage += `• 💎 ${reward.coins.toLocaleString()} monedas\n`;
    }
    
    if (reward.exp) {
      // Dar EXP a la primera waifu del usuario
      const firstWaifu = await getUserFirstWaifu(userId);
      if (firstWaifu) {
        await addWaifuExp(firstWaifu.id, userId, reward.exp);
        rewardMessage += `• ✨ ${reward.exp} EXP para ${firstWaifu.name}\n`;
      }
    }
    
    if (reward.badge) {
      rewardMessage += `• 🎖️ Insignia "${reward.badge}"\n`;
    }
    
    // Marcar como reclamado
    await db.run(
      'UPDATE user_achievements SET reward_claimed = 1, claimed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND achievement_id = ?',
      [userId, achievementId]
    );
    
    rewardMessage += `\n✅ *¡Premio reclamado con éxito!*`;
    
    await sock.sendMessage(chatId, { 
      text: rewardMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    achievementsLogger.success(`Premio reclamado - usuario: ${userId} - logro: ${achievementId}`);
    
  } catch (error) {
    achievementsLogger.error('Error al reclamar premio:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al reclamar el premio.'
    }, { quoted: m });
  }
}

/**
 * Muestra logros globales
 */
async function showGlobalAchievements(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const globalStats = await getGlobalStats();
    const recentAchievements = await getRecentAchievements();
    
    let globalMessage = `🌍 *LOGROS GLOBALES* 🌍\n\n`;
    globalMessage += `👤 *@${userId.split('@')[0]}*\n\n`;
    
    globalMessage += `📊 *ESTADÍSTICAS MUNDIALES:*\n`;
    globalMessage += `• Total de jugadores: ${globalStats.totalPlayers.toLocaleString()}\n`;
    globalMessage += `• Logros desbloqueados: ${globalStats.totalAchievements.toLocaleString()}\n`;
    globalMessage += `• Promedio por jugador: ${Math.round(globalStats.totalAchievements / globalStats.totalPlayers)}\n`;
    globalMessage += `• Logro más común: ${globalStats.mostCommonAchievement}\n`;
    globalMessage += `• Categoría más popular: ${getCategoryName(globalStats.mostPopularCategory)}\n\n`;
    
    globalMessage += `🏆 *TOP 5 LOGROS MÁS DESBLOQUEADOS:*\n\n`;
    
    Object.entries(globalStats.achievementCounts || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([achievementId, count], index) => {
        const def = ACHIEVEMENT_DEFINITIONS[achievementId];
        if (def) {
          globalMessage += `${index + 1}. ${def.emoji} *${def.name}*\n`;
          globalMessage += `   📊 Desbloqueado por ${count} jugadores\n\n`;
        }
      });
    
    globalMessage += `🕐 *LOGROS RECIENTES:*\n\n`;
    
    recentAchievements.slice(0, 5).forEach((achievement, index) => {
      const def = ACHIEVEMENT_DEFINITIONS[achievement.achievement_id];
      if (def) {
        globalMessage += `${index + 1}. *@${achievement.username.split('@')[0]}* desbloqueó ${def.emoji} *${def.name}*\n`;
        globalMessage += `   📅 ${new Date(achievement.unlocked_at).toLocaleDateString()}\n\n`;
      }
    });
    
    await sock.sendMessage(chatId, { 
      text: globalMessage, 
      mentions: [userId, ...recentAchievements.map(a => a.username)] 
    }, { quoted: m });
    
  } catch (error) {
    achievementsLogger.error('Error al mostrar logros globales:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar los logros globales.'
    }, { quoted: m });
  }
}

/**
 * Funciones auxiliares
 */
async function getUserAchievements(userId) {
  try {
    const achievements = await db.all(
      'SELECT * FROM user_achievements WHERE user_id = ? ORDER BY unlocked_at DESC',
      [userId]
    );
    return achievements;
  } catch (error) {
    achievementsLogger.error('Error al obtener logros de usuario:', error);
    return [];
  }
}

async function getUserStats(userId) {
  try {
    const stats = await db.get(
      'SELECT COUNT(DISTINCT character_id) as waifuCount, COUNT(*) as battleCount, SUM(CASE WHEN result = "win" THEN 1 ELSE 0 END) as battleWins, COUNT(DISTINCT friend_id) as friendCount, SUM(price) as totalSpent FROM claimed_characters cc LEFT JOIN battle_results br ON cc.user_id = br.user_id LEFT JOIN friendships f ON cc.user_id = f.user_id LEFT JOIN claimed_characters wc ON wc.user_id = cc.user_id WHERE cc.user_id = ?',
      [userId]
    );
    return stats || {};
  } catch (error) {
    achievementsLogger.error('Error al obtener estadísticas de usuario:', error);
    return {};
  }
}

async function getLeaderboard() {
  try {
    const leaderboard = await db.all(`
      SELECT ua.user_id, u.username, COUNT(*) as achievements, SUM(ad.points) as points
      FROM user_achievements ua
      JOIN achievement_definitions ad ON ua.achievement_id = ad.id
      JOIN users u ON ua.user_id = u.chatId
      GROUP BY ua.user_id, u.username
      ORDER BY points DESC
      LIMIT ?
    `, [CONFIG.leaderboardSize]);
    
    return leaderboard;
  } catch (error) {
    achievementsLogger.error('Error al obtener leaderboard:', error);
    return [];
  }
}

async function getUserRank(userId) {
  try {
    const rank = await db.get(`
      SELECT COUNT(*) + 1 as rank FROM (
        SELECT ua.user_id, SUM(ad.points) as points
        FROM user_achievements ua
        JOIN achievement_definitions ad ON ua.achievement_id = ad.id
        GROUP BY ua.user_id
        ORDER BY points DESC
      ) WHERE points > (SELECT SUM(ad.points) FROM user_achievements ua JOIN achievement_definitions ad ON ua.achievement_id = ad.id WHERE ua.user_id = ?)
    `, [userId]);
    
    return rank.rank;
  } catch (error) {
    achievementsLogger.error('Error al obtener rango de usuario:', error);
    return null;
  }
}

async function getUserTotalPoints(userId) {
  try {
    const points = await db.get(
      'SELECT SUM(ad.points) as points FROM user_achievements ua JOIN achievement_definitions ad ON ua.achievement_id = ad.id WHERE ua.user_id = ?',
      [userId]
    );
    return points.points || 0;
  } catch (error) {
    achievementsLogger.error('Error al obtener puntos de usuario:', error);
    return 0;
  }
}

function calculateProgress(userId, achievement) {
  // Esta función debería calcular el progreso real basado en las estadísticas del usuario
  // Por ahora, devuelve un valor simulado
  return Math.floor(Math.random() * 100);
}

function getCategoryName(category) {
  const categoryNames = {
    collection: 'Colección',
    battle: 'Batalla',
    social: 'Social',
    economy: 'Economía',
    customization: 'Personalización',
    events: 'Eventos',
    minigames: 'Minijuegos',
    milestones: 'Hitos',
    special: 'Especial'
  };
  return categoryNames[category] || category;
}

function getCategoryEmoji(category) {
  const categoryEmojis = {
    collection: '📚',
    battle: '⚔️',
    social: '👥',
    economy: '💰',
    customization: '🎨',
    events: '🎉',
    minigames: '🎮',
    milestones: '📈',
    special: '✨'
  };
  return categoryEmojis[category] || '🏆';
}

function getRecordEmoji(type) {
  const recordEmojis = {
    waifu_count: '📚',
    battle_count: '⚔️',
    battle_wins: '🏆',
    friend_count: '👥',
    total_spent: '💰',
    max_level: '⭐'
  };
  return recordEmojis[type] || '🎯';
}

async function getPersonalRecords(userId) {
  try {
    const records = await db.all(
      'SELECT * FROM personal_records WHERE user_id = ? ORDER BY value DESC LIMIT 10',
      [userId]
    );
    return records;
  } catch (error) {
    achievementsLogger.error('Error al obtener récords personales:', error);
    return [];
  }
}

async function getCompletedCategories(userId) {
  try {
    const userAchievements = await getUserAchievements(userId);
    const completedCategories = new Set();
    
    userAchievements.forEach(achievement => {
      const def = ACHIEVEMENT_DEFINITIONS[achievement.achievement_id];
      if (def) {
        const categoryAchievements = Object.values(ACHIEVEMENT_DEFINITIONS).filter(a => a.category === def.category);
        const userCategoryAchievements = userAchievements.filter(a => {
          const userDef = ACHIEVEMENT_DEFINITIONS[a.achievement_id];
          return userDef && userDef.category === def.category;
        });
        
        if (userCategoryAchievements.length === categoryAchievements.length) {
          completedCategories.add(def.category);
        }
      }
    });
    
    return completedCategories.size;
  } catch (error) {
    achievementsLogger.error('Error al calcular categorías completadas:', error);
    return 0;
  }
}

async function getGlobalStats() {
  try {
    const stats = await db.get(`
      SELECT COUNT(DISTINCT ua.user_id) as totalPlayers,
             COUNT(*) as totalAchievements
      FROM user_achievements ua
    `);
    
    // Obtener logro más común
    const mostCommon = await db.get(`
      SELECT ua.achievement_id, COUNT(*) as count
      FROM user_achievements ua
      GROUP BY ua.achievement_id
      ORDER BY count DESC
      LIMIT 1
    `);
    
    // Obtener categoría más popular
    const mostPopularCategory = await db.get(`
      SELECT ad.category, COUNT(*) as count
      FROM user_achievements ua
      JOIN achievement_definitions ad ON ua.achievement_id = ad.id
      GROUP BY ad.category
      ORDER BY count DESC
      LIMIT 1
    `);
    
    return {
      ...stats,
      mostCommonAchievement: mostCommon ? ACHIEVEMENT_DEFINITIONS[mostCommon.achievement_id]?.name || 'Desconocido' : 'N/A',
      mostPopularCategory: mostPopularCategory?.category || 'N/A'
    };
  } catch (error) {
    achievementsLogger.error('Error al obtener estadísticas globales:', error);
    return {};
  }
}

async function getRecentAchievements() {
  try {
    const recent = await db.all(`
      SELECT ua.*, u.username
      FROM user_achievements ua
      JOIN users u ON ua.user_id = u.chatId
      ORDER BY ua.unlocked_at DESC
      LIMIT 10
    `);
    return recent;
  } catch (error) {
    achievementsLogger.error('Error al obtener logros recientes:', error);
    return [];
  }
}

async function updateUserBalance(userId, amount) {
  try {
    await db.run('UPDATE usuarios SET saldo = saldo + ? WHERE chatId = ?', [amount, userId]);
  } catch (error) {
    achievementsLogger.error('Error al actualizar saldo:', error);
  }
}

async function addWaifuExp(characterId, userId, exp) {
  try {
    // Esta función debería implementarse en el core
    achievementsLogger.info(`EXP añadido - waifu: ${characterId} - usuario: ${userId} - exp: ${exp}`);
  } catch (error) {
    achievementsLogger.error('Error al añadir EXP:', error);
  }
}

async function getUserFirstWaifu(userId) {
  try {
    const waifu = await db.get(
      'SELECT c.* FROM claimed_characters cc JOIN characters c ON cc.character_id = c.id WHERE cc.user_id = ? LIMIT 1',
      [userId]
    );
    return waifu;
  } catch (error) {
    achievementsLogger.error('Error al obtener primera waifu:', error);
    return null;
  }
}

// Inicializar tablas de logros
async function initializeAchievementTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT,
        achievement_id TEXT,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reward_claimed BOOLEAN DEFAULT 0,
        claimed_at DATETIME,
        PRIMARY KEY (user_id, achievement_id)
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS achievement_definitions (
        id TEXT PRIMARY KEY,
        name TEXT,
        emoji TEXT,
        category TEXT,
        type TEXT,
        description TEXT,
        requirement TEXT,
        points INTEGER,
        reward TEXT,
        condition TEXT,
        hidden BOOLEAN DEFAULT 0
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS personal_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        type TEXT,
        name TEXT,
        value INTEGER,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    achievementsLogger.success('Tablas de logros inicializadas');
  } catch (error) {
    achievementsLogger.error('Error al inicializar tablas de logros:', error);
  }
}

// Exportar configuración y funciones necesarias
export const command = ['.logros', '.progreso_logros', '.salon_fama', '.marcas', '.estadisticas_logros', '.reclamar_premio', '.logros_globales'];
export const alias = ['.achievements', '.achievement_progress', '.hall_of_fame', '.personal_records', '.achievement_stats', '.claim_reward', '.global_achievements'];
export const description = 'Sistema de logros, trofeos y salón de la fama';

// Inicializar sistema
initializeAchievementTables();
loadCharacters();

export { CONFIG, achievementsLogger, ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_TYPES, ACHIEVEMENT_DEFINITIONS };
