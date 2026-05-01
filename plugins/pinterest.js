/**
 * @file Pinterest v2.0 - Sistema mejorado de búsqueda de imágenes
 * @description Sistema de búsqueda de imágenes con múltiples APIs y fallback robusto
 * @version 2.0.0
 * @author Mejorado para HINATA-BOT
 */

// Configuración del plugin
const CONFIG = {
  enableLogging: true,
  maxImages: 3,
  searchTimeout: 15000,
  imageTimeout: 10000,
  delayBetweenImages: 800,
  maxRetries: 2,
  enableFallback: true,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Sistema de logging
const logger = {
  info: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[PINTEREST] ℹ️ ${message}`);
    }
  },
  error: (message, error = null) => {
    console.error(`[PINTEREST] ❌ ${message}`);
    if (error) console.error('Error:', error);
  },
  success: (message) => {
    if (CONFIG.enableLogging) {
      console.log(`[PINTEREST] ✅ ${message}`);
    }
  },
  debug: (message, data = null) => {
    if (CONFIG.enableLogging) {
      console.log(`[PINTEREST] 🔍 ${message}`);
      if (data) console.log('Data:', data);
    }
  }
};

// Función para validar URL de imagen
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const hasImageExtension = imageExtensions.some(ext => url.toLowerCase().includes(ext));
  
  const imageHosts = ['i.pinimg.com', 'pinterest.com', 'pinimg.com', 'pexels.com', 'unsplash.com'];
  const hasImageHost = imageHosts.some(host => url.includes(host));
  
  return hasImageExtension || hasImageHost;
}

// Función para obtener configuración
function getConfig() {
  try {
    // Intentar obtener desde el sistema global
    if (global.db && global.db.data && global.db.data.config) {
      return global.db.data.config;
    }
    
    // Fallback a configuración por defecto
    return {
      pexelsApiKey: process.env.PEXELS_API_KEY || '',
      unsplashApiKey: process.env.UNSPLASH_API_KEY || ''
    };
  } catch (error) {
    logger.error('Error obteniendo configuración:', error);
    return {};
  }
}

// Función para hacer peticiones HTTP con reintentos
async function makeRequest(url, options = {}, retries = CONFIG.maxRetries) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(CONFIG.searchTimeout)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    if (retries > 0 && !error.name?.includes('AbortError')) {
      logger.debug(`Reintentando petición (${retries} restantes)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return makeRequest(url, options, retries - 1);
    }
    throw error;
  }
}

// Método 1: Búsqueda con API de Pexels
async function searchPexels(query) {
  try {
    const config = getConfig();
    if (!config.pexelsApiKey || config.pexelsApiKey === 'TU_API_KEY_DE_PEXELS') {
      throw new Error('API Key de Pexels no configurada');
    }
    
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${CONFIG.maxImages + 2}`;
    
    const response = await makeRequest(url, {
      headers: {
        'Authorization': config.pexelsApiKey,
        'User-Agent': CONFIG.userAgent
      }
    });
    
    const data = await response.json();
    
    if (!data.photos || data.photos.length === 0) {
      throw new Error('No se encontraron imágenes en Pexels');
    }
    
    return data.photos.slice(0, CONFIG.maxImages).map(photo => ({
      url: photo.src?.large2x || photo.src?.large || photo.src?.medium,
      title: `${photo.photographer} (vía Pexels)`,
      source: 'pexels'
    }));
    
  } catch (error) {
    logger.error('Error en búsqueda Pexels:', error);
    return [];
  }
}

// Método 2: Búsqueda con API de Unsplash
async function searchUnsplash(query) {
  try {
    const config = getConfig();
    const apiKey = config.unsplashApiKey || 'demo';
    
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${CONFIG.maxImages + 2}`;
    
    const response = await makeRequest(url, {
      headers: {
        'Authorization': `Client-ID ${apiKey}`,
        'User-Agent': CONFIG.userAgent
      }
    });
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No se encontraron imágenes en Unsplash');
    }
    
    return data.results.slice(0, CONFIG.maxImages).map(photo => ({
      url: photo.urls?.regular || photo.urls?.small,
      title: `${photo.user?.name} (vía Unsplash)`,
      source: 'unsplash'
    }));
    
  } catch (error) {
    logger.error('Error en búsqueda Unsplash:', error);
    return [];
  }
}

