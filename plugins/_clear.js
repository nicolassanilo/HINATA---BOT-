/**
 * @file Clear System v2.0 - Sistema mejorado de limpieza de archivos temporales
 * @description Sistema automático de limpieza de archivos temporales y sesiones con manejo robusto de errores
 * @version 2.0.0
 * @author Mejorado para HINATA-BOT
 */

import fs from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Configuración del plugin
const CONFIG = {
  enableLogging: true,
  enableAutoClean: true,
  cleanInterval: 60 * 1000, // 1 minuto
  sessionDirs: ['./sessions', './NagiSession'],
  jadibotDirs: ['./jadi', './NagiJadiBot'],
  protectedFiles: ['creds.json', 'session.json', 'store.json'],
  maxAge: 24 * 60 * 60 * 1000, // 24 horas
  enableSizeLimit: true,
  maxDirSize: 100 * 1024 * 1024, // 100MB
  dryRun: false // Si es true, solo muestra lo que se eliminaría
};

// Sistema de logging
const logger = {
  info: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[CLEAR] ℹ️ ${message}`);
    }
  },
  error: (message, error = null) => {
    console.error(`[CLEAR] ❌ ${message}`);
    if (error) console.error('Error:', error);
  },
  success: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[CLEAR] ✅ ${message}`);
    }
  },
  debug: (message, data = null) => {
    if (CONFIG.enableLogging) {
      console.log(`[CLEAR] 🔍 ${message}`);
      if (data) console.log('Data:', data);
    }
  }
};

// Estadísticas del sistema
let systemStats = {
  totalFilesDeleted: 0,
  totalDirsCleaned: 0,
  lastCleanTime: null,
  errors: 0
};

