/**
 * @file Plugin Waifu Minimal - Versión simplificada y central
 * @version 4.0.0
 * @author HINATA-BOT
 * @description Plugin waifu minimalista que redirige a módulos especializados
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Importar funciones esenciales desde el core
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

/**
 * Función principal - Redirige comandos a módulos especializados
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    // Redirigir comandos a módulos especializados
    switch (command) {
      case '.waifus':
      case '.mywaifus':
      case '.vender':
      case '.coleccion':
      case '.waifuinfo':
      case '.claim':
        return await redirectToModule('waifu_collection.js', sock, m, { text, command });
        
      case '.interact':
      case '.interactuar':
        return await redirectToModule('waifu_interact.js', sock, m, { text, command });
        
      case '.evolucion':
      case '.evol':
      case '.level':
        return await redirectToModule('waifu_evolution.js', sock, m, { text, command });
        
      case '.batalla':
      case '.battle':
      case '.fight':
        return await redirectToModule('waifu_battle.js', sock, m, { text, command });
        
      case '.tienda':
      case '.shop':
      case '.comprar':
      case '.buy':
        return await redirectToModule('waifu_shop.js', sock, m, { text, command });
        
      default:
        await showAvailableCommands(sock, chatId, m);
    }
  } catch (error) {
    logger.error('Error en sistema waifu:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error en el sistema de waifus. Intenta nuevamente.'
    }, { quoted: m });
  }
}

/**
 * Redirige a un módulo específico
 */
async function redirectToModule(moduleName, sock, m, args) {
  try {
    const module = await import(`./${moduleName}`);
    if (module.run && typeof module.run === 'function') {
      return await module.run(sock, m, args);
    }
    throw new Error(`Módulo ${moduleName} no disponible`);
  } catch (error) {
    logger.error(`Error cargando ${moduleName}:`, error);
    const chatId = m.key.remoteJid;
    await sock.sendMessage(chatId, {
      text: `❌ Módulo ${moduleName} no disponible. Contacta al administrador.`
    }, { quoted: m });
  }
}

/**
 * Muestra comandos disponibles
 */
async function showAvailableCommands(sock, chatId, m) {
  const commands = `🤖 *SISTEMA DE WAIFUS* 🤖\n\n` +
    `📋 *Comandos Disponibles:*\n\n` +
    `🎯 *Colección:*\n` +
    `• \`.waifus\` - Ver todos los personajes\n` +
    `• \`.mywaifus\` - Tu colección\n` +
    `• \`.claim <nombre>\` - Reclamar waifu\n` +
    `• \`.vender <nombre>\` - Vender waifu\n` +
    `• \`.coleccion\` - Estadísticas\n` +
    `• \`.waifuinfo <nombre>\` - Información\n\n` +
    `💖 *Interacción:*\n` +
    `• \`.interact <nombre> <acción>\` - Interactuar\n\n` +
    `🌟 *Evolución:*\n` +
    `• \`.evolucion <nombre>\` - Ver progreso\n\n` +
    `⚔️ *Combate:*\n` +
    `• \`.batalla <waifu> @oponente <waifu>\` - Combatir\n\n` +
    `🛍️ *Tienda:*\n` +
    `• \`.tienda waifu\` - Tienda de waifus\n` +
    `• \`.comprar <nombre>\` - Comprar waifu\n\n` +
    `💡 *Todos los comandos están distribuidos en módulos especializados*`;
  
  await sock.sendMessage(chatId, { text: commands }, { quoted: m });
}

// Exportar configuración
export const command = [
  '.waifus', '.mywaifus', '.vender', '.coleccion', '.waifuinfo', '.claim',
  '.interact', '.interactuar', '.evolucion', '.evol', '.level',
  '.batalla', '.battle', '.fight', '.tienda', '.shop', '.comprar', '.buy'
];
export const alias = [
  '.personajes', '.miswaifus', '.venderwaifu', '.colección', '.info', '.reclamar',
  '.interact', '.evolucion', '.batalla', '.tienda', '.comprar'
];
export const description = 'Sistema modular de waifus - Redirige a módulos especializados';

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