// Método 3: Búsqueda con Pixabay (API gratuita)
async function searchPixabay(query) {
  try {
    const config = getConfig();
    const apiKey = config.pixabayApiKey || 'demo';
    
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${CONFIG.maxImages + 2}&image_type=photo&safe_search=true`;
    
    const response = await makeRequest(url, {
      headers: {
        'User-Agent': CONFIG.userAgent
      }
    });
    
    const data = await response.json();
    
    if (!data.hits || data.hits.length === 0) {
      throw new Error('No se encontraron imágenes en Pixabay');
    }
    
    return data.hits.slice(0, CONFIG.maxImages).map(photo => ({
      url: photo.webformatURL || photo.largeImageURL,
      title: `${photo.user || 'Anónimo'} (vía Pixabay)`,
      source: 'pixabay'
    }));
    
  } catch (error) {
    logger.error('Error en búsqueda Pixabay:', error);
    return [];
  }
}

// Método 4: Búsqueda con Bing Images (scraping simple)
async function searchBingImages(query) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&tsc=ImageBasicHover`;
    
    const response = await makeRequest(url, {
      headers: {
        'User-Agent': CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });
    
    const html = await response.text();
    
    // Extraer URLs de imágenes del HTML
    const urlRegex = /"murl":"([^"]+)"/g;
    const matches = [];
    let match;
    
    while ((match = urlRegex.exec(html)) !== null && matches.length < CONFIG.maxImages) {
      const url = match[1];
      if (isValidImageUrl(url) && !matches.find(m => m.url === url)) {
        matches.push({
          url: url,
          title: `Imagen de Bing`,
          source: 'bing'
        });
      }
    }
    
    return matches;
    
  } catch (error) {
    logger.error('Error en búsqueda Bing:', error);
    return [];
  }
}

