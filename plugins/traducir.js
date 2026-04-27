/**
 * @file Plugin de Traductor - Traduce texto entre idiomas
 * @version 1.0.0
 * @author HINATA-BOT
 */

export const command = ['.traducir', '.translate'];

export async function run(sock, m, { text, args }) {
    const chatId = m.key.remoteJid;
    
    // Idiomas soportados
    const idiomas = {
        'es': 'Español',
        'en': 'Inglés',
        'fr': 'Francés',
        'de': 'Alemán',
        'it': 'Italiano',
        'pt': 'Portugués',
        'ja': 'Japonés',
        'ko': 'Coreano',
        'zh': 'Chino',
        'ru': 'Ruso',
        'ar': 'Árabe'
    };

    if (!args || args.length < 2) {
        const listaIdiomas = Object.entries(idiomas)
            .map(([cod, nom]) => `• ${cod} → ${nom}`)
            .join('\n');
        
        return await sock.sendMessage(chatId, {
            text: `🌐 *TRADUCTOR* 🌐\n\n` +
                  `📝 Uso: .traducir <idioma_origen> <idioma_destino> <texto>\n\n` +
                  `📋 *Idiomas disponibles:*\n${listaIdiomas}\n\n` +
                  `💡 *Ejemplos:*\n` +
                  `• .traducir en es Hello world\n` +
                  `• .traducir es en Hola mundo\n` +
                  `• .traducir fr es Bonjour`
        }, { quoted: m });
    }

    const idiomaOrigen = args[0].toLowerCase();
    const idiomaDestino = args[1].toLowerCase();
    const texto = args.slice(2).join(' ');

    if (!idiomas[idiomaOrigen]) {
        return await sock.sendMessage(chatId, {
            text: `❌ Idioma de origen no válido: ${idiomaOrigen}\n\n` +
                  `Usa .traducir para ver los idiomas disponibles.`
        }, { quoted: m });
    }

    if (!idiomas[idiomaDestino]) {
        return await sock.sendMessage(chatId, {
            text: `❌ Idioma de destino no válido: ${idiomaDestino}\n\n` +
                  `Usa .traducir para ver los idiomas disponibles.`
        }, { quoted: m });
    }

    // Simulación de traducción (en un bot real usarías una API)
    const traduccionesSimuladas = {
        'en-es': {
            'hello': 'hola',
            'world': 'mundo',
            'how are you': 'cómo estás',
            'thank you': 'gracias',
            'good morning': 'buenos días',
            'good night': 'buenas noches',
            'i love you': 'te quiero'
        },
        'es-en': {
            'hola': 'hello',
            'mundo': 'world',
            'cómo estás': 'how are you',
            'gracias': 'thank you',
            'buenos días': 'good morning',
            'buenas noches': 'good night',
            'te quiero': 'i love you'
        },
        'fr-es': {
            'bonjour': 'hola',
            'merci': 'gracias',
            'au revoir': 'adiós'
        },
        'es-fr': {
            'hola': 'bonjour',
            'gracias': 'merci',
            'adiós': 'au revoir'
        }
    };

    const clave = `${idiomaOrigen}-${idiomaDestino}`;
    let traduccion = texto;
    
    // Intentar traducción simulada
    if (traduccionesSimuladas[clave]) {
        const palabras = texto.toLowerCase().split(' ');
        const palabrasTraducidas = palabras.map(p => 
            traduccionesSimuladas[clave][p] || p
        );
        traduccion = palabrasTraducidas.join(' ');
    }

    await sock.sendMessage(chatId, {
        text: `🌐 *TRADUCCIÓN* 🌐\n\n` +
              `📝 *Original (${idiomas[idiomaOrigen]}):*\n${texto}\n\n` +
              `🔄 *Traducido (${idiomas[idiomaDestino]}):*\n${traduccion}\n\n` +
              `⚠️ *Nota:* Esta es una traducción básica. ` +
              `Para traducciones más precisas, usa una API externa.`
    }, { quoted: m });
}

export const help = `
Traduce texto entre diferentes idiomas.

📝 *Uso:*
.traducir <origen> <destino> <texto>

📋 *Idiomas disponibles:*
• es → Español
• en → Inglés
• fr → Francés
• de → Alemán
• it → Italiano
• pt → Portugués
• ja → Japonés
• ko → Coreano
• zh → Chino
• ru → Ruso
• ar → Árabe

💡 *Ejemplos:*
• .traducir en es Hello world
• .traducir es en Hola mundo
• .traducir fr es Bonjour
`;