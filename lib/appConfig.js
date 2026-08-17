import fs from 'fs/promises';

const ENV_MAP = {
    PEXELS_API_KEY: 'pexelsApiKey',
    GEMINI_API_KEY: 'geminiApiKey',
    OPENAI_API_KEY: 'openaiApiKey',
    REPLICATE_API_KEY: 'replicateApiKey',
    HUGGINGFACE_API_KEY: 'huggingFaceApiKey',
    TENOR_API_KEY: 'tenorApiKey',
    GOOGLE_SEARCH_API_KEY: 'googleSearchApiKey',
    GOOGLE_CSE_ID: 'googleCseId',
    SPIDERX_API_KEY: 'spiderXApiKey',
    BOT_OWNER_NUMBER: 'ownerJid',
    BOT_PHONE_NUMBER: 'phoneNumber',
    WEB_PORT: 'port',
};

export async function loadConfig() {
    const raw = await fs.readFile('config/config.json', 'utf8');
    const fileConfig = JSON.parse(raw);
    const merged = { ...fileConfig };

    for (const [envKey, configKey] of Object.entries(ENV_MAP)) {
        if (process.env[envKey]) {
            merged[configKey] = process.env[envKey];
        }
    }

    if (process.env.PORT) {
        merged.port = Number(process.env.PORT);
    }

    merged.version = merged.version || '2.0.0';
    return merged;
}
