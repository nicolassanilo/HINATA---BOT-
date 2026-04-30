/**
 * @file Plugin Debug Owner - Para diagnosticar problemas de verificación de propietario
 * @description Muestra información detallada sobre el usuario y la configuración
 * @version 1.0.0
 */

import { getConfig } from '../index.js';

export const command = ['.debugowner', '.testowner'];

export async function run(sock, msg, { text, command, args }) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const chatId = msg.key.remoteJid;
    
    try {
        // Obtener configuración
        const config = getConfig();
        
        // Función para normalizar números
        const normalizeNumber = (num) => {
            if (!num) return '';
            return num.replace(/[^0-9+]/g, '').replace(/^00/, '+');
        };
        
        // Recopilar información
        const debugInfo = {
            senderId: senderId,
            normalizedSenderId: normalizeNumber(senderId),
            config: {
                propietario: config.propietario,
                normalizedPropietario: normalizeNumber(config.propietario),
                ownerJid: config.ownerJid,
                normalizedOwnerJid: normalizeNumber(config.ownerJid),
                phoneNumber: config.phoneNumber,
                normalizedPhoneNumber: normalizeNumber(config.phoneNumber)
            }
        };
        
        // Verificaciones
        const checks = {
            propietarioMatch: debugInfo.normalizedSenderId.includes(debugInfo.config.normalizedPropietario) || 
                           debugInfo.config.normalizedPropietario.includes(debugInfo.normalizedSenderId),
            ownerJidMatch: debugInfo.normalizedSenderId.includes(debugInfo.config.normalizedOwnerJid.replace('@s.whatsapp.net', '')) || 
                         debugInfo.config.normalizedOwnerJid.replace('@s.whatsapp.net', '').includes(debugInfo.normalizedSenderId),
            phoneNumberMatch: debugInfo.normalizedSenderId.includes(debugInfo.config.normalizedPhoneNumber) || 
                             debugInfo.config.normalizedPhoneNumber.includes(debugInfo.normalizedSenderId)
        };
        
        // Construir mensaje de debug
        let debugText = `🔍 *DEBUG DE VERIFICACIÓN DE PROPIETARIO*\n\n`;
        
        debugText += `📱 *Información del Usuario:*\n`;
        debugText += `• ID completo: \`${senderId}\`\n`;
        debugText += `• ID normalizado: \`${debugInfo.normalizedSenderId}\`\n\n`;
        
        debugText += `⚙️ *Configuración Actual:*\n`;
        debugText += `• Propietario: \`${config.propietario}\`\n`;
        debugText += `• Propietario normalizado: \`${debugInfo.config.normalizedPropietario}\`\n`;
        debugText += `• OwnerJid: \`${config.ownerJid}\`\n`;
        debugText += `• OwnerJid normalizado: \`${debugInfo.config.normalizedOwnerJid}\`\n`;
        debugText += `• PhoneNumber: \`${config.phoneNumber}\`\n`;
        debugText += `• PhoneNumber normalizado: \`${debugInfo.config.normalizedPhoneNumber}\`\n\n`;
        
        debugText += `✅ *Resultados de Verificación:*\n`;
        debugText += `• Propietario coincide: ${checks.propietarioMatch ? '✅ SÍ' : '❌ NO'}\n`;
        debugText += `• OwnerJid coincide: ${checks.ownerJidMatch ? '✅ SÍ' : '❌ NO'}\n`;
        debugText += `• PhoneNumber coincide: ${checks.phoneNumberMatch ? '✅ SÍ' : '❌ NO'}\n\n`;
        
        debugText += `🔍 *Análisis Detallado:*\n`;
        
        // Análisis de propietario
        if (checks.propietarioMatch) {
            debugText += `• ✅ Propietario: Coincidencia encontrada\n`;
        } else {
            debugText += `• ❌ Propietario: No hay coincidencia\n`;
            debugText += `  - ¿Contiene "${debugInfo.config.normalizedPropietario}" en "${debugInfo.normalizedSenderId}"?\n`;
        }
        
        // Análisis de ownerJid
        if (checks.ownerJidMatch) {
            debugText += `• ✅ OwnerJid: Coincidencia encontrada\n`;
        } else {
            debugText += `• ❌ OwnerJid: No hay coincidencia\n`;
            debugText += `  - ¿Contiene "${debugInfo.config.normalizedOwnerJid.replace('@s.whatsapp.net', '')}" en "${debugInfo.normalizedSenderId}"?\n`;
        }
        
        // Análisis de phoneNumber
        if (checks.phoneNumberMatch) {
            debugText += `• ✅ PhoneNumber: Coincidencia encontrada\n`;
        } else {
            debugText += `• ❌ PhoneNumber: No hay coincidencia\n`;
            debugText += `  - ¿Contiene "${debugInfo.config.normalizedPhoneNumber}" en "${debugInfo.normalizedSenderId}"?\n`;
        }
        
        debugText += `\n💡 *Recomendaciones:*\n`;
        
        if (!checks.propietarioMatch && !checks.ownerJidMatch && !checks.phoneNumberMatch) {
            debugText += `• Ninguna verificación coincide. Revisa el formato del número en config.json\n`;
            debugText += `• Intenta usar el formato exacto que muestra WhatsApp\n`;
            debugText += `• Considera agregar el número completo con @s.whatsapp.net\n`;
        } else {
            debugText += `• Al menos una verificación funciona. El problema puede estar en reload.js\n`;
        }
        
        // Enviar mensaje
        await sock.sendMessage(chatId, { text: debugText }, { quoted: msg });
        
        console.log(`[DEBUG] Información de depuración enviada a ${senderId}`);
        console.log(`[DEBUG] Verificaciones:`, checks);
        
    } catch (error) {
        console.error('[DEBUG] Error en debug_owner:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Error en el sistema de debug: ${error.message}` 
        }, { quoted: msg });
    }
}

export const help = `
🔍 *DEBUG DE PROPIETARIO*

• \`.debugowner\` - Muestra información detallada de verificación
• \`.testowner\` - Alias del comando anterior

Este comando ayuda a diagnosticar por qué el sistema no reconoce al propietario del bot.`;
