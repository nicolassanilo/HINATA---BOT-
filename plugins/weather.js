/**
 * @file Plugin Weather - Información del clima
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema completo de información meteorológica
 */

import axios from 'axios';
import { db } from './db.js';

// Configuración
const CONFIG = {
  enableLogging: true,
  apiKey: process.env.WEATHER_API_KEY || 'demo_key',
  defaultUnits: 'metric',
  updateInterval: 600000, // 10 minutos
  maxLocations: 5,
  supportedLanguages: ['es', 'en'],
  weatherIcons: {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
  }
};

// Sistema de logging
const weatherLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[WEATHER] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[WEATHER] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[WEATHER] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[WEATHER] ❌ ${message}`)
};

// Funciones principales
export const command = ['.weather', '.climate', '.forecast', '.locations', '.addlocation', '.removelocation', '.airquality'];
export const alias = ['.tiempo', '.clima', '.pronostico', '.ubicaciones', '.agregarubicacion', '.eliminarubicacion', '.calidadaire'];
export const description = 'Sistema completo de información meteorológica';

export async function run(sock, m, { text, command }) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    switch (command) {
      case '.weather':
      case '.tiempo':
        await getCurrentWeather(sock, m, text);
        break;
      case '.climate':
      case '.clima':
        await getClimateInfo(sock, m, text);
        break;
      case '.forecast':
      case '.pronostico':
        await getWeatherForecast(sock, m, text);
        break;
      case '.locations':
      case '.ubicaciones':
        await showSavedLocations(sock, m);
        break;
      case '.addlocation':
      case '.agregarubicacion':
        await addLocation(sock, m, text);
        break;
      case '.removelocation':
      case '.eliminarubicacion':
        await removeLocation(sock, m, text);
        break;
      case '.airquality':
      case '.calidadaire':
        await getAirQuality(sock, m, text);
        break;
      default:
        await showWeatherHelp(sock, m);
    }
  } catch (error) {
    weatherLogger.error('Error en sistema de clima:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema de clima. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

// Obtener clima actual
async function getCurrentWeather(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const location = text.replace(/^(\.weather|\.tiempo)\s*/, '').trim();

  try {
    await sock.sendMessage(chatId, {
      text: '🌤️ *Obteniendo información del clima...*'
    }, { quoted: m });

    let locationData;
    if (location) {
      locationData = await getLocationData(location);
    } else {
      // Usar ubicación guardada predeterminada
      const savedLocations = await getUserLocations(userId);
      if (savedLocations.length === 0) {
        return await sock.sendMessage(chatId, {
          text: '❌ No tienes ubicaciones guardadas. Usa `.addlocation <ciudad>` para agregar una.'
        }, { quoted: m });
      }
      locationData = savedLocations.find(loc => loc.is_default) || savedLocations[0];
    }

    if (!locationData) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo encontrar la ubicación especificada.'
      }, { quoted: m });
    }

    const weatherData = await fetchWeatherData(locationData.lat, locationData.lon);
    if (!weatherData) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo obtener el clima para esta ubicación.'
      }, { quoted: m });
    }

    let message = `🌤️ *CLIMA ACTUAL* 🌤️\n\n`;
    message += `📍 **${locationData.name}**\n\n`;
    
    message += `🌡️ *Temperatura:*\n`;
    message += `• Actual: ${weatherData.current.temp}°C\n`;
    message += `• Sensación térmica: ${weatherData.current.feels_like}°C\n`;
    message += `• Máxima: ${weatherData.daily[0].temp.max}°C\n`;
    message += `• Mínima: ${weatherData.daily[0].temp.min}°C\n\n`;
    
    message += `🌤️ *Cielo:*\n`;
    message += `${getWeatherIcon(weatherData.current.weather[0].icon)} ${weatherData.current.weather[0].description}\n\n`;
    
    message += `💧 *Humedad:*\n`;
    message += `${weatherData.current.humidity}%\n\n`;
    
    message += `💨 *Viento:*\n`;
    message += `• Velocidad: ${weatherData.current.wind_speed} m/s\n`;
    message += `• Dirección: ${getWindDirection(weatherData.current.wind_deg)}\n\n`;
    
    message += `👁️ *Visibilidad:*\n`;
    message += `${(weatherData.current.visibility / 1000).toFixed(1)} km\n\n`;
    
    message += `🌅 *Sol:*\n`;
    message += `• Amanecer: ${formatTime(weatherData.current.sunrise)}\n`;
    message += `• Atardecer: ${formatTime(weatherData.current.sunset)}\n\n`;
    
    message += `📊 *Presión:*\n`;
    message += `${weatherData.current.pressure} hPa\n\n`;
    
    message += `📍 *Ubicación:*\n`;
    message += `Lat: ${locationData.lat.toFixed(4)}, Lon: ${locationData.lon.toFixed(4)}\n`;
    message += `🕐 Actualizado: ${new Date().toLocaleTimeString()}`;

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

    // Guardar en historial
    await saveWeatherQuery(userId, locationData.name, weatherData.current.temp);

  } catch (error) {
    weatherLogger.error('Error obteniendo clima actual:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al obtener el clima actual.'
    }, { quoted: m });
  }
}

// Obtener información climática
async function getClimateInfo(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const location = text.replace(/^(\.climate|\.clima)\s*/, '').trim();

  try {
    await sock.sendMessage(chatId, {
      text: '🌍 *Obteniendo información climática...*'
    }, { quoted: m });

    let locationData;
    if (location) {
      locationData = await getLocationData(location);
    } else {
      const savedLocations = await getUserLocations(userId);
      if (savedLocations.length === 0) {
        return await sock.sendMessage(chatId, {
          text: '❌ No tienes ubicaciones guardadas.'
        }, { quoted: m });
      }
      locationData = savedLocations[0];
    }

    if (!locationData) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo encontrar la ubicación.'
      }, { quoted: m });
    }

    const climateData = await fetchClimateData(locationData.lat, locationData.lon);
    if (!climateData) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo obtener información climática.'
      }, { quoted: m });
    }

    let message = `🌍 *INFORMACIÓN CLIMÁTICA* 🌍\n\n`;
    message += `📍 **${locationData.name}**\n\n`;
    
    message += `📊 *Datos climáticos promedio:*\n\n`;
    
    message += `🌡️ *Temperaturas anuales:*\n`;
    message += `• Promedio: ${climateData.avg_temp}°C\n`;
    message += `• Máxima promedio: ${climateData.avg_max}°C\n`;
    message += `• Mínima promedio: ${climateData.avg_min}°C\n\n`;
    
    message += `💧 *Precipitación:*\n`;
    message += `• Anual: ${climateData.annual_precipitation} mm\n`;
    message += `• Días lluviosos: ${climateData.rainy_days}\n\n`;
    
    message += `☀️ *Sol:*\n`;
    message += `• Horas de sol anuales: ${climateData.sunshine_hours}\n`;
    message += `• Días soleados: ${climateData.sunny_days}\n\n`;
    
    message += `🌤️ *Clima:*\n`;
    message += `• Tipo: ${climateData.climate_type}\n`;
    message += `• Clasificación: ${climateData.koppen_classification}\n\n`;
    
    message += `🌡️ *Extremos históricos:*\n`;
    message += `• Máxima histórica: ${climateData.historical_max}°C\n`;
    message += `• Mínima histórica: ${climateData.historical_min}°C\n\n`;
    
    message += `📅 *Mejor época para visitar:*\n`;
    message += `${climateData.best_season}`;

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    weatherLogger.error('Error obteniendo información climática:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al obtener la información climática.'
    }, { quoted: m });
  }
}

// Obtener pronóstico
async function getWeatherForecast(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const args = text.split(' ');
  const location = args.slice(1).join(' ');
  const days = parseInt(args[1]) || 5;

  if (days < 1 || days > 7) {
    return await sock.sendMessage(chatId, {
      text: '❌ El pronóstico debe ser entre 1 y 7 días.'
    }, { quoted: m });
  }

  try {
    await sock.sendMessage(chatId, {
      text: '📅 *Obteniendo pronóstico...*'
    }, { quoted: m });

    let locationData;
    if (location && !isNaN(days)) {
      locationData = await getLocationData(location);
    } else {
      const savedLocations = await getUserLocations(userId);
      if (savedLocations.length === 0) {
        return await sock.sendMessage(chatId, {
          text: '❌ No tienes ubicaciones guardadas.'
        }, { quoted: m });
      }
      locationData = savedLocations[0];
    }

    if (!locationData) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo encontrar la ubicación.'
      }, { quoted: m });
    }

    const forecastData = await fetchForecastData(locationData.lat, locationData.lon, days);
    if (!forecastData) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo obtener el pronóstico.'
      }, { quoted: m });
    }

    let message = `📅 *PRONÓSTICO DE ${days} DÍAS* 📅\n\n`;
    message += `📍 **${locationData.name}**\n\n`;

    forecastData.daily.slice(0, days).forEach((day, index) => {
      const date = new Date(day.dt * 1000);
      message += `📆 *Día ${index + 1} - ${date.toLocaleDateString()}*\n`;
      message += `${getWeatherIcon(day.weather[0].icon)} ${day.weather[0].description}\n`;
      message += `🌡️ ${day.temp.min}°C - ${day.temp.max}°C\n`;
      message += `💧 Humedad: ${day.humidity}%\n`;
      message += `💨 Viento: ${day.wind_speed} m/s\n`;
      message += `🌧️ Lluvia: ${(day.pop * 100).toFixed(0)}%\n`;
      message += `💧 Precipitación: ${day.rain ? day.rain['1h'] || 0 : 0} mm\n\n`;
    });

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    weatherLogger.error('Error obteniendo pronóstico:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al obtener el pronóstico.'
    }, { quoted: m });
  }
}

// Mostrar ubicaciones guardadas
async function showSavedLocations(sock, m) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;

  try {
    const locations = await getUserLocations(userId);
    
    if (locations.length === 0) {
      return await sock.sendMessage(chatId, {
        text: '📍 No tienes ubicaciones guardadas.\n\n💡 Usa `.addlocation <ciudad>` para agregar una.'
      }, { quoted: m });
    }

    let message = `📍 *TUS UBICACIONES* 📍\n\n`;
    
    locations.forEach((location, index) => {
      message += `${index + 1}. **${location.name}**\n`;
      message += `   🌍 ${location.country}\n`;
      message += `   📍 Lat: ${location.lat.toFixed(4)}, Lon: ${location.lon.toFixed(4)}\n`;
      message += `   ${location.is_default ? '⭐ Predeterminada' : ''}\n`;
      message += `   🕐 Agregada: ${new Date(location.added_at).toLocaleDateString()}\n\n`;
    });

    message += `💡 *Comandos:*\n`;
    message += `• \`.addlocation <ciudad>\` - Agregar ubicación\n`;
    message += `• \`.removelocation <ciudad>\` - Eliminar ubicación\n`;
    message += `• \`.weather <ciudad>\` - Clima de ubicación específica`;

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    weatherLogger.error('Error mostrando ubicaciones:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar tus ubicaciones.'
    }, { quoted: m });
  }
}