// Función para verificar si un directorio existe
async function directoryExists(path) {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// Función para obtener tamaño de un directorio
async function getDirectorySize(dirPath) {
  try {
    let totalSize = 0;
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = join(dirPath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        totalSize += await getDirectorySize(filePath);
      } else {
        totalSize += stat.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    logger.error(`Error obteniendo tamaño de ${dirPath}:`, error);
    return 0;
  }
}

// Función para verificar si un archivo está protegido
function isProtectedFile(fileName) {
  return CONFIG.protectedFiles.some(protectedFile => fileName.includes(protectedFile));
}

// Función para verificar si un archivo es antiguo
function isOldFile(filePath) {
  try {
    const stats = existsSync(filePath) ? require('fs').statSync(filePath) : null;
    if (!stats) return false;
    
    const age = Date.now() - stats.mtime.getTime();
    return age > CONFIG.maxAge;
  } catch {
    return false;
  }
}

// Función para limpiar un directorio
async function cleanDirectory(dirPath, dirType = 'general') {
  try {
    if (!await directoryExists(dirPath)) {
      logger.debug(`Directorio no existe: ${dirPath}`);
      return { deleted: 0, errors: 0, size: 0 };
    }

    logger.debug(`Limpiando directorio: ${dirPath} (${dirType})`);
    
    const files = await fs.readdir(dirPath);
    let deleted = 0;
    let errors = 0;
    let totalSize = 0;
    
    for (const file of files) {
      const filePath = join(dirPath, file);
      
      try {
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          // Limpiar subdirectorios recursivamente
          const subResult = await cleanDirectory(filePath, `${dirType}/subdir`);
          deleted += subResult.deleted;
          errors += subResult.errors;
          totalSize += subResult.size;
          
          // Eliminar directorio si está vacío
          try {
            const remainingFiles = await fs.readdir(filePath);
            if (remainingFiles.length === 0) {
              await fs.rmdir(filePath);
              deleted++;
              logger.debug(`Directorio vacío eliminado: ${filePath}`);
            }
          } catch (error) {
            logger.debug(`No se pudo eliminar directorio vacío ${filePath}:`, error.message);
          }
        } else {
          // Verificar si el archivo está protegido
          if (isProtectedFile(file)) {
            logger.debug(`Archivo protegido ignorado: ${file}`);
            continue;
          }
          
          // Verificar si el archivo es antiguo
          const shouldDelete = CONFIG.maxAge > 0 ? isOldFile(filePath) : true;
          
          if (shouldDelete) {
            const fileSize = stat.size;
            totalSize += fileSize;
            
            if (!CONFIG.dryRun) {
              await fs.unlink(filePath);
              logger.debug(`Archivo eliminado: ${file} (${formatBytes(fileSize)})`);
            } else {
              logger.debug(`[DRY RUN] Se eliminaría: ${file} (${formatBytes(fileSize)})`);
            }
            
            deleted++;
          }
        }
      } catch (error) {
        errors++;
        logger.error(`Error procesando ${file}:`, error);
      }
    }
    
    systemStats.totalFilesDeleted += deleted;
    systemStats.errors += errors;
    
    if (deleted > 0 || errors > 0) {
      logger.info(`${dirType}: ${deleted} archivos eliminados, ${errors} errores, ${formatBytes(totalSize)} liberados`);
    }
    
    return { deleted, errors, size: totalSize };
    
  } catch (error) {
    logger.error(`Error limpiando directorio ${dirPath}:`, error);
    return { deleted: 0, errors: 1, size: 0 };
  }
}

// Función para limpiar sesiones de Jadibot
async function cleanJadibotSessions() {
  logger.info('🧹 Iniciando limpieza de sesiones Jadibot...');
  
  let totalDeleted = 0;
  let totalErrors = 0;
  let totalSize = 0;
  
  for (const dirPath of CONFIG.jadibotDirs) {
    if (await directoryExists(dirPath)) {
      const result = await cleanDirectory(dirPath, 'Jadibot');
      totalDeleted += result.deleted;
      totalErrors += result.errors;
      totalSize += result.size;
    } else {
      logger.debug(`Directorio Jadibot no encontrado: ${dirPath}`);
    }
  }
  
  stats.totalDirsCleaned++;
  
  if (totalDeleted > 0) {
    logger.success(`Jadibot: ${totalDeleted} archivos eliminados, ${formatBytes(totalSize)} liberados`);
  } else {
    logger.info('Jadibot: No se encontraron archivos para eliminar');
  }
  
  return { deleted: totalDeleted, errors: totalErrors, size: totalSize };
}

// Función para limpiar sesiones principales
async function cleanMainSessions() {
  logger.info('🧹 Iniciando limpieza de sesiones principales...');
  
  let totalDeleted = 0;
  let totalErrors = 0;
  let totalSize = 0;
  
  for (const dirPath of CONFIG.sessionDirs) {
    if (await directoryExists(dirPath)) {
      const result = await cleanDirectory(dirPath, 'Sessions');
      totalDeleted += result.deleted;
      totalErrors += result.errors;
      totalSize += result.size;
    } else {
      logger.debug(`Directorio de sesiones no encontrado: ${dirPath}`);
    }
  }
  
  stats.totalDirsCleaned++;
  
  if (totalDeleted > 0) {
    logger.success(`Sessions: ${totalDeleted} archivos eliminados, ${formatBytes(totalSize)} liberados`);
  } else {
    logger.info('Sessions: No se encontraron archivos para eliminar');
  }
  
  return { deleted: totalDeleted, errors: totalErrors, size: totalSize };
}

// Función para limpiar archivos temporales
async function cleanTempFiles() {
  logger.info('🧹 Iniciando limpieza de archivos temporales...');
  
  const tempDirs = ['./temp', './tmp', './cache', './logs'];
  let totalDeleted = 0;
  let totalErrors = 0;
  let totalSize = 0;
  
  for (const dirPath of tempDirs) {
    if (await directoryExists(dirPath)) {
      const result = await cleanDirectory(dirPath, 'Temp');
      totalDeleted += result.deleted;
      totalErrors += result.errors;
      totalSize += result.size;
    }
  }
  
  if (totalDeleted > 0) {
    logger.success(`Temp: ${totalDeleted} archivos eliminados, ${formatBytes(totalSize)} liberados`);
  }
  
  return { deleted: totalDeleted, errors: totalErrors, size: totalSize };
}

// Función para verificar límites de tamaño
async function checkSizeLimits() {
  if (!CONFIG.enableSizeLimit) return;
  
  logger.debug('Verificando límites de tamaño...');
  
  for (const dirPath of [...CONFIG.sessionDirs, ...CONFIG.jadibotDirs]) {
    if (await directoryExists(dirPath)) {
      const size = await getDirectorySize(dirPath);
      
      if (size > CONFIG.maxDirSize) {
        logger.warn(`Directorio ${dirPath} excede límite: ${formatBytes(size)} > ${formatBytes(CONFIG.maxDirSize)}`);
        
        // Limpiar archivos más antiguos primero
        const result = await cleanDirectory(dirPath, 'SizeLimit');
        if (result.deleted > 0) {
          logger.success(`Limpieza por tamaño en ${dirPath}: ${result.deleted} archivos eliminados`);
        }
      }
    }
  }
}

// Función para formatear bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para mostrar estadísticas
function displayStats() {
  logger.info('📊 Estadísticas del Sistema de Limpieza:');
  logger.info(`• Archivos eliminados: ${systemStats.totalFilesDeleted}`);
  logger.info(`• Directorios limpiados: ${systemStats.totalDirsCleaned}`);
  logger.info(`• Errores: ${systemStats.errors}`);
  logger.info(`• Última limpieza: ${systemStats.lastCleanTime ? new Date(systemStats.lastCleanTime).toLocaleString() : 'Nunca'}`);
  logger.info(`• Intervalo: ${CONFIG.cleanInterval / 1000} segundos`);
  logger.info(`• Modo Dry Run: ${CONFIG.dryRun ? 'Sí' : 'No'}`);
}

// Función principal de limpieza
async function performClean() {
  try {
    systemStats.lastCleanTime = Date.now();
    
    logger.info('🚀 Iniciando ciclo de limpieza automática...');
    
    // Verificar límites de tamaño primero
    await checkSizeLimits();
    
    // Limpiar diferentes tipos de archivos
    const jadibotResult = await cleanJadibotSessions();
    const sessionsResult = await cleanMainSessions();
    const tempResult = await cleanTempFiles();
    
    // Mostrar resumen
    const totalDeleted = jadibotResult.deleted + sessionsResult.deleted + tempResult.deleted;
    const totalSize = jadibotResult.size + sessionsResult.size + tempResult.size;
    const totalErrors = jadibotResult.errors + sessionsResult.errors + tempResult.errors;
    
    if (totalDeleted > 0) {
      logger.success(`🎉 Limpieza completada: ${totalDeleted} archivos eliminados, ${formatBytes(totalSize)} liberados`);
    } else {
      logger.info('✅ No se encontraron archivos para eliminar');
    }
    
    if (totalErrors > 0) {
      logger.warn(`⚠️ Se encontraron ${totalErrors} errores durante la limpieza`);
    }
    
    // Mostrar estadísticas cada 5 ciclos
    if (systemStats.totalDirsCleaned % 5 === 0) {
      displayStats();
    }
    
  } catch (error) {
    logger.error('Error en ciclo de limpieza:', error);
    systemStats.errors++;
  }
}

// Función para iniciar el sistema
function startCleanSystem() {
  if (!CONFIG.enableAutoClean) {
    logger.info('🔧 Sistema de limpieza automática desactivado');
    return;
  }
  
  logger.info('🚀 Iniciando sistema de limpieza automática...');
  logger.info(`⏱️ Intervalo: ${CONFIG.cleanInterval / 1000} segundos`);
  logger.info(`🔁 Modo Dry Run: ${CONFIG.dryRun ? 'Sí' : 'No'}`);
  logger.info(`📁 Directorios monitoreados: ${[...CONFIG.sessionDirs, ...CONFIG.jadibotDirs].join(', ')}`);
  
  // Ejecutar limpieza inmediata
  performClean();
  
  // Configurar intervalo regular
  const interval = setInterval(performClean, CONFIG.cleanInterval);
  
  // Manejar cierre del proceso
  process.on('SIGINT', () => {
    logger.info('🛑 Deteniendo sistema de limpieza...');
    clearInterval(interval);
    displayStats();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logger.info('🛑 Deteniendo sistema de limpieza...');
    clearInterval(interval);
    displayStats();
    process.exit(0);
  });
  
  return interval;
}

// Función de ayuda
export const help = `
🧹 *CLEAR SYSTEM v2.0*

Sistema automático de limpieza de archivos temporales y sesiones del bot.

⚙️ *Configuración:*
• Intervalo de limpieza: 1 minuto
• Protección de archivos críticos
• Límites de tamaño por directorio
• Sistema de estadísticas

📁 *Directorios monitoreados:*
• Sessions: ./sessions, ./NagiSession
• Jadibot: ./jadi, ./NagiJadiBot
• Temporales: ./temp, ./tmp, ./cache

🛡️ *Archivos protegidos:*
• creds.json (credenciales)
• session.json (sesiones)
• store.json (almacenamiento)

📊 *Características:*
• Limpieza automática programada
• Eliminación recursiva de subdirectorios
• Verificación de límites de tamaño
• Sistema de estadísticas detallado
• Modo Dry Run para pruebas

🔧 *Configuración avanzada:*
• maxAge: Edad máxima de archivos (24h)
• maxDirSize: Tamaño máximo por directorio (100MB)
• enableSizeLimit: Activar límites de tamaño
• dryRun: Modo prueba (solo muestra qué se eliminaría)

⚠️ *Nota:*
• El sistema se inicia automáticamente
• Los archivos protegidos nunca se eliminan
• Se mantiene registro de todas las operaciones
`;

// Exportar funciones y configuración
export const config = CONFIG;
export const getStats = () => systemStats;
export const cleanNow = performClean;
export const displayStats = displayStats;

// Iniciar el sistema automáticamente
let cleanInterval = null;

try {
  cleanInterval = startCleanSystem();
  logger.info('✅ Sistema de limpieza iniciado correctamente');
} catch (error) {
  logger.error('Error iniciando sistema de limpieza:', error);
}

// Exportar para poder detener el sistema si es necesario
export default {
  start: startCleanSystem,
  stop: () => {
    if (cleanInterval) {
      clearInterval(cleanInterval);
      cleanInterval = null;
      logger.info('🛑 Sistema de limpieza detenido');
    }
  },
  getStats,
  cleanNow,
  displayStats
};
