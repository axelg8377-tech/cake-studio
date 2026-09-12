# Plan — Pastelería: app de costos de tortas + flyer + carta con QR

## Contexto

La hermana del CEO hace tortas y hoy calcula costos a mano. Necesita, desde el celular y sin internet:
actualizar precios de ingredientes y ver cuánto subieron, armar una torta, saber cuánto cuesta, ponerle
precio, y mandarle al cliente un flyer lindo por WhatsApp con un QR a su número. Más una tarjeta chica
para recomendar su trabajo. Fuentes: `C:\Users\axelg\Pasteleria\Promt inicial.txt` y
`Implementacion de IA.txt` (el CEO aclaró que son referenciales) + 4 imágenes guía en la misma carpeta.

**Nivel 3** · construcción · ingreso: ninguno directo (proyecto familiar). Se parte en 4 sesiones.
Planifica Opus (esta sesión); ejecuta Sonnet en sesiones aparte, tarea por tarea, contra este plan.
Sin subagentes (regla del CEO).

**Terminado cuando:** en un Android real, con modo avión, la hermana hace los 11 pasos del criterio de
éxito del brief (actualizar precio → ver aumento → armar torta → ver costo → fijar precio → elegir imagen
→ elegir diseño → generar flyer → descargar/compartir a WhatsApp), y el QR del flyer escaneado con otro
teléfono abre un chat de WhatsApp con su número.

## Decisiones cerradas con el CEO

| Tema | Decisión | Por qué |
|---|---|---|
| Dispositivo | Celular, casi siempre | Respuesta del CEO |
| Forma | **PWA instalable, offline** | "Ícono instalado, sin internet" en celular, sin Play Store |
| UI | React 18 + TypeScript + Vite + Tailwind | Brief; TS paga en una app de formularios y plata |
| Datos | **IndexedDB vía Dexie** + `navigator.storage.persist()` | SQLite no corre en navegador. `persist()` evita que Android borre los datos |
| Hosting | **GitHub Pages**, sin Firebase | Pedido del CEO. HTTPS gratis, requisito para instalar la PWA |
| IA | Entra en v1: **pegar texto del cliente → JSON → revisión humana**, y marca lo que falta | Respuesta del CEO. Sin audio |
| Clave de IA | Vive en el teléfono, cargada en *Configuración*, guardada en IndexedDB. **Nunca en el código** | El CEO eligió "clave en la app"; con repo público en GitHub es la única forma que no la publica |
| Stock | Entra en v1, versión mínima | El CEO no lo sacó del alcance |
| Clientes | Entra en v1 (nombre, teléfono, notas) | Idem |
| Sync multi-dispositivo | **Afuera** | El CEO lo sacó |
| Backup | Exportar archivo + compartir, e importar. Aviso si pasaron 14+ días | Respuesta del CEO |
| Galería | Set precargado (formas, fondos, logo) + fotos que sube ella | Respuesta del CEO |
| Extras pedidos | QR chico con logo de torta en el flyer → `wa.me`. Tarjeta de recomendación con logo, nombre, datos y QR | Pedido del CEO |
| Cálculo | **Receta por opción escalada por factor de tamaño, con escape a precio fijo** | Sin receta, el historial de precios y la revisión de costos no sirven |

## Reuso de Pizarrita (`C:\Users\axelg\menus`) — no reescribir

El motor de QR y de cartel ya está hecho, probado y sin dependencias externas. Se **copia** (no se
importa entre repos) a `src/lib/qr/` y se deja un comentario de origen.

