/**
 * @file Plugin Waifu System Test - Pruebas de compatibilidad
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de pruebas para verificar compatibilidad entre plugins waifu
 */

import { db } from './db.js';

// Importar todos los plugins waifu para verificar compatibilidad
import { 
  characters, 
  loadCharacters, 
  getCharacterById, 
  getCharacterByName,
  getUserWaifus,
  validateUserWaifu,
  getRarezaEmoji,
  getRarezaTexto,
  CONFIG,
  logger
} from './waifu_core.js';

import { run as waifuRun, command as waifuCommands } from './waifu.js';
import { run as waifuMainRun, command as waifuMainCommands } from './waifu_main.js';
import { run as waifuWorldRun, command as waifuWorldCommands } from './waifu_world.js';

// Sistema de logging para pruebas
const testLogger = {
  info: (message) => console.log(`[TEST] ℹ️ ${message}`),
  success: (message) => console.log(`[TEST] ✅ ${message}`),
  warning: (message) => console.warn(`[TEST] ⚠️ ${message}`),
  error: (message) => console.error(`[TEST] ❌ ${message}`)
};

// Pruebas de compatibilidad
export const command = ['.testwaifu', '.waifutest'];
export const alias = ['.probarwaifu', '.testwaifus'];
export const description = 'Sistema de pruebas para plugins waifu';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.testwaifu':
      case '.waifutest':
      case '.probarwaifu':
      case '.testwaifus':
        await runCompatibilityTests(sock, m, userId);
        break;
      default:
        await showTestHelp(sock, m);
    }
  } catch (error) {
    testLogger.error('Error en sistema de pruebas:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error en el sistema de pruebas.'
    }, { quoted: m });
  }
}

async function runCompatibilityTests(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  await sock.sendMessage(chatId, {
    text: '🧪 *INICIANDO PRUEBAS DE COMPATIBILIDAD* 🧪\n\n⏳ Verificando sistema waifu...'
  }, { quoted: m });

  const results = {
    core: { status: 'pending', tests: [] },
    basic: { status: 'pending', tests: [] },
    main: { status: 'pending', tests: [] },
    world: { status: 'pending', tests: [] }
  };

  // Prueba 1: Core Functions
  testLogger.info('Probando funciones del core...');
  try {
    await testCoreFunctions(results.core);
    results.core.status = 'passed';
    testLogger.success('✅ Core functions passed');
  } catch (error) {
    results.core.status = 'failed';
    results.core.error = error.message;
    testLogger.error('❌ Core functions failed:', error);
  }

  // Prueba 2: Basic Waifu Plugin
  testLogger.info('Probando plugin básico waifu...');
  try {
    await testBasicPlugin(results.basic);
    results.basic.status = 'passed';
    testLogger.success('✅ Basic waifu plugin passed');
  } catch (error) {
    results.basic.status = 'failed';
    results.basic.error = error.message;
    testLogger.error('❌ Basic waifu plugin failed:', error);
  }

  // Prueba 3: Main Waifu Plugin
  testLogger.info('Probando plugin principal waifu...');
  try {
    await testMainPlugin(results.main);
    results.main.status = 'passed';
    testLogger.success('✅ Main waifu plugin passed');
  } catch (error) {
    results.main.status = 'failed';
    results.main.error = error.message;
    testLogger.error('❌ Main waifu plugin failed:', error);
  }

  // Prueba 4: World Waifu Plugin
  testLogger.info('Probando plugin world waifu...');
  try {
    await testWorldPlugin(results.world);
    results.world.status = 'passed';
    testLogger.success('✅ World waifu plugin passed');
  } catch (error) {
    results.world.status = 'failed';
    results.world.error = error.message;
    testLogger.error('❌ World waifu plugin failed:', error);
  }

  // Generar reporte
  await generateTestReport(sock, m, userId, results);
}

