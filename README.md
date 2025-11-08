# Vuelta al Cóndor 2025

<p align="center">
  <img src="images/VAC.png" alt="Logotipo de Vuelta al Cóndor" width="240" />
</p>

Sitio estático oficial de la **Vuelta al Cóndor 2025**, un desafío de ciclismo de ruta autosuficiente de 187 km y 3000 m+ organizado por **El Rey de la Montaña**. El proyecto prioriza la accesibilidad (WCAG 2.2 AA), el rendimiento (Core Web Vitals ≥ 95) y la comunicación inclusiva para toda la comunidad LGBTQI+.

## Estructura del proyecto

```
/
├─ index.html              # Landing principal con hero, ruta, altimetría, FAQ y reglamento
├─ corredores.html         # Página informativa “Próximamente” para el listado de riders
├─ styles.css              # Hoja de estilos editable (tokens --vac-*)
├─ styles.min.css          # Versión minificada para producción
├─ sw.js                   # Service Worker (cache estática + dinámica)
├─ site.webmanifest        # Manifest PWA (maskable icons, theme, start_url)
├─ data/sponsors.json      # Logos, enlaces y CTA de patrocinadores
├─ route/vac.gpx           # Track oficial validado (GPX)
└─ images/                 # Identidad visual, altimetría y recursos multimedia
```

## Requisitos rápidos

- Node.js ≥ 20.19.4 (recomendado). El proyecto incluye `.nvmrc`; usa `nvm use` (macOS/Linux) o `nvm use 20.19.4` (Windows) para fijar versión.
- Lighthouse (CLI o Chrome DevTools) para validar CWV.

### Entorno Node
- Versionado local: `.nvmrc` especifica `20.19.4`.
- macOS/Linux: `nvm install` y luego `nvm use`.
- Windows (nvm‑windows): `nvm install 20.19.4` y `nvm use 20.19.4`.

## Desarrollo local

```bash
# Minificar estilos (mantén styles.css como fuente de verdad)
npx clean-css-cli styles.css -o styles.min.css
```

## Desarrollo con CSP (sin tocar HTML / .htaccess)

- Servidor de desarrollo con Node/Express que aplica una **CSP relajada por cabecera** y remueve la meta CSP del HTML al vuelo.
- No modifica archivos fuente; solo aplica en localhost.

```bash
# Arrancar servidor de desarrollo
npm run dev            # node dev-server.js

# Arrancar con recarga automática (watch)
npm run dev:auto       # nodemon observa .html, .css, .js, .json

# Acceso
http://localhost:5174/
```

- Qué hace: 
  - Cabecera CSP en dev: permite `http:`, `https:`, `data:`, `blob:`, inline y eval; no bloquea recursos reescritos por extensiones locales.
  - Elimina la meta CSP de las respuestas HTML para evitar combinación de políticas.
- Producción: usa la **CSP estricta definida en HTML**, con orígenes limitados (Google Fonts/GA) y `'self'`.

### Recomendaciones
- No desplegar el server de desarrollo; es solo para localhost.
- Validar en producción sin extensiones que reescriban recursos.
- Si necesitas probar CSP estricta en dev, arranca sin `dev:auto` y ajusta temporalmente `DEV_CSP` en `dev-server.js`.

## Accesibilidad y QA

- **Teclado**: recorre la interfaz completa, verifica `skip-link`, menú móvil y foco visible.
- **Lectores de pantalla**: comprueba estructura semántica (NVDA / VoiceOver) y textos alternativos.
- **Contraste**: usa herramientas como Axe, Stark o `npx @axe-core/cli http://localhost:8000`.
- **Preferencias de usuario**: valida `prefers-reduced-motion`, contraste alto y navegación offline (PWA instalada).
- **Lighthouse**: ejecuta `npx lighthouse http://localhost:8000 --view` y guarda el reporte con puntuaciones ≥ 95.

## Privacidad y Analítica

- Analítica: se usa Google Analytics 4 (GA4) con carga diferida.
- Respeto a Do Not Track (DNT): si el usuario tiene DNT activo, no se carga `gtag.js` ni se envían eventos.
- CSP: las páginas incluyen Content Security Policy restringiendo orígenes (`googletagmanager.com` y `google-analytics.com` para scripts/conexiones de GA).
- PII: el sitio no recolecta ni transmite datos personales identificables; sólo métricas agregadas de uso cuando DNT está desactivado.

