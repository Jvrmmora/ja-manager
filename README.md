# JA Manager - Sistema de Gestión de Jóvenes

Una plataforma completa para la gestión de jóvenes de iglesia, desarrollada con tecnologías modernas y diseño responsive.

## 🌟 Características

- ✅ **CRUD Completo**: Crear, leer, actualizar y eliminar registros de jóvenes
- 📱 **Diseño Responsive**: Funciona perfectamente en móviles, tablets y escritorio
- 🖼️ **Gestión de Imágenes**: Subida y almacenamiento de fotos de perfil
- 🔍 **Búsqueda y Filtros**: Buscar por nombre, teléfono y filtrar por rango de edad
- 📊 **Estadísticas**: Dashboard con métricas importantes
- 🎂 **Recordatorios**: Visualización de cumpleaños del mes
- 🐳 **Dockerizado**: Fácil despliegue con Docker Compose

## 🛠️ Stack Tecnológico

### Backend

- **Node.js** con **TypeScript**
- **Express.js** para la API REST
- **MongoDB** con **Mongoose** ODM
- **Cloudinary** para almacenamiento de imágenes
- **Joi** para validación de datos
- **Helmet** y **CORS** para seguridad

### Frontend

- **React 18** con **TypeScript**
- **Vite** como bundler
- **Tailwind CSS** para estilos
- **React Hook Form** para formularios
- **Axios** para peticiones HTTP
- **React Hot Toast** para notificaciones
- **Lucide React** para iconos

### DevOps

- **Docker** y **Docker Compose**
- **Nginx** como servidor web
- **MongoDB** como base de datos

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- Docker y Docker Compose
- Cuenta en Cloudinary (gratuita)

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd ja-manager
```

### 2. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar las variables de entorno
# Especialmente configurar Cloudinary
```

### 3. Instalación con Docker (Recomendado)

```bash
# Construir y ejecutar todos los servicios
docker-compose up -d

# La aplicación estará disponible en:
# Frontend: http://localhost
# Backend API: http://localhost:5000
# MongoDB: localhost:27017
```

### 4. Instalación Manual (Desarrollo)

```bash
# Instalar dependencias del monorepo
npm install

# Instalar dependencias del backend
cd backend && npm install

# Instalar dependencias del frontend
cd ../frontend && npm install

# Volver al directorio raíz
cd ..

# Ejecutar en modo desarrollo
npm run dev
```

## 📝 Uso de la Aplicación

### Gestión de Jóvenes

1. **Agregar Joven**: Clic en "Agregar Joven" y llenar el formulario
2. **Editar**: Clic en cualquier tarjeta de joven para editar
3. **Buscar**: Usar la barra de búsqueda para encontrar por nombre o teléfono
4. **Filtrar**: Seleccionar rango de edad y opciones de ordenamiento

### Datos Requeridos

- **Nombre Completo**: Nombre y apellidos del joven
- **Rango de Edad**: Seleccionar entre 13-15, 16-18, 19-21, 22-25, 26-30, 30+
- **Teléfono**: Número de contacto
- **Fecha de Cumpleaños**: Para recordatorios
- **Foto de Perfil**: Opcional, soporta JPG, PNG, WebP (máx. 5MB)

## 🎨 Paleta de Colores

Basada en la imagen de referencia azul:

- **Primario**: #3B82F6 (Blue 500)
- **Secundario**: #1E40AF (Blue 700)
- **Accent**: #60A5FA (Blue 400)
- **Success**: #10B981 (Emerald 500)
- **Warning**: #F59E0B (Amber 500)
- **Error**: #EF4444 (Red 500)

## 📁 Estructura del Proyecto

```
ja-manager/
├── backend/                 # API REST con Express
│   ├── src/
│   │   ├── controllers/    # Controladores de la API
│   │   ├── models/         # Modelos de MongoDB
│   │   ├── routes/         # Rutas de la API
│   │   ├── middleware/     # Middleware personalizado
│   │   ├── config/         # Configuraciones
│   │   ├── utils/          # Utilidades y validaciones
│   │   └── types/          # Tipos de TypeScript
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas de la aplicación
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Servicios API
│   │   ├── types/          # Tipos de TypeScript
│   │   └── utils/          # Utilidades
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Configuración de Docker Compose
├── mongo-init.js          # Script de inicialización de MongoDB
└── README.md
```

## 🌐 API Endpoints

### Jóvenes

