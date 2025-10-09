# Backend Dockerfile
FROM node:20.18-alpine3.20

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar solo dependencias de producción (los tipos ahora están en dependencies)
RUN npm ci --omit=dev

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Copiar archivos de documentación que no se compilan con TypeScript
RUN mkdir -p dist/docs && cp src/docs/oas3.yaml dist/docs/

# Crear directorio uploads
RUN mkdir -p uploads

# Exponer puerto (Render usa PORT del environment)
EXPOSE $PORT

# Variables de entorno por defecto
ENV NODE_ENV=production

# Comando para ejecutar la aplicación
CMD ["npm", "start"]
