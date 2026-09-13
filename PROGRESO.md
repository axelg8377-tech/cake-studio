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

## Sesión 2 — 2026-09-12 (Opus) · T7 y T8 hechos, sin commitear

- `datos/catalogo.ts`: `leerCatalogo`, alta/edición/borrado de gastos, tamaños y opciones, `guardarTorta`
  (congela el snapshot; "realizada" descuenta stock sin bajar de 0).
  - Borrar un gasto que usa una opción: bloqueado. El último tamaño: bloqueado. Borrar una opción: se permite,
    las tortas guardadas tienen su costo congelado.
  - Pasar una opción a precio fijo le borra la receta (no queda escondida).
- T7: `pantallas/Mas.tsx` (entra a Opciones, Tamaños, Gastos; lo demás figura como próximo), `Gastos.tsx`,
  `Tamanos.tsx`, `Opciones.tsx`. La lista de opciones muestra el costo al lado, para el molde de factor 1.
  El formulario de opción ofrece solo los gastos que **no** son "de cada torta", para no cobrarlos dos veces.
- T8: `pantallas/Constructor.tsx` en la pestaña Tortas. Chips por paso con el costo al tamaño elegido,
  ganancia % editable (arranca en `margenDefecto`), precio final opcional, detalle del costo, aviso de stock,
  "Guardar borrador" / "Ya la hice" (confirma antes de descontar stock), últimas 5 guardadas. Barra fija con
  costo (tinta), ganancia (verde, rojo si es pérdida) y precio (terracota).
- `Pendientes.tsx` borrado; `NoEncontrado` pasó a `componentes/ui.tsx`.
- Verificación: `npm test` 45/45 (7 nuevos en `datos/catalogo.test.ts`, incluida la cuenta a mano de
  vainilla + dulce de leche + ganache en 20 cm = $13.826,76 → sugerido $20.800). `npm run build` limpio.
  En `vite preview` a 412 px: el constructor muestra costo $13.827 y precio $20.800 con esa torta; guardar un
  borrador con precio final $25.000 lo lista en "Últimas guardadas". Capturas revisadas a ojo.
- **No verificado:** en Android real, y "Ya la hice" descontando stock desde la pantalla (sí está en test).
- **Falta:** commit + push con OK del CEO. Próximo: sesión 3 (T9 galería, T10 plantillas, T11 flyer).

### Sesión 2, segunda parte — pedidos del CEO tras probar la app (sin commitear)

- T7 y T8 publicados en `2a5e01e`. El CEO probó los pasos 1, 2, 4 y 5 en el celular: bien. El 3 (stock) no lo probó.
- **Torta por ingredientes sueltos** (pedido del CEO): en Tortas, "Elegir opciones" / "Elegir ingredientes".
  `Seleccion.ingredientes?: LineaReceta[]` (opcional, las tortas viejas no lo tienen). Esas cantidades **no se
  escalan** por tamaño: son las de esa torta. `calcularTorta` y `consumo` las suman. En ese modo solo se muestran
  los extras de las opciones.
- **Tortas guardadas se abren y editan** (pedido del CEO): ruta `#/tortas/:id`. Guardar cambios, Ya la hice,
  Guardar como torta nueva / Hacer otra igual (copia en borrador), Borrar. `guardarTorta(datos, id?)` conserva la
  fecha y **descuenta stock solo la primera vez** que pasa a hecha. Borrar una hecha no devuelve stock (lo avisa).
  Al abrir una guardada el costo se recalcula con precios de hoy.
- **Explicaciones** (pedido del CEO): `Ayuda` en `componentes/ui.tsx`, un `<details>` abierto hasta "Entendido",
  recordado en `localStorage` (`ayuda-vista:<pantalla>`). Si no hay almacenamiento, se muestra siempre. Está en
  Inicio (primeros pasos), Tortas, Ingredientes, ficha de ingrediente, Opciones, Tamaños y Gastos. Más tiene
  "Volver a ver las explicaciones".
