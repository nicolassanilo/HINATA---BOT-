import Database from './database.js';

const DEFAULT_DATA = {
    users: {},
    chats: {},
    settings: {},
    msgs: {},
    sticker: {},
};

const DEFAULT_CHAT = {
    welcome: false,
    goodbye: false,
    antiLink: false,
    antiLink2: false,
    antiSpam: false,
    antiToxic: false,
    antiDelete: false,
    antiBot: false,
    antiFake: false,
    antifake: false,
    detect: false,
    autosticker: false,
    autolevelup: false,
    reaction: false,
    simi: false,
    isBanned: false,
};

const DEFAULT_USER = {
    exp: 0,
    level: 1,
    warn: 0,
    banned: false,
    bloqueado: false,
    warnPrivado: 0,
    tiempoBloqueo: 0,
    block: false,
};

export function initGlobalDb(filepath = './database.json') {
    if (global.db?.data) return global.db;

    global.db = new Database(filepath);
    const current = global.db.data || {};

    global.db.data = {
        ...DEFAULT_DATA,
        ...current,
        users: current.users || {},
        chats: current.chats || {},
        settings: current.settings || {},
        msgs: current.msgs || {},
        sticker: current.sticker || {},
    };

    return global.db;
}

export function ensureUser(jid) {
    if (!global.db.data.users[jid]) {
        global.db.data.users[jid] = { ...DEFAULT_USER };
    }
    return global.db.data.users[jid];
}

export function ensureChat(jid) {
    if (!global.db.data.chats[jid]) {
        global.db.data.chats[jid] = { ...DEFAULT_CHAT };
    }
    return global.db.data.chats[jid];
}

export function ensureBotSettings(botJid) {
    if (!global.db.data.settings[botJid]) {
        global.db.data.settings[botJid] = {
            antiPrivate: false,
            restrict: false,
            autoread: false,
        };
    }
    return global.db.data.settings[botJid];
}
