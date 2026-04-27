/**
 * @file Plugin de Dados - Tirar dados aleatorios
 * @version 1.0.0
 * @author HINATA-BOT
 */

export const command = ['.dados', '.dado', '.tirar'];

export async function run(sock, m, { text, args }) {
    const chatId = m.key.remoteJid;
    const userId = m.key.participant || m.key.remoteJid;
    const pushName = m.pushName || 'Usuario';

    // Determinar tipo de dado
    let caras = 6; // Por defecto d6
    let cantidad = 1;
    
    if (args.length > 0) {
        const arg = args[0].toLowerCase();
        
        // Parsear formato: 2d20, 3d6, d20, etc.
        const match = arg.match(/^(\d+)?d(\d+)$/i);
        if (match) {
            cantidad = parseInt(match[1]) || 1;
            caras = parseInt(match[2]);
        } else if (!isNaN(arg)) {
            caras = parseInt(arg);
        }
    }

    // Validar límites
    if (cantidad < 1) cantidad = 1;
    if (cantidad > 10) cantidad = 10;
    if (caras < 2) caras = 2;
    if (caras > 100) caras = 100;

    // Tirar los dados
    const resultados = [];
    for (let i = 0; i < cantidad; i++) {
        resultados.push(Math.floor(Math.random() * caras) + 1);
    }

    const total = resultados.reduce((a, b) => a + b, 0);
    
    // Emoji del dado según el resultado
    const dadoEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const mostrarDados = cantidad <= 6 
        ? resultados.map(r => dadoEmojis[r - 1] || '🎲').join(' ')
        : resultados.map(r => r).join(', ');

    // Mensaje según el resultado
    let mensajeExtra = '';
    if (cantidad === 1 && caras === 6) {
        if (resultados[0] === 1) mensajeExtra = '\n\n🎯 ¡CRÍTICO! Sacaste 1...';
        else if (resultados[0] === 6) mensajeExtra = '\n\n⭐ ¡EXITO! Sacaste 6';
    } else if (cantidad > 1) {
        if (resultados.every(r => r === resultados[0])) {
            mensajeExtra = '\n\n✨ ¡Todos iguales!';
        }
    }

    await sock.sendMessage(chatId, {
        text: `🎲 *TIRADA DE DADOS* 🎲\n\n` +
              `👤 Jugador: ${pushName}\n` +
              `🎯 Tirada: ${cantidad}d${caras}\n\n` +
              `📊 *Resultados:*\n${mostrarDados}\n\n` +
              `➕ *Total:* ${total}${mensajeExtra}`
    }, { quoted: m });
}

export const help = `
Tira dados aleatorios.

📝 *Uso:*
.dados [cantidad]d[caras]

📋 *Formatos:*
• .dados → 1d6 (dado de 6 caras)
• .dados 2 → 2 dados de 6 caras
• .dados d20 → 1 dado de 20 caras
• .dados 2d20 → 2 dados de 20 caras

💡 *Ejemplos:*
• .dados → Tirar 1d6
• .dados 2d6 → Tirar 2 dados de 6
• .dados d20 → Tirar 1 dado de 20

📊 *Dados especiales:*
• 1d6 con resultado 1 = CRÍTICO
• 1d6 con resultado 6 = ÉXITO
`;