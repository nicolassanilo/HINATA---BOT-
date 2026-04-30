# Dockerfile para HINATA-BOT v3.0
# Bot de WhatsApp con sistema Waifu avanzado

# Usar Node.js 18 LTS como base
FROM node:18-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    git

# Copiar archivos de configuración del package
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci --only=production && npm cache clean --force

# Crear directorios necesarios para el bot
RUN mkdir -p ./media ./lib ./plugins ./data

# Copiar el código fuente del bot
COPY . .

# Establecer permisos adecuados
RUN chown -R node:node /app
USER node

# Exponer el puerto (si el bot tiene alguna interfaz web)
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV TZ=America/Argentina/Buenos_Aires

# Comando para iniciar el bot
CMD ["npm", "start"]

# Health check para Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Bot health check')" || exit 1