- Verificación: `npm test` 47/47 · build limpio · **recorrido con agent-browser a 412 px: 74/74 comprobaciones**
  (navegación, explicaciones, los dos modos, abrir/editar/copiar/borrar tortas, aviso de stock, buscador, alta y
  precio de ingrediente, bloqueos de borrado, opciones, tamaños, gastos, ruta inexistente). Guiones en el
  scratchpad de la sesión, no en el repo.
- Cicatriz de la prueba: `agent-browser open` a la misma URL con otro `#` **no recarga**. Borrar IndexedDB con la
  app abierta la deja vacía sin semilla hasta recargar. Para resetear: `deleteDatabase` + `location.reload()`.
- **Falta:** commit + push con OK del CEO. Después, sesión nueva: T9 galería, T10 plantillas, T11 flyer.

## Sesión 3 — 2026-09-12 (Opus) · T9, T10 y T11 hechos, sin commitear

- T9: `pantallas/Galeria.tsx` (Más › Galería) + `datos/imagenes.ts` (`subirFotos` achica a 1200 px JPEG,
  `marcarPrincipal` deja una sola). `Miniatura` en `componentes/ui.tsx` libera la URL blob al desmontar.
  **El set base en SVG no va como fotos:** flor, sello y logo ya se dibujan dentro de las plantillas, y sin foto
  sale el logo grande. Si el CEO quiere formas elegibles como imagen, se agrega.
- T10: `flyer/plantillas/dulce.ts` (paleta B, Great Vibes OFL en `public/fuentes/` con su licencia, foto en
  flor con `feston()`, sello dorado, datos en columna con hasta 2 líneas) y `carta.ts` (tamaños con precio,
  masas/rellenos/coberturas, máx. 6 por lista con "y N más"). El pie (QR 196 px + contactos) pasó a `pie()`
  en `svg.ts` y lo usan las tres: el tamaño probado por el CEO no cambia.
  `flyer/desdeTorta.ts`: `flyerDeTorta` (del snapshot sale solo el precio final) y `cartaDelCatalogo` (precio
  "desde" = masa + relleno + cobertura más baratos a ese tamaño, con `margenDefecto`; editable en pantalla).
- T11: `pantallas/Flyer.tsx` en `#/flyer` y `#/flyer/:tortaId` (botón "Hacer flyer" en el constructor).
  Diseño, torta guardada, nombre/texto/precio, foto (o subir una), datos del negocio guardados en `config`,
  vista previa, "Enviar por WhatsApp" y "Descargar". Sin WhatsApp cargado los botones quedan apagados.
  `PruebaFlyer.tsx` borrado; `fotoDataUri` reemplazado por `reducirFoto` + `blobADataUri`.
- Verificación: `npm test` 60/60 (las 3 plantillas: tamaño, escape, QR con logo, JPEG 60, 540 y 480 px, sin
  foto; cuenta de la carta). Build limpio. PNG de las tres revisados a ojo.
- **No verificado:** Android real y escaneo del QR de Dulce y Carta con otro teléfono.

## Sesión 4 — 2026-09-13 (Opus) · T12 a T16 hechos, sin commitear

Recorte avisado al CEO al arrancar: esta sesión T12–T16; **F1, T17 y T18 quedan para la sesión 5**.

- **T12** `flyer/plantillas/tarjeta.ts`: tarjeta 1063×591 (9×5 cm a 300 dpi), logo, nombre (achica hasta 2 líneas),
  frase, WhatsApp, Instagram y QR 340 px sobre cuadrado de papel. **No usa la hoja de `cartel.js`**: es vertical
  A6–A4 con NFC y pie de Pizarrita; se toma el método (QR encajado, texto que achica). Frase a 32 px = 7,7 pt impreso.
  - Pedido del CEO a mitad de sesión: **`hojaA4()`**, 10 tarjetas (2×5) pegadas con marcas de corte y pie "imprimir al
    100%". La tarjeta se dibuja una vez y se repite con `<use href="#tarjeta">`.
  - `pantallas/Tarjeta.tsx` (Más › Tarjeta): datos del negocio compartidos con el flyer, "Descargar hoja A4",
    "Enviar tarjeta", "Descargar tarjeta".
