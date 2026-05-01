/**
 * @file Spider-X-API - Sistema de API centralizado para descargas de YouTube
 * @description API modular con múltiples fuentes de descarga y manejo de errores robusto
 * @version 1.0.0
 */

import axios from 'axios';
import yts from 'yt-search';

// Configuración principal
const CONFIG = {
  timeout: 180000, // 3 minutos
  maxRetries: 3,
  retryDelay: 2000,
  maxVideoSizeMB: 100,
  downloadTimeout: 300000, // 5 minutos
  supportedFormats: ['mp4', 'webm', 'mkv', 'avi'],
  qualities: ['144p', '240p', '360p', '480p', '720p', '1080p'],
  
  // APIs de descarga con prioridades
  apis: [
    {
      name: 'cobalt-api',
      priority: 1,
      enabled: true,
      baseUrl: 'https://api.cobalt.tools/api/json',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      download: async (url, quality = '720p') => {
        try {
          const response = await axios.post(CONFIG.apis[0].baseUrl, {
            url: url,
            vQuality: quality === '1080p' ? '1080' : quality === '720p' ? '720' : quality === '480p' ? '480' : '360',
            aFormat: 'mp3',
            filenamePattern: 'pretty'
          }, {
            timeout: CONFIG.timeout,
            headers: CONFIG.apis[0].headers
          });
          
          if (response.data && response.data.url) {
            return {
              success: true,
              url: response.data.url,
              quality: quality,
              format: 'mp4',
              size: response.data.size || 'Unknown'
            };
          }
          return { success: false, error: 'No download URL provided' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    {
      name: 'ytdl-api',
      priority: 2,
      enabled: true,
      baseUrl: 'https://ytdl-api.com/api/v1',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      download: async (url, quality = '720p') => {
        try {
          const response = await axios.get(`${CONFIG.apis[1].baseUrl}/download?url=${encodeURIComponent(url)}&format=mp4&quality=${quality}`, {
            timeout: CONFIG.timeout,
            headers: CONFIG.apis[1].headers
          });
          
          if (response.data && response.data.download_url) {
            return {
              success: true,
              url: response.data.download_url,
              quality: quality,
              format: 'mp4',
              size: response.data.file_size || 'Unknown'
            };
          }
          return { success: false, error: 'Download URL not found' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    {
      name: 'yt-dlp-web',
      priority: 3,
      enabled: true,
      baseUrl: 'https://yt-dlp-web.vercel.app/api',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      download: async (url, quality = '720p') => {
        try {
          const response = await axios.post(`${CONFIG.apis[2].baseUrl}/download`, {
            url: url,
            format: 'mp4',
            quality: quality
          }, {
            timeout: CONFIG.timeout,
            headers: CONFIG.apis[2].headers
          });
          
          if (response.data && response.data.download_url) {
            return {
              success: true,
              url: response.data.download_url,
              quality: quality,
              format: 'mp4',
              size: response.data.file_size || 'Unknown'
            };
          }
          return { success: false, error: 'Download failed' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    {
      name: 'loader-to',
      priority: 4,
      enabled: true,
      baseUrl: 'https://loader.to/api/download',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      download: async (url, quality = '720p') => {
        try {
          const response = await axios.post(CONFIG.apis[3].baseUrl, {
            url: url,
            quality: quality,
            format: 'mp4'
          }, {
            timeout: CONFIG.timeout,
            headers: CONFIG.apis[3].headers
          });
          
          if (response.data && response.data.download_url) {
            return {
              success: true,
              url: response.data.download_url,
              quality: quality,
              format: 'mp4',
              size: response.data.file_size || 'Unknown'
            };
          }
          return { success: false, error: 'Download not available' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    }
  ]
};

// Sistema de logging
const logger = {
  info: (message) => console.log(`[SPIDER-X-API] ℹ️ ${message}`),
  error: (message, error = null) => {
    console.error(`[SPIDER-X-API] ❌ ${message}`);
    if (error) console.error('Error:', error);
  },
  success: (message) => console.log(`[SPIDER-X-API] ✅ ${message}`),
  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SPIDER-X-API] 🔍 ${message}`);
      if (data) console.log('Data:', data);
    }
  }
};

// Clase principal Spider-X-API
class SpiderXAPI {
  constructor() {
    this.apis = CONFIG.apis.filter(api => api.enabled).sort((a, b) => a.priority - b.priority);
  }

  // Validar URL de YouTube
  validateYouTubeURL(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(\?[^&]*)?(#.*)?$/;
    return youtubeRegex.test(url);
  }

  // Extraer ID de video
  extractVideoID(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  // Obtener información del video
  async getVideoInfo(url) {
    try {
      const videoId = this.extractVideoID(url);
      if (!videoId) {
        return { success: false, error: 'Invalid video ID' };
      }

      const videoInfo = await yts({ videoId: videoId });
      if (videoInfo && videoInfo.videos && videoInfo.videos.length > 0) {
        const video = videoInfo.videos[0];
        return {
          success: true,
          data: {
            videoId: video.videoId,
            title: video.title,
            duration: video.duration?.timestamp || video.duration,
            durationSeconds: video.seconds,
            views: video.views,
            channel: video.author?.name,
            channelId: video.author?.channelId,
            uploadedAt: video.uploadedAt,
            thumbnail: video.thumbnail,
            description: video.description,
            category: video.category
          }
        };
      }
      return { success: false, error: 'Video not found' };
    } catch (error) {
      logger.error('Error getting video info:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener calidades disponibles
  async getAvailableQualities(url) {
    try {
      // Para simplicidad, devolveremos las calidades estándar
      // En una implementación real, podríamos verificar cada API
      return {
        success: true,
        qualities: CONFIG.qualities
      };
    } catch (error) {
      logger.error('Error getting available qualities:', error);
      return { success: false, error: error.message };
    }
  }

  // Descargar video con múltiples APIs
  async downloadVideo(url, quality = '720p') {
    logger.info(`Starting download: ${url} @ ${quality}`);
    
    const results = [];
    
    for (const api of this.apis) {
      logger.debug(`Trying API: ${api.name}`);
      
      for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
        try {
          const result = await api.download(url, quality);
          
          if (result.success) {
            logger.success(`Success with ${api.name} (attempt ${attempt})`);
            
            // Validar que el URL sea accesible
            const validation = await this.validateDownloadURL(result.url);
            if (validation.success) {
              return {
                success: true,
                url: result.url,
                quality: result.quality,
                format: result.format,
                size: result.size,
                api: api.name,
                attempt: attempt,
                validation: validation
              };
            } else {
              logger.warn(`URL validation failed for ${api.name}: ${validation.error}`);
            }
          } else {
            logger.debug(`${api.name} failed (attempt ${attempt}): ${result.error}`);
          }
        } catch (error) {
          logger.error(`Error with ${api.name} (attempt ${attempt}):`, error.message);
        }
        
        // Esperar antes del siguiente intento
        if (attempt < CONFIG.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * attempt));
        }
      }
      
      results.push({
        api: api.name,
        success: false,
        error: 'All attempts failed'
      });
    }
    
    return {
      success: false,
      error: 'All APIs failed',
      results: results
    };
  }

  // Validar URL de descarga
  async validateDownloadURL(url) {
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const contentLength = response.headers['content-length'];
      const contentType = response.headers['content-type'];
      
      return {
        success: true,
        size: contentLength ? parseInt(contentLength) : null,
        contentType: contentType || 'unknown'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Descargar archivo completo
  async downloadFile(url, maxSizeMB = CONFIG.maxVideoSizeMB) {
    try {
      logger.info(`Downloading file: ${url}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: CONFIG.downloadTimeout,
        maxContentLength: maxSizeMB * 1024 * 1024,
        maxBodyLength: maxSizeMB * 1024 * 1024,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      });
      
      const buffer = Buffer.from(response.data);
      const sizeMB = buffer.length / (1024 * 1024);
      
      logger.success(`File downloaded: ${sizeMB.toFixed(2)} MB`);
      
      return {
        success: true,
        buffer: buffer,
        sizeMB: sizeMB,
        contentType: response.headers['content-type'] || 'video/mp4'
      };
    } catch (error) {
      logger.error('Error downloading file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validar formato de video
  validateVideoFormat(buffer) {
    const signatures = {
      'mp4': ['66747970', '69736F6D'], // ftyp, isom
      'webm': ['1A45DFA3'], // EBML
      'mkv': ['1A45DFA3'], // EBML (same as webm)
      'avi': ['52494646'] // RIFF
    };
    
    const hex = buffer.toString('hex', 0, 16);
    
    for (const [format, sigs] of Object.entries(signatures)) {
      for (const sig of sigs) {
        if (hex.startsWith(sig.toLowerCase())) {
          return format;
        }
      }
    }
    
    return 'unknown';
  }

  // Parsear tamaño
  parseSize(sizeStr) {
    if (!sizeStr || typeof sizeStr !== 'string') return 0;
    
    const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'TB': return value * 1024 * 1024;
      case 'GB': return value * 1024;
      case 'MB': return value;
      case 'KB': return value / 1024;
      case 'B': return value / (1024 * 1024);
      default: return value;
    }
  }

  // Obtener estadísticas de APIs
  getAPIStats() {
    return {
      totalAPIs: this.apis.length,
      enabledAPIs: this.apis.filter(api => api.enabled).length,
      apis: this.apis.map(api => ({
        name: api.name,
        priority: api.priority,
        enabled: api.enabled
      }))
    };
  }
}

// Exportar la clase principal
export default SpiderXAPI;

// Exportar utilidades
export const utils = {
  validateYouTubeURL: (url) => new SpiderXAPI().validateYouTubeURL(url),
  extractVideoID: (url) => new SpiderXAPI().extractVideoID(url),
  parseSize: (sizeStr) => new SpiderXAPI().parseSize(sizeStr)
};

// Exportar configuración
export { CONFIG };
