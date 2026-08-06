#!/bin/bash

# Script de validación pre-commit para ja-manager
# Verifica que tanto el backend como el frontend compilen correctamente

set -e  # Salir si cualquier comando falla

echo "🔍 Ejecutando validaciones pre-commit..."
echo ""

# Función para limpiar artifacts de build
cleanup() {
    echo "🧹 Limpiando artifacts de build temporal..."
    if [ -d "backend/dist" ]; then
        rm -rf backend/dist
    fi
    if [ -d "frontend/dist" ]; then
        rm -rf frontend/dist
    fi
}

# Limpiar al inicio
cleanup

# Función para manejo de errores
handle_error() {
    echo ""
    echo "❌ Error: La validación pre-commit falló"
    echo "🚨 El commit ha sido cancelado para proteger la integridad del proyecto"
    echo ""
    echo "Por favor, corrige los errores y vuelve a intentar el commit."
    cleanup
    exit 1
}

# Configurar trap para limpiar en caso de error
trap handle_error ERR

echo "📦 Verificando dependencias del proyecto raíz..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  Instalando dependencias del proyecto raíz..."
    npm install
fi

echo ""
echo "🔧 Validando Backend..."
echo "--------------------------------"

# Verificar dependencias del backend
cd backend
if [ ! -d "node_modules" ]; then
    echo "⚠️  Instalando dependencias del backend..."
    npm install
fi

echo "🔍 Ejecutando linting del backend..."
npm run lint

echo "🏗️  Verificando compilación del backend..."
npm run build

if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: El backend no compiló correctamente"
    exit 1
fi

echo "✅ Backend compilado exitosamente"

# Volver al directorio raíz
cd ..

echo ""
echo "🎨 Validando Frontend..."
echo "--------------------------------"

# Verificar dependencias del frontend
cd frontend
if [ ! -d "node_modules" ]; then
    echo "⚠️  Instalando dependencias del frontend..."
    npm ci
else
    if ! node -e "require('rollup/dist/native')" >/dev/null 2>&1; then
        echo "⚠️  Dependencia opcional de Rollup faltante. Reinstalando dependencias del frontend..."
        rm -rf node_modules
        npm ci
    fi
fi

echo "🔍 Ejecutando linting del frontend..."
npm run lint

echo "🏗️  Verificando compilación del frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Error: El frontend no compiló correctamente"
    exit 1
fi

echo "✅ Frontend compilado exitosamente"

# Volver al directorio raíz
cd ..

# Limpiar artifacts de build
cleanup

echo ""
echo "🎉 ¡Todas las validaciones pasaron exitosamente!"
echo "✅ Backend: Compilación exitosa"
echo "✅ Frontend: Compilación exitosa"
echo "🚀 El commit puede proceder de forma segura"
echo ""