/**
 * @file Plugin Pet System - Sistema de mascotas
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema completo de mascotas virtuales con cuidado y evolución
 */

import { db } from './db.js';

// Configuración
const CONFIG = {
  enableLogging: true,
  maxPets: 3,
  feedCost: 50,
  playCost: 30,
  healCost: 100,
  maxLevel: 100,
  evolutionLevels: [10, 25, 50, 75],
  hungerDecay: 5, // cada hora
  happinessDecay: 3, // cada hora
  experiencePerFeed: 10,
  experiencePerPlay: 15,
  experiencePerTrain: 25
};

// Sistema de logging
const petLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[PET] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[PET] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[PET] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[PET] ❌ ${message}`)
};

// Funciones principales
export const command = ['.pet', '.mypets', '.adopt', '.feed', '.play', '.train', '.heal', '.petshop', '.petbattle'];
export const alias = ['.mascota', '.mismascotas', '.adoptar', '.alimentar', '.jugar', '.entrenar', '.curar', '.tiendamascotas', '.batallamascotas'];
export const description = 'Sistema completo de mascotas virtuales';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.pet':
        await showPetInfo(sock, m, text);
        break;
      case '.mypets':
        await showMyPets(sock, m);
        break;
      case '.adopt':
        await adoptPet(sock, m, text);
        break;
      case '.feed':
        await feedPet(sock, m, text);
        break;
      case '.play':
        await playWithPet(sock, m, text);
        break;
      case '.train':
        await trainPet(sock, m, text);
        break;
      case '.heal':
        await healPet(sock, m, text);
        break;
      case '.petshop':
        await showPetShop(sock, m);
        break;
      case '.petbattle':
        await petBattle(sock, m, text);
        break;
      default:
        await showPetHelp(sock, m);
    }
  } catch (error) {
    petLogger.error('Error en sistema de mascotas:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de mascotas. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Mostrar información de mascota
async function showPetInfo(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const petName = args[1];

  try {
    const pet = await getPet(userId, petName);
    if (!pet) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes una mascota con ese nombre. Usa `.mypets` para ver tus mascotas.'
      }, { quoted: m });
    }

    // Actualizar estadísticas
    await updatePetStats(pet.id);

    let message = `🐾 *${pet.name}* 🐾\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `🎭 Especie: ${pet.species}\n`;
    message += `⭐ Nivel: ${pet.level}\n`;
    message += `✨ Experiencia: ${pet.experience}/${getExpForNextLevel(pet.level)}\n`;
    message += `❤️ Salud: ${pet.health}/100\n`;
    message += `🍖 Hambre: ${pet.hunger}/100\n`;
    message += `😊 Felicidad: ${pet.happiness}/100\n`;
    message += `💪 Fuerza: ${pet.strength}\n`;
    message += `🛡️ Defensa: ${pet.defense}\n`;
    message += `⚡ Velocidad: ${pet.speed}\n`;
    message += `🎯 Habilidades: ${pet.skills || 'Ninguna'}\n\n`;
    
    message += `📊 *Estado:* ${getPetStatus(pet)}\n\n`;
    
    message += `💡 *Acciones disponibles:*\n`;
    message += `• \`.feed ${pet.name}\` - Alimentar (50 pts)\n`;
    message += `• \`.play ${pet.name}\` - Jugar (30 pts)\n`;
    message += `• \`.train ${pet.name}\` - Entrenar (25 pts)\n`;
    message += `• \`.heal ${pet.name}\` - Curar (100 pts)`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    petLogger.error('Error mostrando información de mascota:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar información de la mascota.'
    }, { quoted: m });
  }
}

