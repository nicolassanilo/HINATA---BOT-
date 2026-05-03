/**
 * @file Plugin Waifu Economy - Sistema económico avanzado
 * @version 1.0.0
 * @author HINATA-BOT
 * @description Sistema de mercado secundario, subastas, inversiones y economía avanzada
 */

import { db } from './db.js';
import fs from 'fs/promises';

// Importar funciones compartidas desde el core
import { 
  characters, 
  loadCharacters, 
  getWaifuLevel, 
  getRarezaEmoji,
  getUserBalance,
  updateUserBalance,
  getUserWaifus,
  validateUserWaifu,
  logger
} from './waifu_core.js';

// Sistema de configuración
const CONFIG = {
  enableLogging: true,
  auctionDuration: 2 * 60 * 60 * 1000, // 2 horas
  maxAuctions: 10,
  minBidIncrement: 100,
  maxMarketListings: 20,
  marketFee: 0.05, // 5% de comisión
  investmentReturnRate: 0.1, // 10% de retorno
  maxInvestments: 5,
  casinoMaxBet: 10000,
  casinoCooldown: 30 * 60 * 1000 // 30 minutos
};

// Sistema de logging
const economyLogger = {
  info: (message) => CONFIG.enableLogging && console.log(`[ECONOMY] ℹ️ ${message}`),
  success: (message) => CONFIG.enableLogging && console.log(`[ECONOMY] ✅ ${message}`),
  warning: (message) => CONFIG.enableLogging && console.warn(`[ECONOMY] ⚠️ ${message}`),
  error: (message) => CONFIG.enableLogging && console.error(`[ECONOMY] ❌ ${message}`)
};

// Tipos de transacciones económicas
const TRANSACTION_TYPES = {
  MARKET_BUY: 'market_buy',
  MARKET_SELL: 'market_sell',
  AUCTION_BID: 'auction_bid',
  AUCTION_WIN: 'auction_win',
  INVESTMENT: 'investment',
  CASINO_WIN: 'casino_win',
  CASINO_LOSE: 'casino_lose'
};

// Juegos de casino
const CASINO_GAMES = {
  SLOTS: 'slots',
  ROULETTE: 'roulette',
  DICE: 'dice',
  BLACKJACK: 'blackjack'
};

/**
 * Sistema económico avanzado
 */
export async function run(sock, m, { text, command }) {
  const userId = m.key.participant || m.key.remoteJid;
  const chatId = m.key.remoteJid;

  try {
    switch (command) {
      case '.mercado':
        await showMarket(sock, m, userId);
        break;
      case '.vender_mercado':
        await sellOnMarket(sock, m, userId, text);
        break;
      case '.comprar_mercado':
        await buyFromMarket(sock, m, userId, text);
        break;
      case '.subasta':
        await showAuctions(sock, m, userId);
        break;
      case '.crear_subasta':
        await createAuction(sock, m, userId, text);
        break;
      case '.pujar':
        await placeBid(sock, m, userId, text);
        break;
      case '.inversion':
        await showInvestments(sock, m, userId);
        break;
      case '.invertir':
        await makeInvestment(sock, m, userId, text);
        break;
      case '.casino':
        await showCasino(sock, m, userId);
        break;
      case '.jugar_casino':
        await playCasino(sock, m, userId, text);
        break;
      case '.economia':
        await showEconomyStats(sock, m, userId);
        break;
      default:
        economyLogger.warning(`Comando no reconocido: ${command}`);
    }
  } catch (error) {
    economyLogger.error('Error en el sistema económico:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Ocurrió un error en el sistema económico. Intenta nuevamente más tarde.'
    }, { quoted: m });
  }
}

/**
 * Muestra el mercado secundario
 */
async function showMarket(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const listings = await getMarketListings();
    const userBalance = await getUserBalance(userId);
    
    let marketMessage = `🏪 *MERCADO SECUNDARIO* 🏪\n\n`;
    marketMessage += `👤 *@${userId.split('@')[0]}*\n`;
    marketMessage += `💰 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n`;
    marketMessage += `📊 *Listados activos:* ${listings.length}/${CONFIG.maxMarketListings}\n\n`;
    
    if (listings.length === 0) {
      marketMessage += `📦 *No hay waifus en el mercado*\n\n`;
      marketMessage += `💡 *Usa \`.vender_mercado <waifu> <precio>\` para vender una waifu`;
    } else {
      marketMessage += `🎯 *WAIFUS DISPONIBLES:*\n\n`;
      
      listings.forEach((listing, index) => {
        const character = characters.find(c => c.id === listing.character_id);
        const rareza = getRarezaEmoji(character.price);
        const profit = listing.price - character.price;
        const profitPercent = Math.round((profit / character.price) * 100);
        
        marketMessage += `${index + 1}. ${rareza} *${character.name}*\n`;
        marketMessage += `   📺 ${character.anime}\n`;
        marketMessage += `   💰 Precio: ${listing.price.toLocaleString()} 💎`;
        if (profit > 0) {
          marketMessage += ` (+${profitPercent}%)`;
        } else if (profit < 0) {
          marketMessage += ` (${profitPercent}%)`;
        }
        marketMessage += `\n   👤 Vendedor: @${listing.seller_id.split('@')[0]}\n`;
        marketMessage += `   ⏰ Publicado: ${new Date(listing.created_at).toLocaleDateString()}\n\n`;
      });
    }
    
    marketMessage += `💡 *Comandos del mercado:*\n`;
    marketMessage += `• \`.vender_mercado <waifu> <precio>\` - Vender waifu\n`;
    marketMessage += `• \`.comprar_mercado <número>\` - Comprar waifu\n`;
    marketMessage += `• \`.economia\` - Ver estadísticas económicas\n\n`;
    marketMessage += `⚠️ *Comisión:* ${CONFIG.marketFee * 100}% por transacción`;
    
    await sock.sendMessage(chatId, { 
      text: marketMessage, 
      mentions: [userId, ...listings.map(l => l.seller_id)] 
    }, { quoted: m });
    
  } catch (error) {
    economyLogger.error('Error al mostrar mercado:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el mercado.'
    }, { quoted: m });
  }
}

