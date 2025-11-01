# Scripts para Generar Imagen Open Graph

Para que WhatsApp y otras redes sociales muestren el logo de tu sitio al compartir el enlace, necesitas una imagen Open Graph.

## 📋 Requisitos

La imagen debe ser:

- **Tamaño:** 1200x630 píxeles (ratio 1.91:1)
- **Formato:** JPG o PNG
- **Tamaño del archivo:** Menos de 1MB (recomendado)
- **Ubicación:** `frontend/public/og-image.jpg`

## 🚀 Opción 1: Script Bash (ImageMagick)

Si tienes ImageMagick instalado:

```bash
cd frontend
./scripts/generate-og-image.sh
```

### Instalar ImageMagick

**macOS:**

```bash
brew install imagemagick
```

**Ubuntu/Debian:**

```bash
sudo apt-get install imagemagick
```

## 🚀 Opción 2: Script Node.js (Sharp)

Si prefieres usar Node.js:

1. Instalar Sharp:

```bash
cd frontend
npm install --save-dev sharp
```

2. Ejecutar el script:

```bash
node scripts/generate-og-image.js
```

## ✏️ Opción 3: Crear Manualmente

Si prefieres crear la imagen manualmente:

1. Abre tu editor de imágenes favorito (Photoshop, GIMP, Canva, Figma, etc.)
2. Crea un canvas de **1200x630 píxeles**
3. Usa el color de fondo: **#3B82F6** (azul de la marca)
4. Coloca el logo de `frontend/src/assets/logos/logo.png`
5. Opcional: Agrega texto "Jóvenes Modelia - Plataforma Digital"
6. Guarda como **JPG** con calidad alta (80-90%)
7. Coloca el archivo en: `frontend/public/og-image.jpg`

## ✅ Verificar

Después de generar la imagen:

1. **Localmente:** Abre `http://localhost:5173/og-image.jpg` en tu navegador
2. **Verificar en WhatsApp:**
   - Publica los cambios
   - Ve a: https://developers.facebook.com/tools/debug/
   - Ingresa tu URL: `https://jovenesmodelia.com`
   - Haz clic en "Scrape Again" para limpiar la caché
3. **Probar compartiendo:** Comparte el enlace en WhatsApp y verifica que se vea el logo

## 📝 Notas Importantes

- WhatsApp cachea las imágenes de Open Graph
- Si cambias la imagen, usa el Facebook Debugger para limpiar la caché
- La imagen debe ser accesible públicamente (no protegida por autenticación)
- Usa URLs absolutas (https://jovenesmodelia.com/og-image.jpg) en los meta tags
