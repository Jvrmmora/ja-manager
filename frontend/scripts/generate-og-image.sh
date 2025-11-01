#!/bin/bash

# Script para generar imagen Open Graph para WhatsApp y redes sociales
# Requiere: ImageMagick instalado (brew install imagemagick en macOS)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOGO_PATH="$PROJECT_ROOT/frontend/src/assets/logos/logo.png"
OUTPUT_PATH="$PROJECT_ROOT/frontend/public/og-image.jpg"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🎨 Generando imagen Open Graph para WhatsApp${NC}"
echo ""

# Verificar si ImageMagick está instalado
if ! command -v convert &> /dev/null; then
    echo -e "${RED}❌ ImageMagick no está instalado${NC}"
    echo ""
    echo "Para instalarlo en macOS:"
    echo "  brew install imagemagick"
    echo ""
    echo "Para instalarlo en Ubuntu/Debian:"
    echo "  sudo apt-get install imagemagick"
    echo ""
    echo "Alternativamente, puedes crear la imagen manualmente:"
    echo "  1. Abre tu editor de imágenes favorito (Photoshop, GIMP, Canva, etc.)"
    echo "  2. Crea un canvas de 1200x630 píxeles"
    echo "  3. Coloca el logo y texto: 'Jóvenes Modelia - Plataforma Digital'"
    echo "  4. Usa el color de marca: #3B82F6"
    echo "  5. Guarda como 'og-image.jpg' en frontend/public/"
    echo ""
    exit 1
fi

# Verificar que el logo existe
if [ ! -f "$LOGO_PATH" ]; then
    echo -e "${RED}❌ Logo no encontrado en: $LOGO_PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}📐 Tamaño recomendado para Open Graph: 1200x630 píxeles${NC}"
echo -e "${YELLOW}📐 Tamaño del logo: $(identify -format '%wx%h' "$LOGO_PATH")${NC}"
echo ""

# Crear la imagen Open Graph
echo "Generando imagen..."

# Colores de marca
BG_COLOR="#3B82F6"  # Azul de la marca
TEXT_COLOR="#FFFFFF"  # Blanco para el texto

# Crear imagen base con fondo azul
convert -size 1200x630 xc:"$BG_COLOR" "$OUTPUT_PATH"

# Redimensionar logo para que quepa bien (ajustar según necesidad)
# Calculamos el tamaño: 30% del ancho o máximo 600px de altura
LOGO_WIDTH=360
LOGO_HEIGHT=360

# Superponer el logo centrado (ajustado un poco arriba)
convert "$OUTPUT_PATH" \
    \( "$LOGO_PATH" -resize "${LOGO_WIDTH}x${LOGO_HEIGHT}>" -gravity center \) \
    -geometry +0-80 \
    -gravity north \
    -composite \
    "$OUTPUT_PATH"

# Agregar texto (opcional - comentado por ahora para evitar problemas con fuentes)
# Si tienes fuentes instaladas, puedes descomentar:
# convert "$OUTPUT_PATH" \
#     -font "Helvetica-Bold" \
#     -pointsize 48 \
#     -fill "$TEXT_COLOR" \
#     -gravity south \
#     -annotate +0+50 "Jóvenes Modelia" \
#     -pointsize 28 \
#     -annotate +0+120 "Plataforma Digital" \
#     "$OUTPUT_PATH"

echo ""
echo -e "${GREEN}✅ Imagen Open Graph generada exitosamente!${NC}"
echo -e "${GREEN}📁 Ubicación: $OUTPUT_PATH${NC}"
echo ""
echo "Ahora puedes:"
echo "  1. Verificar que la imagen se ve bien"
echo "  2. Si quieres agregar texto, edita la imagen manualmente"
echo "  3. Publica los cambios y limpia la caché de WhatsApp:"
echo "     https://developers.facebook.com/tools/debug/"
echo ""