async function testCoreFunctions(results) {
  // Test 1: Cargar personajes
  await loadCharacters();
  results.tests.push({ name: 'loadCharacters', status: characters.length > 0 ? 'passed' : 'failed' });

  // Test 2: Obtener personaje por ID
  const characterById = getCharacterById(1);
  results.tests.push({ name: 'getCharacterById', status: characterById ? 'passed' : 'failed' });

  // Test 3: Obtener personaje por nombre
  const characterByName = getCharacterByName('Hinata');
  results.tests.push({ name: 'getCharacterByName', status: characterByName ? 'passed' : 'failed' });

  // Test 4: Funciones de rareza
  const rarityEmoji = getRarezaEmoji(5000);
  const rarityText = getRarezaTexto(5000);
  results.tests.push({ name: 'rarityFunctions', status: (rarityEmoji && rarityText) ? 'passed' : 'failed' });

  // Test 5: Base de datos
  const userBalance = await getUserBalance('test_user');
  results.tests.push({ name: 'databaseFunctions', status: userBalance ? 'passed' : 'failed' });
}

async function testBasicPlugin(results) {
  // Test 1: Command exports
  results.tests.push({ name: 'commandExport', status: Array.isArray(waifuCommands) ? 'passed' : 'failed' });

  // Test 2: Run function
  results.tests.push({ name: 'runFunction', status: typeof waifuRun === 'function' ? 'passed' : 'failed' });

  // Test 3: Mock message test
  const mockSock = {
    sendMessage: async (chatId, message) => {
      return { success: true };
    }
  };

  const mockM = {
    key: { remoteJid: 'test@g.us', participant: 'test_user@s.whatsapp.net' },
    message: { conversation: '.waifus' }
  };

  try {
    await waifuRun(mockSock, mockM, { text: '.waifus', command: '.waifus' });
    results.tests.push({ name: 'basicExecution', status: 'passed' });
  } catch (error) {
    results.tests.push({ name: 'basicExecution', status: 'failed', error: error.message });
  }
}

async function testMainPlugin(results) {
  // Test 1: Command exports
  results.tests.push({ name: 'commandExport', status: Array.isArray(waifuMainCommands) ? 'passed' : 'failed' });

  // Test 2: Run function
  results.tests.push({ name: 'runFunction', status: typeof waifuMainRun === 'function' ? 'passed' : 'failed' });

  // Test 3: Mock message test
  const mockSock = {
    sendMessage: async (chatId, message) => {
      return { success: true };
    }
  };

  const mockM = {
    key: { remoteJid: 'test@g.us', participant: 'test_user@s.whatsapp.net' },
    message: { conversation: '.waifus' }
  };

  try {
    await waifuMainRun(mockSock, mockM, { text: '.waifus', command: '.waifus' });
    results.tests.push({ name: 'mainExecution', status: 'passed' });
  } catch (error) {
    results.tests.push({ name: 'mainExecution', status: 'failed', error: error.message });
  }
}

async function testWorldPlugin(results) {
  // Test 1: Command exports
  results.tests.push({ name: 'commandExport', status: Array.isArray(waifuWorldCommands) ? 'passed' : 'failed' });

  // Test 2: Run function
  results.tests.push({ name: 'runFunction', status: typeof waifuWorldRun === 'function' ? 'passed' : 'failed' });

  // Test 3: Mock message test
  const mockSock = {
    sendMessage: async (chatId, message) => {
      return { success: true };
    }
  };

  const mockM = {
    key: { remoteJid: 'test@g.us', participant: 'test_user@s.whatsapp.net' },
    message: { conversation: '.mundo' }
  };

  try {
    await waifuWorldRun(mockSock, mockM, { text: '.mundo', command: '.mundo' });
    results.tests.push({ name: 'worldExecution', status: 'passed' });
  } catch (error) {
    results.tests.push({ name: 'worldExecution', status: 'failed', error: error.message });
  }
}