/**
 * Vende una waifu en el mercado
 */
async function sellOnMarket(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.vender_mercado <nombre_waifu> <precio>`\n' +
            '*Ejemplo:* `.vender_mercado Hinata Hyuga 5000`'
    }, { quoted: m });
  }
  
  const waifuName = args.slice(0, -1).join(' ');
  const price = parseInt(args[args.length - 1]);
  
  if (isNaN(price) || price <= 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ El precio debe ser un número positivo.'
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Verificar si ya está en el mercado
    const existingListing = await db.get(
      'SELECT * FROM market_listings WHERE character_id = ? AND seller_id = ? AND status = "active"',
      [character.id, userId]
    );
    
    if (existingListing) {
      return await sock.sendMessage(chatId, {
        text: `❌ *${character.name}* ya está en el mercado.`
      }, { quoted: m });
    }
    
    // Verificar límite de listados
    const userListings = await db.get(
      'SELECT COUNT(*) as count FROM market_listings WHERE seller_id = ? AND status = "active"',
      [userId]
    );
    
    if (userListings.count >= CONFIG.maxMarketListings) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite de ${CONFIG.maxMarketListings} listados en el mercado.`
      }, { quoted: m });
    }
    
    // Crear listado
    await db.run(
      'INSERT INTO market_listings (character_id, seller_id, price, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [character.id, userId, price]
    );
    
    const rareza = getRarezaEmoji(character.price);
    const profit = price - character.price;
    const profitPercent = Math.round((profit / character.price) * 100);
    
    let listingMessage = `🏪 *WAIFU PUESTA EN VENTA* 🏪\n\n`;
    listingMessage += `${rareza} *${character.name}*\n`;
    listingMessage += `📺 ${character.anime}\n`;
    listingMessage += `💰 *Precio de venta:* ${price.toLocaleString()} 💎\n`;
    listingMessage += `💎 *Precio original:* ${character.price.toLocaleString()} 💎\n`;
    
    if (profit > 0) {
      listingMessage += `📈 *Ganancia potencial:* +${profit.toLocaleString()} 💎 (+${profitPercent}%)\n`;
    } else {
      listingMessage += `📉 *Pérdida:* ${Math.abs(profit).toLocaleString()} 💎 (${profitPercent}%)\n`;
    }
    
    listingMessage += `⏰ *Publicado:* ${new Date().toLocaleString()}\n\n`;
    listingMessage += `💡 *Otros usuarios pueden comprarla con \`.comprar_mercado\`\n`;
    listingMessage += `⚠️ *Comisión:* ${CONFIG.marketFee * 100}% cuando se venda`;
    
    await sock.sendMessage(chatId, { 
      text: listingMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    economyLogger.success(`Waifu ${character.name} puesta en venta por ${userId} - precio: ${price}`);
    
  } catch (error) {
    economyLogger.error('Error al vender en mercado:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al poner la waifu en venta.'
    }, { quoted: m });
  }
}

/**
 * Compra una waifu del mercado
 */