// Mostrar todas las mascotas del usuario
async function showMyPets(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const pets = await getUserPets(userId);
    
    if (pets.length === 0) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes mascotas. Usa `.adopt` para adoptar una mascota.'
      }, { quoted: m });
    }

    let message = `🐾 *TUS MASCOTAS* 🐾\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `📊 Total: ${pets.length}/${CONFIG.maxPets}\n\n`;

    pets.forEach((pet, index) => {
      message += `${index + 1}. **${pet.name}** (${pet.species})\n`;
      message += `   ⭐ Nivel ${pet.level} | ${getPetStatus(pet)}\n`;
      message += `   ❤️ ${pet.health} | 🍖 ${pet.hunger} | 😊 ${pet.happiness}\n\n`;
    });

    message += `💡 *Comandos:*\n`;
    message += `• \`.pet <nombre>\` - Ver detalles\n`;
    message += `• \`.adopt <especie> <nombre>\` - Adoptar nueva\n`;
    message += `• \`.petshop\` - Tienda de mascotas`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    petLogger.error('Error mostrando mascotas del usuario:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar tus mascotas.'
    }, { quoted: m });
  }
}

// Adoptar mascota
async function adoptPet(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  
  if (args.length < 3) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.adopt <especie> <nombre>\n*Ejemplo:* `.adopt gato Michi`'
    }, { quoted: m });
  }

  const species = args[1].toLowerCase();
  const petName = args.slice(2).join(' ');

  try {
    const userPets = await getUserPets(userId);
    if (userPets.length >= CONFIG.maxPets) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya tienes el máximo de mascotas (${CONFIG.maxPets}).`
      }, { quoted: m });
    }

    // Verificar si ya existe una mascota con ese nombre
    const existingPet = await getPet(userId, petName);
    if (existingPet) {
      return await sock.sendMessage(chatId, {
        text: '❌ Ya tienes una mascota con ese nombre.'
      }, { quoted: m });
    }

    // Verificar si la especie está disponible
    const availableSpecies = ['perro', 'gato', 'conejo', 'hamster', 'pajaro', 'pez', 'dragon', 'unicornio'];
    if (!availableSpecies.includes(species)) {
      return await sock.sendMessage(chatId, {
        text: `❌ Especie no disponible. Especies: ${availableSpecies.join(', ')}`
      }, { quoted: m });
    }

    // Crear nueva mascota
    const baseStats = getBaseStats(species);
    await db.run(`
      INSERT INTO pets (user_id, name, species, level, experience, health, hunger, happiness, 
                       strength, defense, speed, skills, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      userId, petName, species, 1, 0, 100, 80, 80,
      baseStats.strength, baseStats.defense, baseStats.speed, baseStats.skills
    ]);

    let message = `🎉 *¡MASCOTA ADOPTADA!* 🎉\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `🐾 Nombre: **${petName}**\n`;
    message += `🎭 Especie: ${species}\n`;
    message += `⭐ Nivel: 1\n`;
    message += `❤️ Salud: 100/100\n`;
    message += `🍖 Hambre: 80/100\n`;
    message += `😊 Felicidad: 80/100\n\n`;
    
    message += `💡 *Próximos pasos:*\n`;
    message += `• \`.pet ${petName}\` - Ver detalles\n`;
    message += `• \`.feed ${petName}\` - Alimentar\n`;
    message += `• \`.play ${petName}\` - Jugar\n`;
    message += `• \`.train ${petName}\` - Entrenar`;

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

    petLogger.success(`Mascota adoptada: ${petName} (${species}) por ${userId}`);

  } catch (error) {
    petLogger.error('Error adoptando mascota:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al adoptar la mascota.'
    }, { quoted: m });
  }
}