async function generateTestReport(sock, m, userId, results) {
  const chatId = m.key.remoteJid;
  
  let report = `🧪 *REPORTE DE PRUEBAS WAIFU* 🧪\n\n`;
  report += `👤 *@${userId.split('@')[0]}*\n`;
  report += `🕐 ${new Date().toLocaleString()}\n\n`;

  // Resumen general
  const totalTests = Object.values(results).reduce((sum, module) => sum + module.tests.length, 0);
  const passedTests = Object.values(results).reduce((sum, module) => 
    sum + module.tests.filter(test => test.status === 'passed').length, 0);
  const successRate = Math.round((passedTests / totalTests) * 100);

  report += `📊 *RESUMEN GENERAL:*\n`;
  report += `✅ Pasadas: ${passedTests}/${totalTests} (${successRate}%)\n`;
  report += `❌ Fallidas: ${totalTests - passedTests}\n\n`;

  // Detalles por módulo
  report += `📋 *DETALLES POR MÓDULO:*\n\n`;

  const moduleNames = {
    core: '🔧 Core Functions',
    basic: '📦 Basic Waifu',
    main: '🎯 Main Waifu',
    world: '🌍 World Waifu'
  };

  Object.entries(results).forEach(([moduleKey, moduleResult]) => {
    const statusEmoji = moduleResult.status === 'passed' ? '✅' : '❌';
    const passedCount = moduleResult.tests.filter(test => test.status === 'passed').length;
    const totalCount = moduleResult.tests.length;
    
    report += `${statusEmoji} ${moduleNames[moduleKey]}: ${passedCount}/${totalCount}\n`;
    
    // Mostrar pruebas fallidas
    const failedTests = moduleResult.tests.filter(test => test.status === 'failed');
    if (failedTests.length > 0) {
      report += `   ❌ Fallidas: ${failedTests.map(test => test.name).join(', ')}\n`;
    }
    report += `\n`;
  });

  // Recomendaciones
  if (successRate < 100) {
    report += `⚠️ *RECOMENDACIONES:*\n`;
    
    if (results.core.status === 'failed') {
      report += `• Revisar funciones del core waifu_core.js\n`;
    }
    if (results.basic.status === 'failed') {
      report += `• Revisar plugin básico waifu.js\n`;
    }
    if (results.main.status === 'failed') {
      report += `• Revisar plugin principal waifu_main.js\n`;
    }
    if (results.world.status === 'failed') {
      report += `• Revisar plugin world waifu_world.js\n`;
    }
    report += `\n`;
  } else {
    report += `🎉 *¡TODAS LAS PRUEBAS PASARON!*\n`;
    report += `✅ El sistema waifu está funcionando correctamente\n\n`;
  }

  report += `💡 *Próximos pasos:*\n`;
  report += `• Probar comandos waifu en el bot\n`;
  report += `• Verificar integración con usuarios reales\n`;
  report += `• Monitorear performance en producción`;

  await sock.sendMessage(chatId, {
    text: report,
    mentions: [userId]
  }, { quoted: m });

  testLogger.success(`Pruebas completadas - Éxito: ${successRate}%`);
}

async function showTestHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let help = `🧪 *SISTEMA DE PRUEBAS WAIFU* 🧪\n\n`;
  help += `💡 *Comandos disponibles:*\n\n`;
  help += `• \`.testwaifu\` - Ejecutar todas las pruebas\n`;
  help += `• \`.waifutest\` - Alias del comando anterior\n\n`;
  
  help += `🔍 *Pruebas realizadas:*\n`;
  help += `• Core Functions - Funciones centrales\n`;
  help += `• Basic Waifu - Plugin básico\n`;
  help += `• Main Waifu - Plugin principal\n`;
  help += `• World Waifu - Plugin de mundo\n\n`;
  
  help += `📊 *Resultados:*\n`;
  help += `• Reporte detallado de cada prueba\n`;
  help += `• Porcentaje de éxito\n`;
  help += `• Recomendaciones automáticas\n\n`;
  
  help += `⚠️ *Importante:*\n`;
  help += `• Las pruebas usan datos de prueba\n`;
  help += `• No afectan datos reales de usuarios\n`;
  help += `• Se pueden ejecutar múltiples veces`;

  await sock.sendMessage(chatId, { text: help }, { quoted: m });
}

// Inicializar sistema
testLogger.info('Sistema de pruebas waifu inicializado');

// Exportar para uso externo
export { 
  runCompatibilityTests,
  testCoreFunctions,
  testBasicPlugin,
  testMainPlugin,
  testWorldPlugin
};
