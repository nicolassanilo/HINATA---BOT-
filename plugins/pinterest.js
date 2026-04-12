/**
 * @file Plugin para buscar imágenes tipo Pinterest (Pexels / fallback Unsplash).
 * @description Búsqueda optimizada: menos peso por imagen, descargas en paralelo y envío por buffer.
 * @version 1.1.0
 */

import axios from 'axios';
import { obtenerConfig } from '../lib/functions.js';

export const command = '.pinterest';

/** Cuántas fotos pedir a la API (suficiente para elegir varias sin alargar la respuesta). */
const API_PER_PAGE = 12;
/** Cuántas imágenes enviar al chat. */
const SEND_COUNT = 3;
/** Timeout descarga de cada imagen (ms). */
const IMAGE_DOWNLOAD_TIMEOUT = 22000;
/** Tamaño máximo por imagen descargada (bytes). */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const http = axios.create({
    timeout: 12000,
    validateStatus: (s) => s >= 200 && s < 300
});

function shuffleInPlace(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * URL Pexels adecuada para WhatsApp: prioriza `large` (más liviano que large2x, suele bastar).
 */
function pexelsPhotoUrl(photo) {
    const src = photo?.src;
    if (!src) return null;
    return src.large || src.large2x || src.medium || src.small || null;
}

async function downloadImageBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: IMAGE_DOWNLOAD_TIMEOUT,
        maxContentLength: MAX_IMAGE_BYTES,
        maxBodyLength: MAX_IMAGE_BYTES,
        headers: {
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
        }
    });
    return Buffer.from(res.data);
}

async function fetchPexels(query, apiKey) {
    const response = await http.get(`https://api.pexels.com/v1/search`, {
        params: {
            query,
            per_page: API_PER_PAGE
        },
        headers: { Authorization: apiKey }
    });
    return (response.data.photos || [])
        .map((photo) => ({
            url: pexelsPhotoUrl(photo),
            title: photo.photographer || 'Imagen'
        }))
        .filter((x) => Boolean(x.url));
}

async function fetchUnsplash(query) {
    const response = await http.get(`https://api.unsplash.com/search/photos`, {
        params: { query, per_page: API_PER_PAGE },
        headers: { Authorization: 'Client-ID demo' }
    });
    return (response.data.results || [])
        .map((photo) => ({
            url: photo.urls?.small || photo.urls?.regular,
            title: photo.user?.name || 'Imagen'
        }))
        .filter((x) => Boolean(x.url));
}

export async function run(sock, m, { text }) {
    const chatId = m.key.remoteJid;
    const q = text?.trim();

    if (!q) {
        return await sock.sendMessage(
            chatId,
            {
                text: '📌 Por favor, escribe qué quieres buscar en Pinterest.\n\n*Ejemplo:*\n.pinterest decoración de interiores'
            },
            { quoted: m }
        );
    }

    await sock.sendMessage(chatId, { text: `📌 Buscando imágenes de "${q}"...` }, { quoted: m });

    try {
        let config = {};
        try {
            config = obtenerConfig();
        } catch {
            console.warn('Config no disponible, usando valores por defecto');
        }

        let images = [];

        if (config.pexelsApiKey && config.pexelsApiKey !== 'TU_API_KEY_DE_PEXELS') {
            try {
                images = await fetchPexels(q, config.pexelsApiKey);
            } catch (err) {
                console.warn('Error con Pexels API:', err.message);
            }
        }

        if (images.length === 0) {
            try {
                images = await fetchUnsplash(q);
            } catch (err) {
                console.warn('Error con Unsplash:', err.message);
            }
        }

        if (images.length === 0) {
            return await sock.sendMessage(
                chatId,
                { text: `❌ No encontré imágenes para "${q}". Intenta con otra búsqueda.` },
                { quoted: m }
            );
        }

        shuffleInPlace(images);
        const selected = images.slice(0, Math.min(SEND_COUNT, images.length));

        const settled = await Promise.allSettled(
            selected.map(async (img) => {
                const buffer = await downloadImageBuffer(img.url);
                return { buffer, img };
            })
        );

        let sent = 0;
        for (const result of settled) {
            if (result.status !== 'fulfilled') {
                console.warn('Error descargando imagen:', result.reason?.message || result.reason);
                continue;
            }
            const { buffer, img } = result.value;
            try {
                await sock.sendMessage(
                    chatId,
                    {
                        image: buffer,
                        caption: `📌 *${q}*\n👤 ${img.title}`
                    },
                    { quoted: m }
                );
                sent++;
            } catch (imgErr) {
                console.error('Error enviando imagen:', imgErr.message);
            }
        }

        if (sent === 0) {
            await sock.sendMessage(chatId, { text: '❌ No se pudieron enviar las imágenes. Intenta de nuevo.' }, { quoted: m });
        }
    } catch (error) {
        console.error('Error al buscar imágenes:', error.message);

        let errorMsg = '❌ Error al buscar imágenes.';
        if (error.code === 'ECONNABORTED') {
            errorMsg = '⏱️ La búsqueda tardó demasiado. Intenta de nuevo.';
        } else if (String(error.message).includes('401') || String(error.message).includes('403')) {
            errorMsg = '⚙️ Error de autenticación en la API. Revisa tu configuración.';
        }

        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
    }
}
