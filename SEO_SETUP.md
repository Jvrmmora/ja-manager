# 📈 Guía de SEO para Jóvenes Modelia

## ✅ Archivos SEO Creados

1. ✅ **index.html** - Meta tags completos (Open Graph, Twitter Cards, JSON-LD)
2. ✅ **robots.txt** - Instrucciones para buscadores
3. ✅ **sitemap.xml** - Mapa del sitio
4. ✅ **manifest.json** - PWA manifest

---

## 🚀 Pasos para Indexar en Google

### Paso 1: Verificar en Google Search Console

1. Ve a [Google Search Console](https://search.google.com/search-console)
2. Agrega tu propiedad:
   - Ingresa: `https://jovenesmodelia.com`
   - O `https://www.jovenesmodelia.com` (el que prefieras)
3. Verifica propiedad mediante uno de estos métodos:

#### Opción A: HTML Tag (Más fácil)

- Google te dará un meta tag
- Cópialo y pégalo en `<head>` de `index.html`

#### Opción B: Archivo HTML

- Descarga el archivo que Google te da
- Súbelo a la raíz de tu sitio: `/public/google-xxxxx.html`

#### Opción C: DNS (Recomendado si tienes acceso)

- Agrega el registro TXT que Google te da en Namecheap

### Paso 2: Enviar Sitemap

1. En Google Search Console, ve a **Sitemaps**
2. Ingresa: `https://jovenesmodelia.com/sitemap.xml`
3. Haz clic en **Enviar**

### Paso 3: Verificar URLs

1. Ve a **Inspección de URL**
2. Ingresa tu URL principal: `https://jovenesmodelia.com`
3. Haz clic en **Solicitar indexación**
4. Repite para `https://www.jovenesmodelia.com`

---

## 📊 Verificaciones SEO

### Verificar Meta Tags

Abre tu sitio y en la consola del navegador:

```javascript
// Verificar Open Graph
document.querySelector('meta[property="og:title"]')?.content;

// Verificar JSON-LD
JSON.parse(
  document.querySelector('script[type="application/ld+json"]').textContent
);
```

### Verificar Robots.txt

Visita: `https://jovenesmodelia.com/robots.txt`

Debe mostrar:

```
User-agent: *
Allow: /
Sitemap: https://jovenesmodelia.com/sitemap.xml
```

### Verificar Sitemap

Visita: `https://jovenesmodelia.com/sitemap.xml`

Debe mostrar el XML con las URLs de tu sitio.

---

## 🔍 Herramientas de Verificación

### 1. Google Rich Results Test

- URL: https://search.google.com/test/rich-results
- Ingresa: `https://jovenesmodelia.com`
- Verifica que detecte el JSON-LD

### 2. Facebook Sharing Debugger

- URL: https://developers.facebook.com/tools/debug/
- Ingresa: `https://jovenesmodelia.com`
- Verifica que muestre correctamente el Open Graph

### 3. Twitter Card Validator

- URL: https://cards-dev.twitter.com/validator
- Ingresa: `https://jovenesmodelia.com`
- Verifica que muestre correctamente las Twitter Cards

### 4. PageSpeed Insights

- URL: https://pagespeed.web.dev/
- Ingresa: `https://jovenesmodelia.com`
- Verifica rendimiento y SEO

---

## 📝 Próximos Pasos Recomendados

### 1. ✅ Crear Imagen OG (Open Graph) - CRÍTICO PARA WHATSAPP

**IMPORTANTE:** Para que WhatsApp muestre el logo al compartir, necesitas crear la imagen OG.

**Ubicación:** `frontend/public/og-image.jpg`

**Especificaciones:**

- Tamaño: 1200x630 píxeles (ratio 1.91:1)
- Formato: JPG
- Contenido sugerido:
  - Logo de Jóvenes Modelia
  - Texto: "Jóvenes Modelia - Plataforma Digital"
  - Colores de la marca (#3B82F6)

**Opciones para generar:**

1. **Script automático (bash):**

   ```bash
   cd frontend
   ./scripts/generate-og-image.sh
   ```

   Requiere: `brew install imagemagick` (macOS) o `sudo apt-get install imagemagick` (Linux)

2. **Script automático (Node.js):**

   ```bash
   cd frontend
   npm install --save-dev sharp
   node scripts/generate-og-image.js
   ```

3. **Manualmente:**
   - Ver instrucciones detalladas en: `frontend/scripts/README.md`

**Después de crear la imagen:**

1. Publica los cambios
2. Limpia la caché de WhatsApp en: https://developers.facebook.com/tools/debug/
3. Ingresa tu URL y haz clic en "Scrape Again"
4. Comparte el enlace en WhatsApp para verificar

### 2. Actualizar Sitemap dinámicamente

Cuando agregues nuevas páginas, actualiza `sitemap.xml` o implementa generación dinámica.

### 3. Google Analytics (Opcional)

Agrega Google Analytics para tracking:

```html
<!-- Google tag (gtag.js) -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
></script>
```

### 4. Google Tag Manager (Opcional)

Para mejor gestión de tags y tracking.

---

## ⚠️ Notas Importantes

1. **Canonical URL**: Ya configurado en `index.html` para evitar contenido duplicado
2. **HTTPS**: Asegúrate de que SSL esté activo (ya lo tienes ✅)
3. **Mobile-First**: Tu sitio ya es responsive ✅
4. **Tiempo de Indexación**: Google puede tardar de 1 día a 1 semana en indexar

---

## 📈 Monitoreo

Después de 1 semana:

1. Revisa Google Search Console → Cobertura
2. Verifica qué páginas están indexadas
3. Revisa errores y advertencias
4. Monitorea búsquedas que llevan a tu sitio

---

## 🔗 Enlaces Útiles

- [Google Search Console](https://search.google.com/search-console)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
