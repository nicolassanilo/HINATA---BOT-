/**
 * @file Plugin para buscar información de animes y enviar imágenes locales.
 * @author Gemini Code Assist
 * @version 1.1.0
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localImagesRoot = path.join(__dirname, '../imagenes');

export const command = '.anime';

function normalizeText(text = '') {
    return text.toString().trim().toLowerCase();
}

function capitalize(text = '') {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export async function run(sock, m, { text }) {
    const chatId = m.key.remoteJid;
    const query = normalizeText(text);

    if (!query) {
        return await sock.sendMessage(chatId, {
            text: 'Por favor, escribe el nombre de un anime o personaje para buscar.\n\n*Ejemplo:*\n.anime Naruto\n.anime hinata'
        }, { quoted: m });
    }

    try {
        // Buscar imágenes locales primero
        const folders = await fs.readdir(localImagesRoot, { withFileTypes: true });
        const directories = folders.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
        const matchedFolder = directories.find(folder => normalizeText(folder) === query || normalizeText(folder).includes(query) || query.includes(normalizeText(folder)));

        if (matchedFolder) {
            const folderPath = path.join(localImagesRoot, matchedFolder);
            const files = await fs.readdir(folderPath);
            const images = files.filter(file => /\.(jpe?g|png|webp|gif)$/i.test(file));

            if (images.length === 0) {
                return await sock.sendMessage(chatId, { text: `❌ No se encontraron imágenes en la carpeta "${matchedFolder}".` }, { quoted: m });
            }

            const selectedImage = images[Math.floor(Math.random() * images.length)];
            const imagePath = path.join(folderPath, selectedImage);
            const caption = `✨ Aquí tienes una imagen de *${capitalize(matchedFolder)}* desde la carpeta local de HINATA.`;

            return await sock.sendMessage(chatId, { image: { url: imagePath }, caption }, { quoted: m });
        }

        // Si no hay carpeta local, buscar información en la API
        await sock.sendMessage(chatId, { text: `🔎 Buscando información de "${text}"...` }, { quoted: m });

        const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&limit=1`);
        const animeData = response.data.data;

        if (!animeData || animeData.length === 0) {
            return await sock.sendMessage(chatId, { text: `❌ No encontré información para el anime "${text}".` }, { quoted: m });
        }

        const anime = animeData[0];
        const imageUrl = anime.images.jpg.large_image_url;
        const synopsis = anime.synopsis ? anime.synopsis.substring(0, 400) + '...' : 'No disponible.';

        const caption = `*✨ ${anime.title} (${anime.title_japanese}) ✨*\n\n*🎬 Episodios:* ${anime.episodes || 'N/A'}\n*⭐ Puntuación:* ${anime.score || 'N/A'}\n*📊 Estado:* ${anime.status || 'N/A'}\n*🗓️ Emisión:* ${anime.aired.string || 'N/A'}\n\n*📖 Sinopsis:*\n${synopsis}\n\n*🔗 Más información:* ${anime.url}`;

        await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: caption }, { quoted: m });

    } catch (error) {
        console.error('Error al ejecutar .anime:', error);
        await sock.sendMessage(chatId, { text: '❌ Ocurrió un error al procesar el comando .anime.' }, { quoted: m });
    }
}
