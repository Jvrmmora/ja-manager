<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Copilot Instructions for Youth Management Platform

Este es un proyecto de gestión de jóvenes para iglesia con las siguientes características:

## Stack Tecnológico
- **Backend**: TypeScript + Express + Node.js + MongoDB + Mongoose
- **Frontend**: React.js + TypeScript + Vite + Tailwind CSS
- **Base de datos**: MongoDB con Mongoose ODM
- **Almacenamiento de imágenes**: Cloudinary (gratuito)
- **Containerización**: Docker y Docker Compose
- **Despliegue**: Preparado para clusters gratuitos

## Estructura del Proyecto
- `backend/`: API REST con Express y TypeScript
- `frontend/`: Aplicación React con Vite y TypeScript
- Monorepo con scripts para desarrollo y producción

## Esquema de Datos de Jóvenes
```typescript
interface Young {
  id: string;
  fullName: string;
  ageRange: string; // "13-15", "16-18", "19-21", "22-25", etc.
  phone: string;
  birthday: Date;
  profileImage?: string; // URL de Cloudinary
  createdAt: Date;
  updatedAt: Date;
}
```

## Paleta de Colores (Basada en la imagen de referencia)
- **Primario**: #3B82F6 (Blue 500)
- **Secundario**: #1E40AF (Blue 700)
- **Accent**: #60A5FA (Blue 400)
- **Success**: #10B981 (Emerald 500)
- **Warning**: #F59E0B (Amber 500)
- **Error**: #EF4444 (Red 500)
- **Background**: #F8FAFC (Slate 50)
- **Card**: #FFFFFF (White)

## Funcionalidades Principales
1. **CRUD Completo**: Crear, leer, actualizar y eliminar jóvenes
2. **Subida de imágenes**: Integración con Cloudinary
3. **Diseño responsive**: Mobile-first con Tailwind CSS
4. **Filtros y búsqueda**: Por nombre, edad, etc.
5. **Interfaz visual**: Cards con imágenes de perfil
6. **Validación**: Tanto frontend como backend

## Directrices de Código
- Usar TypeScript estricto en todo el proyecto
- Implementar manejo de errores robusto
- Seguir patrones REST para la API
- Usar hooks de React y context para state management
- Implementar lazy loading para las imágenes
- Usar componentes reutilizables
- Seguir las mejores prácticas de seguridad
