# Progreso — contra PLAN.md

Cada sesión lee esto primero, después la tarea que toca en PLAN.md.

## Sesión 1 — 2026-09-12 (Opus)

- **T0 hecho a medias:** `specify init --here --integration claude` corrió (`.specify/` y skills en
  `.claude/`). Falta volcar PLAN.md en constitution/spec/plan/tasks.
- **T1 en curso:** motor de flyer escrito y probado en Node.
  - `src/lib/qr/` = copia de Pizarrita (`menus/runtime/qr.js`, `qr-arte.js`, `cartel.js`) + `.d.ts` propios.
  - `src/flyer/`: `logo.ts`, `qrMarca.ts`, `svg.ts`, `plantillas/elegante.ts`.
  - `src/lib/exportar.ts`: SVG→PNG en canvas, Web Share o descarga, fuente embebida, foto reducida a 1200 px.
  - `src/lib/whatsapp.ts`: normaliza teléfonos AR a `549…` para `wa.me`.
  - `npm test`: 10/10. El QR con logo se decodifica con jsqr en el PNG y **también tras JPEG calidad 60**.
  - `npm run build`: limpio.
  - Chromium de escritorio (`vite preview` + agent-browser): SVG→canvas→PNG = 123.843 bytes,
    1080×1350, Playfair embebida en el SVG, `navigator.canShare` presente.
  - Diseño revisado a ojo en `salida-pruebas/flyer-elegante.png`: se corrigió el título que cortaba
    palabras (ahora achica la letra), el subtítulo tapado por la foto (la foto arranca donde termina
    el título) y el sello de precio que pisaba "Cobertura".
  - agent-browser desde Git Bash cuelga al abrir Chrome; desde PowerShell anda pero tarda >2 min.
  - **Falta la verificación que define T1:** abrir en un Android real, generar, compartir a WhatsApp, y
    escanear el QR. Eso lo hace el CEO; sin eso T1 no está cerrado.

### Publicación
- Repo: https://github.com/axelg8377-tech/cake-studio · Sitio: https://axelg8377-tech.github.io/cake-studio/
- **Público:** el CEO pidió privado "si se puede"; GitHub respondió 422 "Your current plan does not
  support GitHub Pages for this repository". Antes de abrirlo se sacó de PLAN.md una ruta a un archivo
  con credenciales y se reescribió el único commit.
- Workflow `pages.yml`: `npm test` antes de publicar, permisos mínimos (CICD-01), acciones por SHA
  (CICD-03). Primer deploy verde. Aviso de GitHub: esas acciones apuntan a Node 20 (deprecado) y corren
  forzadas en Node 24; actualizar los SHA a versiones nuevas cuando haga falta.

### Prueba del CEO en Android (T1 cerrado con un arreglo)
- Compartir a WhatsApp, fuente, foto y precio: bien en el teléfono real.
- QR: no lo pudo escanear. Con su imagen real, jsqr lee el QR a 1080 y 720 px de ancho y **falla a
  540 y 400 px** (tamaño en pantalla de un celular). Causa: el mensaje `?text=` duplicaba la densidad.
- Arreglo: el QR lleva solo `wa.me/549…`, pasa de 132 a 172 px, y hay un test que lo lee con el flyer
  achicado a 540 px en JPEG 70. **Falta que el CEO lo reescanee con el celular.**

### T2 · T3 · T4 hechos (sin publicar)
- T2: `vite-plugin-pwa` (autoUpdate, manifest en español, scope `./`), íconos en `public/iconos/`
  generados con `node scripts/iconos.ts`, precache con fuentes. Build: `sw.js` + 17 entradas.
  `lib/almacenamiento.ts` pide `navigator.storage.persist()` al abrir.
- T3: `src/db.ts` (Dexie, 9 tablas de PLAN.md) + `src/datos/semilla.ts` (12 ingredientes, 4 gastos,
  4 tamaños con factor por área, 11 opciones). Se siembra al abrir si no hay config, sin `populate`.
- T4: `src/tipos.ts`, `lib/unidades.ts`, `lib/costos.ts` (costo por ingrediente, opción, torta, margen,
  redondeo, consumo y faltantes de stock).
- `npm test`: 27/27 (flyer, costos del brief, base con fake-indexeddb). `npm run build`: limpio.
- La pantalla visible sigue siendo `PruebaFlyer`; la app real arranca en T5.
- **T0 de spec-kit sin completar a propósito:** el CEO pidió avanzar directo. PLAN.md + este archivo
  son la especificación.

### Cierre de la sesión 1 (sin commitear, esperando OK del CEO)
- CEO reescaneó: el QR sin mensaje abre el chat. Pidió recuperar el mensaje.
- Ahora el QR lleva `MENSAJE_QR = 'Hola! Quiero una torta'` (lib/whatsapp.ts), mide 196 px, y
  flyer.test.ts lo lee con el flyer achicado a 540 y 480 px. Filas de detalle reespaciadas (5 datos
  entran antes del pie). `npm test` 28/28. **Falta: commit + push con OK del CEO, y reescaneo.**
- D1 **decidido por el CEO: A (papel y chocolate) para la app, B (rosa empolvado) como plantilla "Dulce"
  del flyer** (T10).
- T5 hecho: `App.tsx` con rutas por hash (`lib/ruta.ts`), `componentes/NavInferior.tsx` (Inicio, Tortas,
  Ingredientes, Flyer, Más), tokens de A en `estilos.css`. Sin Tailwind: pocas pantallas, CSS con tokens.
- T6 hecho: `pantallas/Ingredientes.tsx` (buscador sin tildes, agrupado por categoría, badge de variación,
  alerta si supera `umbralAlerta`), `FichaIngrediente.tsx` (actual / anterior / variación $ y %, actualizar
  precio con cambio de presentación, historial), `FormIngrediente.tsx` (alta, edición sin precio, borrar
  bloqueado si está en una receta). Lógica en `datos/ingredientes.ts`.
- `Inicio.tsx`: aviso de precios de ejemplo, accesos, top 3 aumentos. `Pendientes.tsx`: Tortas y Más
  dicen qué falta.
- `npm test` 38/38 · build limpio. Publicado con OK del CEO.
- **Próximo:** T7 (gastos, tamaños, opciones con receta) → T8 (constructor de torta).

### Decisiones tomadas en la sesión
- `base: './'` en Vite: GitHub Pages sirve en `/<repo>/` y así no depende del nombre del repo.
- `testTimeout` 30 s: render con sharp + jsqr tarda más de 5 s en frío. No era falla del QR.
- Hueco del logo: `qr-arte.js` lo reserva solo si recibe píxeles de logo; se le pasa un píxel
  (`HAY_LOGO`) y el dibujo real va por `logoDataUri`.
