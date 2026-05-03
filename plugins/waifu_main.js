/**
 * @file Plugin Waifu Main - Plugin principal redirigido
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Plugin principal que redirige a los módulos especializados de waifus
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Importar desde el core
import { 
  characters, 
  loadCharacters, 
  getWaifuLevel, 
  getWaifuStats,
  getRarezaEmoji,
  getRarezaTexto,
  getRarezaFromPrice,
  getRarezaBonus,
  getExpForNextLevel,
  getExpProgress,
  addWaifuExp,
  logger
} from './waifu_core.js';

// Sistema de configuración principal
const CONFIG = {
  enableLogging: true,
  version: '2.0.0',
  modules: {
    interact: 'waifu_interact.js',
    evolution: 'waifu_evolution.js',
    battle: 'waifu_battle.js',
    shop: 'waifu_shop.js',
    collection: 'waifu_collection.js',
    events: 'waifu_events.js',
    minigames: 'waifu_minigames.js',
    social: 'waifu_social.js',
    economy: 'waifu_economy.js',
    customization: 'waifu_customization.js',
    abilities: 'waifu_abilities.js',
    achievements: 'waifu_achievements.js',
    world: 'waifu_world.js'
  }
};

/**
 * Función principal que redirige a los módulos especializados
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    // Comandos principales que se manejan aquí
    switch (command) {
      case '.waifus':
      case '.mywaifus':
      case '.vender':
      case '.coleccion':
      case '.waifuinfo':
      case '.claim':
        // Redirigir al módulo de colección básico (waifu.js)
        logger.info(`Redirigiendo comando ${command} al módulo básico de waifu`);
        const waifuModule = await import('./waifu.js');
        return await waifuModule.run(sock, m, { text, command });
        
      case '.interact':
      case '.interactuar':
        // Redirigir al módulo de interacción
        logger.info(`Redirigiendo comando ${command} al módulo de interacción`);
        return await redirectCommand('waifu_interact.js', sock, m, { text, command });
        
      case '.evolucion':
      case '.evol':
      case '.level':
        // Redirigir al módulo de evolución
        logger.info(`Redirigiendo comando ${command} al módulo de evolución`);
        return await redirectCommand('waifu_evolution.js', sock, m, { text, command });
        
      case '.batalla':
      case '.battle':
      case '.fight':
        // Redirigir al módulo de batalla
        logger.info(`Redirigiendo comando ${command} al módulo de batalla`);
        return await redirectCommand('waifu_battle.js', sock, m, { text, command });
        
      case '.tienda':
      case '.shop':
      case '.comprar':
      case '.buy':
        // Redirigir al módulo de tienda
        logger.info(`Redirigiendo comando ${command} al módulo de tienda`);
        return await redirectCommand('waifu_shop.js', sock, m, { text, command });
        
      // Nuevos comandos de eventos
      case '.evento':
      case '.eventos':
      case '.participar':
      case '.premios_evento':
        // Redirigir al módulo de eventos
        logger.info(`Redirigiendo comando ${command} al módulo de eventos`);
        return await redirectCommand('waifu_events.js', sock, m, { text, command });
        
      // Nuevos comandos de minijuegos
      case '.minijuego':
      case '.adivina':
      case '.quiz':
      case '.trivia':
      case '.respuesta':
      case '.pista':
      case '.estadisticas_juegos':
        // Redirigir al módulo de minijuegos
        logger.info(`Redirigiendo comando ${command} al módulo de minijuegos`);
        return await redirectCommand('waifu_minigames.js', sock, m, { text, command });
        
      // Nuevos comandos sociales
      case '.amigos':
      case '.agregar_amigo':
      case '.visitar':
      case '.regalar':
      case '.fiesta':
      case '.unirse_fiesta':
      case '.relaciones':
      case '.social':
        // Redirigir al módulo social
        logger.info(`Redirigiendo comando ${command} al módulo social`);
        return await redirectCommand('waifu_social.js', sock, m, { text, command });
        
      // Nuevos comandos económicos
      case '.mercado':
      case '.vender_mercado':
      case '.comprar_mercado':
      case '.subasta':
      case '.crear_subasta':
      case '.pujar':
      case '.inversion':
      case '.invertir':
      case '.casino':
      case '.jugar_casino':
      case '.economia':
        // Redirigir al módulo económico
        logger.info(`Redirigiendo comando ${command} al módulo económico`);
        return await redirectCommand('waifu_economy.js', sock, m, { text, command });
        
      // Nuevos comandos de personalización
      case '.personalizar':
      case '.vestuario':
      case '.equipar_outfit':
      case '.accesorios':
      case '.equipar_accesorio':
      case '.cuarto':
      case '.decorar_cuarto':
      case '.galeria':
      case '.foto':
      case '.marcos':
      case '.equipar_marco':
        // Redirigir al módulo de personalización
        logger.info(`Redirigiendo comando ${command} al módulo de personalización`);
        return await redirectCommand('waifu_customization.js', sock, m, { text, command });
        
      // Nuevos comandos de habilidades
      case '.habilidades':
      case '.clase':
      case '.cambiar_clase':
      case '.arbol_talentos':
      case '.desbloquear_habilidad':
      case '.mejorar_habilidad':
      case '.usar_habilidad':
      case '.stats_combate':
        // Redirigir al módulo de habilidades
        logger.info(`Redirigiendo comando ${command} al módulo de habilidades`);
        return await redirectCommand('waifu_abilities.js', sock, m, { text, command });
        
      // Nuevos comandos de logros
      case '.logros':
      case '.progreso_logros':
      case '.salon_fama':
      case '.marcas':
      case '.estadisticas_logros':
      case '.reclamar_premio':
      case '.logros_globales':
        // Redirigir al módulo de logros
        logger.info(`Redirigiendo comando ${command} al módulo de logros`);
        return await redirectCommand('waifu_achievements.js', sock, m, { text, command });
        
      // Nuevos comandos de mundo
      case '.mundo':
      case '.explorar':
      case '.viajar':
      case '.lugares':
      case '.misiones':
      case '.aceptar_mision':
      case '.progreso_mision':
      case '.mazmorra':
      case '.mapa':
        // Redirigir al módulo de mundo
        logger.info(`Redirigiendo comando ${command} al módulo de mundo`);
        return await redirectCommand('waifu_world.js', sock, m, { text, command });
        
      default:
        logger.warning(`Comando no reconocido: ${command}`);
        await sock.sendMessage(chatId, {
          text: '❌ Comando no reconocido.\n\n' +
                '💡 *Comandos disponibles:*\n\n' +
                '📚 *Colección:*\n' +
                '• `.waifus` - Ver personajes\n' +
                '• `.mywaifus` - Tu colección\n' +
                '• `.vender <nombre>` - Vender waifu\n' +
                '• `.coleccion` - Estadísticas\n' +
                '• `.waifuinfo <nombre>` - Información\n' +
                '• `.claim <nombre>` - Reclamar waifu\n\n' +
                '💝 *Interacción:*\n' +
                '• `.interact <nombre> <acción>` - Interactuar\n' +
                '• `.interactstats` - Estadísticas de interacción\n\n' +
                '📈 *Evolución:*\n' +
                '• `.evolucion <nombre>` - Ver evolución\n' +
                '• `.level <nombre>` - Ver nivel\n\n' +
                '⚔️ *Batalla:*\n' +
                '• `.batalla <waifu> @oponente <waifu>` - Combatir\n\n' +
                '🛍️ *Tienda:*\n' +
                '• `.tienda waifu` - Tienda de waifus\n' +
                '• `.comprar <nombre>` - Comprar waifu\n\n' +
                '🎉 *Eventos:*\n' +
                '• `.evento` - Evento actual\n' +
                '• `.eventos` - Lista de eventos\n' +
                '• `.participar` - Unirse a evento\n\n' +
                '🎮 *Minijuegos:*\n' +
                '• `.minijuego` - Menú de juegos\n' +
                '• `.adivina` - Adivinar waifu\n' +
                '• `.quiz` - Quiz de anime\n\n' +
                '👥 *Social:*\n' +
                '• `.amigos` - Lista de amigos\n' +
                '• `.agregar_amigo @usuario` - Agregar amigo\n' +
                '• `.visitar @usuario` - Visitar amigo\n\n' +
                '💰 *Economía:*\n' +
                '• `.mercado` - Mercado secundario\n' +
                '• `.subasta` - Subastas activas\n' +
                '• `.casino` - Juegos de casino\n\n' +
                '🎨 *Personalización:*\n' +
                '• `.personalizar` - Menú personalización\n' +
                '• `.vestuario <waifu>` - Armario\n' +
                '• `.cuarto <waifu>` - Decorar cuarto\n\n' +
                '⚔️ *Habilidades:*\n' +
                '• `.habilidades` - Sistema de habilidades\n' +
                '• `.clase <waifu>` - Ver clase\n' +
                '• `.arbol_talentos <waifu>` - Árbol de talentos\n\n' +
                '🏆 *Logros:*\n' +
                '• `.logros` - Tus logros\n' +
                '• `.progreso_logros` - Progreso\n' +
                '• `.salon_fama` - Ranking global\n\n' +
                '🗺️ *Mundo:*\n' +
                '• `.mundo` - Mapa del mundo\n' +
                '• `.explorar <lugar>` - Explorar lugar\n' +
                '• `.misiones` - Misiones disponibles'
        }, { quoted: m });
    }
  } catch (error) {
    logger.error('Error en el sistema principal de waifus:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de waifus. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Función para redirigir comandos a módulos especializados
 */
