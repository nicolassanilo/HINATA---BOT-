import { reloadPlugins, getConfig } from '../index.js';

export const command = ['.reload', '.updateplugins'];

export async function run(sock, msg) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const chatId = msg.key.remoteJid;

    try {
        let runtimeConfig = getConfig();
        let ownerJid = (runtimeConfig.ownerJid || '').trim();
        let propietario = (runtimeConfig.propietario || '').trim();

        if (!ownerJid && !propietario) {
            const result = await reloadPlugins();
            runtimeConfig = result.config || runtimeConfig;
            ownerJid = (runtimeConfig.ownerJid || '').trim();
            propietario = (runtimeConfig.propietario || '').trim();
        }

        // 2. Verificar si el remitente es el propietario
        let isOwner = false;
        if (ownerJid && senderId.includes(ownerJid)) {
            isOwner = true;
        } else if (propietario && senderId.includes(propietario)) {
            isOwner = true;
        }

        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ No tienes permiso para usar este comando. Solo el propietario puede recargar los plugins.' }, { quoted: msg });
            return;
        }

        // 3. Si es el propietario, ejecutar la recarga
        await sock.sendMessage(chatId, { text: '🔄 Recargando plugins... Por favor espera.' }, { quoted: msg });

        const { plugins: loadedPlugins, errors } = await reloadPlugins();

        let responseText = `✅ Recarga completada. Se cargaron ${loadedPlugins.size} comandos.`;

        if (errors.length > 0) {
            responseText += '\n\n*Se encontraron errores en los siguientes plugins:*\n';
            errors.forEach(err => {
                responseText += `\n📄 *Archivo:* ${err.file}\n   └─ 🐛 *Error:* ${err.error}`;
            });
            responseText += '\n\nEstos plugins no estarán disponibles hasta que se corrijan los errores.';
        }

        await sock.sendMessage(chatId, { text: responseText }, { quoted: msg });
        console.log(`🔄 Plugins recargados por el propietario (${senderId}). Errores: ${errors.length}`);

    } catch (error) {
        console.error('❌ Error en el comando .reload:', error);
        await sock.sendMessage(chatId, { text: '❌ Ocurrió un error al intentar recargar los plugins.' }, { quoted: msg });
    }
}