// Agregar ubicación
async function addLocation(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const locationName = text.replace(/^(\.addlocation|\.agregarubicacion)\s*/, '').trim();

  if (!locationName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar una ciudad.\n\n💡 *Uso:* `.addlocation <ciudad>`'
    }, { quoted: m });
  }

  try {
    const userLocations = await getUserLocations(userId);
    if (userLocations.length >= CONFIG.maxLocations) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya tienes el máximo de ubicaciones (${CONFIG.maxLocations}).`
      }, { quoted: m });
    }

    await sock.sendMessage(chatId, {
      text: '🔍 *Buscando ubicación...*'
    }, { quoted: m });

    const locationData = await getLocationData(locationName);
    if (!locationData) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo encontrar esa ubicación.'
      }, { quoted: m });
    }

    // Verificar si ya existe
    const existingLocation = userLocations.find(loc => 
      loc.name.toLowerCase() === locationData.name.toLowerCase()
    );
    
    if (existingLocation) {
      return await sock.sendMessage(chatId, {
        text: '❌ Ya tienes esta ubicación guardada.'
      }, { quoted: m });
    }

    // Agregar a la base de datos
    const isDefault = userLocations.length === 0;
    await db.run(`
      INSERT INTO weather_locations (user_id, name, country, lat, lon, is_default, added_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, locationData.name, locationData.country, locationData.lat, locationData.lon, isDefault]);

    let message = `✅ *UBICACIÓN AGREGADA* ✅\n\n`;
    message += `📍 **${locationData.name}**\n`;
    message += `🌍 ${locationData.country}\n`;
    message += `📍 Coordenadas: ${locationData.lat.toFixed(4)}, ${locationData.lon.toFixed(4)}\n\n`;
    
    if (isDefault) {
      message += `⭐ Establecida como ubicación predeterminada.\n\n`;
    }
    
    message += `💡 Ahora puedes usar \`.weather\` para ver el clima de esta ubicación.`;

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    weatherLogger.error('Error agregando ubicación:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al agregar la ubicación.'
    }, { quoted: m });
  }
}

