/**
 * @file Plugin Debug Owner v2.0 - Para diagnosticar problemas de verificación de propietario
 * @description Muestra información detallada sobre el usuario y la configuración con formato @s.whatsapp.net
 * @version 2.0.0
 */

import { getConfig } from '../index.js';

export const command = ['.debugowner', '.testowner'];

export async function run(sock, msg, { text, command, args }) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const chatId = msg.key.remoteJid;
    
    try {
        // Obtener configuración
        const config = getConfig();
        
        // Recopilar información
        const debugInfo = {
            senderId: senderId,
            isGroup: chatId.includes('@g.us'),
            chatId: chatId,
            config: {
                propietario: config.propietario,
                ownerJid: config.ownerJid,
                phoneNumber: config.phoneNumber
            }
        };
        
        // Verificaciones mejoradas
        const checks = {
            exactMatch: false,
            inclusionMatch: false,
            groupMatch: false
        };
        
        // Verificación exacta
        const validOwnerIds = [
            config.propietario,
            config.ownerJid,
            config.phoneNumber
        ].filter(id => id && id.includes('@s.whatsapp.net'));
        
        for (const ownerId of validOwnerIds) {
            if (senderId === ownerId) {
                checks.exactMatch = true;
                break;
            }
        }
        
        // Verificación por inclusión
        const normalizedSenderId = senderId.replace('@g.us', '').replace('@s.whatsapp.net', '');
        for (const ownerId of validOwnerIds) {
            const normalizedOwnerId = ownerId.replace('@s.whatsapp.net', '');
            if (normalizedSenderId.includes(normalizedOwnerId) || normalizedOwnerId.includes(normalizedSenderId)) {
                checks.inclusionMatch = true;
                break;
            }
        }
        
        // Verificación específica para grupos
        if (debugInfo.isGroup) {
            checks.groupMatch = checks.inclusionMatch;
        }
        
        // Construir mensaje de debug
        let debugText = `🔍 *DEBUG DE VERIFICACIÓN DE PROPIETARIO v2.0*\n\n`;
        
        debugText += `📱 *Información del Usuario:*\n`;
        debugText += `• ID completo: \`${senderId}\`\n`;
        debugText += `• Es grupo: ${debugInfo.isGroup ? '✅ Sí' : '❌ No'}\n`;
        debugText += `• ID del chat: \`${chatId}\`\n`;
        debugText += `• ID normalizado: \`${normalizedSenderId}\`\n\n`;
        
        debugText += `⚙️ *Configuración Actual:*\n`;
        debugText += `• Propietario: \`${config.propietario}\`\n`;
        debugText += `• OwnerJid: \`${config.ownerJid}\`\n`;
        debugText += `• PhoneNumber: \`${config.phoneNumber}\`\n\n`;
        
        debugText += `✅ *IDs Válidos del Propietario:*\n`;
        validOwnerIds.forEach((id, index) => {
            debugText += `${index + 1}. \`${id}\`\n`;
        });
        debugText += `\n`;
        
        debugText += `🔍 *Resultados de Verificación:*\n`;
        debugText += `• Coincidencia exacta: ${checks.exactMatch ? '✅ SÍ' : '❌ NO'}\n`;
        debugText += `• Coincidencia por inclusión: ${checks.inclusionMatch ? '✅ SÍ' : '❌ NO'}\n`;
        debugText += `• Verificación de grupo: ${checks.groupMatch ? '✅ SÍ' : '❌ NO'}\n\n`;
        
        debugText += `🎯 *Resultado Final:*\n`;
        const isOwner = checks.exactMatch || checks.inclusionMatch;
        debugText += `• ¿Es propietario? ${isOwner ? '✅ SÍ' : '❌ NO'}\n\n`;
        
        debugText += `🔧 *Análisis Detallado:*\n`;
        
        if (checks.exactMatch) {
            debugText += `• ✅ Coincidencia exacta encontrada\n`;
            debugText += `• 🔒 Acceso garantizado\n`;
        } else if (checks.inclusionMatch) {
            debugText += `• ⚠️ Coincidencia por inclusión\n`;
            debugText += `• 🔒 Acceso permitido (formato de grupo)\n`;
        } else {
            debugText += `• ❌ Ninguna coincidencia encontrada\n`;
            debugText += `• 🚫 Acceso denegado\n\n`;
            
            debugText += `💡 *Posibles soluciones:*\n`;
            debugText += `• Verifica que tu número esté en config.json\n`;
            debugText += `• Asegúrate de usar formato @s.whatsapp.net\n`;
            debugText += `• Confirma que estés usando el número correcto\n`;
            debugText += `• Revisa si hay espacios o caracteres extra\n`;
        }
        
        debugText += `\n📋 *Formato Esperado:*\n`;
        debugText += `• Tu ID: \`${senderId}\`\n`;
        debugText += `• Config: \`${validOwnerIds[0] || 'No configurado'}\`\n\n`;
        
        debugText += `🔄 *Próximos Pasos:*\n`;
        if (isOwner) {
            debugText += `• ✅ Puedes usar comandos de administrador\n`;
            debugText += `• 🔄 Prueba con \`.reload\` para verificar\n`;
        } else {
            debugText += `• 📝 Actualiza config.json si es necesario\n`;
            debugText += `• 🔄 Usa \`.reload\` después de corregir\n`;
            debugText += `• 📞 Contacta al administrador si no eres el propietario\n`;
        }
        
        // Enviar mensaje
        await sock.sendMessage(chatId, { text: debugText }, { quoted: msg });
        
        console.log(`[DEBUG v2.0] Información de depuración enviada a ${senderId}`);
        console.log(`[DEBUG v2.0] Verificaciones:`, checks);
        console.log(`[DEBUG v2.0] Resultado final: ${isOwner ? 'PROPIETARIO' : 'NO PROPIETARIO'}`);
        
    } catch (error) {
        console.error('[DEBUG v2.0] Error en debug_owner:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ Error en el sistema de debug: ${error.message}` 
        }, { quoted: msg });
    }
}

export const help = `
🔍 *DEBUG DE PROPIETARIO v2.0*

• \`.debugowner\` - Muestra información detallada de verificación
• \`.testowner\` - Alias del comando anterior

Este comando ayuda a diagnosticar por qué el sistema no reconoce al propietario del bot con el nuevo formato @s.whatsapp.net.

🔧 *Características:*
• Verificación exacta de IDs
• Soporte para grupos y chats privados
• Análisis detallado de configuración
• Recomendaciones automáticas
• Formato @s.whatsapp.net optimizado
`;