async function buyFromMarket(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const listingNumber = parseInt(args[0]);
  
  if (isNaN(listingNumber) || listingNumber <= 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar un número de listado válido.\n\n' +
            '💡 *Uso:* `.comprar_mercado <número>`\n' +
            '*Ejemplo:* `.comprar_mercado 3`'
    }, { quoted: m });
  }
  
  try {
    // Obtener listados del mercado
    const listings = await getMarketListings();
    
    if (listingNumber > listings.length) {
      return await sock.sendMessage(chatId, {
        text: `❌ El listado ${listingNumber} no existe.\n\n` +
              `📊 *Listados disponibles:* ${listings.length}`
      }, { quoted: m });
    }
    
    const listing = listings[listingNumber - 1];
    const character = characters.find(c => c.id === listing.character_id);
    const userBalance = await getUserBalance(userId);
    
    // Verificar si es el propio vendedor
    if (listing.seller_id === userId) {
      return await sock.sendMessage(chatId, {
        text: `❌ No puedes comprar tu propia waifu.`
      }, { quoted: m });
    }
    
    // Verificar si tiene suficiente saldo
    const totalCost = listing.price + Math.floor(listing.price * CONFIG.marketFee);
    
    if (userBalance.total < totalCost) {
      const needed = totalCost - userBalance.total;
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes suficientes 💎.\n\n` +
              `💰 *Costo total:* ${totalCost.toLocaleString()} 💎\n` +
              `💵 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n` +
              `⚠️ *Faltan:* ${needed.toLocaleString()} 💎`
      }, { quoted: m });
    }
    
    // Verificar si ya tiene la waifu
    const alreadyOwned = await db.get(
      'SELECT character_id FROM claimed_characters WHERE user_id = ? AND character_id = ?',
      [userId, character.id]
    );
    
    if (alreadyOwned) {
      return await sock.sendMessage(chatId, {
        text: `❌ Ya tienes a *${character.name}* en tu colección.`
      }, { quoted: m });
    }
    
    // Realizar la compra
    await processMarketPurchase(userId, listing, character);
    
    const rareza = getRarezaEmoji(character.price);
    
    let purchaseMessage = `🎉 *¡WAIFU COMPRADA!* 🎉\n\n`;
    purchaseMessage += `${rareza} *${character.name}*\n`;
    purchaseMessage += `📺 ${character.anime}\n`;
    purchaseMessage += `💰 *Precio:* ${listing.price.toLocaleString()} 💎\n`;
    purchaseMessage += `🔧 *Comisión:* ${Math.floor(listing.price * CONFIG.marketFee).toLocaleString()} 💎\n`;
    purchaseMessage += `💸 *Total pagado:* ${totalCost.toLocaleString()} 💎\n\n`;
    purchaseMessage += `👤 *Vendedor:* @${listing.seller_id.split('@')[0]}\n`;
    purchaseMessage += `💖 *¡Ahora es tuya, @${userId.split('@')[0]}!*`;
    
    try {
      await sock.sendMessage(chatId, {
        image: { url: character.image_url[Math.floor(Math.random() * character.image_url.length)] },
        caption: purchaseMessage,
        mentions: [userId, listing.seller_id]
      }, { quoted: m });
    } catch (imageError) {
      await sock.sendMessage(chatId, { 
        text: purchaseMessage, 
        mentions: [userId, listing.seller_id] 
      }, { quoted: m });
    }
    
    economyLogger.success(`Waifu ${character.name} comprada por ${userId} de ${listing.seller_id} - precio: ${listing.price}`);
    
  } catch (error) {
    economyLogger.error('Error al comprar del mercado:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al procesar la compra.'
    }, { quoted: m });
  }
}

/**
 * Muestra las subastas activas
 */
async function showAuctions(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const auctions = await getActiveAuctions();
    const userBalance = await getUserBalance(userId);
    
    let auctionMessage = `🏛️ *SUBASTAS ACTIVAS* 🏛️\n\n`;
    auctionMessage += `👤 *@${userId.split('@')[0]}*\n`;
    auctionMessage += `💰 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n`;
    auctionMessage += `📊 *Subastas activas:* ${auctions.length}/${CONFIG.maxAuctions}\n\n`;
    
    if (auctions.length === 0) {
      auctionMessage += `🔨 *No hay subastas activas*\n\n`;
      auctionMessage += `💡 *Usa \`.crear_subasta <waifu> <precio_inicial>\` para crear una subasta`;
    } else {
      auctionMessage += `🎯 *SUBASTAS DISPONIBLES:*\n\n`;
      
      auctions.forEach((auction, index) => {
        const character = characters.find(c => c.id === auction.character_id);
        const rareza = getRarezaEmoji(character.price);
        const timeRemaining = getTimeRemaining(auction.end_time);
        const bidCount = auction.bid_count || 0;
        
        auctionMessage += `${index + 1}. ${rareza} *${character.name}*\n`;
        auctionMessage += `   📺 ${character.anime}\n`;
        auctionMessage += `   💰 Puja actual: ${auction.current_bid.toLocaleString()} 💎\n`;
        auctionMessage += `   🥈 Puja inicial: ${auction.starting_bid.toLocaleString()} 💎\n`;
        auctionMessage += `   👤 Pujador actual: @${auction.current_bidder_id?.split('@')[0] || 'Ninguno'}\n`;
        auctionMessage += `   📊 Pujas: ${bidCount}\n`;
        auctionMessage += `   ⏰ Tiempo restante: ${timeRemaining}\n\n`;
      });
    }
    
    auctionMessage += `💡 *Comandos de subasta:*\n`;
    auctionMessage += `• \`.crear_subasta <waifu> <precio>\` - Crear subasta\n`;
    auctionMessage += `• \`.pujar <número> <cantidad>\` - Hacer una puja\n`;
    auctionMessage += `• \`.economia\` - Ver estadísticas económicas\n\n`;
    auctionMessage += `⚠️ *Incremento mínimo:* ${CONFIG.minBidIncrement} 💎`;
    
    await sock.sendMessage(chatId, { 
      text: auctionMessage, 
      mentions: [userId, ...auctions.map(a => a.current_bidder_id).filter(Boolean)] 
    }, { quoted: m });
    
  } catch (error) {
    economyLogger.error('Error al mostrar subastas:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las subastas.'
    }, { quoted: m });
  }
}

/**
 * Crea una nueva subasta
 */
async function createAuction(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.crear_subasta <nombre_waifu> <precio_inicial>`\n' +
            '*Ejemplo:* `.crear_subasta Hinata Hyuga 1000`'
    }, { quoted: m });
  }
  
  const waifuName = args.slice(0, -1).join(' ');
  const startingBid = parseInt(args[args.length - 1]);
  
  if (isNaN(startingBid) || startingBid <= 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ El precio inicial debe ser un número positivo.'
    }, { quoted: m });
  }
  
  try {
    // Verificar si el usuario tiene la waifu
    const claimed = await db.all('SELECT character_id FROM claimed_characters WHERE user_id = ?', [userId]);
    const claimedIds = claimed.map(c => c.character_id);
    
    const character = characters.find(c => 
      claimedIds.includes(c.id) &&
      c.name.toLowerCase().includes(waifuName.toLowerCase())
    );
    
    if (!character) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes a *${waifuName}* en tu colección.`
      }, { quoted: m });
    }
    
    // Verificar si ya está en subasta
    const existingAuction = await db.get(
      'SELECT * FROM auctions WHERE character_id = ? AND status = "active"',
      [character.id]
    );
    
    if (existingAuction) {
      return await sock.sendMessage(chatId, {
        text: `❌ *${character.name}* ya está en subasta.`
      }, { quoted: m });
    }
    
    // Verificar límite de subastas
    const auctionCount = await db.get(
      'SELECT COUNT(*) as count FROM auctions WHERE status = "active"'
    );
    
    if (auctionCount.count >= CONFIG.maxAuctions) {
      return await sock.sendMessage(chatId, {
        text: `❌ Se ha alcanzado el límite de ${CONFIG.maxAuctions} subastas simultáneas.`
      }, { quoted: m });
    }
    
    // Crear subasta
    const endTime = new Date(Date.now() + CONFIG.auctionDuration).toISOString();
    await db.run(
      'INSERT INTO auctions (character_id, seller_id, starting_bid, current_bid, end_time, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [character.id, userId, startingBid, startingBid, endTime]
    );
    
    const rareza = getRarezaEmoji(character.price);
    
    let auctionMessage = `🏛️ *SUBASTA CREADA* 🏛️\n\n`;
    auctionMessage += `${rareza} *${character.name}*\n`;
    auctionMessage += `📺 ${character.anime}\n`;
    auctionMessage += `💰 *Puja inicial:* ${startingBid.toLocaleString()} 💎\n`;
    auctionMessage += `⏰ *Duración:* ${CONFIG.auctionDuration / (60 * 60 * 1000)} horas\n`;
    auctionMessage += `🔧 *Incremento mínimo:* ${CONFIG.minBidIncrement} 💎\n\n`;
    auctionMessage += `💡 *Para pujar:* \`.pujar <número> <cantidad>\`\n`;
    auctionMessage += `🎯 *Otros usuarios pueden pujar hasta que termine el tiempo`;
    
    await sock.sendMessage(chatId, { 
      text: auctionMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    economyLogger.success(`Subasta creada por ${userId} - waifu: ${character.name} - precio inicial: ${startingBid}`);
    
  } catch (error) {
    economyLogger.error('Error al crear subasta:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al crear la subasta.'
    }, { quoted: m });
  }
}