## Decisiones técnicas

- Rendimiento de red: `preconnect` y `dns-prefetch` a `googletagmanager.com` y `google-analytics.com` en todas las páginas.
- Carga de imágenes: `loading="lazy"` y `decoding="async"` en imágenes no críticas; logotipo con `fetchpriority="high"` por estar above‑the‑fold.
- Service Worker: caché estática de páginas clave (`/`, `/guia.html`) y activos (`styles.min.css`, `gpu-io.min.js`, `fluid-background.js`, SVG de ruta y altimetría); estrategias `cacheFirst`, `staleWhileRevalidate` y `networkFirst` según tipo.
- Recarga controlada: el `sw.js` notifica versión nueva (`vac-update`) y las páginas realizan una recarga única para aplicar cambios.
- Analítica: GA4 cargado de forma diferida y condicionado por DNT.
- Animaciones: botón de “modo rendimiento” que reduce animaciones GPU y oculta fireworks.
- Navegación: índice de guía sticky y colapsable en móvil con scroll‑spy; barra de accesos rápidos y botón “↑ Índice”.
- Feedback: botón flotante “Feedback” que abre la sección `#contacto` en la landing.

## Diseño responsive

- Breakpoint principal `900px`: reflujo a una columna, sticky para quickbar y toc; grids (`.guide-grid-2`, `#tool .grid-2/3`) pasan a 1 columna.
- Tipografía y espaciamiento fluidos, respetando tokens `--vac-*` en `styles.css`/`styles.min.css`.
- Navegación móvil accesible: foco atrapado, `aria-expanded`, `Escape` para cerrar y `skip-link` activo.

## Validación multiplataforma

- Desktop: Chrome, Edge, Firefox (Windows/macOS) — verificación visual + Lighthouse.
- Móvil: Chrome Android, Safari iOS — comprobar sticky/colapsable, quickbar, rendimiento con modo bajo.
- PWA: instalación, navegación offline (caché estática) y actualización de caché al publicar.

## Pruebas de usabilidad

- Acceso directo a guía desde home (CTA y promo) y dentro de guía (índice + quickbar).
- Flujo de herramienta: inputs claros, validación mínima y exportación a `.txt` e impresión.
- Botón “Feedback” visible tras scroll, sin interferir con contenido ni controles primarios.

## Mecanismos de retroalimentación

- Botón flotante “Feedback” enlaza a `/#contacto` para mensaje directo.
- Alternativas: reemplazar por `mailto:` en producción o integrar formulario con backend; ajusta el `href` en `index.html`/`guia.html`.

## Rendimiento

- Scripts no críticos con `defer`, restauración de `console` tras carga.
- Imágenes grandes en SVG con lazy y tamaños definidos; preloads mínimos del hero.
- Recursos de terceros (GA) cargados asíncronamente; errores locales esperados en desarrollo.

## Actualizaciones y Service Worker

- Versionado en `sw.js`:
  - `APP_VERSION`: etiqueta de versión (ej. `YYYY-MM-DD`) usada para notificar a clientes.
  - `STATIC_CACHE` / `DYNAMIC_CACHE`: nombres de caché. Cambia los sufijos cuando hay cambios mayores en la política de caché.
- Señal de actualización: al activar, el SW envía `{ type: 'vac-update', version: APP_VERSION }` a todas las pestañas controladas.
- Recarga controlada en páginas:
  - Las páginas escuchan el mensaje `vac-update` y, si la versión difiere, guardan `vac_version` y recargan una sola vez (con llave por ruta en `sessionStorage` para evitar loops).
  - Se puede forzar verificación inmediata enviando `postMessage({ type: 'VAC_CHECK_VERSION' })` desde la página al controlar el SW.
- Estrategias:
  - Documentos y CSS/JS críticos: `cacheFirst` para rapidez (con actualización en background).
  - Imágenes y datos (`/data/`): `staleWhileRevalidate`.
  - Resto: `networkFirst` con fallback offline.

## Caché y Headers (.htaccess)

- `sw.js` sin caché fuerte para propagar cambios inmediatamente:

