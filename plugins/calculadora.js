/**
 * @file Plugin de Calculadora - Operaciones matemáticas
 * @version 1.0.0
 * @author HINATA-BOT
 */

export const command = ['.calculadora', '.calc'];

export async function run(sock, m, { text, args }) {
    const chatId = m.key.remoteJid;
    
    if (!args || args.length < 1) {
        return await sock.sendMessage(chatId, {
            text: `🧮 *CALCULADORA* 🧮\n\n` +
                  `📝 *Uso:* .calculadora <operación>\n\n` +
                  `📋 *Operadores:*\n` +
                  `• + → Suma\n` +
                  `• - → Resta\n` +
                  `• × → Multiplicación\n` +
                  `• / → División\n` +
                  `• ^ → Potencia\n` +
                  `• % → Módulo (resto)\n\n` +
                  `💡 *Ejemplos:*\n` +
                  `• .calculadora 5 + 3\n` +
                  `• .calculadora 10 * 2\n` +
                  `• .calculadora 2 ^ 8\n` +
                  `• .calculadora 15 / 3\n` +
                  `• .calculadora 17 % 5`
        }, { quoted: m });
    }

    const operacion = args.join(' ');
    
    try {
        // Validar que solo contenga números y operadores seguros
        const expresionValida = /^[0-9+\-*/^%.\s()]+$/;
        
        if (!expresionValida.test(operacion)) {
            return await sock.sendMessage(chatId, {
                text: `❌ Expresión inválida.\n\n` +
                      `Usa solo números y operadores: + - × / ^ %\n` +
                      `Ejemplo: .calculadora 5 + 3`
            }, { quoted: m });
        }

        // Reemplazar símbolos visuales por operadores JS
        let expresion = operacion
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/²/g, '^2')
            .replace(/³/g, '^3');

        // Evaluar la expresión
        const resultado = Function('"use strict"; return (' + expresion + ')')();

        // Verificar si es un número válido
        if (isNaN(resultado) || !isFinite(resultado)) {
            return await sock.sendMessage(chatId, {
                text: `❌ Error: La operación no produce un resultado válido.`
            }, { quoted: m });
        }

        // Formatear el resultado
        let resultadoFormateado;
        if (Number.isInteger(resultado)) {
            resultadoFormateado = resultado.toLocaleString();
        } else {
            resultadoFormateado = resultado.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
            });
        }

        await sock.sendMessage(chatId, {
            text: `🧮 *RESULTADO* 🧮\n\n` +
                  `📊 *Operación:* ${operacion}\n\n` +
                  `✅ *Resultado:* ${resultadoFormateado}`
        }, { quoted: m });

    } catch (error) {
        await sock.sendMessage(chatId, {
            text: `❌ *Error en la operación*\n\n` +
                  `La expresión no es válida.\n\n` +
                  `💡 *Ejemplos correctos:*\n` +
                  `• .calculadora 5 + 3\n` +
                  `• .calculadora 10 * 2\n` +
                  `• .calculadora (5 + 3) * 2`
        }, { quoted: m });
    }
}

export const help = `
Realiza operaciones matemáticas básicas.

📝 *Uso:*
.calculadora <operación>

📋 *Operadores:*
• + → Suma
• - → Resta
• × → Multiplicación
• / → División
• ^ → Potencia
• % → Módulo

💡 *Ejemplos:*
• .calculadora 5 + 3 → 8
• .calculadora 10 * 2 → 20
• .calculadora 2 ^ 8 → 256
• .calculadora (5 + 3) * 2 → 16
`;