/**
 * Hace una puja en una subasta
 */
async function placeBid(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.pujar <número_subasta> <cantidad>`\n' +
            '*Ejemplo:* `.pujar 1 1500`'
    }, { quoted: m });
  }
  
  const auctionNumber = parseInt(args[0]);
  const bidAmount = parseInt(args[1]);
  
  if (isNaN(auctionNumber) || isNaN(bidAmount) || auctionNumber <= 0 || bidAmount <= 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ El número de subasta y la cantidad deben ser números positivos.'
    }, { quoted: m });
  }
  
  try {
    // Obtener subastas activas
    const auctions = await getActiveAuctions();
    
    if (auctionNumber > auctions.length) {
      return await sock.sendMessage(chatId, {
        text: `❌ La subasta ${auctionNumber} no existe.\n\n` +
              `📊 *Subastas disponibles:* ${auctions.length}`
      }, { quoted: m });
    }
    
    const auction = auctions[auctionNumber - 1];
    const character = characters.find(c => c.id === auction.character_id);
    const userBalance = await getUserBalance(userId);
    
    // Verificar si es el vendedor
    if (auction.seller_id === userId) {
      return await sock.sendMessage(chatId, {
        text: `❌ No puedes pujar en tu propia subasta.`
      }, { quoted: m });
    }
    
    // Verificar si la puja es válida
    if (bidAmount <= auction.current_bid) {
      return await sock.sendMessage(chatId, {
        text: `❌ La puja debe ser mayor que la puja actual (${auction.current_bid.toLocaleString()} 💎).`
      }, { quoted: m });
    }
    
    if (bidAmount - auction.current_bid < CONFIG.minBidIncrement) {
      return await sock.sendMessage(chatId, {
        text: `❌ El incremento mínimo es de ${CONFIG.minBidIncrement} 💎.`
      }, { quoted: m });
    }
    
    // Verificar si tiene suficiente saldo
    if (userBalance.total < bidAmount) {
      const needed = bidAmount - userBalance.total;
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes suficientes 💎.\n\n` +
              `💰 *Puja requerida:* ${bidAmount.toLocaleString()} 💎\n` +
              `💵 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n` +
              `⚠️ *Faltan:* ${needed.toLocaleString()} 💎`
      }, { quoted: m });
    }
    
    // Realizar la puja
    await db.run(
      'UPDATE auctions SET current_bid = ?, current_bidder_id = ?, bid_count = bid_count + 1 WHERE id = ?',
      [bidAmount, userId, auction.id]
    );
    
    const rareza = getRarezaEmoji(character.price);
    
    let bidMessage = `🏛️ *PUJA REALIZADA* 🏛️\n\n`;
    bidMessage += `${rareza} *${character.name}*\n`;
    bidMessage += `📺 ${character.anime}\n`;
    bidMessage += `💰 *Nueva puja:* ${bidAmount.toLocaleString()} 💎\n`;
    bidMessage += `📊 *Puja anterior:* ${auction.current_bid.toLocaleString()} 💎\n`;
    bidMessage += `👤 *Pujador:* @${userId.split('@')[0]}\n`;
    bidMessage += `⏰ *Tiempo restante:* ${getTimeRemaining(auction.end_time)}\n\n`;
    bidMessage += `🎯 *¡Ahora lideras la subasta!*`;
    
    await sock.sendMessage(chatId, { 
      text: bidMessage, 
      mentions: [userId, auction.seller_id] 
    }, { quoted: m });
    
    economyLogger.success(`Puja realizada por ${userId} - subasta: ${auction.id} - cantidad: ${bidAmount}`);
    
  } catch (error) {
    economyLogger.error('Error al realizar puja:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al realizar la puja.'
    }, { quoted: m });
  }
}

/**
 * Muestra las inversiones del usuario
 */