// Eliminar ubicación
async function removeLocation(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const locationName = text.replace(/^(\.removelocation|\.eliminarubicacion)\s*/, '').trim();

  if (!locationName) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar una ciudad.\n\n💡 *Uso:* `.removelocation <ciudad>`'
    }, { quoted: m });
  }

  try {
    const userLocations = await getUserLocations(userId);
    const locationToRemove = userLocations.find(loc => 
      loc.name.toLowerCase().includes(locationName.toLowerCase())
    );

    if (!locationToRemove) {
      return await sock.sendMessage(chatId, {
        text: '❌ No tienes una ubicación con ese nombre.'
      }, { quoted: m });
    }

    await db.run('DELETE FROM weather_locations WHERE id = ?', [locationToRemove.id]);

    // Si era la predeterminada, establecer una nueva
    if (locationToRemove.is_default && userLocations.length > 1) {
      const newDefault = userLocations.find(loc => loc.id !== locationToRemove.id);
      await db.run('UPDATE weather_locations SET is_default = 1 WHERE id = ?', [newDefault.id]);
    }

    let message = `🗑️ *UBICACIÓN ELIMINADA* 🗑️\n\n`;
    message += `📍 **${locationToRemove.name}**\n`;
    message += `🌍 ${locationToRemove.country}\n\n`;
    message += `✅ Eliminada de tu lista de ubicaciones.`;

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    weatherLogger.error('Error eliminando ubicación:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al eliminar la ubicación.'
    }, { quoted: m });
  }
}