- **T13** `pantallas/Historial.tsx` (hechas / borradores, por mes, total vendido) y `pantallas/Clientes.tsx` (lista con
  buscador, alta/edición, sus tortas, "Escribirle por WhatsApp", borrar). `datos/clientes.ts`: borrar un cliente deja
  sus tortas sin cliente. Constructor: selector "Cliente (opcional)"; `DatosTorta.clienteId`.
- `Torta.hecha?` nuevo: fecha en que pasó a realizada, una sola vez. Las cuentas del mes van por ese día (las tortas
  viejas usan `fecha`).
- **T14** `lib/resumen.ts` (`resumenDelMes`, `aumentos`). Inicio: cifras del mes (tortas, ventas, costos, ganancia),
  alerta de ingredientes con suba `> umbralAlerta` (3 nombres + "y N más"), aviso de tortas a revisar, top 3 aumentos.
- **T15** `revisarPrecios` + `pantallas/RevisarPrecios.tsx`. **Regla elegida:** avisa si el costo de hoy es mayor y lo
  que cobró queda debajo del precio sugerido de hoy con el mismo margen. Si se borró una opción, ingrediente o tamaño,
  la torta sale "no se puede comparar" (el costo de hoy mentiría para abajo). No cambia nada.
- **T16** `lib/backup.ts` + `pantallas/Copia.tsx` (Más › Copia de seguridad). JSON con las 9 tablas y fotos en base64
  (BKP-01), nombre con fecha y hora (no pisa copias), **sin `claveIA`** y al restaurar se conserva la del teléfono.
  `leerCopia` valida todo antes de tocar la base; `restaurarCopia` decodifica fotos antes y reemplaza en una
  transacción. `ultimoBackup` se marca solo si el archivo salió (cancelar no cuenta). Aviso en Inicio: "nunca" si hay
  tortas o cambios de precio, o ≥ 14 días. La pantalla avisa que el archivo tiene teléfonos de clientes.
  BKP-02/03/06 (cifrado, inmutabilidad, credenciales) no aplican a un archivo local sin servidor: decisión, no olvido.
- Más: 9 secciones con link; "Próximas" queda solo "Pedido con IA".

### Verificación
- `npm test` **79/79** (nuevos: `lib/backup.test.ts` ida y vuelta con foto por bytes y 6 rechazos, `lib/resumen.test.ts`,
  tarjeta y hoja A4 en `flyer.test.ts`). Build limpio. oxlint: solo avisos viejos en `lib/qr/` copiados.
- QR de la tarjeta leído con jsqr a 1063, 531 y 425 px (JPEG 75), y el de la última celda de la hoja A4.
  PNG revisados a ojo: `salida-pruebas/tarjeta.png`, `tarjetas-a4.png`.
- Chromium con `vite preview` a 412 px: alta de cliente → torta con cliente "Ya la hice" → precios +30% → Inicio
  muestra alerta, aviso de copia y de revisar; Revisar precios +16% "conviene"; Historial y ficha del cliente ok.
  Copia (119 KB con foto) → `deleteDatabase` → app vacía → restaurar → cliente y foto 1063×591 vuelven, "Última copia".
- Cicatriz de la prueba: `deleteDatabase` con la app abierta queda **bloqueado** y encola toda apertura siguiente (la
  app se cuelga en "Armando la copia…"). Borrar desde una URL del mismo origen sin la app (`/manifest.webmanifest`).
- **No verificado:** Android real, impresión real de la hoja A4 a 100% y escaneo del QR impreso, compartir el JSON
  en Android (si `canShare` no acepta JSON cae a descarga), restaurar eligiendo el archivo desde el selector del teléfono.
- **Falta:** commit + push con OK del CEO. Sesión 5: F1 (cargar skill `claude-api` antes), T17, T18.

### Sesión 4, segunda parte — commit de T12–T16 y T17 (T17 sin commitear)