| Archivo origen | Qué da | Uso acá |
|---|---|---|
| `menus/runtime/qr.js` (454 l.) | `codificar(texto, {correccion})`, `svgDe`, `huecoDeLogo`. Codificador QR propio | QR del flyer y de la tarjeta, corrección `'H'` |
| `menus/runtime/qr-arte.js` (618 l.) | `svgArte`, `pintar`, estilo `marca` con logo al centro, `contrasteDe`, `CONTRASTE_MINIMO` | Logo de torta al centro del QR, colores de la marca con contraste verificado |
| `menus/runtime/cartel.js` (459 l.) | `svgCartel(svgDelQr, opciones)`, `PLIEGOS`, fuentes embebidas | Base de la **tarjeta de recomendación** |
| `menus/panel-react/src/modules/qr/dibujo.ts` | Patrón a copiar: `svgDelQr` (l.142), `rasterizar` SVG→canvas (l.333), `fuenteEmbebida` woff2→base64 (l.280), `bajar` (l.179), `imagenDeArchivo` con tope de lado (l.78) | Motor de exportación del flyer |
| `menus/panel-react/src/modules/qr/destinos.ts` l.85-91 | Normalización del número → `https://wa.me/${digitos}` | URL del QR, más `?text=` con mensaje prearmado |
| `menus/worker/fuentes/playfair-latin.woff2` | Tipografía serif ya en disco | Títulos del flyer, embebida y offline |

**Cambio de decisión respecto de lo conversado:** el flyer **no** usa `html-to-image`. Se genera como
**SVG y se rasteriza a PNG** con el mismo camino de Pizarrita. Motivo: `html-to-image` falla con fuentes
web y con imágenes en celulares; el camino SVG con fuentes en base64 ya funciona en producción. Cero
dependencias nuevas para el flyer.

## Diseño (lectura de las 4 imágenes guía)

| Imagen | Qué se toma |
|---|---|
| `1fc5042b…` Dessert Menu | Papel crema con textura, serif negra grande, **QR abajo a la izquierda junto a contactos** → plantilla *Elegante* |
| `35df9bf7…` Cardápio Bolos | Tamaños con precio, masas y rellenos en lista, teléfono en píldora → plantilla *Carta*: la carta de precios armada sola desde las opciones cargadas |
| `bd76635f…` Dough Daze | Crema-rosa, script para títulos, **fotos recortadas en forma de flor/festón**, líneas punteadas hacia el precio → plantilla *Dulce* |
| `135374bd…` Bruniva | Precio adentro de una **estrella/sello**, títulos en píldora, manchas orgánicas → recurso "sello de precio" reutilizable en las tres |

Formato de salida: **1080×1350** (4:5, se ve entero en WhatsApp). Tarjeta: 1050×600 (proporción tarjeta).

`diseno-web.md` exige dos direcciones antes del final. La tarea D1 las maqueta y el CEO elige una:

- **A · Papel y chocolate** — fondo `#F5EDE0`, tinta `#3B2A22`, acento terracota `#A8553A`, detalle `#D9C3A5`. Playfair Display (títulos) + Karla (datos). Sobria, la de las imágenes 1 y 2.
- **B · Rosa empolvado** — fondo `#FFF7EC`, tinta `#3B2A26`, acento `#D98E96`, dorado `#E9B872`. Script (Great Vibes o similar) solo para el nombre de la torta + Cormorant/Karla. Cálida, la de la imagen 3.

La paleta elegida se usa también en la app, con la regla de `ui-ux-pro-max`: contraste 4.5:1, botones de
44px mínimo, navegación inferior de 5 ítems como máximo, íconos SVG (Lucide), cero emoji como ícono.
**Tipografías autoalojadas en `public/fuentes/`**, nunca Google Fonts por CDN: la app es offline y el
SVG del flyer necesita embeberlas.

Navegación inferior (5): **Inicio · Tortas · Ingredientes · Flyer · Más** (Más = Gastos, Opciones,
Galería, Historial, Clientes, Revisar precios, Tarjeta, Configuración/Backup).

## Modelo de datos (Dexie, 10 tablas)

