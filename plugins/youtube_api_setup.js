/**
 * @file YouTube API Setup - Instrucciones para configurar la API youtube-video-downloader-api
 * @description Guía completa para desplegar y configurar la API de YouTube
 * @version 1.0.0
 */

export const command = ['.setupyoutube', '.youtubeapi'];

export const help = `
🔧 *CONFIGURACIÓN DE API YOUTUBE* 🔧

*📋 Pasos para configurar la API youtube-video-downloader-api:*

*1. 📥 Clonar el repositorio:*
\`\`\`bash
git clone https://github.com/zararashraf/youtube-video-downloader-api.git
cd youtube-video-downloader-api
\`\`\`

*2. 📦 Instalar dependencias:*
\`\`\`bash
pip install flask pytubefix
\`\`\`

*3. 🚀 Ejecutar la API:*
\`\`\`bash
python main.py
\`\`\`

*4. 🔗 Obtener URL de la API:*
- Local: http://localhost:5000
- Render/Heroku: https://your-app-name.onrender.com

*5. ⚙️ Configurar en el bot:*
- Actualizar la URL en youtube_v3.js
- Cambiar CONFIG.apiEndpoints.base

*🌐 Opciones de despliegue:*

*• Local (para desarrollo):*
- Portátil/PC
- Acceso solo local

*• Render (recomendado):*
- Gratis
- URL pública
- Auto-reinicio

*• Heroku:*
- Dynos gratuitos
- URL pública
- Configurable

*• Railway:*
- Moderno
- Fácil configuración
- Buen rendimiento

*📝 Ejemplo de configuración en Render:*
1. Conectar repositorio GitHub
2. Configurar build command: \`pip install flask pytubefix\`
3. Configurar start command: \`python main.py\`
4. Obtener URL pública

*🔧 Configuración final en el bot:*
En \`youtube_v3.js\`, cambiar:
\`\`\`javascript
apiEndpoints: {
  base: 'https://your-app-name.onrender.com', // Tu URL aquí
  download: '/download/{resolution}',
  videoInfo: '/video_info',
  availableResolutions: '/available_resolutions'
}
\`\`\`

*⚠️ Notas importantes:*
- La API debe estar en línea para funcionar
- Render tiene límites de uso gratuito
- Considera un plan pago para uso intensivo
- Monitorea el rendimiento regularmente
`;

export async function run(sock, m, { text, args }) {
  const chatId = m.key.remoteJid;
  
  try {
    await sock.sendMessage(chatId, {
      text: `🔧 *CONFIGURACIÓN API YOUTUBE*\n\n` +
            `Para usar la nueva versión de YouTube downloader con la API youtube-video-downloader-api:\n\n` +
            `📋 *Pasos requeridos:*\n\n` +
            `1. 📥 **Clonar el repositorio:**\n` +
            `\`\`\`git clone https://github.com/zararashraf/youtube-video-downloader-api.git\`\`\`\n\n` +
            `2. 📦 **Instalar dependencias:**\n` +
            `\`\`\`pip install flask pytubefix\`\`\`\n\n` +
            `3. 🚀 **Desplegar la API:**\n` +
            `• Local: \`python main.py\` (http://localhost:5000)\n` +
            `• Render: Conectar repositorio y desplegar\n` +
            `• Heroku/Railway: Similar proceso\n\n` +
            `4. ⚙️ **Configurar URL en el bot:**\n` +
            `En \`youtube_v3.js\` cambiar:\n` +
            `\`base: 'https://your-api-url.onrender.com'\`\n\n` +
            `5. 🔄 **Recargar plugins:**\n` +
            `\`.reload\`\n\n` +
            `🌐 *Servicios recomendados:*\n` +
            `• Render (gratis, fácil)\n` +
            `• Railway (moderno)\n` +
            `• Heroku (estable)\n\n` +
            `💡 *Una vez configurada, usa:*\n` +
            `\`.youtube <URL>\` para descargar videos\n\n` +
            `📖 *Para ayuda detallada, usa:*\n` +
            `\`.setupyoutube help\``
    }, { quoted: m });
    
  } catch (error) {
    console.error('Error en setupyoutube:', error);
    await sock.sendMessage(chatId, { 
      text: '❌ Error al mostrar la guía de configuración' 
    }, { quoted: m });
  }
}