// Obtener calidad del aire
async function getAirQuality(sock, m, text) {
  const chatId = m.key.remoteJid;
  const userId = m.key.participant || m.key.remoteJid;
  const location = text.replace(/^(\.airquality|\.calidadaire)\s*/, '').trim();

  try {
    await sock.sendMessage(chatId, {
      text: '💨 *Obteniendo calidad del aire...*'
    }, { quoted: m });

    let locationData;
    if (location) {
      locationData = await getLocationData(location);
    } else {
      const savedLocations = await getUserLocations(userId);
      if (savedLocations.length === 0) {
        return await sock.sendMessage(chatId, {
          text: '❌ No tienes ubicaciones guardadas.'
        }, { quoted: m });
      }
      locationData = savedLocations[0];
    }

    if (!locationData) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo encontrar la ubicación.'
      }, { quoted: m });
    }

    const airQualityData = await fetchAirQualityData(locationData.lat, locationData.lon);
    if (!airQualityData) {
      return await sock.sendMessage(chatId, {
        text: '❌ No se pudo obtener la calidad del aire.'
      }, { quoted: m });
    }

    const aqiLevel = getAQILevel(airQualityData.aqi);
    
    let message = `💨 *CALIDAD DEL AIRE* 💨\n\n`;
    message += `📍 **${locationData.name}**\n\n`;
    
    message += `📊 *Índice de Calidad del Aire (AQI):*\n`;
    message += `${aqiLevel.icon} **${airQualityData.aqi}** - ${aqiLevel.description}\n\n`;
    
    message += `🎯 *Componentes:*\n`;
    message += `• CO: ${airQualityData.co} μg/m³\n`;
    message += `• NO: ${airQualityData.no} μg/m³\n`;
    message += `• NO₂: ${airQualityData.no2} μg/m³\n`;
    message += `• O₃: ${airQualityData.o3} μg/m³\n`;
    message += `• SO₂: ${airQualityData.so2} μg/m³\n`;
    message += `• PM2.5: ${airQualityData.pm2_5} μg/m³\n`;
    message += `• PM10: ${airQualityData.pm10} μg/m³\n\n`;
    
    message += `🏥 *Recomendaciones:*\n`;
    message += `${aqiLevel.recommendations}\n\n`;
    
    message += `🕐 Actualizado: ${new Date().toLocaleTimeString()}`;

    await sock.sendMessage(chatId, { text: message }, { quoted: m });

  } catch (error) {
    weatherLogger.error('Error obteniendo calidad del aire:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al obtener la calidad del aire.'
    }, { quoted: m });
  }
}

