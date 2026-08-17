import { ensureChat, ensureUser, ensureBotSettings } from './globalDb.js';

function extractText(msg) {
    return (
        msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || msg.message?.imageMessage?.caption
        || msg.message?.videoMessage?.caption
        || ''
    );
}

function extractMentions(msg) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    return Array.isArray(mentioned) ? mentioned : [];
}

function extractQuoted(msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted?.stanzaId) return null;
    return {
        sender: quoted.participant || msg.key.remoteJid,
        stanzaId: quoted.stanzaId,
    };
}

function normalizeNumber(value = '') {
    return String(value).replace(/[^0-9+]/g, '').replace(/^00/, '+');
}

export function isOwner(jid, config = {}) {
    const ownerId =
        config.ownerJid
        || config.propietario
        || config.phoneNumber
        || '';

    if (!ownerId || !jid) return false;

    const normalizedOwner = normalizeNumber(ownerId);
    const normalizedUser = normalizeNumber(jid);

    if (normalizedOwner.includes(normalizedUser) || normalizedUser.includes(normalizedOwner.replace('@s.whatsapp.net', ''))) {
        return true;
    }

    if (ownerId.includes('@')) return jid === ownerId;
    return jid === ownerId || jid.includes(ownerId) || jid.startsWith(ownerId);
}

export async function getGroupAdmins(sock, chatId) {
    if (!chatId?.endsWith('@g.us')) return { participants: [], isAdmin: false, isBotAdmin: false };
    try {
        const meta = await sock.groupMetadata(chatId);
        const participants = meta.participants || [];
        return {
            participants,
            groupMetadata: meta,
            isAdmin: (sender) => participants.some((p) => p.id === sender && p.admin),
            isBotAdmin: participants.some((p) => p.id === sock.user?.id && p.admin),
        };
    } catch {
        return { participants: [], isAdmin: () => false, isBotAdmin: false };
    }
}

export function createNagiConn(sock) {
    const names = new Map();

    const conn = Object.assign(sock, {
        user: sock.user || {},
        async getName(jid) {
            if (!jid) return 'Usuario';
            if (names.has(jid)) return names.get(jid);
            try {
                const contact = await sock.onWhatsApp(jid);
                const name = contact?.[0]?.name || jid.split('@')[0];
                names.set(jid, name);
                return name;
            } catch {
                const fallback = jid.split('@')[0];
                names.set(jid, fallback);
                return fallback;
            }
        },
    });

    return conn;
}

export function createNagiMessage(rawMsg, textOverride = null) {
    const chat = rawMsg.key.remoteJid;
    const sender = rawMsg.key.participant || rawMsg.key.remoteJid;
    const text = textOverride ?? extractText(rawMsg);
    const mentionedJid = extractMentions(rawMsg);
    const quoted = extractQuoted(rawMsg);

    const m = {
        key: rawMsg.key,
        message: rawMsg.message,
        chat,
        sender,
        from: sender,
        isGroup: chat.endsWith('@g.us'),
        isBaileys: sender.endsWith('@s.whatsapp.net') || sender.includes('@lid'),
        fromMe: rawMsg.key.fromMe,
        text,
        body: text,
        mentionedJid,
        quoted,
        pushName: rawMsg.pushName,
        messageStubType: rawMsg.messageStubType,
        messageStubParameters: rawMsg.messageStubParameters,
        async reply(content, options = {}) {
            const payload = typeof content === 'string' ? { text: content } : content;
            return sockRef.sendMessage(chat, payload, { quoted: rawMsg, ...options });
        },
        async react(emoji) {
            return sockRef.sendMessage(chat, {
                react: { text: emoji, key: rawMsg.key },
            });
        },
    };

    let sockRef = null;
    m.bindSock = (sock) => {
        sockRef = sock;
    };

    return m;
}

export async function buildNagiContext(rawMsg, sock, config, extras = {}) {
    const conn = createNagiConn(sock);
    const m = createNagiMessage(rawMsg, extras.text);
    m.bindSock(sock);

    const chatId = m.chat;
    const sender = m.sender;
    const group = await getGroupAdmins(sock, chatId);

    ensureUser(sender);
    if (chatId.endsWith('@g.us')) ensureChat(chatId);
    if (conn.user?.id) ensureBotSettings(conn.user.id);

    const owner = isOwner(sender, config);
    const admin = group.isAdmin(sender);

    return {
        conn,
        usedPrefix: '.',
        command: (extras.command || '').replace(/^\./, ''),
        args: extras.args || [],
        text: extras.text || m.text,
        isOwner: owner,
        isROwner: owner,
        isAdmin: admin,
        isBotAdmin: group.isBotAdmin,
        participants: group.participants,
        groupMetadata: group.groupMetadata,
        config,
        plugins: extras.plugins,
    };
}

export async function runMiddleware(middleware, sock, rawMsg, config, extras = {}) {
    const ctx = await buildNagiContext(rawMsg, sock, config, extras);

    if (middleware.type === 'native') {
        const result = await middleware.before(sock, rawMsg);
        if (result === false) return false;
        return true;
    }

    const m = ctx.conn ? createNagiMessage(rawMsg, extras.text) : ctx;
    m.bindSock(sock);
    const nagiCtx = await buildNagiContext(rawMsg, sock, config, extras);
    const result = await middleware.before(m, nagiCtx);
    if (result === false) return false;
    return true;
}

export async function runNagiPlugin(plugin, sock, rawMsg, config, extras = {}) {
    const m = createNagiMessage(rawMsg, extras.text);
    m.bindSock(sock);
    const ctx = await buildNagiContext(rawMsg, sock, config, extras);
    await plugin.run(m, ctx);
}
