//Código creado para HINATA-BOT

import fs from 'fs';
import path from 'path';

let handler = async (m, { conn, usedPrefix }) => {
    let who;

    if (m.mentionedJid.length > 0) {
        who = m.mentionedJid[0];
    } else if (m.quoted) {
        who = m.quoted.sender; 
    } else {
        who = m.sender; 
    }

    let name = conn.getName(who); 
    let name2 = conn.getName(m.sender); 
    m.react('🤔');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *está pensando en* \`${name || who}\`.`; 
    } else if (m.quoted) {
        str = `\`${name2}\` *está pensando en* \`${name || who}\`.`; 
    } else {
        str = `\`${name2}\` *está pensando profundamente*`.trim();
    }
    
    let pp = 'https://files.catbox.moe/5r4k2p.mp4'; 
    let pp2 = 'https://files.catbox.moe/2m7n9x.mp4'; 
    let pp3 = 'https://files.catbox.moe/8j5h4g.mp4';
    let pp4 = 'https://files.catbox.moe/3w6v1t.mp4';
    let pp5 = 'https://files.catbox.moe/7k8q3r.mp4';
    let pp6 = 'https://files.catbox.moe/9n2m4x.mp4';
    
    const videos = [pp, pp2, pp3, pp4, pp5, pp6];
    const video = videos[Math.floor(Math.random() * videos.length)];
 
    let mentions = m.mentionedJid.length > 0 ? [who] : [];
    conn.sendMessage(m.chat, { video: { url: video }, gifPlayback: true, caption: str, mentions }, { quoted: m });
}

handler.help = ['think/pensar [@tag]'];
handler.tags = ['anime'];
handler.command = ['think','pensar'];
handler.group = true;

export default handler;