```
ingredientes      id, nombre, categoria, unidad('g'|'ml'|'u'), precio, cantidad, stock?, actualizado, notas
preciosHistorial  id, ingredienteId, precioAnterior, precioNuevo, cantidad, fecha
gastos            id, nombre, categoria, precio, fecha, notas, porTorta(bool)
tamanos           id, nombre('20 cm' | '2 kg'), factor(number), orden
opciones          id, tipo('masa'|'relleno'|'cobertura'|'decoracion'|'extra'), nombre,
                  modo('receta'|'fijo'), precioFijo?, receta:[{ingredienteId, cantidad}], gastos:[gastoId]
tortas            id, fecha, nombre, clienteId?, tamanoId, seleccion{...ids},
                  snapshot{lineas, costo, precioSugerido, precioFinal, ganancia}, estado('borrador'|'realizada')
clientes          id, nombre, telefono, notas
imagenes          id, blob, categoria('torta'|'decoracion'|'fondo'|'logo'|'otro'), principal(bool), creada
config            id='unica', negocio{nombre, telefono, instagram, frase}, margenDefecto, umbralAlerta(%),
                  plantillaFlyer, paleta, claveIA?, ultimoBackup
```

- `unidad` guarda la **base**: kg y l se convierten a g y ml al cargar (el formulario ofrece kg/g/l/ml/u
  y normaliza). Así el cálculo es una sola división.
- `tortas.snapshot` congela costo y líneas del momento. Sin eso, "Revisar precios" no puede comparar.
- Borrar un ingrediente usado en una receta: **no se borra**, se avisa en qué opciones está.

## Cálculo (`src/lib/costos.ts`, funciones puras, con tests)

```
costoIngrediente(ing, cantidadUsada) = ing.precio / ing.cantidad * cantidadUsada
costoOpcion(op, factor)              = op.modo==='fijo' ? op.precioFijo
                                        : Σ costoIngrediente(receta) * factor + Σ gastos
costoTorta                           = Σ costoOpcion(seleccion, tamano.factor) + Σ gastos porTorta
precioSugerido                       = costoTorta * (1 + margen/100)
ganancia                             = precioFinal - costoTorta
variacion(ant, nuevo)                = { abs: nuevo-ant, pct: (nuevo-ant)/ant*100 }  // ant=0 → pct null
```

Nota para el CEO: el brief llama "margen 50%" a pasar de $12.000 a $18.000. Eso es **recargo sobre
costo**, no margen. Se implementa así (es lo que ella espera ver) y en pantalla se rotula
"Ganancia sobre el costo".

Redondeo: precios a $100 hacia arriba en el sugerido; los costos se muestran sin decimales.

**Stock mínimo:** `ingredientes.stock` opcional. Al marcar una torta como *realizada* se descuenta lo
usado. Si al armar no alcanza, aviso amarillo con cuánto falta; nunca bloquea.

## IA (tarea F1, al final)

- Pantalla "Pegar pedido": textarea → botón "Interpretar". Deshabilitado si no hay internet o no hay clave.
- Llamada directa desde el navegador a la API de Claude, modelo `claude-haiku-4-5-20251001`, pidiendo
  JSON con las **opciones existentes pasadas como lista cerrada**, para que no invente nombres.
- Salida: `{tamano, masa, rellenos[], cobertura, decoracion, extras[], cliente?, notas, faltantes[]}`.
- Pantalla de revisión: cada campo con ✓ o ⚠ pendiente, y chips con las opciones reales para completar.
  "Aceptar" llena el constructor; **la IA nunca calcula ni escribe en la base**.
- **Antes de escribir esta tarea, cargar la skill `claude-api`** y verificar el header para acceso
  directo desde navegador y el formato de salida estructurada. No se escribe de memoria.

## Estructura