// Alimentar mascota
async function feedPet(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const petName = args.slice(1).join(' ');

  if (!petName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la mascota.\n\n💡 *Uso:* `.feed <nombre>`'
    }, { quoted: m });
  }

  try {
    const pet = await getPet(userId, petName);
    if (!pet) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes una mascota con ese nombre.'
      }, { quoted: m });
    }

    const balance = await getUserBalance(userId);
    if (balance.total < CONFIG.feedCost) {
      return await sock.sendMessage(chatId, {
        text: `❌ Saldo insuficiente. Necesitas ${CONFIG.feedCost} pts para alimentar.`
      }, { quoted: m });
    }

    // Verificar si la mascota necesita alimentarse
    if (pet.hunger >= 90) {
      return await sock.sendMessage(chatId, {
        text: `❌ ${pet.name} no tiene hambre right now (Hambre: ${pet.hunger}/100).`
      }, { quoted: m });
    }

    await updateUserBalance(userId, balance.saldo - CONFIG.feedCost);

    // Alimentar mascota
    const newHunger = Math.min(100, pet.hunger + 30);
    const newHappiness = Math.min(100, pet.happiness + 10);
    const newExperience = pet.experience + CONFIG.experiencePerFeed;

    await db.run(`
      UPDATE pets 
      SET hunger = ?, happiness = ?, experience = ?
      WHERE id = ?
    `, [newHunger, newHappiness, newExperience, pet.id]);

    // Verificar si subió de nivel
    const leveledUp = await checkLevelUp(pet.id, newExperience);

    let message = `🍖 *${pet.name} ALIMENTADA* 🍖\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `💰 Costo: ${CONFIG.feedCost} pts\n\n`;
    message += `📊 *Cambios:*\n`;
    message += `🍖 Hambre: ${pet.hunger} → ${newHunger}/100\n`;
    message += `😊 Felicidad: ${pet.happiness} → ${newHappiness}/100\n`;
    message += `✨ Experiencia: +${CONFIG.experiencePerFeed} pts`;
    
    if (leveledUp) {
      message += `\n\n🎉 *¡SUBIÓ DE NIVEL!* 🎉`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    petLogger.error('Error alimentando mascota:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al alimentar la mascota.'
    }, { quoted: m });
  }
}

// Jugar con mascota
async function playWithPet(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const petName = args.slice(1).join(' ');

  if (!petName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la mascota.\n\n💡 *Uso:* `.play <nombre>`'
    }, { quoted: m });
  }

  try {
    const pet = await getPet(userId, petName);
    if (!pet) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes una mascota con ese nombre.'
      }, { quoted: m });
    }

    const balance = await getUserBalance(userId);
    if (balance.total < CONFIG.playCost) {
      return await sock.sendMessage(chatId, {
        text: `❌ Saldo insuficiente. Necesitas ${CONFIG.playCost} pts para jugar.`
      }, { quoted: m });
    }

    // Verificar si la mascota puede jugar
    if (pet.health < 30) {
      return await sock.sendMessage(chatId, {
        text: `❌ ${pet.name} está muy enferma para jugar (Salud: ${pet.health}/100).`
      }, { quoted: m });
    }

    await updateUserBalance(userId, balance.saldo - CONFIG.playCost);

    // Jugar con mascota
    const newHappiness = Math.min(100, pet.happiness + 25);
    const newHunger = Math.max(0, pet.hunger - 10);
    const newExperience = pet.experience + CONFIG.experiencePerPlay;

    await db.run(`
      UPDATE pets 
      SET happiness = ?, hunger = ?, experience = ?
      WHERE id = ?
    `, [newHappiness, newHunger, newExperience, pet.id]);

    const leveledUp = await checkLevelUp(pet.id, newExperience);

    // Actividad aleatoria
    const activities = [
      '🎾 Jugaron a la pelota',
      '🎾 Corrieron por el parque',
      '🎾 Jugaron a perseguirse',
      '🎾 Hicieron trucos',
      '🎾 Exploraron juntos'
    ];
    const activity = activities[Math.floor(Math.random() * activities.length)];

    let message = `🎮 *JUGANDO CON ${pet.name.toUpperCase()}* 🎮\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `💰 Costo: ${CONFIG.playCost} pts\n`;
    message += `🎾 Actividad: ${activity}\n\n`;
    message += `📊 *Cambios:*\n`;
    message += `😊 Felicidad: ${pet.happiness} → ${newHappiness}/100\n`;
    message += `🍖 Hambre: ${pet.hunger} → ${newHunger}/100\n`;
    message += `✨ Experiencia: +${CONFIG.experiencePerPlay} pts`;
    
    if (leveledUp) {
      message += `\n\n🎉 *¡SUBIÓ DE NIVEL!* 🎉`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    petLogger.error('Error jugando con mascota:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al jugar con la mascota.'
    }, { quoted: m });
  }
}

