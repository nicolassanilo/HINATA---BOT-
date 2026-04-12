/**
 * @file Fondos de pantalla anime (Wallhaven.cc API).
 * @description Busca wallpapers solo categoría *anime* y SFW; envío por buffer.
 */

import axios from 'axios';
import { obtenerConfig } from '../lib/functions.js';

export const command = ['.fondoanime', '.wallanime'];

export const help = `
Busca *fondos de pantalla anime* (alta resolución) usando la API de Wallhaven.

*Uso:*
  • \`.fondoanime <qué buscar>\`
  • \`.wallanime <qué buscar>\` (alias)

*Ejemplos:*
  • \`.fondoanime naruto\`
  • \`.wallanime cyberpunk city anime\`

*API key (opcional pero recomendada):*
  1. Crea cuenta en https://wallhaven.cc/signup
  2. Ve a *Ajustes de cuenta* → *API* https://wallhaven.cc/settings/account
  3. Copia tu clave y ponla en \`config/config.json\` como \`wallhavenApiKey\`

Sin clave suele funcionar para búsquedas SFW, pero los límites por minuto son más bajos (≈45 peticiones/min con clave según Wallhaven).
`;

const WALLHAVEN_SEARCH = 'https://wallhaven.cc/api/v1/search';
const SEND_COUNT = 2;
const API_TIMEOUT_MS = 18000;
const IMAGE_TIMEOUT_MS = 45000;
const MAX_IMAGE_BYTES = 22 * 1024 * 1024;

const http = axios.create({
    timeout: API_TIMEOUT_MS,
    headers: { 'User-Agent': 'HINATA-BOT/1.1 (Wallhaven; +https://github.com/)' },
    validateStatus: (s) => s >= 200 && s < 500
});

function shuffleInPlace(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function normalizeWallhavenPath(item) {
    if (item?.path && typeof item.path === 'string') {
        const p = item.path;
        if (p.startsWith('http')) return p;
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
    const key = apiKey && String(apiKey).trim();
    const headers = key ? { 'X-API-Key': key } : {};

    const res = await http.get(WALLHAVEN_SEARCH, { params, headers });
    if (res.status === 401) {
        const err = new Error('WALLHAVEN_AUTH');
        throw err;
    }
    if (res.status === 429) {
        const err = new Error('WALLHAVEN_RATE');
        throw err;
    }
    if (res.status !== 200 || !res.data) {
        const err = new Error(`Wallhaven HTTP ${res.status}`);
        throw err;
    }
    return res.data.data || [];
}

async function downloadWallpaperBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: IMAGE_TIMEOUT_MS,
        maxContentLength: MAX_IMAGE_BYTES,
        maxBodyLength: MAX_IMAGE_BYTES,
        headers: {
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            'User-Agent': 'HINATA-BOT/1.1'
        },
        validateStatus: (s) => s >= 200 && s < 400
    });
    return Buffer.from(res.data);
}

export async function run(sock, m, { text }) {
    const chatId = m.key.remoteJid;
    const q = text?.trim();

    if (!q) {
        return await sock.sendMessage(
            chatId,
            {
                text: '🖼️ Escribe qué fondo anime quieres.\n\n*Ejemplo:*\n.fondoanime rem re zero\n\n*API:* https://wallhaven.cc/settings/account → clave en `wallhavenApiKey` (opcional).'
            },
            { quoted: m }
        );
    }

    let wallhavenApiKey = '';
    try {
        const cfg = obtenerConfig();
        wallhavenApiKey = cfg?.wallhavenApiKey || '';
    } catch {
        console.warn('fondoanime: sin config, se usa Wallhaven sin apikey');
    }

    await sock.sendMessage(chatId, { text: `🖼️ Buscando fondos anime: *${q}*…` }, { quoted: m });

    try {
        const items = await searchWallpapers(q, wallhavenApiKey);

        const candidates = items
            .map((it) => ({
                url: normalizeWallhavenPath(it),
                resolution: it.resolution || '',
                id: it.id || ''
            }))
            .filter((x) => Boolean(x.url));

        if (candidates.length === 0) {
            return await sock.sendMessage(
                chatId,
                { text: `❌ No hay resultados SFW de anime para "${q}". Prueba otras palabras o en inglés (tags de Wallhaven).` },
                { quoted: m }
            );
        }

        shuffleInPlace(candidates);
        const selected = candidates.slice(0, Math.min(SEND_COUNT + 4, candidates.length));

        const settled = await Promise.allSettled(
            selected.map(async (c) => {
                const buffer = await downloadWallpaperBuffer(c.url);
                return { buffer, c };
            })
        );

        let sent = 0;
        for (const result of settled) {
            if (sent >= SEND_COUNT) break;
            if (result.status !== 'fulfilled') {
                console.warn('fondoanime: descarga fallida', result.reason?.message || result.reason);
                continue;
            }
            const { buffer, c } = result.value;
            try {
                await sock.sendMessage(
                    chatId,
                    {
                        image: buffer,
                        caption: `🖼️ *${q}*\n📐 ${c.resolution || '—'}${c.id ? `\n🔗 wallhaven.cc/w/${c.id}` : ''}`
                    },
                    { quoted: m }
                );
                sent++;
            } catch (e) {
                console.error('fondoanime: error enviando imagen', e.message);
            }
        }

        if (sent === 0) {
            await sock.sendMessage(
                chatId,
                {
                    text: '❌ No pude descargar o enviar los archivos (muy pesados o red). Prueba otra búsqueda o más tarde.'
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
                { text: '⏳ Demasiadas peticiones a Wallhaven. Espera un minuto o configura tu propia API key.' },
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