async function showInvestments(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const investments = await getUserInvestments(userId);
    const userBalance = await getUserBalance(userId);
    
    let investmentMessage = `💼 *INVERSIONES* 💼\n\n`;
    investmentMessage += `👤 *@${userId.split('@')[0]}*\n`;
    investmentMessage += `💰 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n`;
    investmentMessage += `📊 *Inversiones activas:* ${investments.length}/${CONFIG.maxInvestments}\n\n`;
    
    if (investments.length === 0) {
      investmentMessage += `📦 *No tienes inversiones activas*\n\n`;
      investmentMessage += `💡 *Usa \`.invertir <cantidad>\` para invertir\n`;
      investmentMessage += `📈 *Retorno esperado:* ${CONFIG.investmentReturnRate * 100}%\n`;
      investmentMessage += `⏰ *Duración:* 24 horas`;
    } else {
      investmentMessage += `📈 *TUS INVERSIONES:*\n\n`;
      
      investments.forEach((investment, index) => {
        const profit = Math.floor(investment.amount * CONFIG.investmentReturnRate);
        const timeRemaining = getTimeRemaining(investment.maturity_time);
        
        investmentMessage += `${index + 1}. 💰 *Inversión*\n`;
        investmentMessage += `   💵 Cantidad: ${investment.amount.toLocaleString()} 💎\n`;
        investmentMessage += `   📈 Retorno esperado: +${profit.toLocaleString()} 💎\n`;
        investmentMessage += `   ⏰ Tiempo restante: ${timeRemaining}\n`;
        investmentMessage += `   📅 Invertido: ${new Date(investment.created_at).toLocaleDateString()}\n\n`;
      });
    }
    
    investmentMessage += `💡 *Comandos de inversión:*\n`;
    investmentMessage += `• \`.invertir <cantidad>\` - Realizar inversión\n`;
    investmentMessage += `• \`.economia\` - Ver estadísticas económicas\n\n`;
    investmentMessage += `⚠️ *Riesgo:* Las inversiones tienen un 90% de éxito`;
    
    await sock.sendMessage(chatId, { 
      text: investmentMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    economyLogger.error('Error al mostrar inversiones:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las inversiones.'
    }, { quoted: m });
  }
}

/**
 * Realiza una inversión
 */
async function makeInvestment(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  const amount = parseInt(args[0]);
  
  if (isNaN(amount) || amount <= 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ Debes especificar una cantidad válida.\n\n' +
            '💡 *Uso:* `.invertir <cantidad>`\n' +
            '*Ejemplo:* `.invertir 5000`'
    }, { quoted: m });
  }
  
  try {
    const userBalance = await getUserBalance(userId);
    
    if (userBalance.total < amount) {
      const needed = amount - userBalance.total;
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes suficientes 💎.\n\n` +
              `💰 *Inversión requerida:* ${amount.toLocaleString()} 💎\n` +
              `💵 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n` +
              `⚠️ *Faltan:* ${needed.toLocaleString()} 💎`
      }, { quoted: m });
    }
    
    // Verificar límite de inversiones
    const currentInvestments = await getUserInvestments(userId);
    if (currentInvestments.length >= CONFIG.maxInvestments) {
      return await sock.sendMessage(chatId, {
        text: `❌ Has alcanzado el límite de ${CONFIG.maxInvestments} inversiones simultáneas.`
      }, { quoted: m });
    }
    
    // Realizar inversión
    const maturityTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db.run(
      'INSERT INTO investments (user_id, amount, created_at, maturity_time, status) VALUES (?, ?, CURRENT_TIMESTAMP, ?, "pending")',
      [userId, amount, maturityTime]
    );
    
    // Descontar el saldo
    await updateUserBalance(userId, userBalance.saldo - amount);
    
    const expectedReturn = Math.floor(amount * CONFIG.investmentReturnRate);
    const totalReturn = amount + expectedReturn;
    
    let investmentMessage = `💼 *INVERSIÓN REALIZADA* 💼\n\n`;
    investmentMessage += `👤 *@${userId.split('@')[0]}*\n`;
    investmentMessage += `💰 *Cantidad invertida:* ${amount.toLocaleString()} 💎\n`;
    investmentMessage += `📈 *Retorno esperado:* +${expectedReturn.toLocaleString()} 💎 (${CONFIG.investmentReturnRate * 100}%)\n`;
    investmentMessage += `💸 *Total esperado:* ${totalReturn.toLocaleString()} 💎\n`;
    investmentMessage += `⏰ *Vencimiento:* 24 horas\n`;
    investmentMessage += `🎲 *Probabilidad de éxito:* 90%\n\n`;
    investmentMessage += `💡 *Podrás reclamar tus ganancias después de 24 horas*`;
    
    await sock.sendMessage(chatId, { 
      text: investmentMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    economyLogger.success(`Inversión realizada por ${userId} - cantidad: ${amount}`);
    
  } catch (error) {
    economyLogger.error('Error al realizar inversión:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al realizar la inversión.'
    }, { quoted: m });
  }
}

/**
 * Muestra el casino
 */
async function showCasino(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userBalance = await getUserBalance(userId);
    const lastPlay = await getLastCasinoPlay(userId);
    const canPlay = !lastPlay || (Date.now() - new Date(lastPlay.play_time).getTime()) >= CONFIG.casinoCooldown;
    
    let casinoMessage = `🎰 *CASINO DE WAIFUS* 🎰\n\n`;
    casinoMessage += `👤 *@${userId.split('@')[0]}*\n`;
    casinoMessage += `💰 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎\n`;
    casinoMessage += `🎲 *Apuesta máxima:* ${CONFIG.casinoMaxBet.toLocaleString()} 💎\n`;
    casinoMessage += `⏰ *Cooldown:* ${canPlay ? '✅ Disponible' : `⏳ ${Math.ceil((CONFIG.casinoCooldown - (Date.now() - new Date(lastPlay.play_time).getTime())) / 60000)} min`}\n\n`;
    
    casinoMessage += `🎯 *JUEGOS DISPONIBLES:*\n\n`;
    
    Object.entries(CASINO_GAMES).forEach(([key, game]) => {
      const gameInfo = getGameInfo(key);
      casinoMessage += `🎲 *${gameInfo.name}*\n`;
      casinoMessage += `   ${gameInfo.description}\n`;
      casinoMessage += `   📊 Rango de ganancia: ${gameInfo.minWin}x - ${gameInfo.maxWin}x\n`;
      casinoMessage += `   💡 Uso: \`.jugar_casino ${key} <cantidad>\`\n\n`;
    });
    
    casinoMessage += `💡 *Ejemplos:*\n`;
    casinoMessage += `• \`.jugar_casino slots 1000\` - Jugar a las tragamonedas\n`;
    casinoMessage += `• \`.jugar_casino roulette 500\` - Jugar a la ruleta\n`;
    casinoMessage += `• \`.jugar_casino dice 2000\` - Jugar a los dados\n\n`;
    casinoMessage += `⚠️ *Advertencia:* Juega con responsabilidad`;
    
    await sock.sendMessage(chatId, { 
      text: casinoMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    economyLogger.error('Error al mostrar casino:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar el casino.'
    }, { quoted: m });
  }
}