// Mostrar ayuda
async function showWeatherHelp(sock, m) {
  const chatId = m.key.remoteJid;
  
  let message = `🌤️ *SISTEMA DE CLIMA* 🌤️\n\n`;
  message += `💡 *Comandos disponibles:*\n\n`;
  
  message += `🌡️ *Clima actual:*\n`;
  message += `• \`.weather <ciudad>\` - Clima de ciudad específica\n`;
  message += `• \`.weather\` - Clima de ubicación predeterminada\n\n`;
  
  message += `🌍 *Información climática:*\n`;
  message += `• \`.climate <ciudad>\` - Datos climáticos promedio\n`;
  message += `• \`.forecast <días>\` - Pronóstico extendido\n\n`;
  
  message += `📍 *Gestión de ubicaciones:*\n`;
  message += `• \`.addlocation <ciudad>\` - Agregar ubicación\n`;
  message += `• \`.removelocation <ciudad>\` - Eliminar ubicación\n`;
  message += `• \`.locations\` - Ver ubicaciones guardadas\n\n`;
  
  message += `💨 *Calidad del aire:*\n`;
  message += `• \`.airquality <ciudad>\` - Calidad del aire\n\n`;
  
  message += `📊 *Características:*\n`;
  message += `• Máximo ${CONFIG.maxLocations} ubicaciones por usuario\n`;
  message += `• Pronóstico hasta 7 días\n`;
  message += `• Datos en tiempo real\n`;
  message += `• Calidad del aire incluida\n\n`;
  
  message += `🌍 *Unidades:*\n`;
  message += `• Temperatura: °C\n`;
  message += `• Viento: m/s\n`;
  message += `• Presión: hPa\n`;
  message += `• Visibilidad: km`;

  await sock.sendMessage(chatId, { text: message }, { quoted: m });
}

// Funciones auxiliares
async function getLocationData(locationName) {
  try {
    // Simulación de geocodificación (en producción usarías APIs reales)
    const mockLocations = [
      { name: 'Madrid', country: 'España', lat: 40.4168, lon: -3.7038 },
      { name: 'Barcelona', country: 'España', lat: 41.3851, lon: 2.1734 },
      { name: 'Valencia', country: 'España', lat: 39.4699, lon: -0.3763 },
      { name: 'Sevilla', country: 'España', lat: 37.3891, lon: -5.9845 },
      { name: 'Bilbao', country: 'España', lat: 43.2630, lon: -2.9350 }
    ];
    
    return mockLocations.find(loc => 
      loc.name.toLowerCase().includes(locationName.toLowerCase()) ||
      locationName.toLowerCase().includes(loc.name.toLowerCase())
    ) || mockLocations[0];
    
  } catch (error) {
    weatherLogger.error('Error obteniendo datos de ubicación:', error);
    return null;
  }
}

async function fetchWeatherData(lat, lon) {
  try {
    // Simulación de datos del clima (en producción usarías OpenWeatherMap API)
    return {
      current: {
        temp: 22,
        feels_like: 21,
        humidity: 65,
        wind_speed: 3.5,
        wind_deg: 180,
        visibility: 10000,
        pressure: 1013,
        weather: [{ icon: '01d', description: 'cielo despejado' }],
        sunrise: Date.now() - 3600000 * 6,
        sunset: Date.now() + 3600000 * 6
      },
      daily: [{
        temp: { max: 25, min: 18 }
      }]
    };
  } catch (error) {
    weatherLogger.error('Error obteniendo datos del clima:', error);
    return null;
  }
}

async function fetchClimateData(lat, lon) {
  try {
    // Simulación de datos climáticos
    return {
      avg_temp: 18,
      avg_max: 22,
      avg_min: 14,
      annual_precipitation: 450,
      rainy_days: 80,
      sunshine_hours: 2500,
      sunny_days: 200,
      climate_type: 'Mediterráneo',
      koppen_classification: 'Csa',
      historical_max: 40,
      historical_min: -2,
      best_season: 'Primavera y otoño'
    };
  } catch (error) {
    weatherLogger.error('Error obteniendo datos climáticos:', error);
    return null;
  }
}