// Entrenar mascota
async function trainPet(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const petName = args.slice(1).join(' ');

  if (!petName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la mascota.\n\n💡 *Uso:* `.train <nombre>`'
    }, { quoted: m });
  }

  try {
    const pet = await getPet(userId, petName);
    if (!pet) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes una mascota con ese nombre.'
      }, { quoted: m });
    }

    const balance = await getUserBalance(userId);
    if (balance.total < CONFIG.experiencePerTrain) {
      return await sock.sendMessage(chatId, {
        text: `❌ Saldo insuficiente. Necesitas ${CONFIG.experiencePerTrain} pts para entrenar.`
      }, { quoted: m });
    }

    // Verificar si la mascota puede entrenar
    if (pet.health < 50) {
      return await sock.sendMessage(chatId, {
        text: `❌ ${pet.name} está muy débil para entrenar (Salud: ${pet.health}/100).`
      }, { quoted: m });
    }

    if (pet.hunger < 30) {
      return await sock.sendMessage(chatId, {
        text: `❌ ${pet.name} tiene demasiada hambre para entrenar (Hambre: ${pet.hunger}/100).`
      }, { quoted: m });
    }

    await updateUserBalance(userId, balance.saldo - CONFIG.experiencePerTrain);

    // Entrenar mascota
    const newStrength = pet.strength + Math.floor(Math.random() * 3) + 1;
    const newDefense = pet.defense + Math.floor(Math.random() * 2) + 1;
    const newSpeed = pet.speed + Math.floor(Math.random() * 2) + 1;
    const newHealth = Math.max(0, pet.health - 10);
    const newHunger = Math.max(0, pet.hunger - 15);
    const newExperience = pet.experience + CONFIG.experiencePerTrain;

    await db.run(`
      UPDATE pets 
      SET strength = ?, defense = ?, speed = ?, health = ?, hunger = ?, experience = ?
      WHERE id = ?
    `, [newStrength, newDefense, newSpeed, newHealth, newHunger, newExperience, pet.id]);

    const leveledUp = await checkLevelUp(pet.id, newExperience);

    // Tipo de entrenamiento
    const trainings = [
      '💪 Entrenamiento de fuerza',
      '🛡️ Entrenamiento de defensa',
      '⚡ Entrenamiento de velocidad',
      '🎯 Entrenamiento de combate'
    ];
    const training = trainings[Math.floor(Math.random() * trainings.length)];

    let message = `🏋️ *ENTRENANDO A ${pet.name.toUpperCase()}* 🏋️\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `💰 Costo: ${CONFIG.experiencePerTrain} pts\n`;
    message += `🎯 Tipo: ${training}\n\n`;
    message += `📊 *Cambios:*\n`;
    message += `💪 Fuerza: ${pet.strength} → ${newStrength}\n`;
    message += `🛡️ Defensa: ${pet.defense} → ${newDefense}\n`;
    message += `⚡ Velocidad: ${pet.speed} → ${newSpeed}\n`;
    message += `❤️ Salud: ${pet.health} → ${newHealth}/100\n`;
    message += `🍖 Hambre: ${pet.hunger} → ${newHunger}/100\n`;
    message += `✨ Experiencia: +${CONFIG.experiencePerTrain} pts`;
    
    if (leveledUp) {
      message += `\n\n🎉 *¡SUBIÓ DE NIVEL!* 🎉`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    petLogger.error('Error entrenando mascota:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al entrenar la mascota.'
    }, { quoted: m });
  }
}

// Curar mascota
async function healPet(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const petName = args.slice(1).join(' ');

  if (!petName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar el nombre de la mascota.\n\n💡 *Uso:* `.heal <nombre>`'
    }, { quoted: m });
  }

  try {
    const pet = await getPet(userId, petName);
    if (!pet) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes una mascota con ese nombre.'
      }, { quoted: m });
    }

    const balance = await getUserBalance(userId);
    if (balance.total < CONFIG.healCost) {
      return await sock.sendMessage(chatId, {
        text: `❌ Saldo insuficiente. Necesitas ${CONFIG.healCost} pts para curar.`
      }, { quoted: m });
    }

    // Verificar si la mascota necesita curación
    if (pet.health >= 90) {
      return await sock.sendMessage(chatId, {
        text: `❌ ${pet.name} está sana (Salud: ${pet.health}/100).`
      }, { quoted: m });
    }

    await updateUserBalance(userId, balance.saldo - CONFIG.healCost);

    // Curar mascota
    const newHealth = Math.min(100, pet.health + 50);

    await db.run(`
      UPDATE pets 
      SET health = ?
      WHERE id = ?
    `, [newHealth, pet.id]);

    let message = `💊 *${pet.name} CURADA* 💊\n\n`;
    message += `👤 *@${userId.split('@')[0]}*\n`;
    message += `💰 Costo: ${CONFIG.healCost} pts\n\n`;
    message += `📊 *Cambios:*\n`;
    message += `❤️ Salud: ${pet.health} → ${newHealth}/100\n\n`;
    
    if (newHealth >= 100) {
      message += `🎉 *¡${pet.name} está completamente sana!* 🎉`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId]
    }, { quoted: m });

  } catch (error) {
    petLogger.error('Error curando mascota:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al curar la mascota.'
    }, { quoted: m });
  }
}

// Mostrar tienda de mascotas
async function showPetShop(sock, m) {
  const chatId = m.key.remoteJid;
  
  try {
    let message = `🏪 *TIENDA DE MASCOTAS* 🏪\n\n`;
    
    message += `🐾 *Especies disponibles:*\n\n`;
    
    message += `🐕 **Perro** - Leal y amigable\n`;
    message += `   💪 Fuerza alta | 🛡️ Defensa media\n\n`;
    
    message += `🐱 **Gato** - Ágil e independiente\n`;
    message += `   ⚡ Velocidad alta | 💪 Fuerza media\n\n`;
    
    message += `🐰 **Conejo** - Rápido y juguetón\n`;
    message += `   ⚡ Velocidad alta | 😊 Felicidad alta\n\n`;
    
    message += `🐹 **Hamster** - Pequeño y enérgico\n`;
    message += `   🍖 Hambre baja | 💰 Mantenimiento bajo\n\n`;
    
    message += `🐦 **Pájaro** - Libre y veloz\n`;
    message += `   ⚡ Velocidad máxima | 🎯 Evasión alta\n\n`;
    
    message += `🐠 **Pez** - Tranquilo y pacífico\n`;
    message += `   😊 Felicidad alta | 🛡️ Defensa baja\n\n`;
    
    message += `🐉 **Dragón** - Poderoso y raro\n`;
    message += `   💪 Fuerza máxima | 🛡️ Defensa máxima\n\n`;
    
    message += `🦄 **Unicornio** - Mágico y especial\n`;
    message += `   ✨ Habilidades especiales | ❤️ Salud alta\n\n`;
    
    message += `💰 *Costos de mantenimiento:*\n`;
    message += `• Alimentar: ${CONFIG.feedCost} pts\n`;
    message += `• Jugar: ${CONFIG.playCost} pts\n`;
    message += `• Entrenar: ${CONFIG.experiencePerTrain} pts\n`;
    message += `• Curar: ${CONFIG.healCost} pts\n\n`;
    
    message += `💡 *Para adoptar:*\n`;
    message += `• \`.adopt <especie> <nombre>\`\n`;
    message += `• Máximo ${CONFIG.maxPets} mascotas por usuario\n`;
    message += `• Cada mascota tiene estadísticas únicas`;

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    petLogger.error('Error mostrando tienda:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar la tienda de mascotas.'
    }, { quoted: m });
  }
}

