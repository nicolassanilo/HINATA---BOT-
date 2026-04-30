/**
 * @file Plugin mejorado para buscar imágenes de Pinterest oficial.
 * @description Busca y envía imágenes directamente desde Pinterest.com con scraping responsable.
 * @version 2.0.0
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';
import { obtenerConfig } from '../lib/functions.js';

export const command = '.pinterest';

export async function run(sock, m, { text }) {
    const chatId = m.key.remoteJid;

    if (!text || !text.trim()) {
        return await sock.sendMessage(chatId, { 
            text: '📌 Por favor, escribe qué quieres buscar en Pinterest.\n\n*Ejemplo:*\n.pinterest decoración de interiores' 
        }, { quoted: m });
    }

    await sock.sendMessage(chatId, { 
        text: `📌 Buscando en Pinterest: "${text.trim()}"...` 
    }, { quoted: m });

    try {
        const query = encodeURIComponent(text.trim());
        const images = await getPinterestImages(query);

        if (!images || images.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: `❌ No encontré imágenes para "${text.trim()}".\n\n💡 *Sugerencias:*\n• Intenta con términos más específicos\n• Usa palabras en inglés si no hay resultados\n• Verifica la ortografía` 
            }, { quoted: m });
        }

        // Enviar 3 imágenes aleatorias
        const shuffled = images.sort(() => Math.random() - 0.5);
        const selectedImages = shuffled.slice(0, Math.min(3, shuffled.length));

        let sent = 0;
        for (const img of selectedImages) {
            if (img.url) {
                try {
                    await sock.sendMessage(
                        chatId,
                        {
                            image: { url: img.url },
                            caption: `📌 *${text.trim()}*\n🔗 ${img.title || 'Pin de Pinterest'}\n💡 Fuente: Pinterest.com`
                        },
                        { quoted: m }
                    );
                    sent++;
                    // Delay entre imágenes para evitar rate limiting
                    await new Promise(resolve => setTimeout(resolve, 800));
                } catch (imgErr) {
                    console.error('Error enviando imagen:', imgErr.message);
                }
            }
        }

        if (sent === 0) {
            await sock.sendMessage(chatId, { 
                text: '❌ No se pudieron enviar las imágenes. Intenta de nuevo.' 
            }, { quoted: m });
        }

    } catch (error) {
        console.error('Error al buscar imágenes en Pinterest:', error.message);

        let errorMsg = '❌ Error al buscar imágenes en Pinterest.';
        if (error.code === 'ECONNABORTED') {
            errorMsg = '⏱️ La búsqueda tardó demasiado. Intenta con una búsqueda más simple.';
        } else if (error.message.includes('403')) {
            errorMsg = '🚫 Pinterest está bloqueando el acceso. Intenta más tarde.';
        } else if (error.message.includes('429')) {
            errorMsg = '⏰ Demasiadas solicitudes. Espera un momento y vuelve a intentar.';
        }

        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
    }
}

/**
 * Obtiene imágenes directamente desde Pinterest.com
 * @param {string} query - Término de búsqueda codificado
 * @returns {Array} Array de objetos de imagen con url y title
 */
async function getPinterestImages(query) {
    try {
        // Método 1: Intentar con la API no oficial de Pinterest (más rápido)
        const apiImages = await getPinterestAPIImages(query);
        if (apiImages && apiImages.length > 0) {
            return apiImages;
        }

        // Método 2: Web scraping directo (fallback)
        const scrapedImages = await scrapePinterestImages(query);
        if (scrapedImages && scrapedImages.length > 0) {
            return scrapedImages;
        }

        // Método 3: Usar motor de búsqueda de imágenes de Google con filtro Pinterest
        const googleImages = await getGooglePinterestImages(query);
        if (googleImages && googleImages.length > 0) {
            return googleImages;
        }

        return [];

    } catch (error) {
        console.error('Error en getPinterestImages:', error);
        return [];
    }
}

/**
 * Método 1: Intenta usar la API no oficial de Pinterest
 */
