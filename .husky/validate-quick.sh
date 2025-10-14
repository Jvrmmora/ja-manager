#!/bin/bash

# Script de validación rápida para desarrollo
# Verifica lint sin hacer build completo

set -e

echo "🔍 Ejecutando validación rápida..."
echo ""

# Función para manejo de errores
handle_error() {
    echo ""
    echo "❌ Error: La validación rápida falló"
    echo ""
    exit 1
}

trap handle_error ERR

echo "🔧 Validando lint del Backend..."
cd backend
if [ -f "package.json" ] && [ -d "node_modules" ]; then
    npm run lint
    echo "✅ Backend lint OK"
else
    echo "⚠️  Saltando backend - dependencias no instaladas"
fi

cd ..

echo ""
echo "🎨 Validando lint del Frontend..."
cd frontend
if [ -f "package.json" ] && [ -d "node_modules" ]; then
    npm run lint
    echo "✅ Frontend lint OK"
else
    echo "⚠️  Saltando frontend - dependencias no instaladas"
fi

cd ..

echo ""
echo "🎉 ¡Validación rápida completada!"
echo ""