```
C:\Users\axelg\Pasteleria\
  .specify/                 spec-kit
  public/ manifest.webmanifest, iconos/, fuentes/*.woff2, galeria-base/*.svg
  src/
    db.ts                   Dexie: esquema + seed inicial
    lib/costos.ts           cálculo puro          lib/costos.test.ts
    lib/unidades.ts         normalizar kg→g, l→ml
    lib/qr/                 qr.js, qr-arte.js, cartel.js copiados de Pizarrita
    lib/exportar.ts         SVG→PNG, compartir (Web Share) o descargar
    lib/backup.ts           exportar/importar JSON (imágenes en base64)
    lib/ia.ts
    flyer/plantillas/       elegante.ts, dulce.ts, carta.ts, tarjeta.ts  (devuelven string SVG)
    pantallas/              Inicio, Tortas, Constructor, Ingredientes, Gastos, Opciones,
                            Galeria, Flyer, Tarjeta, Historial, Clientes, RevisarPrecios, Configuracion, PedidoIA
    componentes/            NavInferior, Campo, Monto, Variacion, Aviso
  vite.config.ts  (base: '/<repo>/', vite-plugin-pwa)
  .github/workflows/pages.yml
```

Sin router pesado: estado de pantalla simple o `react-router` en modo hash (GitHub Pages no reescribe rutas).
Sin store global: `useLiveQuery` de Dexie alcanza.

## Tareas — en orden de riesgo, cada una con su verificación

Marca: **[O]** la hace Opus · **[S]** la puede ejecutar Sonnet con este plan.

**Sesión 1 — riesgos y base**
- **T0 [O]** `specify init --here --ai claude` en `C:\Users\axelg\Pasteleria`; volcar este plan en
  `constitution`, `spec`, `plan`, `tasks`. ✔ existen los 4 archivos en `.specify/`.