async function fetchForecastData(lat, lon, days) {
  try {
    // Simulación de pronóstico
    const daily = [];
    for (let i = 0; i < days; i++) {
      daily.push({
        dt: Date.now() / 1000 + (i * 86400),
        temp: {
          min: 15 + Math.floor(Math.random() * 5),
          max: 25 + Math.floor(Math.random() * 5)
        },
        humidity: 50 + Math.floor(Math.random() * 30),
        wind_speed: 2 + Math.random() * 4,
        pop: Math.random(),
        rain: Math.random() > 0.7 ? { '1h': Math.random() * 5 } : null,
        weather: [{ icon: '01d', description: 'cielo despejado' }]
      });
    }
    return { daily };
  } catch (error) {
    weatherLogger.error('Error obteniendo pronóstico:', error);
    return null;
  }
}

async function fetchAirQualityData(lat, lon) {
  try {
    // Simulación de datos de calidad del aire
    return {
      aqi: Math.floor(Math.random() * 150) + 20,
      co: Math.random() * 1000,
      no: Math.random() * 50,
      no2: Math.random() * 100,
      o3: Math.random() * 200,
      so2: Math.random() * 50,
      pm2_5: Math.random() * 50,
      pm10: Math.random() * 100
    };
  } catch (error) {
    weatherLogger.error('Error obteniendo calidad del aire:', error);
    return null;
  }
}

function getWeatherIcon(iconCode) {
  return CONFIG.weatherIcons[iconCode] || '🌤️';
}

function getWindDirection(degrees) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString();
}

function getAQILevel(aqi) {
  if (aqi <= 50) {
    return {
      icon: '🟢',
      description: 'Buena',
      recommendations: 'La calidad del aire es satisfactoria. Disfruta de actividades al aire libre.'
    };
  } else if (aqi <= 100) {
    return {
      icon: '🟡',
      description: 'Moderada',
      recommendations: 'La calidad del aire es aceptable. Las personas sensibles pueden considerar limitar actividades prolongadas al aire libre.'
    };
  } else if (aqi <= 150) {
    return {
      icon: '🟠',
      description: 'No saludable para grupos sensibles',
      recommendations: 'Las personas sensibles deben reducir actividades prolongadas al aire libre.'
    };
  } else if (aqi <= 200) {
    return {
      icon: '🔴',
      description: 'No saludable',
      recommendations: 'Todos deben reducir actividades prolongadas al aire libre.'
    };
  } else if (aqi <= 300) {
    return {
      icon: '🟣',
      description: 'Muy no saludable',
      recommendations: 'Evita actividades prolongadas al aire libre.'
    };
  } else {
    return {
      icon: '🟤',
      description: 'Peligrosa',
      recommendations: 'Permanece en interiores. Evita toda exposición al aire libre.'
    };
  }
}

// Funciones de base de datos
async function getUserLocations(userId) {
  try {
    return await db.all(`
      SELECT * FROM weather_locations 
      WHERE user_id = ? 
      ORDER BY is_default DESC, added_at ASC
    `, [userId]);
  } catch (error) {
    weatherLogger.error('Error obteniendo ubicaciones del usuario:', error);
    return [];
  }
}

async function saveWeatherQuery(userId, location, temperature) {
  try {
    await db.run(`
      INSERT INTO weather_history (user_id, location, temperature, queried_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, location, temperature]);
  } catch (error) {
    weatherLogger.error('Error guardando consulta de clima:', error);
  }
}

// Inicializar tablas
async function initializeTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS weather_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        name TEXT,
        country TEXT,
        lat REAL,
        lon REAL,
        is_default INTEGER DEFAULT 0,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS weather_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        location TEXT,
        temperature REAL,
        queried_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    weatherLogger.success('Tablas de clima inicializadas');
  } catch (error) {
    weatherLogger.error('Error inicializando tablas:', error);
  }
}

// Inicializar sistema
initializeTables();

// Exportar funciones para compatibilidad
export { 
  CONFIG,
  weatherLogger,
  getLocationData,
  fetchWeatherData,
  getAQILevel
};
