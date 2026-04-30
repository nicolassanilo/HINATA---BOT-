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
    m.react('😊');

    let str;
    if (m.mentionedJid.length > 0) {
        str = `\`${name2}\` *sonrió a* \`${name || who}\`.`; 
    } else if (m.quoted) {
        str = `\`${name2}\` *sonrió a* \`${name || who}\`.`; 
    } else {
        str = `\`${name2}\` *sonrió felizmente*`.trim();
    }
    
    let pp = 'https://files.catbox.moe/9r4k2p.mp4'; 
    let pp2 = 'https://files.catbox.moe/6m7n9x.mp4'; 
    let pp3 = 'https://files.catbox.moe/4j5h4g.mp4';
    let pp4 = 'https://files.catbox.moe/8w6v1t.mp4';
    let pp5 = 'https://files.catbox.moe/3k8q3r.mp4';
    let pp6 = 'https://files.catbox.moe/7n2m4x.mp4';
    
    const videos = [pp, pp2, pp3, pp4, pp5, pp6];
    const video = videos[Math.floor(Math.random() * videos.length)];
 
    let mentions = m.mentionedJid.length > 0 ? [who] : [];
    conn.sendMessage(m.chat, { video: { url: video }, gifPlayback: true, caption: str, mentions }, { quoted: m });
}

handler.help = ['smile/sonreir [@tag]'];
handler.tags = ['anime'];
handler.command = ['smile','sonreir'];
handler.group = true;

export default handler;