async function redirectCommand(moduleName, sock, m, args) {
  try {
    logger.info(`Intentando cargar módulo: ${moduleName}`);
    
    // Importar dinámicamente el módulo
    const module = await import(`./${moduleName}`);
    
    logger.info(`Módulo ${moduleName} cargado exitosamente`);
    
    // Ejecutar la función run del módulo
    if (module.run && typeof module.run === 'function') {
      return await module.run(sock, m, args);
    } else {
      throw new Error(`El módulo ${moduleName} no tiene una función run válida`);
    }
  } catch (error) {
    logger.error(`Error al redirigir al módulo ${moduleName}:`, error);
    
    const chatId = m.key.remoteJid;
    
    // Si el módulo no existe, mostrar mensaje amigable
    if (error.code === 'MODULE_NOT_FOUND' || error.message.includes('Cannot find module')) {
      await sock.sendMessage(chatId, {
        text: `🚧 *Módulo en desarrollo*\n\n❌ El módulo ${moduleName} aún no está disponible.\n\n💡 Este módulo estará disponible en futuras actualizaciones.\n\n📋 *Módulos disponibles:*\n• waifu_collection.js - Colección básica\n• waifu_trading.js - Sistema de intercambio`
      }, { quoted: m });
    } else {
      await sock.sendMessage(chatId, {
        text: `❌ Error al cargar el módulo ${moduleName}. Contacta al administrador.\n\n🔍 Error: ${error.message}`
      }, { quoted: m });
    }
  }
}