- **T1 [O] Prueba de exportación (riesgo #1).** Vite+React mínimo, copiar `lib/qr/`, un SVG fijo 1080×1350
  con foto, Playfair embebida y QR con logo → PNG → `navigator.share({files})`. Publicar en Pages.
  ✔ en un Android real: el PNG llega a WhatsApp con la tipografía correcta y el QR escanea.
  Si falla dos veces con variantes: parar y rediagnosticar (B3), no seguir construyendo encima.
- **T2 [S]** PWA instalable: manifest, íconos, vite-plugin-pwa, `base`, workflow de Pages,
  `storage.persist()`. ✔ se instala en Android y abre en modo avión.
- **T3 [S]** Dexie: esquema completo + seed (categorías, tamaños 15/18/20/24 cm, opciones de ejemplo reales
  del rubro). ✔ tablas visibles en DevTools > IndexedDB.
- **T4 [S]** `lib/unidades.ts` + `lib/costos.ts` con Vitest: harina $2000/1kg usa 500 g → $1000;
  huevos $4000/12u usa 4 → $1333; chocolate 5000→7000 → +2000 / +40%; anterior 0 → pct null.
  ✔ `npm test` verde.

**Sesión 2 — administración y constructor**
- **D1 [O]** Maquetar las direcciones A y B (pantalla Constructor + flyer Elegante) → **el CEO elige**.
- **T5 [S]** Shell: navegación inferior, tokens de color/tipografía de la dirección elegida.
- **T6 [S]** Ingredientes: lista con buscador, alta/edición con unidad kg/g/l/ml/u, editar precio guarda en
  `preciosHistorial`, ficha con actual/anterior/variación $ y % + tabla de historial.
  ✔ cambiar chocolate 5000→7000 muestra +$2.000 y +40% y deja 1 fila de historial.
- **T7 [S]** Gastos (CRUD, flag "se suma a cada torta"). Tamaños y Opciones (receta o precio fijo).
  ✔ una opción por receta muestra su costo al lado.
- **T8 [S]** Constructor: tamaño → masa → rellenos → cobertura → decoración → extras, costo en vivo,
  ganancia %, precio sugerido, precio final editable. Costo / ganancia / precio con colores distintos.
  Aviso de stock insuficiente. Guardar como borrador o realizada (descuenta stock).
  ✔ con los datos de T4, el total coincide con la cuenta hecha a mano.

**Sesión 3 — flyer, tarjeta, galería**
- **T9 [S]** Galería: subir desde cámara/galería (redimensionar a 1200 px como `imagenDeArchivo`),
  categorías, principal, set base en SVG (festón, sello estrella, manchas, logo de torta).
- **T10 [O]** Plantillas `elegante`, `dulce`, `carta` como funciones que devuelven SVG, con QR `wa.me` +
  `?text=Hola! Vi tu torta y quiero encargar una` y logo de torta al centro.
  ✔ las tres exportan a PNG en Android y el QR escanea con el logo puesto.
- **T11 [S]** Pantalla Flyer: elegir torta, imagen, plantilla, editar nombre/texto/precio, vista previa,
  "Enviar por WhatsApp" (Web Share) y "Descargar". El costo y la ganancia **nunca** entran al SVG.
- **T12 [S]** Tarjeta de recomendación desde `cartel.js`: logo, nombre, frase, teléfono, Instagram, QR.
  ✔ PNG legible impreso a 9×5 cm.

**Sesión 4 — historial, alertas, backup, IA, pulido**
- **T13 [S]** Historial de tortas y Clientes (simple, sin CRM).
- **T14 [S]** Inicio: tortas del mes, ventas, costos, ganancia, top 3 aumentos. Alerta de aumento en
  Ingredientes si supera `umbralAlerta` (20% por defecto).
- **T15 [S]** Revisar precios: por torta realizada, costo congelado vs. costo con precios de hoy, diferencia,
  aviso "Conviene revisar el precio de venta". Sin cambiar nada solo.
- **T16 [S]** Backup: exportar JSON con imágenes → compartir/descargar; importar con validación y
  confirmación ("esto reemplaza tus datos"); aviso en Inicio si pasaron 14 días.
  ✔ exportar → borrar datos del sitio → importar → todo vuelve, fotos incluidas.
- **F1 [O]** IA (sección de arriba).
- **T17 [S]** Pulido con checklist de `ui-ux-pro-max/references/pro-rules.md`, estados vacíos, textos.
- **T18 [O]** Verificación final (abajo) y entrega.

## Qué NO se hace

Login, usuarios, roles, nube, sincronización, audio, IA que decida precios o diseñe, editor tipo Canva,
gráficos, proveedores, compras, recetas con pasos de elaboración, PDF (el PNG alcanza para WhatsApp),
modo oscuro, notificaciones push.

## Riesgos abiertos

1. **Web Share con archivos** no está en todos los navegadores: si `navigator.canShare({files})` es falso,
   cae a descarga. Se prueba en T1.
2. **Clave de IA en el teléfono:** quien tenga el celular desbloqueado puede leerla. Aceptado por el CEO.
   Mitigación: clave con límite de gasto mensual bajo en la consola de Anthropic.
3. **Cuota de IndexedDB** con muchas fotos: se redimensiona al subir y Inicio muestra el espacio usado.
4. **Datos de la hermana:** nunca se commitean ni se suben. El repo solo tiene código y el set base.
5. **El repo es público** (GitHub Pages gratis no publica repos privados): nada de claves, teléfonos
   reales ni rutas de la máquina del CEO en ningún archivo commiteado.

## Verificación end-to-end

1. `npm test` — cálculo, unidades, variación y backup en verde.
2. `npm run build` sin errores de TypeScript.
3. Deploy a Pages (**con confirmación explícita del CEO**, mostrando qué archivos suben).
4. Android real: instalar desde Chrome → activar modo avión → recorrer los 11 pasos del criterio de éxito.
5. Escanear el QR del flyer y de la tarjeta con otro teléfono → abre WhatsApp con el número y el mensaje.
6. Exportar backup → Configuración del sitio > borrar datos → importar → verificar ingredientes, historial y fotos.
7. Revisar un flyer exportado: no aparece costo ni ganancia en ningún lado.

Commit y push: siempre con confirmación del CEO, stage explícito de archivos.