/**
 * Juega en el casino
 */
async function playCasino(sock, m, userId, text) {
  const chatId = m.key.remoteJid;
  const args = (text || '').split(' ').slice(1);
  
  if (args.length < 2) {
    return await sock.sendMessage(chatId, {
      text: '❌ Uso incorrecto.\n\n' +
            '💡 *Formato:* `.jugar_casino <juego> <cantidad>`\n' +
            '*Juegos:* ' + Object.keys(CASINO_GAMES).join(', ') + '\n' +
            '*Ejemplo:* `.jugar_casino slots 1000`'
    }, { quoted: m });
  }
  
  const gameType = args[0].toLowerCase();
  const betAmount = parseInt(args[1]);
  
  if (!Object.values(CASINO_GAMES).includes(gameType)) {
    return await sock.sendMessage(chatId, {
      text: `❌ Juego no válido.\n\n` +
            '*Juegos disponibles:* ' + Object.keys(CASINO_GAMES).join(', ')
    }, { quoted: m });
  }
  
  if (isNaN(betAmount) || betAmount <= 0) {
    return await sock.sendMessage(chatId, {
      text: '❌ La cantidad debe ser un número positivo.'
    }, { quoted: m });
  }
  
  if (betAmount > CONFIG.casinoMaxBet) {
    return await sock.sendMessage(chatId, {
      text: `❌ La apuesta máxima es de ${CONFIG.casinoMaxBet.toLocaleString()} 💎.`
    }, { quoted: m });
  }
  
  try {
    const userBalance = await getUserBalance(userId);
    
    if (userBalance.total < betAmount) {
      return await sock.sendMessage(chatId, {
        text: `❌ No tienes suficientes 💎.\n\n` +
              `💰 *Apuesta requerida:* ${betAmount.toLocaleString()} 💎\n` +
              `💵 *Tu saldo:* ${userBalance.total.toLocaleString()} 💎`
      }, { quoted: m });
    }
    
    // Verificar cooldown
    const lastPlay = await getLastCasinoPlay(userId);
    if (lastPlay && (Date.now() - new Date(lastPlay.play_time).getTime()) < CONFIG.casinoCooldown) {
      const remaining = Math.ceil((CONFIG.casinoCooldown - (Date.now() - new Date(lastPlay.play_time).getTime())) / 60000);
      return await sock.sendMessage(chatId, {
        text: `⏰ Debes esperar ${remaining} minutos antes de volver a jugar.`
      }, { quoted: m });
    }
    
    // Jugar
    const result = await playCasinoGame(gameType, betAmount);
    
    // Actualizar saldo
    const newBalance = userBalance.saldo + (result.win ? result.amount : -betAmount);
    await updateUserBalance(userId, newBalance);
    
    // Registrar juego
    await db.run(
      'INSERT INTO casino_plays (user_id, game_type, bet_amount, result_amount, win, play_time) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [userId, gameType, betAmount, result.amount, result.win]
    );
    
    const gameInfo = getGameInfo(gameType);
    
    let playMessage = `🎰 *${gameInfo.name}* 🎰\n\n`;
    playMessage += `👤 *@${userId.split('@')[0]}*\n`;
    playMessage += `💰 *Apuesta:* ${betAmount.toLocaleString()} 💎\n`;
    
    if (result.win) {
      playMessage += `🎉 *¡GANASTE!*\n`;
      playMessage += `💸 *Ganancia:* +${result.amount.toLocaleString()} 💎\n`;
      playMessage += `📊 *Multiplicador:* ${result.multiplier}x\n`;
      playMessage += `💵 *Nuevo saldo:* ${newBalance.toLocaleString()} 💎`;
    } else {
      playMessage += `😔 *Perdiste*\n`;
      playMessage += `💸 *Pérdida:* -${betAmount.toLocaleString()} 💎\n`;
      playMessage += `💵 *Nuevo saldo:* ${newBalance.toLocaleString()} 💎`;
    }
    
    playMessage += `\n${result.message}`;
    
    await sock.sendMessage(chatId, { 
      text: playMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
    economyLogger.success(`Juego de casino - usuario: ${userId} - juego: ${gameType} - resultado: ${result.win ? 'ganó' : 'perdió'} - cantidad: ${result.amount}`);
    
  } catch (error) {
    economyLogger.error('Error al jugar en el casino:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al procesar el juego.'
    }, { quoted: m });
  }
}

/**
 * Muestra estadísticas económicas
 */
async function showEconomyStats(sock, m, userId) {
  const chatId = m.key.remoteJid;
  
  try {
    const userBalance = await getUserBalance(userId);
    const userStats = await getEconomyStats(userId);
    
    let statsMessage = `📊 *ESTADÍSTICAS ECONÓMICAS* 📊\n\n`;
    statsMessage += `👤 *@${userId.split('@')[0]}*\n\n`;
    
    statsMessage += `💰 *BALANCE ACTUAL:*\n`;
    statsMessage += `• Saldo: ${userBalance.saldo.toLocaleString()} 💎\n`;
    statsMessage += `• Banco: ${userBalance.banco.toLocaleString()} 💎\n`;
    statsMessage += `• Total: ${userBalance.total.toLocaleString()} 💎\n\n`;
    
    statsMessage += `📈 *TRANSACCIONES:*\n`;
    statsMessage += `• Compras en mercado: ${userStats.marketBuys || 0}\n`;
    statsMessage += `• Ventas en mercado: ${userStats.marketSells || 0}\n`;
    statsMessage += `• Subastas ganadas: ${userStats.auctionsWon || 0}\n`;
    statsMessage += `• Inversiones: ${userStats.investments || 0}\n`;
    statsMessage += `• Juegos de casino: ${userStats.casinoPlays || 0}\n\n`;
    
    statsMessage += `💸 *GANANCIAS/PERDIDAS:*\n`;
    statsMessage += `• Ganancias totales: ${(userStats.totalEarnings || 0).toLocaleString()} 💎\n`;
    statsMessage += `• Pérdidas totales: ${(userStats.totalLosses || 0).toLocaleString()} 💎\n`;
    statsMessage += `• Balance neto: ${((userStats.totalEarnings || 0) - (userStats.totalLosses || 0)).toLocaleString()} 💎\n\n`;
    
    statsMessage += `🎯 *MÉTRICAS:*\n`;
    statsMessage += `• Tasa de ganancia casino: ${userStats.casinoPlays > 0 ? Math.round((userStats.casinoWins / userStats.casinoPlays) * 100) : 0}%\n`;
    statsMessage += `• Retorno de inversiones: ${userStats.investmentReturns || 0}%\n`;
    statsMessage += `• Comisiones pagadas: ${(userStats.totalFees || 0).toLocaleString()} 💎`;
    
    await sock.sendMessage(chatId, { 
      text: statsMessage, 
      mentions: [userId] 
    }, { quoted: m });
    
  } catch (error) {
    economyLogger.error('Error al mostrar estadísticas económicas:', error);
    await sock.sendMessage(chatId, {
      text: '❌ Error al cargar las estadísticas económicas.'
    }, { quoted: m });
  }
}

/**
 * Funciones auxiliares
 */
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
    economyLogger.error('Error al obtener saldo:', error);
    return { saldo: 0, banco: 0, total: 0 };
  }
}

