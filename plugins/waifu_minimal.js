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
  const chatId = m.key.remoteJid;
  
  try {
    logger.info(`Redirigiendo a módulo: ${moduleName}`);
    
    // Intentar importar el módulo
    const module = await import(`./${moduleName}`);
    
    // Verificar que el módulo tenga la función run
    if (!module.run || typeof module.run !== 'function') {
      throw new Error(`El módulo ${moduleName} no exporta una función run válida`);
    }
    
    // Verificar que el módulo tenga los comandos necesarios
    if (!module.command || !Array.isArray(module.command)) {
      logger.warning(`El módulo ${moduleName} no tiene comandos definidos`);
    }
    
    logger.success(`Ejecutando comando ${args.command} en módulo ${moduleName}`);
    
    // Ejecutar la función run del módulo
    return await module.run(sock, m, args);
    
  } catch (importError) {
    logger.error(`Error importando ${moduleName}:`, importError);
    
    // Intentar dar una respuesta más útil al usuario
    let errorMessage = `❌ No se pudo cargar el módulo ${moduleName}\n\n`;
    
    if (importError.code === 'MODULE_NOT_FOUND') {
      errorMessage += `📁 *Archivo no encontrado*: ${moduleName}\n`;
      errorMessage += `💡 *Solución*: El archivo del módulo no existe\n`;
    } else if (importError.message.includes('no exporta una función run')) {
      errorMessage += `⚙️ *Módulo mal configurado*: ${moduleName}\n`;
      errorMessage += `💡 *Solución*: El módulo necesita exportar una función run\n`;
    } else {
      errorMessage += `🔧 *Error desconocido*: ${importError.message}\n`;
      errorMessage += `💡 *Solución*: Contacta al administrador\n`;
    }
    
    errorMessage += `\n📋 *Comandos disponibles en este módulo:*`;
    errorMessage += `\n• Usa \`.menu\` para ver todos los comandos`;
    
    await sock.sendMessage(chatId, { text: errorMessage }, { quoted: m });
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

// Inicializar sistema al iniciar
(async () => {
  try {
    // Cargar personajes
    await loadCharacters();
    logger.success('Sistema waifu minimal inicializado correctamente');
  } catch (error) {
    logger.error('Error inicializando sistema waifu minimal:', error);
  }
})();