async function getPinterestAPIImages(query) {
    try {
        const response = await axios.get(
            `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${query}&data=%7B%22options%22%3A%7B%22isPrefetch%22%3Afalse%2C%22query%22%3A%22${query}%22%2C%22scope%22%3A%22pins%22%2C%22no_fetch_context%22%3Afalse%7D%2C%22context%22%3A%7B%7D%7D&_=1`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'es-ES,es;q=0.9',
                    'Referer': `https://www.pinterest.com/search/pins/?q=${query}`
                },
                timeout: 15000
            }
        );

        const data = response.data;
        const pins = data?.resource_response?.data?.results || [];

        return pins.map(pin => ({
            url: pin.images?.orig?.url || pin.images?.originals?.url,
            title: pin.title || pin.description || 'Pin de Pinterest',
            id: pin.id
        })).filter(img => img.url && img.url.startsWith('https://i.pinimg.com'));

    } catch (error) {
        console.warn('Error con API de Pinterest:', error.message);
        return [];
    }
}

/**
 * Método 2: Web scraping directo de Pinterest
 */
async function scrapePinterestImages(query) {
    try {
        const response = await axios.get(
            `https://ar.pinterest.com/search/pins/?q=${query}`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'es-ES,es;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 20000
            }
        );

        const dom = new JSDOM(response.data);
        const document = dom.window.document;

        // Buscar imágenes en diferentes selectores que Pinterest usa
        const imageSelectors = [
            'img[src*="i.pinimg.com"]',
            '[data-test-id="pin-visual-wrapper"] img',
            '.GrowthUnauthPinImage img',
            '[data-test-id="pin-visual"] img'
        ];

        const images = [];
        
        for (const selector of imageSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const src = element.src || element.getAttribute('data-src');
                if (src && src.includes('i.pinimg.com') && !images.find(img => img.url === src)) {
                    images.push({
                        url: src.replace('/236x/', '/736x/'), // Mejor calidad
                        title: element.alt || element.title || 'Pin de Pinterest'
                    });
                }
            });
        }

        return images.slice(0, 15); // Limitar a 15 imágenes

    } catch (error) {
        console.warn('Error en scraping de Pinterest:', error.message);
        return [];
    }
}

/**
 * Método 3: Búsqueda en Google con filtro de Pinterest
 */
async function getGooglePinterestImages(query) {
    try {
        const response = await axios.get(
            `https://www.google.com/search?q=${query}+site:pinterest.com&tbm=isch`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'es-ES,es;q=0.9'
                },
                timeout: 15000
            }
        );

        const dom = new JSDOM(response.data);
        const document = dom.window.document;

        // Extraer miniaturas de Google Images que vienen de Pinterest
        const images = [];
        const elements = document.querySelectorAll('img[src*="pinterest.com"], img[src*="pinimg.com"]');

        elements.forEach(element => {
            const src = element.src;
            if (src && (src.includes('pinterest.com') || src.includes('pinimg.com'))) {
                // Convertir thumbnail a URL de alta calidad si es posible
                let highQualityUrl = src;
                if (src.includes('=s')) {
                    highQualityUrl = src.split('=s')[0] + '=s736';
                }
                
                if (!images.find(img => img.url === highQualityUrl)) {
                    images.push({
                        url: highQualityUrl,
                        title: element.alt || 'Imagen de Pinterest'
                    });
                }
            }
        });

        return images.slice(0, 10);

    } catch (error) {
        console.warn('Error en búsqueda Google Pinterest:', error.message);
        return [];
    }
}

/**
 * Función de fallback usando APIs de terceros (si Pinterest falla completamente)
 */
async function getFallbackImages(query) {
    try {
        let config;
        try {
            config = obtenerConfig();
        } catch (err) {
            config = {};
        }

        // Intentar con Pexels
        if (config.pexelsApiKey && config.pexelsApiKey !== 'TU_API_KEY_DE_PEXELS') {
            const response = await axios.get(
                `https://api.pexels.com/v1/search?query=${query}&per_page=10`,
                {
                    headers: { Authorization: config.pexelsApiKey },
                    timeout: 10000
                }
            );

            return (response.data.photos || []).map(photo => ({
                url: photo.src?.large2x || photo.src?.large,
                title: `${photo.photographer} (vía Pexels)`
            }));
        }

        // Fallback a Unsplash
        const response = await axios.get(
            `https://api.unsplash.com/search/photos?query=${query}&per_page=10`,
            {
                headers: { 'Authorization': 'Client-ID demo' },
                timeout: 10000
            }
        );

        return (response.data.results || []).map(photo => ({
            url: photo.urls?.regular,
            title: `${photo.user?.name} (vía Unsplash)`
        }));

    } catch (error) {
        console.warn('Error en fallback:', error.message);
        return [];
    }
}