// Batalla de mascotas
async function petBattle(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  
  if (args.length < 3) {
    return await sock.sendMessage(chatId, {
      text: '❌ Formato incorrecto.\n\n💡 *Uso:* `.petbattle <tu_mascota> <@usuario> <mascota_rival>\n*Ejemplo:* `.petbattle Michi @usuario123 Gato`'
    }, { quoted: m });
  }

  const myPetName = args[1];
  const opponentId = args[2].replace('@', '') + '@s.whatsapp.net';
  const opponentPetName = args.slice(3).join(' ');

  try {
    const myPet = await getPet(userId, myPetName);
    const opponentPet = await getPet(opponentId, opponentPetName);

    if (!myPet) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes una mascota con ese nombre.'
      }, { quoted: m });
    }

    if (!opponentPet) {
      return await sock.sendMessage(chatId, {
        text: '❌ El oponente no tiene una mascota con ese nombre.'
      }, { quoted: m });
    }

    // Verificar si las mascotas pueden batallar
    if (myPet.health < 50) {
      return await sock.sendMessage(chatId, {
        text: `❌ ${myPet.name} está muy débil para batallar (Salud: ${myPet.health}/100).`
      }, { quoted: m });
    }

    if (opponentPet.health < 50) {
      return await sock.sendMessage(chatId, {
        text: `❌ La mascota rival está muy débil para batallar (Salud: ${opponentPet.health}/100).`
      }, { quoted: m });
    }

    // Simular batalla
    const battleResult = simulateBattle(myPet, opponentPet);

    let message = `⚔️ *BATALLA DE MASCOTAS* ⚔️\n\n`;
    message += `👤 *@${userId.split('@')[0]} vs @${opponentId.split('@')[0]}*\n\n`;
    message += `🐾 ${myPet.name} (${myPet.species}) vs ${opponentPet.name} (${opponentPet.species})\n\n`;
    
    message += `📊 *Estadísticas:*\n`;
    message += `${myPet.name}: ❤️${myPet.health} 💪${myPet.strength} 🛡️${myPet.defense} ⚡${myPet.speed}\n`;
    message += `${opponentPet.name}: ❤️${opponentPet.health} 💪${opponentPet.strength} 🛡️${opponentPet.defense} ⚡${opponentPet.speed}\n\n`;
    
    message += `⚔️ *Resultado de la batalla:*\n`;
    battleResult.rounds.forEach((round, index) => {
      message += `Ronda ${index + 1}: ${round}\n`;
    });
    
    message += `\n🏆 *Ganador: ${battleResult.winner}*\n`;
    
    if (battleResult.winner === myPet.name) {
      const expGain = 50 + (opponentPet.level * 10);
      await db.run(`
        UPDATE pets 
        SET experience = experience + ?
        WHERE id = ?
      `, [expGain, myPet.id]);
      
      message += `\n✨ ${myPet.name} ganó ${expGain} pts de experiencia`;
    }

    await sock.sendMessage(chatId, {
      text: message,
      mentions: [userId, opponentId]
    }, { quoted: m });

  } catch (error) {
    petLogger.error('Error en batalla de mascotas:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al iniciar la batalla de mascotas.'
    }, { quoted: m });
  }
}

