# Backend Dockerfile
FROM node:20.18-alpine3.20

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Crear directorio uploads
RUN mkdir -p uploads

# Exponer puerto (Render usa PORT del environment)
EXPOSE $PORT

# Variables de entorno por defecto
ENV NODE_ENV=production

# Comando para ejecutar la aplicación
CMD ["npm", "start"]
