/**
 * @file Plugin para buscar información de animes y enviar imágenes locales.
 * @author Gemini Code Assist
 * @version 1.2.0
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
  return text.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function simplifyText(text = '') {
  return normalizeText(text)
    .replace(/[-_ ]+/g, ' ')
    .replace(/\s+/g, '');
}

function capitalize(text = '') {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function findBestFolder(query, directories) {
  const normalizedQuery = simplifyText(query);
  const normalizedDirectories = directories.map(folder => ({
    folder,
    normalized: simplifyText(folder)
  }));

  const exactMatch = normalizedDirectories.find(dir => dir.normalized === normalizedQuery);
  if (exactMatch) return exactMatch.folder;

  const partialMatch = normalizedDirectories.find(dir =>
    dir.normalized.includes(normalizedQuery) || normalizedQuery.includes(dir.normalized)
  );
  if (partialMatch) return partialMatch.folder;

  return normalizedDirectories.find(dir =>
    dir.normalized
      .split(/[-_ ]+/)
      .some(part => part && normalizedQuery.includes(part) && part.length > 1)
  )?.folder || null;
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
    const folders = await fs.readdir(localImagesRoot, { withFileTypes: true });
    const directories = folders.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
    const matchedFolder = findBestFolder(query, directories);

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

    await sock.sendMessage(chatId, { image: { url: imageUrl }, caption }, { quoted: m });

  } catch (error) {
    console.error('Error al ejecutar .anime:', error);
    await sock.sendMessage(chatId, { text: '❌ Ocurrió un error al procesar el comando .anime.' }, { quoted: m });
  }
}