// Mostrar ayuda
async function showPetHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `🐾 *SISTEMA DE MASCOTAS* 🐾\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `📋 *Información:*\n`;
  message += `• \`.pet <nombre>\` - Ver detalles de mascota\n`;
  message += `• \`.mypets\` - Ver todas tus mascotas\n\n`;
  
  message += `🎮 *Interacción:*\n`;
  message += `• \`.adopt <especie> <nombre>\` - Adoptar mascota\n`;
  message += `• \`.feed <nombre>\` - Alimentar (${CONFIG.feedCost} pts)\n`;
  message += `• \`.play <nombre>\` - Jugar (${CONFIG.playCost} pts)\n`;
  message += `• \`.train <nombre>\` - Entrenar (${CONFIG.experiencePerTrain} pts)\n`;
  message += `• \`.heal <nombre>\` - Curar (${CONFIG.healCost} pts)\n\n`;
  
  message += `🏪 *Tienda:*\n`;
  message += `• \`.petshop\` - Ver especies disponibles\n\n`;
  
  message += `⚔️ *Batallas:*\n`;
  message += `• \`.petbattle <mascota> <@usuario> <mascota>\` - Batallar\n\n`;
  
  message += `📊 *Especies disponibles:*\n`;
  message += `• Perro, Gato, Conejo, Hamster\n`;
  message += `• Pájaro, Pez, Dragón, Unicornio\n\n`;
  
  message += `⚠️ *Importante:*\n`;
  message += `• Máximo ${CONFIG.maxPets} mascotas por usuario\n`;
  message += `• Las mascotas necesitan cuidado regular\n`;
  message += `• Pueden subir de nivel y evolucionar\n`;
  message += `• Cada especie tiene estadísticas únicas`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones auxiliares