```apache
<IfModule mod_headers.c>
  <Files "sw.js">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </Files>
</IfModule>
```

- HTML sin caché fuerte en producción para asegurar contenido fresco (opcional si el SW controla):

```apache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  # Activos versionados (CSS/JS/img) pueden tener caché largo
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

- Sugerencias de seguridad (opcionales):
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: SAMEORIGIN`
  - `Permissions-Policy: interest-cohort`()

## Despliegue

- **Netlify / Vercel**: arrastra la carpeta del proyecto o conecta el repositorio (build vacío, output `/`).
- **GitHub Pages**: publica desde rama principal o carpeta `docs/` con contenido idéntico.
- **Servidor tradicional / CDN**: copia los archivos tal cual; invalida cachés al actualizar `styles.min.css` o imágenes pesadas.

### Staging (GitHub Pages)
- URL de staging: `https://cripterhack.github.io/Vuelta-al-Condor/` (actualiza con tu usuario y nombre de repo).
- Compatibilidad de rutas: se ajustaron todas las referencias a recursos a rutas relativas (`styles.min.css`, `images/...`, `route/vac.gpx`, `site.webmanifest`) para funcionar bajo subpath de Pages.
- CD automático: se incluye `/.github/workflows/pages.yml` que construye estilos (autoprefix + minify), genera variantes de imagen y despliega a Pages en cada push a `main`/`master`.
- Activación: en la configuración del repositorio (“Pages”), el workflow `Deploy to GitHub Pages` habilita el entorno `github-pages` automáticamente; no requiere secretos.
- Fallback noscript: en `index.html` se aplica la técnica `preload as=style` con `onload` y un `<noscript>` de respaldo, combinada con CSS crítico inline para mejorar LCP.

### Nota de CSP y despliegue
- El hosting no debe añadir cabeceras CSP que contradigan la meta CSP del HTML, salvo que quieras mover la CSP al servidor. Si lo haces, asegúrate de mantener las mismas directivas.

## Flujo de publicación

- Bump de versión:
  - Actualiza `APP_VERSION` en `sw.js`.
  - Si cambias la política de caché, actualiza sufijos de `STATIC_CACHE` y `DYNAMIC_CACHE`.
  - Versiona recursos estáticos con query (`styles.min.css?v=YYYYMMDDHHMM`) o nombres con hash.
- Despliegue:
  - Publica los archivos; el navegador recibirá el SW nuevo.
  - Páginas recibirán `vac-update` y se recargarán una sola vez para aplicar contenido.
- Validación:
  - DevTools → Application → Service Workers: pulsa “Update” y observa la recarga única.
  - Network: verifica que `sw.js` no se cachea fuerte y que HTML responde sin `Expires` largo.

## Checklist de migración

- [ ] Tokens `--vac-*` aplicados en estilos y componentes.
- [ ] JSON-LD (SportsEvent, WebSite, Breadcrumb) con datos actuales de VAC.
- [ ] Manifest + Service Worker operativos (experiencia offline funcional).
- [ ] `APP_VERSION` actualizado y recarga controlada probada (sin loops).
- [ ] `sw.js` con headers de no‑cache en `.htaccess`.
- [ ] DNT activo: GA4 no carga; DNT desactivado: GA4 carga diferido.
- [ ] Track `route/vac.gpx` descargable y sincronizado.
- [ ] Secciones hero, detalles, ruta, altimetría, patrocinadores, FAQ, reglamento y contacto alineadas con el brief.
- [ ] Página `corredores.html` visible en navegación con estado “Próximamente”.
- [ ] Resultados Lighthouse ≥ 95 en Performance, Accessibility, Best Practices y SEO.
- [ ] Verificado desarrollo en localhost con `npm run dev:auto` sin errores CSP.
- [ ] Despliegue sin cabeceras CSP adicionales que contradigan la meta CSP.

## Créditos y derechos

- Identidad visual y recursos de marca: propiedad de sus titulares; uso autorizado para este sitio.
- Logos de patrocinadores y fotografías: publicados con permiso; revisar antes de reutilizar en otros contextos.
- Desarrollo: IzignaMx. Contribuciones y mejoras son bienvenidas mediante PR.
