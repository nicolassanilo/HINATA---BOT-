/**
 * @file Archivo principal del Bot de WhatsApp HINATA.
 * @description Este archivo maneja la conexión con WhatsApp, carga los plugins de comandos
 * y procesa los mensajes entrantes.
 * @version 2.0.0
 */

// ----------------------------------------
//          IMPORTS Y CONFIGURACIÓN
// ----------------------------------------
import {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import path from 'path';
import fs from 'fs/promises';
import { Boom } from '@hapi/boom';
import express from 'express';
import { initDB, db } from './db.js';

// Importa makeWASocket como default
import makeWASocket from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Almacén global para los comandos cargados
export let plugins = new Map();
export let regexPlugins = [];
// Almacén global para la configuración
let config = {};

// Cooldown maps for rate-limiting
// key: `${command}:${userId}` -> timestamp (ms)
const cooldownsMap = new Map();
// key: chatId -> array of timestamps (ms) of recent commands
const groupUsageMap = new Map();

// ----------------------------------------
//          FUNCIONES AUXILIARES
// ----------------------------------------

/**
 * Carga la configuración desde config.json.
 * Es buena práctica mover esta función a un archivo en una carpeta 'lib'.
 */
async function obtenerConfig() {
    try {
        const data = await fs.readFile('config/config.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error al leer o parsear config/config.json. Asegúrate de que el archivo existe y es un JSON válido.', error);
        // Termina el proceso si no hay configuración, ya que es vital.
        process.exit(1);
    }
}

/**
 * Carga dinámicamente todos los comandos desde la carpeta 'plugins'.
 */
export async function cargarPlugins() {
    const newPlugins = new Map();
    const newRegexPlugins = [];
    const errors = [];

    const pluginsDir = path.join(__dirname, 'plugins');
    try {
        const files = await fs.readdir(pluginsDir);
        // Filtra los archivos .js y excluye db.js
        const pluginFiles = files.filter(file => file.endsWith('.js') && file !== 'db.js');

        console.log('🔌 Cargando plugins...');
        for (const file of pluginFiles) {
            try {
                // Usamos un timestamp para evitar problemas de caché con import()
                const pluginPath = path.join(pluginsDir, file) + `?v=${Date.now()}`;
                const imported = await import(pluginPath);
                const pluginDefinition = imported.default || imported;
                const commands = pluginDefinition.command || pluginDefinition.commands || imported.command || imported.commands;

                if (!commands) {
                    console.log(`⚠️ Plugin omitido: "${file}" no exporta un comando compatible.`);
                    continue;
                }

                const pluginObj = typeof pluginDefinition === 'function'
                    ? { ...pluginDefinition, run: pluginDefinition, command: pluginDefinition.command }
                    : { ...pluginDefinition, run: pluginDefinition.run || pluginDefinition };

                if (typeof pluginObj.run !== 'function') {
                    console.log(`⚠️ Plugin omitido: "${file}" no tiene una función de ejecución válida.`);
                    continue;
                }

                const commandList = Array.isArray(commands) ? commands : [commands];
                for (const cmd of commandList) {
                    if (cmd instanceof RegExp) {
                        newRegexPlugins.push({ pattern: cmd, plugin: pluginObj, file });
                        continue;
                    }

                    if (typeof cmd !== 'string') {
                        console.log(`⚠️ Comando ignorado en "${file}": tipo de comando no soportado.`);
                        continue;
                    }

                    const commandKey = cmd.startsWith('.') ? cmd : `.${cmd}`;
                    if (newPlugins.has(commandKey)) {
                        console.warn(`⚠️ ¡Comando duplicado! "${cmd}" en "${file}" será omitido.`);
                        continue;
                    }

                    newPlugins.set(commandKey, pluginObj);
                }
            } catch (err) {
                console.error(`❌ Error al cargar el plugin "${file}":`, err);
                errors.push({ file, error: err.message });
            }
        }
        plugins = newPlugins;
        regexPlugins = newRegexPlugins;
        console.log(`✅ ${plugins.size} comandos cargados, ${regexPlugins.length} patrones regex registrados.`);
        return { plugins, regexPlugins, errors };
    } catch (error) {
        console.error('❌ No se pudo leer el directorio de plugins. Asegúrate de que la carpeta "plugins" existe.', error);
        return { plugins: new Map(), regexPlugins: [], errors: [{ file: 'directorio de plugins', error: error.message }] };
    }
}

// ----------------------------------------
//          CONEXIÓN A WHATSAPP
// ----------------------------------------

async function connectToWhatsApp() {
    try {
        // Inicializar base de datos
        await initDB();
    } catch (dbError) {
        console.error('❌ Error al inicializar la base de datos:', dbError);
        // Continuar sin base de datos en caso de error
    }

    // Cargar configuración y plugins al inicio
    try {
        config = await obtenerConfig();
    } catch (configError) {
        console.error('❌ Error al cargar configuración:', configError);
        process.exit(1);
    }

    try {
        ({ plugins, regexPlugins } = await cargarPlugins());
    } catch (pluginError) {
        console.error('❌ Error al cargar plugins:', pluginError);
        // Continuar con plugins vacíos
        plugins = new Map();
        regexPlugins = [];
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`🤖 Usando WhatsApp v${version.join('.')} (isLatest: ${isLatest})`);

    if (config.authMethod === 'qr') {
        console.log('🔑 Método de autenticación: QR Code');
    } else if (config.authMethod === 'phone') {
        console.log('📱 Método de autenticación: Número de teléfono');
    } else {
        console.log('⚠️ Método de autenticación desconocido, usando QR por defecto');
        config.authMethod = 'qr';
    }

    const sock = makeWASocket({
        version,
        printQRInTerminal: config.authMethod === 'qr',
        auth: {
            creds: state.creds,
            // Almacenamiento en caché para mejorar el rendimiento
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        logger: pino({ level: 'silent' }),
        // Opciones adicionales para más robustez
        shouldIgnoreJid: jid => jid.includes('@broadcast'),
        getMessage: async (key) => {
            // Lógica para obtener mensajes si es necesario (ej. para reintentos)
            return { conversation: 'hello' };
        }
    });

    // Si el método de autenticación es por teléfono, solicitar el código de vinculación
    if (config.authMethod === 'phone') {
        if (!config.phoneNumber) {
            console.error('❌ Error: phoneNumber no está configurado en config.json');
            process.exit(1);
        }
        try {
            const code = await sock.requestPairingCode(config.phoneNumber.replace('+', ''));
            console.log(`🔗 Código de vinculación: ${code}`);
            console.log('Ingresa este código en WhatsApp para vincular el bot.');
        } catch (error) {
            console.error('❌ Error al solicitar el código de vinculación:', error);
            process.exit(1);
        }
    }

    // ---- MANEJO DE EVENTOS DE CONEXIÓN ----
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        // Mostrar el QR explícitamente en terminal si viene en el update
        if (update.qr) {
            try {
                qrcode.generate(update.qr, { small: true });
                console.log('🔑 Escanea el QR mostrado en la terminal para iniciar sesión.');
            } catch (err) {
                console.log('🔑 QR recibido pero no se pudo mostrar en terminal:', err.message || err);
            }
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ?
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut :
                true;
            console.log('🔌 Conexión cerrada por:', lastDisconnect.error, ', reconectando:', shouldReconnect);
            if (shouldReconnect) {
                // Esperar 5 segundos antes de reconectar para evitar bucles rápidos
                setTimeout(() => {
                    connectToWhatsApp();
                }, 5000);
            }
        } else if (connection === 'open') {
            console.log('✅ Conexión abierta. ¡Hinata-Bot está en línea!');
        }
    });

    // ---- GUARDADO DE CREDENCIALES ----
    sock.ev.on('creds.update', saveCreds);

    // ---- MANEJO DE MENSAJES ENTRANTES ----
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify' || !m.messages[0]?.key) return;

        const msg = m.messages[0];
        // Ignorar mensajes propios y de estado
        if (msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') return;

        const chatId = msg.key.remoteJid;
        const userId = msg.key.participant || msg.key.remoteJid;

        // Registrar actividad de usuario en grupos
        if (chatId.endsWith('@g.us')) {
            try {
                // Usamos INSERT ... ON CONFLICT para crear o actualizar el registro
                await db.run(
                    'INSERT INTO group_activity (chatId, userId, lastSeen) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(chatId, userId) DO UPDATE SET lastSeen = CURRENT_TIMESTAMP',
                    [chatId, userId]
                );
            } catch (dbErr) {
                console.error('❌ Error al actualizar la actividad del usuario:', dbErr);
            }
        }

        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const prefix = '.'; // Prefijo para los comandos

        // Verificar si hay un juego activo y el mensaje es un número o letra
        if (!text.startsWith(prefix)) {
            const contenido = text.trim();
            
            try {
                // Verificar si es un número
                if (/^\d+$/.test(contenido)) {
                    // Verificar si es para trivia (1-4)
                    if (/^[1-4]$/.test(contenido)) {
                        const triviaPlugin = plugins.get('.trivia');
                        if (triviaPlugin && triviaPlugin.procesarMensajeTrivia) {
                            await triviaPlugin.procesarMensajeTrivia(sock, msg);
                            return;
                        }
                    }
                    
                    // Si no es trivia, verificar si es para adivina
                    const adivinaPlugin = plugins.get('.adivina');
                    if (adivinaPlugin && adivinaPlugin.procesarMensajeNumero) {
                        await adivinaPlugin.procesarMensajeNumero(sock, msg);
                        return;
                    }
                }
                
                // Verificar si es una sola letra para ahorcado
                if (contenido.length === 1 && /\p{L}/u.test(contenido)) {
                    const ahorcadoPlugin = plugins.get('.ahorcado');
                    if (ahorcadoPlugin && ahorcadoPlugin.procesarMensajeAhorcado) {
                        await ahorcadoPlugin.procesarMensajeAhorcado(sock, msg);
                        return;
                    }
                }
            } catch (err) {
                console.error('Error al procesar mensaje para juegos:', err);
            }
            return;
        }

        if (!text.startsWith(prefix)) return;

        const senderId = msg.key.remoteJid;

        const args = text.slice(prefix.length).trim().split(/ +/); // senderId ya está definido arriba
        const commandName = args.shift().toLowerCase();
        const command = prefix + commandName;
        
        let plugin = plugins.get(command);
        if (!plugin && regexPlugins.length) {
            const matched = regexPlugins.find(({ pattern }) => pattern.test(commandName));
            if (matched) plugin = matched.plugin;
        }

        if (plugin) {
            // Cooldown and rate-limiting logic
            try {
                const now = Date.now();
                // userId y chatId ya están definidos arriba

                // Reload runtime config so changes via .setcooldown apply immediately
                let runtimeConfig = {};
                try {
                    runtimeConfig = await obtenerConfig();
                } catch (e) {
                    runtimeConfig = config || {};
                }

                // Load cooldown config (defaults)
                const perUserSec = (runtimeConfig.cooldowns && runtimeConfig.cooldowns.perUser) ? runtimeConfig.cooldowns.perUser : 5;
                const groupBurstLimit = (runtimeConfig.cooldowns && runtimeConfig.cooldowns.groupBurstLimit) ? runtimeConfig.cooldowns.groupBurstLimit : 25;
                const groupBurstSeconds = (runtimeConfig.cooldowns && runtimeConfig.cooldowns.groupBurstSeconds) ? runtimeConfig.cooldowns.groupBurstSeconds : 60;

                // Owner bypass: if sender is owner, skip cooldowns
                const ownerId = (runtimeConfig.ownerJid && runtimeConfig.ownerJid.toString().trim()) || (runtimeConfig.propietario && runtimeConfig.propietario.toString().trim()) || '';
                let isOwner = false;
                if (ownerId) {
                    try {
                        if (ownerId.includes('@')) {
                            isOwner = userId === ownerId;
                        } else {
                            // allow matching by phone or partial match
                            isOwner = userId === ownerId || userId.includes(ownerId) || userId.startsWith(ownerId);
                        }
                    } catch (e) {
                        isOwner = false;
                    }
                }

                if (isOwner) {
                    // propietario exento de cooldowns
                    console.log(`🔓 Usuario propietario detectado (${userId}), saltando cooldowns para ${command}`);
                    await plugin.run(sock, msg, { text: args.join(' '), command, args, plugins });
                    return;
                }

                // Per-user per-command cooldown
                const cmdKey = `${command}:${userId}`;
                const lastUsed = cooldownsMap.get(cmdKey) || 0;
                const waitMs = perUserSec * 1000 - (now - lastUsed);
                if (lastUsed && waitMs > 0) {
                    const waitSec = Math.ceil(waitMs / 1000);
                    await sock.sendMessage(chatId, { text: `⌛ Por favor espera ${waitSec}s antes de usar el comando ${command} nuevamente.` }, { quoted: msg });
                    return;
                }

                // Group burst limiting to reduce spam
                const windowStart = now - (groupBurstSeconds * 1000);
                let timestamps = groupUsageMap.get(chatId) || [];
                // Keep only recent timestamps
                timestamps = timestamps.filter(t => t >= windowStart);
                if (timestamps.length >= groupBurstLimit) {
                    await sock.sendMessage(chatId, { text: `⚠️ Demasiados comandos en este grupo. Por favor espera unos segundos antes de usar más comandos.` }, { quoted: msg });
                    // update map with filtered list (no push since blocked)
                    groupUsageMap.set(chatId, timestamps);
                    return;
                }

                // Record usage
                timestamps.push(now);
                groupUsageMap.set(chatId, timestamps);
                cooldownsMap.set(cmdKey, now);

                console.log(`💬 Comando: ${command} | Argumentos: [${args.join(', ')}] | De: ${senderId}`);
                await plugin.run(sock, msg, { text: args.join(' '), command, args, plugins });
            } catch (err) {
                console.error(`❌ Error ejecutando el comando "${command}":`, err);
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Ocurrió un error inesperado al ejecutar ese comando.' }, { quoted: msg });
            }
        }
    });

    return sock;
}

// Iniciar el bot
connectToWhatsApp().catch(err => {
    console.error("❌ Error al iniciar la conexión WhatsApp:", err);
    console.log("🔄 El servidor web seguirá ejecutándose. Reintentando conexión en 30 segundos...");
    setTimeout(() => {
        connectToWhatsApp();
    }, 30000);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot HINATA está ejecutándose - Estado: Intentando conectar a WhatsApp...');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor web en puerto ${PORT}`);
});