- `GET /api/young` - Obtener todos los jóvenes (con paginación y filtros)
- `GET /api/young/:id` - Obtener un joven por ID
- `POST /api/young` - Crear un nuevo joven
- `PUT /api/young/:id` - Actualizar un joven
- `DELETE /api/young/:id` - Eliminar un joven
- `GET /api/young/stats` - Obtener estadísticas

### Parámetros de Consulta

- `page` - Número de página (default: 1)
- `limit` - Elementos por página (default: 10, max: 100)
- `search` - Búsqueda por nombre o teléfono
- `ageRange` - Filtrar por rango de edad
- `sortBy` - Ordenar por: fullName, birthday, createdAt
- `sortOrder` - Orden: asc, desc

## 🚀 Despliegue en Producción

### Opción 1: Servicios de Contenedores Gratuitos

- **Railway**: Soporta Docker Compose
- **Render**: Servicios web gratuitos
- **Heroku**: Con add-ons para MongoDB

### Opción 2: VPS con Docker

```bash
# En el servidor
git clone <tu-repositorio>
cd ja-manager

# Configurar variables de entorno
cp .env.example .env
nano .env

# Ejecutar con Docker Compose
docker-compose up -d
```

### Variables de Entorno de Producción

El backend **valida estas variables al arrancar** (`backend/src/config/env.ts`) y
aborta con un mensaje claro si falta alguna o si `JWT_SECRET` es débil.

```env
NODE_ENV=production
MONGODB_URI=mongodb://usuario:password@host:puerto/database
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
# Mínimo 32 caracteres aleatorios:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_SECRET=un_secreto_muy_seguro_y_largo
TOKEN_EXP=7d
CORS_ORIGIN=https://tu-dominio.com
```

Lista completa y opcionales en `backend/.env.example`.

> ⚠️ **Seguridad**: una versión anterior del seeder incluía credenciales reales
> en el código. Si desplegaste antes de este cambio, **rota** ese usuario/contraseña.
> El usuario Super Admin semilla ahora solo se crea con
> `SEED_ADMIN_ENABLED=true` + `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD`.

### Tests

```bash
cd backend && npm test        # Jest (jwt, fechas, rate-limit, manejo de errores)
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## � Despliegue en Producción

### Opción 1: Render (Recomendada)

Este proyecto está configurado para desplegarse fácilmente en Render usando Docker:

#### Preparación:

1. **Subir código a GitHub**:

   ```bash
   git add .
   git commit -m "Configuración para despliegue en Render"
   git push origin main
   ```

2. **En Render Dashboard**:
   - Conecta tu repositorio de GitHub
   - Render detectará automáticamente el `render.yaml`
   - Los servicios se crearán automáticamente

#### Variables de entorno en Render:

Configura estas variables en el panel de Render:

**Backend:**

```
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_secret
JWT_SECRET=tu_jwt_secret_super_seguro_cambiar_en_produccion
```

**Frontend:**

```
VITE_API_URL=https://ja-manager-backend.onrender.com
```

#### URLs de servicios:

- **Backend**: `https://ja-manager-backend.onrender.com`
- **Frontend**: `https://ja-manager-frontend.onrender.com`
- **Database**: MongoDB proporcionado por Render

### Opción 2: Vercel + Render (Híbrida)

#### Backend en Render:

- Sigue los pasos anteriores solo para el backend

#### Frontend en Vercel:

1. **Conecta el repositorio** en Vercel
2. **Configuración**:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Variables de entorno en Vercel**:
   ```
   VITE_API_URL=https://tu-backend.onrender.com
   ```

### Estructura de archivos para despliegue:

```
├── render.yaml                 # Configuración de Render
├── backend/
│   ├── Dockerfile             # Docker para backend
│   └── .env.example          # Variables de ejemplo
├── frontend/
│   ├── Dockerfile            # Docker para frontend
│   ├── nginx.conf           # Configuración Nginx
│   ├── .env.development     # Variables para desarrollo
│   └── .env.production      # Variables para producción
```

### Verificación del despliegue:

1. **Backend Health Check**: `GET /api/health`
2. **Frontend**: Acceso a la aplicación web
3. **Base de datos**: Conexión automática desde backend

### Solución de problemas comunes:

- **CORS Error**: Verificar `CORS_ORIGIN` en variables del backend
- **API 404**: Verificar `VITE_API_URL` en variables del frontend
- **Build Error**: Verificar logs en Render/Vercel dashboard

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- **Cloudinary** por el almacenamiento gratuito de imágenes
- **Render** por el hosting gratuito con Docker
- **MongoDB** por la base de datos
- Comunidad de desarrolladores por las librerías open source

---

Desarrollado con ❤️ para la gestión de jóvenes en iglesias
