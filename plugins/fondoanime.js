/**
 * @file Fondos de pantalla anime (Wallhaven.cc API).
 * @description Solo categoría anime + SFW. Envío por URL (compatible con Baileys) y respaldos.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const command = ['.fondoanime', '.wallanime'];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const help = `
Busca *fondos de pantalla anime* (alta resolución) usando la API de Wallhaven.

*Uso:*
  • \`.fondoanime <qué buscar>\`
  • \`.wallanime <qué buscar>\` (alias)

*Ejemplos:*
  • \`.fondoanime naruto\`
  • \`.wallanime re zero\`

*API key (opcional pero recomendada):*
  1. Cuenta en https://wallhaven.cc/signup
  2. Ajustes → API: https://wallhaven.cc/settings/account
  3. Clave en \`config/config.json\` → \`wallhavenApiKey\`
`;

const WALLHAVEN_SEARCH = 'https://wallhaven.cc/api/v1/search';
const SEND_COUNT = 2;
const API_TIMEOUT_MS = 20000;
const IMAGE_TIMEOUT_MS = 60000;
const MAX_BUFFER_BYTES = 8 * 1024 * 1024;

const CHROME_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

const http = axios.create({
    timeout: API_TIMEOUT_MS,
    headers: { 'User-Agent': CHROME_UA, Accept: 'application/json' },
    validateStatus: (s) => s >= 200 && s < 500
});

function readWallhavenApiKey() {
    try {
        const cfgPath = path.join(__dirname, '..', 'config', 'config.json');
        const raw = fs.readFileSync(cfgPath, 'utf8');
        const key = JSON.parse(raw).wallhavenApiKey;
        return key && String(key).trim() ? String(key).trim() : '';
    } catch {
        return '';
    }
}

function shuffleInPlace(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function normalizeWallhavenPath(item) {
    if (item?.path && typeof item.path === 'string' && item.path.startsWith('http')) {
        return item.path;
    }
    return null;
}

async function searchWallpapers(query, apiKey) {
    const params = {
        q: query.trim(),
        categories: '010',
        purity: '100',
        sorting: 'random',
        atleast: '1920x1080',
        page: 1
    };
    const headers = apiKey ? { 'X-API-Key': apiKey } : {};

    const res = await http.get(WALLHAVEN_SEARCH, { params, headers });
    if (res.status === 401) throw new Error('WALLHAVEN_AUTH');
    if (res.status === 429) throw new Error('WALLHAVEN_RATE');
    if (res.status !== 200 || !res.data) {
        throw new Error(`Wallhaven HTTP ${res.status}`);
    }
    return res.data.data || [];
}

async function downloadBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: IMAGE_TIMEOUT_MS,
        maxContentLength: MAX_BUFFER_BYTES,
        maxBodyLength: MAX_BUFFER_BYTES,
        headers: { Accept: 'image/*,*/*;q=0.8', 'User-Agent': CHROME_UA },
        validateStatus: (s) => s >= 200 && s < 400
    });
    return Buffer.from(res.data);
}

/**
 * WhatsApp/Baileys suele ir mejor con { url } en imágenes pesadas que con buffer gigante.
 */
async function sendOneWallpaper(sock, chatId, m, q, c) {
    const caption = `🖼️ *${q}*\n📐 ${c.resolution || '—'}${c.id ? `\n🔗 https://wallhaven.cc/w/${c.id}` : ''}`;

    try {
        await sock.sendMessage(chatId, { image: { url: c.url }, caption }, { quoted: m });
        return true;
    } catch (e1) {
        console.warn('fondoanime: envío por URL (full) falló:', e1.message);
    }

    if (c.thumbUrl) {
        try {
            await sock.sendMessage(
                chatId,
                {
                    image: { url: c.thumbUrl },
                    caption: `${caption}\n_(vista previa; el enlace arriba lleva al original en Wallhaven)_`
                },
                { quoted: m }
            );
            return true;
        } catch (e2) {
            console.warn('fondoanime: envío por URL (thumb) falló:', e2.message);
        }
    }

    if (c.file_size && c.file_size > MAX_BUFFER_BYTES) {
        console.warn('fondoanime: archivo muy grande para buffer, se omite:', c.file_size);
        return false;
    }

    try {
        const buffer = await downloadBuffer(c.url);
        const mime = c.mime && String(c.mime).startsWith('image/') ? c.mime : 'image/jpeg';
        await sock.sendMessage(chatId, { image: buffer, mimetype: mime, caption }, { quoted: m });
        return true;
    } catch (e3) {
        console.warn('fondoanime: envío por buffer falló:', e3.message);
        return false;
    }
}

export async function run(sock, m, { text }) {
    const chatId = m.key.remoteJid;
    const q = text?.trim();

    if (!q) {
        return await sock.sendMessage(
            chatId,
            {
                text: '🖼️ Escribe qué fondo anime quieres.\n\n*Ejemplo:*\n.fondoanime rem\n\n*API (opcional):* https://wallhaven.cc/settings/account → `wallhavenApiKey` en config.json'
            },
            { quoted: m }
        );
    }

    const wallhavenApiKey = readWallhavenApiKey();

    await sock.sendMessage(chatId, { text: `🖼️ Buscando fondos anime: *${q}*…` }, { quoted: m });

    try {
        const items = await searchWallpapers(q, wallhavenApiKey);

        const candidates = items
            .map((it) => ({
                url: normalizeWallhavenPath(it),
                thumbUrl: it.thumbs?.large || it.thumbs?.original || null,
                resolution: it.resolution || '',
                id: it.id || '',
                file_size: typeof it.file_size === 'number' ? it.file_size : 0,
                mime: it.file_type || 'image/jpeg'
            }))
            .filter((x) => Boolean(x.url));

        if (candidates.length === 0) {
            return await sock.sendMessage(
                chatId,
                {
                    text: `❌ No hay resultados SFW de anime para "${q}". Prueba otras palabras o en inglés (tags de Wallhaven).`
                },
                { quoted: m }
            );
        }

        shuffleInPlace(candidates);

        let sent = 0;
        for (const c of candidates) {
            if (sent >= SEND_COUNT) break;
            const ok = await sendOneWallpaper(sock, chatId, m, q, c);
            if (ok) sent++;
        }

        if (sent === 0) {
            await sock.sendMessage(
                chatId,
                {
                    text: '❌ No pude enviar las imágenes (WhatsApp o la red rechazaron la descarga). Prueba otra búsqueda o más tarde.'
                },
                { quoted: m }
            );
        }
    } catch (error) {
        console.error('fondoanime:', error.message);

        if (error.message === 'WALLHAVEN_AUTH') {
            return await sock.sendMessage(
                chatId,
                {
                    text: '🔑 Wallhaven rechazó la API key. Revisa `wallhavenApiKey` en `config/config.json` (https://wallhaven.cc/settings/account).'
                },
                { quoted: m }
            );
        }
        if (error.message === 'WALLHAVEN_RATE') {
            return await sock.sendMessage(
                chatId,
                { text: '⏳ Demasiadas peticiones a Wallhaven. Espera un minuto o configura tu API key.' },
                { quoted: m }
            );
        }

        await sock.sendMessage(
            chatId,
            { text: `❌ Error al buscar fondos: ${error.message || 'desconocido'}` },
            { quoted: m }
        );
    }
}
