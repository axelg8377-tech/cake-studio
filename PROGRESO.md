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

### Decisiones tomadas en la sesión
- `base: './'` en Vite: GitHub Pages sirve en `/<repo>/` y así no depende del nombre del repo.
- `testTimeout` 30 s: render con sharp + jsqr tarda más de 5 s en frío. No era falla del QR.
- Hueco del logo: `qr-arte.js` lo reserva solo si recibe píxeles de logo; se le pasa un píxel
  (`HAY_LOGO`) y el dibujo real va por `logoDataUri`.