// Método 5: Búsqueda con DuckDuckGo Images
async function searchDuckDuckGo(query) {
  try {
    const url = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&p=1&s=100&f=jpg,l`;
    
    const response = await makeRequest(url, {
      headers: {
        'User-Agent': CONFIG.userAgent
      }
    });
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No se encontraron imágenes en DuckDuckGo');
    }
    
    return data.results.slice(0, CONFIG.maxImages).map(img => ({
      url: img.image,
      title: img.title || 'Imagen de DuckDuckGo',
      source: 'duckduckgo'
    })).filter(img => isValidImageUrl(img.url));
    
  } catch (error) {
    logger.error('Error en búsqueda DuckDuckGo:', error);
    return [];
  }
}

// Función principal de búsqueda con múltiples APIs
async function searchImages(query) {
  try {
    logger.info(`Iniciando búsqueda de imágenes: "${query}"`);
    
    const searchMethods = [
      { name: 'Pexels', func: searchPexels },
      { name: 'Unsplash', func: searchUnsplash },
      { name: 'Pixabay', func: searchPixabay },
      { name: 'Bing', func: searchBingImages },
      { name: 'DuckDuckGo', func: searchDuckDuckGo }
    ];
    
    for (const method of searchMethods) {
      try {
        logger.debug(`Intentando con ${method.name}...`);
        const results = await method.func(query);
        
        if (results && results.length > 0) {
          logger.success(`Éxito con ${method.name}: ${results.length} imágenes encontradas`);
          return results;
        }
      } catch (error) {
        logger.debug(`Falló ${method.name}: ${error.message}`);
        continue;
      }
    }
    
    logger.error('Todos los métodos de búsqueda fallaron');
    return [];
    
  } catch (error) {
    logger.error('Error en búsqueda principal:', error);
    return [];
  }
}

// Función para enviar imagen con validación
async function sendImage(sock, chatId, imageData, query, quoted) {
  try {
    // Validar que la URL sea válida
    if (!isValidImageUrl(imageData.url)) {
      throw new Error('URL de imagen inválida');
    }
    
    // Enviar la imagen
    await sock.sendMessage(chatId, {
      image: { url: imageData.url },
      caption: `📌 *${query}*\n🔗 ${imageData.title}\n💡 Fuente: ${imageData.source}`
    }, { quoted });
    
    logger.success(`Imagen enviada: ${imageData.title}`);
    return true;
    
  } catch (error) {
    logger.error(`Error enviando imagen: ${error.message}`);
    return false;
  }
}

// Función principal del plugin
export async function run(sock, m, { text }) {
  const chatId = m.key.remoteJid;
  
  try {
    // Validar entrada
    if (!text || !text.trim()) {
      await sock.sendMessage(chatId, { 
        text: '📌 Por favor, escribe qué quieres buscar.\n\n*Ejemplo:*\n.pinterest decoración de interiores' 
      }, { quoted: m });
      return;
    }
    
    const query = text.trim();
    logger.info(`Búsqueda solicitada: "${query}"`);
    
    // Enviar mensaje de búsqueda
    await sock.sendMessage(chatId, { 
      text: `📌 Buscando imágenes: "${query}"...` 
    }, { quoted: m });
    
    // Buscar imágenes
    const images = await searchImages(query);
    
    if (!images || images.length === 0) {
      await sock.sendMessage(chatId, { 
        text: `❌ No encontré imágenes para "${query}".\n\n💡 *Sugerencias:*\n• Intenta con términos más específicos\n• Usa palabras en inglés si no hay resultados\n• Verifica la ortografía` 
      }, { quoted: m });
      return;
    }
    
    // Enviar imágenes
    let sent = 0;
    for (const imageData of images) {
      try {
        const success = await sendImage(sock, chatId, imageData, query, m);
        if (success) {
          sent++;
          // Delay entre imágenes para evitar rate limiting
          if (sent < images.length) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenImages));
          }
        }
      } catch (error) {
        logger.error(`Error procesando imagen ${sent + 1}:`, error);
      }
    }
    
    // Verificar si se enviaron imágenes
    if (sent === 0) {
      await sock.sendMessage(chatId, { 
        text: '❌ No se pudieron enviar las imágenes. Intenta de nuevo.' 
      }, { quoted: m });
    } else {
      logger.success(`Búsqueda completada: ${sent} imágenes enviadas`);
    }
    
  } catch (error) {
    logger.error('Error en el comando pinterest:', error);
    
    let errorMsg = '❌ Error al buscar imágenes.';
    
    if (error.name === 'AbortError') {
      errorMsg = '⏱️ La búsqueda tardó demasiado. Intenta con una búsqueda más simple.';
    } else if (error.message.includes('403') || error.message.includes('forbidden')) {
      errorMsg = '🚫 Acceso denegado. Intenta más tarde.';
    } else if (error.message.includes('429') || error.message.includes('rate limit')) {
      errorMsg = '⏰ Demasiadas solicitudes. Espera un momento y vuelve a intentar.';
    }
    
    await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
  }
}

// Exportar configuración y funciones
export const command = '.pinterest';
export const alias = ['.pin', '.img', '.imagen'];

export const help = `
📌 *PINTEREST v2.0*

Sistema de búsqueda de imágenes con múltiples APIs y fallback robusto.

🔍 *Características:*
• Búsqueda en múltiples APIs (Pexels, Unsplash, Pixabay, Bing, DuckDuckGo)
• Sistema de fallback automático
• Validación de URLs de imágenes
• Manejo robusto de errores
• Rate limiting inteligente

📋 *Uso básico:*
• \`.pinterest <término>\` - Buscar imágenes
• \`.pin <término>\` - Alias corto
• \`.img <término>\` - Alias alternativo

💡 *Ejemplos:*
• \`.pinterest decoración de interiores\`
• \`.pin gatos tiernos\`
• \`.img nature landscape\`

⚠️ *Notas:*
• Máximo 3 imágenes por búsqueda
• Delay entre imágenes para evitar spam
• Fallback automático si una API falla
• Soporta búsquedas en español e inglés

🔧 *APIs utilizadas:*
• Pexels (con API key si está configurada)
• Unsplash (con API key si está configurada)
• Pixabay (con API key si está configurada)
• Bing Images (scraping)
• DuckDuckGo Images (API)

💡 *Para configurar API keys:*
Agrega las siguientes variables en config.json:
• pexelsApiKey: "TU_API_KEY"
• unsplashApiKey: "TU_API_KEY"
• pixabayApiKey: "TU_API_KEY"
`;

export default {
  run,
  searchImages,
  sendImage
};