async function updateUserBalance(userId, newBalance) {
  try {
    await db.run('UPDATE usuarios SET saldo = ? WHERE chatId = ?', [newBalance, userId]);
    return true;
  } catch (error) {
    economyLogger.error('Error al actualizar saldo:', error);
    return false;
  }
}

async function getMarketListings() {
  try {
    const listings = await db.all(
      'SELECT * FROM market_listings WHERE status = "active" ORDER BY created_at DESC'
    );
    return listings;
  } catch (error) {
    economyLogger.error('Error al obtener listados del mercado:', error);
    return [];
  }
}

async function getActiveAuctions() {
  try {
    const auctions = await db.all(
      'SELECT * FROM auctions WHERE status = "active" AND end_time > CURRENT_TIMESTAMP ORDER BY created_at DESC'
    );
    return auctions;
  } catch (error) {
    economyLogger.error('Error al obtener subastas activas:', error);
    return [];
  }
}

async function getUserInvestments(userId) {
  try {
    const investments = await db.all(
      'SELECT * FROM investments WHERE user_id = ? AND status = "pending" AND maturity_time > CURRENT_TIMESTAMP'
      , [userId]
    );
    return investments;
  } catch (error) {
    economyLogger.error('Error al obtener inversiones:', error);
    return [];
  }
}

async function getLastCasinoPlay(userId) {
  try {
    const play = await db.get(
      'SELECT * FROM casino_plays WHERE user_id = ? ORDER BY play_time DESC LIMIT 1',
      [userId]
    );
    return play;
  } catch (error) {
    economyLogger.error('Error al obtener último juego de casino:', error);
    return null;
  }
}

async function getEconomyStats(userId) {
  try {
    const stats = await db.get(
      'SELECT COUNT(*) as marketBuys FROM market_transactions WHERE buyer_id = ?',
      [userId]
    );
    return stats || {};
  } catch (error) {
    economyLogger.error('Error al obtener estadísticas económicas:', error);
    return {};
  }
}