async function getPet(userId, petName) {
  try {
    return await db.get(`
      SELECT * FROM pets 
      WHERE user_id = ? AND name = ?
    `, [userId, petName]);
  } catch (error) {
    petLogger.error('Error obteniendo mascota:', error);
    return null;
  }
}

async function getUserPets(userId) {
  try {
    return await db.all(`
      SELECT * FROM pets 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);
  } catch (error) {
    petLogger.error('Error obteniendo mascotas del usuario:', error);
    return [];
  }
}

async function updatePetStats(petId) {
  try {
    const pet = await db.get('SELECT * FROM pets WHERE id = ?', [petId]);
    if (!pet) return;

    // Calcular tiempo desde última actualización
    const hoursSinceUpdate = Math.floor((Date.now() - new Date(pet.last_update || pet.created_at).getTime()) / (1000 * 60 * 60));
    
    if (hoursSinceUpdate > 0) {
      const newHunger = Math.max(0, pet.hunger - (hoursSinceUpdate * CONFIG.hungerDecay));
      const newHappiness = Math.max(0, pet.happiness - (hoursSinceUpdate * CONFIG.happinessDecay));

      await db.run(`
        UPDATE pets 
        SET hunger = ?, happiness = ?, last_update = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newHunger, newHappiness, petId]);
    }
  } catch (error) {
    petLogger.error('Error actualizando estadísticas de mascota:', error);
  }
}

function getPetStatus(pet) {
  if (pet.health < 30) return '🤒 Enfermo';
  if (pet.hunger < 30) return '🍖 Hambriento';
  if (pet.happiness < 30) return '😢 Triste';
  if (pet.health >= 90 && pet.hunger >= 80 && pet.happiness >= 80) return '😊 Feliz';
  return '🙂 Normal';
}

function getBaseStats(species) {
  const stats = {
    perro: { strength: 8, defense: 6, speed: 5, skills: 'Lealtad' },
    gato: { strength: 6, defense: 4, speed: 8, skills: 'Agilidad' },
    conejo: { strength: 4, defense: 3, speed: 9, skills: 'Velocidad' },
    hamster: { strength: 3, defense: 3, speed: 6, skills: 'Energía' },
    pajaro: { strength: 4, defense: 2, speed: 10, skills: 'Vuelo' },
    pez: { strength: 3, defense: 4, speed: 5, skills: 'Natación' },
    dragon: { strength: 10, defense: 10, speed: 7, skills: 'Fuego' },
    unicornio: { strength: 7, defense: 8, speed: 8, skills: 'Magia' }
  };
  return stats[species] || { strength: 5, defense: 5, speed: 5, skills: 'Ninguna' };
}