/**
 * Función para mostrar información del sistema
 */
async function showSystemInfo(sock, m) {
  const chatId = m.key.remoteJid;
  
  let info = `🤖 *SISTEMA DE WAIFUS* 🤖\n\n`;
  info += `📋 *Versión:* ${CONFIG.version}\n`;
  info += `📊 *Personajes cargados:* ${characters.length}\n`;
  info += `🔧 *Módulos activos:*\n`;
  
  Object.entries(CONFIG.modules).forEach(([key, module]) => {
    info += `• ${key}: ${module}\n`;
  });
  
  info += `\n💡 *Todos los comandos están distribuidos en módulos especializados*\n`;
  info += `🎯 *Esto mejora el rendimiento y organización del sistema*`;
  
  await sock.sendMessage(chatId, { text: info }, { quoted: m });
}

// Exportar comandos y configuración
export const command = [
  // Comandos originales
  '.waifus', '.mywaifus', '.vender', '.coleccion', '.waifuinfo', '.claim',
  '.interact', '.interactuar', '.evolucion', '.evol', '.level',
  '.batalla', '.battle', '.fight', '.tienda', '.shop', '.comprar', '.buy',
  // Nuevos comandos de eventos
  '.evento', '.eventos', '.participar', '.premios_evento',
  // Nuevos comandos de minijuegos
  '.minijuego', '.adivina', '.quiz', '.trivia', '.respuesta', '.pista', '.estadisticas_juegos',
  // Nuevos comandos sociales
  '.amigos', '.agregar_amigo', '.visitar', '.regalar', '.fiesta', '.unirse_fiesta', '.relaciones', '.social',
  // Nuevos comandos económicos
  '.mercado', '.vender_mercado', '.comprar_mercado', '.subasta', '.crear_subasta', '.pujar',
  '.inversion', '.invertir', '.casino', '.jugar_casino', '.economia',
  // Nuevos comandos de personalización
  '.personalizar', '.vestuario', '.equipar_outfit', '.accesorios', '.equipar_accesorio',
  '.cuarto', '.decorar_cuarto', '.galeria', '.foto', '.marcos', '.equipar_marco',
  // Nuevos comandos de habilidades
  '.habilidades', '.clase', '.cambiar_clase', '.arbol_talentos', '.desbloquear_habilidad',
  '.mejorar_habilidad', '.usar_habilidad', '.stats_combate',
  // Nuevos comandos de logros
  '.logros', '.progreso_logros', '.salon_fama', '.marcas', '.estadisticas_logros',
  '.reclamar_premio', '.logros_globales',
  // Nuevos comandos de mundo
  '.mundo', '.explorar', '.viajar', '.lugares', '.misiones', '.aceptar_mision',
  '.progreso_mision', '.mazmorra', '.mapa'
];
export const alias = [
  // Alias originales
  '.personajes', '.miswaifus', '.venderwaifu', '.colección', '.info', '.reclamar',
  '.interact', '.evolucion', '.batalla', '.tienda', '.comprar',
  // Nuevos alias
  '.event', '.events', '.join_event', '.event_rewards',
  '.minigame', '.guess', '.quiz_game', '.answer', '.hint', '.game_stats',
  '.friends', '.add_friend', '.visit', '.gift', '.party', '.join_party', '.relationships', '.social_menu',
  '.market', '.sell_market', '.buy_market', '.auction', '.create_auction', '.bid',
  '.investments', '.invest', '.casino_games', '.play_casino', '.economy_stats',
  '.customize', '.wardrobe', '.equip_outfit', '.accessories', '.equip_accessory',
  '.room', '.decorate_room', '.gallery', '.photo', '.frames', '.equip_frame',
  '.abilities', '.class', '.change_class', '.talent_tree', '.unlock_ability',
  '.upgrade_ability', '.use_ability', '.combat_stats',
  '.achievements', '.achievement_progress', '.hall_of_fame', '.personal_records',
  '.achievement_stats', '.claim_reward', '.global_achievements',
  '.world', '.explore', '.travel', '.locations', '.missions', '.accept_mission',
  '.mission_progress', '.dungeon', '.personal_map'
];
export const description = 'Sistema completo de waifus - Redirige a todos los módulos especializados';

// Exportar funciones del core para compatibilidad
export { 
  characters, 
  loadCharacters, 
  getWaifuLevel, 
  getWaifuStats,
  getRarezaEmoji,
  getRarezaTexto,
  getRarezaFromPrice,
  getRarezaBonus,
  getExpForNextLevel,
  getExpProgress,
  addWaifuExp,
  logger
};

// Cargar personajes al iniciar
loadCharacters();

// Exportar CONFIG para uso en otros módulos
export { CONFIG };