function getTimeRemaining(endTime) {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end - now;
  
  if (diff <= 0) return 'Finalizado';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getGameInfo(gameType) {
  const games = {
    [CASINO_GAMES.SLOTS]: {
      name: 'Tragamonedas',
      description: 'Gira los rodillos y prueba tu suerte',
      minWin: 0.5,
      maxWin: 10
    },
    [CASINO_GAMES.ROULETTE]: {
      name: 'Ruleta',
      description: 'Apuesta a números o colores',
      minWin: 1,
      maxWin: 35
    },
    [CASINO_GAMES.DICE]: {
      name: 'Dados',
      description: 'Lanza los dados y multiplica tu apuesta',
      minWin: 1,
      maxWin: 6
    },
    [CASINO_GAMES.BLACKJACK]: {
      name: 'Blackjack',
      description: 'Intenta llegar a 21 sin pasarte',
      minWin: 1,
      maxWin: 2.5
    }
  };
  
  return games[gameType] || { name: 'Desconocido', description: 'Juego no disponible', minWin: 0, maxWin: 0 };
}

async function playCasinoGame(gameType, betAmount) {
  const random = Math.random();
  let result = { win: false, amount: 0, multiplier: 0, message: '' };
  
  switch (gameType) {
    case CASINO_GAMES.SLOTS:
      if (random < 0.3) {
        result.win = true;
        result.multiplier = 1 + Math.random() * 9; // 1x - 10x
        result.amount = Math.floor(betAmount * result.multiplier);
        result.message = '🎰 ¡777! Ganaste grande!';
      } else {
        result.message = '🎰 Sigue intentando...';
      }
      break;
      
    case CASINO_GAMES.ROULETTE:
      if (random < 0.027) { // 2.7% de probabilidad
        result.win = true;
        result.multiplier = 35;
        result.amount = betAmount * 35;
        result.message = '🎰 ¡Número exacto! Ganaste 35x!';
      } else if (random < 0.1) {
        result.win = true;
        result.multiplier = 2;
        result.amount = betAmount * 2;
        result.message = '🎰 ¡Color correcto! Ganaste 2x!';
      } else {
        result.message = '🎰 La rueda no fue favorable...';
      }
      break;
      
    case CASINO_GAMES.DICE:
      const diceRoll = Math.floor(Math.random() * 6) + 1;
      if (diceRoll === 6) {
        result.win = true;
        result.multiplier = 6;
        result.amount = betAmount * 6;
        result.message = `🎰 ¡Sacaste un ${diceRoll}! Ganaste 6x!`;
      } else if (diceRoll >= 4) {
        result.win = true;
        result.multiplier = diceRoll;
        result.amount = betAmount * diceRoll;
        result.message = `🎰 ¡Sacaste un ${diceRoll}! Ganaste ${diceRoll}x!`;
      } else {
        result.message = `🎰 Sacaste un ${diceRoll}. Sigue intentando...`;
      }
      break;
      
    case CASINO_GAMES.BLACKJACK:
      const playerScore = 15 + Math.floor(Math.random() * 7);
      const dealerScore = 15 + Math.floor(Math.random() * 7);
      
      if (playerScore === 21) {
        result.win = true;
        result.multiplier = 2.5;
        result.amount = Math.floor(betAmount * 2.5);
        result.message = `🎰 ¡Blackjack! ${playerScore} vs ${dealerScore}`;
      } else if (playerScore > dealerScore && playerScore <= 21) {
        result.win = true;
        result.multiplier = 2;
        result.amount = betAmount * 2;
        result.message = `🎰 ¡Ganaste! ${playerScore} vs ${dealerScore}`;
      } else {
        result.message = `🎰 Perdiste. ${playerScore} vs ${dealerScore}`;
      }
      break;
  }
  
  return result;
}

async function processMarketPurchase(buyerId, listing, character) {
  try {
    // Calcular costo total con comisión
    const totalCost = listing.price + Math.floor(listing.price * CONFIG.marketFee);
    const sellerEarnings = listing.price;
    
    // Transferir waifu
    await db.run('DELETE FROM claimed_characters WHERE character_id = ? AND user_id = ?', [listing.character_id, listing.seller_id]);
    await db.run('INSERT INTO claimed_characters (character_id, user_id) VALUES (?, ?)', [listing.character_id, buyerId]);
    
    // Transferir dinero
    const buyerBalance = await getUserBalance(buyerId);
    await updateUserBalance(buyerId, buyerBalance.saldo - totalCost);
    
    const sellerBalance = await getUserBalance(listing.seller_id);
    await updateUserBalance(listing.seller_id, sellerBalance.saldo + sellerEarnings);
    
    // Actualizar listado
    await db.run('UPDATE market_listings SET status = "sold", buyer_id = ?, sold_at = CURRENT_TIMESTAMP WHERE id = ?', [buyerId, listing.id]);
    
    // Registrar transacción
    await db.run(
      'INSERT INTO market_transactions (character_id, seller_id, buyer_id, price, fee, transaction_date) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [listing.character_id, listing.seller_id, buyerId, listing.price, Math.floor(listing.price * CONFIG.marketFee)]
    );
    
  } catch (error) {
    economyLogger.error('Error al procesar compra de mercado:', error);
    throw error;
  }
}

// Inicializar tablas económicas
async function initializeEconomyTables() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS market_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        seller_id TEXT,
        price INTEGER,
        status TEXT DEFAULT 'active',
        buyer_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sold_at DATETIME
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS auctions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        seller_id TEXT,
        starting_bid INTEGER,
        current_bid INTEGER,
        current_bidder_id TEXT,
        bid_count INTEGER DEFAULT 1,
        end_time DATETIME,
        status TEXT DEFAULT 'active',
        winner_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS investments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        amount INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        maturity_time DATETIME,
        status TEXT DEFAULT 'pending',
        returned_amount INTEGER
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS casino_plays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        game_type TEXT,
        bet_amount INTEGER,
        result_amount INTEGER,
        win BOOLEAN,
        play_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS market_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        seller_id TEXT,
        buyer_id TEXT,
        price INTEGER,
        fee INTEGER,
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    economyLogger.success('Tablas económicas inicializadas');
  } catch (error) {
    economyLogger.error('Error al inicializar tablas económicas:', error);
  }
}

// Exportar configuración y funciones necesarias
export const command = ['.mercado', '.vender_mercado', '.comprar_mercado', '.subasta', '.crear_subasta', '.pujar', '.inversion', '.invertir', '.casino', '.jugar_casino', '.economia'];
export const alias = ['.market', '.sell_market', '.buy_market', '.auction', '.create_auction', '.bid', '.investments', '.invest', '.casino_games', '.play_casino', '.economy_stats'];
export const description = 'Sistema económico avanzado con mercado, subastas, inversiones y casino';

// Inicializar sistema al iniciar
(async () => {
  try {
    // Asegurar que las tablas existan
    await initializeEconomyTables();
    // Cargar personajes
    await loadCharacters();
    economyLogger.success('Sistema económico waifu inicializado correctamente');
  } catch (error) {
    economyLogger.error('Error inicializando sistema económico waifu:', error);
  }
})();

export { CONFIG, economyLogger, TRANSACTION_TYPES, CASINO_GAMES };
