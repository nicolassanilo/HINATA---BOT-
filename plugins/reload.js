/**
 * @file Plugin Reload v2.0 - Sistema mejorado de recarga de plugins
 * @description Permite recargar plugins dinámicamente con validación de propietario mejorada
 * @version 2.0.0
 * @author Mejorado para HINATA-BOT
 */

import { reloadPlugins, getConfig } from '../index.js';

export const command = ['.reload', '.updateplugins', '.recargar'];

// Configuración del plugin
const CONFIG = {
  enableLogging: true,
  reloadTimeout: 30000, // 30 segundos timeout
  maxRetries: 3,
  retryDelay: 2000
};

// Sistema de logging
const logger = {
  info: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[RELOAD] ℹ️ ${message}`);
    }
  },
  error: (message, error = null) => {
    console.error(`[RELOAD] ❌ ${message}`);
    if (error) console.error('Error:', error);
  },
  success: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[RELOAD] ✅ ${message}`);
    }
  }
};

// Función para normalizar números de teléfono
function normalizePhoneNumber(number) {
  if (!number) return '';
  
  // Eliminar espacios, guiones, paréntesis y otros caracteres no numéricos excepto +
  let normalized = number.replace(/[^0-9+]/g, '');
  
  // Asegurar que comience con +
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

// Función mejorada para verificar si es propietario
function isOwner(senderId, config) {
    if (!senderId || !config) return false;
    
    console.log(`[RELOAD DEBUG] Verificando propietario:`);
    console.log(`[RELOAD DEBUG] Sender ID: ${senderId}`);
    console.log(`[RELOAD DEBUG] Config:`, {
        propietario: config.propietario,
        ownerJid: config.ownerJid,
        phoneNumber: config.phoneNumber
    });
    
    // Verificación directa con formato completo @s.whatsapp.net
    const validOwnerIds = [
        config.propietario,
        config.ownerJid,
        config.phoneNumber
    ].filter(id => id && id.includes('@s.whatsapp.net'));
    
    console.log(`[RELOAD DEBUG] IDs válidos del propietario:`, validOwnerIds);
    
    // Verificación exacta del senderId
    for (const ownerId of validOwnerIds) {
        if (senderId === ownerId) {
            console.log(`[RELOAD DEBUG] ✅ Coincidencia exacta con: ${ownerId}`);
            return true;
        }
    }
    
    // Verificación por inclusión (para grupos donde el ID viene con @g.us)
    const normalizedSenderId = senderId.replace('@g.us', '').replace('@s.whatsapp.net', '');
    console.log(`[RELOAD DEBUG] Sender ID normalizado: ${normalizedSenderId}`);
    
    for (const ownerId of validOwnerIds) {
        const normalizedOwnerId = ownerId.replace('@s.whatsapp.net', '');
        console.log(`[RELOAD DEBUG] Verificando contra: ${normalizedOwnerId}`);
        
        if (normalizedSenderId.includes(normalizedOwnerId) || normalizedOwnerId.includes(normalizedSenderId)) {
            console.log(`[RELOAD DEBUG] ✅ Coincidencia por inclusión con: ${ownerId}`);
            return true;
        }
    }
    
    console.log(`[RELOAD DEBUG] ❌ Ninguna coincidencia encontrada`);
    return false;
}

// Función para ejecutar recarga con reintentos
async function executeReloadWithRetry(retryCount = 0) {
  try {
    const result = await reloadPlugins();
    return result;
  } catch (error) {
    logger.error(`Error en recarga (intento ${retryCount + 1}):`, error);
    
    if (retryCount < CONFIG.maxRetries - 1) {
      logger.info(`Reintentando en ${CONFIG.retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      return executeReloadWithRetry(retryCount + 1);
    }
    
    throw error;
  }
}

// Función para formatear el resultado de la recarga
function formatReloadResult(result, executionTime) {
  const { plugins: loadedPlugins, errors } = result;
  
  let responseText = `🔄 *RECARGA DE PLUGINS COMPLETADA*\n\n`;
  responseText += `📊 *Estadísticas:*\n`;
  responseText += `• 📦 Plugins cargados: ${loadedPlugins.size}\n`;
  responseText += `• ⏱️ Tiempo de ejecución: ${executionTime}ms\n`;
  responseText += `• 🐛 Errores: ${errors.length}\n`;
  
  if (loadedPlugins.size > 0) {
    responseText += `\n📋 *Plugins cargados:*\n`;
    const pluginList = Array.from(loadedPlugins.keys()).slice(0, 10);
    pluginList.forEach(cmd => {
      responseText += `• ${cmd}\n`;
    });
    
    if (loadedPlugins.size > 10) {
      responseText += `• ... y ${loadedPlugins.size - 10} más\n`;
    }
  }
  
  if (errors.length > 0) {
    responseText += `\n❌ *Errores encontrados:*\n`;
    errors.forEach((err, index) => {
      responseText += `\n${index + 1}. 📄 *${err.file}*\n`;
      responseText += `   └─ 🐛 ${err.error}\n`;
    });
    responseText += `\n💡 Estos plugins no estarán disponibles hasta que se corrijan los errores.`;
  }
  
  responseText += `\n\n✨ *Recarga realizada con éxito!*`;
  
  return responseText;
}

// Función principal
export async function run(sock, msg, { text, command, args }) {
  const senderId = msg.key.participant || msg.key.remoteJid;
  const chatId = msg.key.remoteJid;
  
  try {
    logger.info(`Solicitud de recarga iniciada por: ${senderId}`);
    
    // 1. Obtener configuración actual
    let runtimeConfig = getConfig();
    
    // 2. Verificar si el remitente es el propietario
    if (!isOwner(senderId, runtimeConfig)) {
      await sock.sendMessage(chatId, { 
        text: '❌ *ACCESO DENEGADO*\n\nNo tienes permiso para usar este comando. Solo el propietario del bot puede recargar los plugins.' 
      }, { quoted: msg });
      
      logger.error(`Intento de recarga no autorizado por: ${senderId}`);
      return;
    }
    
    // 3. Enviar mensaje de inicio
    await sock.sendMessage(chatId, { 
      text: '🔄 *RECARGANDO PLUGINS*\n\nPor favor espera, esto puede tomar unos segundos...' 
    }, { quoted: msg });
    
    // 4. Ejecutar recarga con medición de tiempo
    const startTime = Date.now();
    const result = await executeReloadWithRetry();
    const executionTime = Date.now() - startTime;
    
    // 5. Formatear y enviar resultado
    const responseText = formatReloadResult(result, executionTime);
    await sock.sendMessage(chatId, { text: responseText }, { quoted: msg });
    
    // 6. Logging del éxito
    logger.success(`Recarga completada por propietario (${senderId})`);
    logger.info(`Plugins cargados: ${result.plugins.size}, Errores: ${result.errors.length}, Tiempo: ${executionTime}ms`);
    
    // 7. Notificación especial si hay errores críticos
    if (result.errors.length > 0) {
      const criticalErrors = result.errors.filter(err => 
        err.error.includes('SyntaxError') || 
        err.error.includes('ReferenceError') ||
        err.error.includes('TypeError')
      );
      
      if (criticalErrors.length > 0) {
        await sock.sendMessage(chatId, {
          text: `⚠️ *ADVERTENCIA*\n\nSe detectaron ${criticalErrors.length} errores críticos que pueden afectar el funcionamiento del bot. Se recomienda revisar estos archivos urgentemente.`
        }, { quoted: msg });
      }
    }
    
  } catch (error) {
    logger.error('Error general en el comando .reload:', error);
    
    try {
      await sock.sendMessage(chatId, { 
        text: `❌ *ERROR CRÍTICO*\n\nOcurrió un error al intentar recargar los plugins:\n\n\`\`\`${error.message}\`\`\`\n\nPor favor, contacta al desarrollador o revisa la consola para más detalles.` 
      }, { quoted: msg });
    } catch (msgError) {
      logger.error('Error al enviar mensaje de error:', msgError);
    }
  }
}

// Función de ayuda
export const help = `
🔄 *COMANDOS DE RECARGA*

• \`.reload\` - Recargar todos los plugins
• \`.updateplugins\` - Alias de .reload
• \`.recargar\` - Versión en español

🔒 *Solo el propietario del bot puede usar estos comandos.*

📋 *Qué hace la recarga:*
• Recarga todos los archivos .js de la carpeta plugins
• Actualiza la configuración desde config.json
• Muestra estadísticas de carga
• Reporta errores encontrados

⚠️ *Nota: La recarga puede tomar varios segundos dependiendo de la cantidad de plugins.`;

// Exportar configuración para debugging
export const config = CONFIG;
export const normalizeNumber = normalizePhoneNumber;
export const checkOwnership = isOwner;