- Con OK del CEO: `685ac96` pusheado, Pages verde (47 s). `referencias/` sin trackear quedó afuera a propósito.
- **T17**, contra `diseno-web.md` (prohibiciones + checklist) y `ui-ux-pro-max/references/pro-rules.md`:
  - Más: sin sección "Próximas entregas" (`diseno-web.md` prohíbe "próximamente"); secciones en 3 grupos (Tu negocio,
    Cómo calculás, Tus datos); "Volver a ver las explicaciones" al final.
  - Ingredientes: un solo aviso con todos los que subieron (antes uno por ingrediente), criterio `> umbral` igual que
    Inicio (antes `>=`), la ayuda dice el umbral real y lleva a Revisar precios.
  - FichaIngrediente usa `NoEncontrado`. Opciones vacía: un solo texto con link, no dos.
  - CSS: respuesta al tocar en chips, fotos, quitar y pestañas (color, sin mover nada), transición 150 ms, apagada con
    `prefers-reduced-motion`; `aria-disabled` se ve deshabilitado.
  - **No aplica / decidido no hacer:** modo oscuro (fuera de alcance en PLAN.md); estado de carga (IndexedDB responde en
    milisegundos, un spinner parpadearía); iconos de emoji (no hay, son SVG).
- Verificación: `npm test` 79/79 · `tsc -b` limpio · build. Barrido en Chromium a 375 px de las 18 rutas: 0 px de
  desborde horizontal en todas; controles < 44 px solo las 2 casillas de gastos de "Editar opción", dentro de un label
  de 44 px. Fuente de títulos verificada relativa en el CSS compilado (`url(../fuentes/…)`), anda bajo `/cake-studio/`.
- **No verificado:** Android real, texto grande del sistema, tablet horizontal.
- **Falta:** commit + push de T17 con OK del CEO. Sesión 5: F1 y T18.

## Sesión 5 — 2026-09-13 (Opus) · correcciones del CEO antes de F1

El CEO pidió 4 correcciones antes de la IA. F1 y T18 siguen pendientes.

- **Foto del flyer acomodable:** `fotoEncuadrada()` en `flyer/svg.ts` (zoom 1–3, correr a los costados, subir o bajar),
  con el tamaño real de la foto (`createImageBitmap`). Las 3 plantillas la usan. Barras en Flyer debajo de la vista
  previa + "Volver a centrar". El encuadre vuelve al centro al cambiar de foto y no se guarda. Test: `svg.test.ts`.
- **Constructor sin elegir modo:** opciones arriba (cada paso con "+ Nueva") y abajo "Ingredientes sueltos"
  (desplegable). Se pueden mezclar: `calcularTorta` ya sumaba las dos cosas.
- **Pisos:** `Seleccion.pisos?` = pisos de arriba; el objeto raíz es el piso 1 (abajo). `pisosDe()` en costos.
  Cada piso con tamaño, opciones e ingredientes; gastos por torta una sola vez; conceptos "Piso N · …".
  Flyer: "2 pisos · 20 cm + 15 cm" y nombres sin repetir. Revisar precios mira el tamaño de todos los pisos.
  Tortas viejas no tienen `pisos`: se leen igual. Backup: `seleccion` sigue validando como objeto.
- **Buscar actualización** en Más: `registration.update()`, espera al SW nuevo (techo 10 s) y recarga. Muestra la
  fecha de compilación (`__COMPILADA__` en `vite.config.ts`).
- Verificación: `npm test` 84/84 · build limpio. Chromium 412 px: 2 pisos → costo por piso correcto, base y gas una vez,
  "Total (2 pisos)". Más muestra versión y botón.
- **No verificado:** barras de la foto en el navegador de prueba. La foto subida por agent-browser quedó con miniatura
  vacía y "Guardando la foto…" colgado (pasa antes de llegar al código nuevo; sin diagnosticar). El cálculo del encuadre
  está en test. **Lo revisa el CEO en el teléfono.**
- Publicado con OK del CEO ("haz deploy").

### Decisiones tomadas en la sesión
- `base: './'` en Vite: GitHub Pages sirve en `/<repo>/` y así no depende del nombre del repo.
- `testTimeout` 30 s: render con sharp + jsqr tarda más de 5 s en frío. No era falla del QR.
- Hueco del logo: `qr-arte.js` lo reserva solo si recibe píxeles de logo; se le pasa un píxel
  (`HAY_LOGO`) y el dibujo real va por `logoDataUri`.