function getExpForNextLevel(level) {
  return level * 100;
}

async function checkLevelUp(petId, experience) {
  try {
    const pet = await db.get('SELECT level FROM pets WHERE id = ?', [petId]);
    if (!pet) return false;

    const requiredExp = getExpForNextLevel(pet.level);
    if (experience >= requiredExp && pet.level < CONFIG.maxLevel) {
      const newLevel = pet.level + 1;
      
      await db.run(`
        UPDATE pets 
        SET level = ?, experience = experience - ?
        WHERE id = ?
      `, [newLevel, requiredExp, petId]);

      // Mejorar estadísticas al subir de nivel
      const statBonus = Math.floor(newLevel / 5) + 1;
      await db.run(`
        UPDATE pets 
        SET strength = strength + ?, defense = defense + ?, speed = speed + ?
        WHERE id = ?
      `, [statBonus, statBonus, statBonus, petId]);

      return true;
    }
    return false;
  } catch (error) {
    petLogger.error('Error verificando subida de nivel:', error);
    return false;
  }
}

function simulateBattle(pet1, pet2) {
  const rounds = [];
  let pet1Health = pet1.health;
  let pet2Health = pet2.health;
  let round = 1;

  while (pet1Health > 0 && pet2Health > 0 && round <= 10) {
    const pet1Attack = Math.max(1, pet1.strength - Math.floor(pet2.defense / 2) + Math.floor(Math.random() * 5));
    const pet2Attack = Math.max(1, pet2.strength - Math.floor(pet1.defense / 2) + Math.floor(Math.random() * 5));

    if (pet1.speed >= pet2.speed) {
      pet2Health -= pet1Attack;
      rounds.push(`${pet1.name} ataca y causa ${pet1Attack} de daño`);
      
      if (pet2Health > 0) {
        pet1Health -= pet2Attack;
        rounds.push(`${pet2.name} contraataca y causa ${pet2Attack} de daño`);
      }
    } else {
      pet1Health -= pet2Attack;
      rounds.push(`${pet2.name} ataca y causa ${pet2Attack} de daño`);
      
      if (pet1Health > 0) {
        pet2Health -= pet1Attack;
        rounds.push(`${pet1.name} contraataca y causa ${pet1Attack} de daño`);
      }
    }

    round++;
  }

  const winner = pet1Health > 0 ? pet1.name : pet2.name;
  
  return { winner, rounds };
}

async function getUserBalance(userId) {
  try {
    const user = await db.get('SELECT saldo, banco FROM usuarios WHERE chatId = ?', [userId]);
    if (!user) {
      await db.run('INSERT INTO usuarios (chatId, saldo, banco) VALUES (?, 100, 0)', [userId]);
      return { saldo: 100, banco: 0, total: 100 };
    }
    return {
      saldo: user.saldo || 0,
      banco: user.banco || 0,
      total: (user.saldo || 0) + (user.banco || 0)
    };
  } catch (error) {
    petLogger.error('Error obteniendo saldo:', error);
    return { saldo: 0, banco: 0, total: 0 };
  }
}

async function updateUserBalance(userId, newBalance) {
  try {
    await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
    return true;
  } catch (error) {
    petLogger.error('Error actualizando saldo:', error);
    return false;
  }
}

// Inicializar tablas
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS pets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        name TEXT,
        species TEXT,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        health INTEGER DEFAULT 100,
        hunger INTEGER DEFAULT 80,
        happiness INTEGER DEFAULT 80,
        strength INTEGER DEFAULT 5,
        defense INTEGER DEFAULT 5,
        speed INTEGER DEFAULT 5,
        skills TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_update DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    petLogger.success('Tablas de mascotas inicializadas');
  } catch (error) {
    petLogger.error('Error inicializando tablas:', error);
  }
}

// Inicializar sistema
initializeTables();

// Exportar funciones para compatibilidad
export { 
  CONFIG,
  petLogger,
  getPet,
  getUserPets,
  updatePetStats
};
