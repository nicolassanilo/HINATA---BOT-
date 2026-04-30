# 🐳 Docker para HINATA-BOT v3.0

Guía completa para desplegar HINATA-BOT usando Docker y Docker Compose.

## 📋 Requisitos Previos

- Docker Desktop instalado
- Docker Compose (incluido en Docker Desktop)
- Al menos 2GB de RAM disponible
- Espacio en disco: 1GB mínimo

## 🚀 Inicio Rápido

### 1. Clonar el Repositorio
```bash
git clone https://github.com/nicolassanilo/HINATA---BOT-.git
cd HINATA---BOT-
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` con tus configuraciones:
```bash
cp .env.example .env
```

Edita el archivo `.env`:
```env
# Configuración del Bot
BOT_OWNER_NUMBER=549XXXXXXXXXX@c.us
BOT_PREFIX=.
SESSION_NAME=HINATA-BOT

# API Keys (opcional pero recomendado)
PEXELS_API_KEY=tu_api_key_de_pexels
GEMINI_API_KEY=tu_gemini_api_key
OPENAI_API_KEY=tu_openai_api_key

# Configuración de Base de Datos (si se usa)
DB_HOST=mongodb
DB_PORT=27017
DB_NAME=hinata_bot
DB_USER=admin
DB_PASS=password123
```

### 3. Construir y Ejecutar
```bash
# Usando Docker Compose (recomendado)
docker-compose up -d

# O solo con Docker
docker build -t hinata-bot .
docker run -d --name hinata-bot-v3 hinata-bot
```

### 4. Verificar Estado
```bash
# Ver logs del contenedor
docker-compose logs -f hinata-bot

# O con Docker
docker logs -f hinata-bot-v3

# Verificar健康状态
docker-compose ps
```

## 🔧 Configuración Avanzada

### Personalizar Dockerfile
Si necesitas modificar la configuración:

```dockerfile
# Cambiar versión de Node.js
FROM node:20-alpine  # o node:16-alpine

# Agregar dependencias adicionales
RUN apk add --no-cache \
    chromium \
    ffmpeg \
    imagemagick
```

### Configurar Volúmenes Persistentes
En `docker-compose.yml`:

```yaml
volumes:
  # Persistencia de datos del bot
  - ./data:/app/data
  - ./media:/app/media
  - ./logs:/app/logs
  
  # Persistencia de base de datos
  - mongodb_data:/data/db
```

### Variables de Entorno Completas
```yaml
environment:
  - NODE_ENV=production
  - TZ=America/Argentina/Buenos_Aires
  - DEBUG=hinata-bot:*
  - MAX_MEMORY=2048
  - WORKERS=4
```

## 📊 Monitoreo y Logs

### Ver Logs en Tiempo Real
```bash
# Logs del bot
docker-compose logs -f hinata-bot

# Logs con timestamps
docker-compose logs -f -t hinata-bot

# Logs de los últimos 100 eventos
docker-compose logs --tail=100 hinata-bot
```

### Monitoreo de Recursos
```bash
# Estadísticas del contenedor
docker stats hinata-bot-v3

# Inspeccionar contenedor
docker inspect hinata-bot-v3

# Ver uso de disco
docker system df
```

## 🔄 Actualizaciones y Mantenimiento

### Actualizar el Bot
```bash
# Detener contenedor
docker-compose down

# Pull de cambios
git pull origin main

# Reconstruir imagen
docker-compose build --no-cache

# Iniciar nuevamente
docker-compose up -d
```

### Limpieza de Docker
```bash
# Limpiar imágenes no usadas
docker image prune -f

# Limpiar volúmenes no usados
docker volume prune -f

# Limpiar sistema completo
docker system prune -f
```

## 🛠️ Solución de Problemas

### Problemas Comunes

#### 1. Error de Permiso
```bash
# Error: permission denied
# Solución: Asegurar que el usuario tiene permisos en los volúmenes
sudo chown -R $USER:$USER ./data ./media ./logs
```

#### 2. Error de Memoria
```bash
# Error: JavaScript heap out of memory
# Solución: Aumentar memoria en docker-compose.yml
environment:
  - NODE_OPTIONS=--max-old-space-size=4096
```

#### 3. Error de Red
```bash
# Error: connect ECONNREFUSED
# Solución: Verificar configuración de red
docker network ls
docker network inspect bot-network
```

#### 4. Error de Dependencias
```bash
# Error: Module not found
# Solución: Reconstruir sin caché
docker-compose build --no-cache --pull
```

### Modo Debug
```bash
# Ejecutar en modo debug
docker-compose run --rm hinata-bot npm run debug

# O con variables de entorno
docker-compose run --rm -e DEBUG=* hinata-bot npm start
```

## 📱 Escaneo de QR Code

El bot generará un QR code para conectar con WhatsApp:

### Método 1: Ver Logs
```bash
docker-compose logs -f hinata-bot
```
Busca la línea que contiene el QR y escanéalo con WhatsApp.

### Método 2: Guardar QR como Archivo
```bash
# Extraer QR de los logs y guardar
docker-compose logs hinata-bot | grep -o "qr.*" > qr.txt
```

### Método 3: Usar interfaz web (si está configurada)
Accede a `http://localhost:3000` para ver el QR.

## 🔒 Seguridad

### Buenas Prácticas
1. **No exponer puertos innecesarios**
2. **Usar variables de entorno para datos sensibles**
3. **Mantener Docker actualizado**
4. **Usar imágenes base oficiales**
5. **Limitar recursos del contenedor**

### Configuración de Seguridad
```yaml
# Limitar recursos
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 1G

# Política de reinicio
restart: unless-stopped

# Usuario no root
user: "1000:1000"
```

## 📈 Rendimiento y Escalado

### Escalado Horizontal
```bash
# Escalar a múltiples instancias
docker-compose up -d --scale hinata-bot=3
```

### Balanceo de Carga
```yaml
# Configurar balanceo (ejemplo con nginx)
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf
```

## 🔄 Backup y Restauración

### Backup de Datos
```bash
# Backup de volúmenes
docker run --rm -v hinata_bot_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data

# Backup de base de datos
docker exec hinata-bot-db mongodump --out /backup
```

### Restauración
```bash
# Restaurar volúmenes
docker run --rm -v hinata_bot_data:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /

# Restaurar base de datos
docker exec hinata-bot-db mongorestore /backup
```

## 📞 Soporte

Si encuentras problemas:

1. **Revisa los logs**: `docker-compose logs -f`
2. **Verifica la configuración**: `docker-compose config`
3. **Prueba en modo interactivo**: `docker-compose run --rm hinata-bot bash`
4. **Consulta la documentación**: README.md del proyecto

---

**Nota**: Esta configuración está optimizada para HINATA-BOT v3.0 con sistema Waifu avanzado. Ajusta según tus necesidades específicas.
