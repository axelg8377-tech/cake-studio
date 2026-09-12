/**
 * El QR con la cara del local.  P022 · el QR de marca.
 *
 * `qr.js` decide **qué** módulos van oscuros; este archivo decide **cómo se ven**. La separación
 * no es prolijidad: la matriz sale de una norma congelada en 2006 y no se toca nunca, mientras
 * que esto es diseño y va a cambiar cada vez que el CEO quiera otra estética. Mezclarlos haría
 * que retocar un color obligue a revisar la corrección de errores.
 *
 * **La única regla de este archivo:** todo lo que dibuja se decodifica después con `jsqr`, que es
 * ajeno, en `scripts/verificar-qr-arte.mjs`. Un QR lindo que no abre la carta no es un QR lindo:
 * es un cartón pegado en una mesa que el comensal escanea tres veces y abandona. Por eso ningún
 * estilo entra acá sin su caso en el arnés.
 *
 * Un solo mecanismo, cuatro presets. Cada módulo se pinta como un punto de tinta sobre un fondo
 * que puede ser la foto del local; los presets solo mueven cinco números. Cuatro algoritmos
 * distintos serían cuatro maneras distintas de romper la legibilidad.
 *
 * **Lo que hace que esto funcione es `margen`, y se pagó midiendo.** Un QR con foto no se lee
 * porque el punto de tinta esté ahí: el escáner no muestrea el centro del módulo, promedia el
 * módulo entero y lo compara con un umbral local. Un módulo claro sobre una foto negra se lee
 * oscuro por más punto blanco que tenga en el medio. Por eso el fondo de cada módulo se corrige
 * **lo mínimo necesario** para que su promedio caiga del lado correcto, y ni un poco más: donde
 * la foto ya sirve, la foto queda intacta. Un empuje parejo del 20% —el primer intento— falló
 * en negro pleno, blanco pleno, rayas finas y la foto real.
 *
 * Sin dependencias y sin DOM: lo importan igual el Worker, el panel de React y el arnés de Node.
 * El rasterizador propio existe por eso — `canvas` no está en Node y `<canvas>` no está en el
 * Worker, así que el arnés probaría un dibujo que no es el que baja el cliente.
 */

import { huecoDeLogo } from './qr.js';

/**
 * Los cuatro estilos, que son cuatro decisiones de producto y no cuatro variantes visuales.
 *
 * Los cinco números: `punto` es el lado del módulo que se pinta (1 = se tocan entre sí);
 * `redondeo` va de 0 —cuadrado— a 0.5 —círculo—; `empuje` es el velo mínimo de color sobre la
 * foto, que es estética; `margen` es cuánto contraste se le exige a cada módulo, que es
 * legibilidad; `ojos` es el redondeo de los tres cuadrados de las esquinas.
 *
 * - `generico`: el QR de siempre. Es el piso y **nunca deja de estar disponible**: un local que
 *   imprime en blanco y negro en la impresora del mostrador necesita esto y no una foto.
 * - `marca`: sin foto, con los colores del local y su logo al centro. El caso más común.
 * - `puntos`: la imagen entera se ve, la tinta la puntea por encima. Para logos planos y
 *   dibujos de línea, que es lo que trae un local: su logo, no una foto de estudio.
 * - `trama`: la foto manda y los módulos se disimulan en el medio tono. Para fotos de verdad
 *   —el plato, el frente del local, el perro del dueño—.
 */
export const ESTILOS = {
  generico: { punto: 1, redondeo: 0, empuje: 0, margen: 1, ojos: 0, usaImagen: false },
  marca: { punto: 1, redondeo: 0.25, empuje: 0, margen: 1, ojos: 0.35, usaImagen: false },
  puntos: { punto: 0.3, redondeo: 0.5, empuje: 0, margen: 0.45, ojos: 0.35, usaImagen: true },
  trama: { punto: 0.46, redondeo: 0.5, empuje: 0.3, margen: 0.72, ojos: 0.35, usaImagen: true },
};

export const NOMBRES_DE_ESTILO = Object.keys(ESTILOS);

/** Zona de silencio de la norma, en módulos. Cuatro. No se negocia: es lo que busca la cámara. */
export const ZONA_SILENCIO = 4;

/* ── Color ──────────────────────────────────────────────────────────────────── */

/** `#rgb` o `#rrggbb` a `[r, g, b]`. Falla explícito: un color mal tipeado no se pinta gris. */
export function colorDe(texto) {
  const limpio = String(texto).trim().replace(/^#/, '');
  const largo = limpio.length === 3 ? 3 : 6;
  if (!new RegExp(`^[0-9a-fA-F]{${largo}}$`).test(limpio)) {
    throw new Error(`Color inválido: ${texto}`);
  }
  const par = (i) =>
    largo === 3
      ? parseInt(limpio[i] + limpio[i], 16)
      : parseInt(limpio.slice(i * 2, i * 2 + 2), 16);
  return [par(0), par(1), par(2)];
}

const aHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Luminancia percibida, 0 a 255. Es la que ve el binarizador de un escáner, no el promedio. */
export const luz = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

const mezclar = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * El contraste real entre el módulo oscuro y el claro, de 0 a 1.
 *
 * Se mide antes de dibujar nada. Un local que elige amarillo sobre blanco no se entera de que su
 * QR no abre hasta que un comensal lo intenta en una mesa con poca luz; acá se entera en el panel,
 * mientras elige el color.
 */
export function contrasteDe(oscuro, claro) {
  return Math.abs(luz(colorDe(oscuro)) - luz(colorDe(claro))) / 255;
}

/** Debajo de esto la cámara de un celular barato bajo luz de bar empieza a fallar. Medido con el arnés. */
export const CONTRASTE_MINIMO = 0.45;

/* ── Imagen ─────────────────────────────────────────────────────────────────── */

/**
 * Una imagen es `{ datos, ancho, alto }` con `datos` en RGBA, que es exactamente lo que devuelve
 * `ImageData` en el navegador y lo que da `sharp` en el arnés. Mismo formato de los dos lados:
 * lo que se verifica en Node es el mismo pixel que descarga el cliente.
 */

/**
 * Reduce la imagen a un lado máximo promediando bloques enteros.
 *
 * Sin esto, una foto de 3000 px muestreada en 700 puntos toma un píxel de cada veinte y la foto
 * se ve con ruido de sal y pimienta. El promedio es lo que hace que una foto de celular quede
 * como una foto y no como una textura.
 */
export function reducir(imagen, ladoMaximo) {
  const factor = Math.max(1, Math.floor(Math.min(imagen.ancho, imagen.alto) / ladoMaximo));
  if (factor <= 1) return imagen;

  const ancho = Math.max(1, Math.floor(imagen.ancho / factor));
  const alto = Math.max(1, Math.floor(imagen.alto / factor));
  const datos = new Uint8ClampedArray(ancho * alto * 4);

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const i = ((y * factor + dy) * imagen.ancho + (x * factor + dx)) * 4;
          r += imagen.datos[i];
          g += imagen.datos[i + 1];
          b += imagen.datos[i + 2];
          a += imagen.datos[i + 3];
          n++;
        }
      }
      const j = (y * ancho + x) * 4;
      datos[j] = r / n;
      datos[j + 1] = g / n;
      datos[j + 2] = b / n;
      datos[j + 3] = a / n;
    }
  }
  return { datos, ancho, alto };
}

/**
 * Muestrea la imagen en coordenadas 0..1, recortándola al cuadrado por el lado corto («cover»).
 *
 * Cover y no «contain» porque el local sube el logo que tiene, casi siempre rectangular, y una
 * banda blanca arriba y abajo del QR se ve como un error de la aplicación. Lo que se pierde del
 * recorte se elige con `encuadre`, que el panel expone como un deslizador.
 *
 * Devuelve el color ya compuesto sobre `fondo`: un PNG con transparencia —que es lo que sube un
 * local con logo— muestrearía negro en el canal RGB y pintaría un cuadrado negro.
 */
export function muestrear(imagen, s, t, fondo, encuadre = 0.5) {
  const lado = Math.min(imagen.ancho, imagen.alto);
  const x0 = (imagen.ancho - lado) * encuadre;
  const y0 = (imagen.alto - lado) * encuadre;

  const fx = Math.min(imagen.ancho - 1, Math.max(0, x0 + s * lado - 0.5));
  const fy = Math.min(imagen.alto - 1, Math.max(0, y0 + t * lado - 0.5));
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const px = fx - ix;
  const py = fy - iy;
  const ix2 = Math.min(imagen.ancho - 1, ix + 1);
  const iy2 = Math.min(imagen.alto - 1, iy + 1);

  const leer = (x, y) => {
    const i = (y * imagen.ancho + x) * 4;
    return [imagen.datos[i], imagen.datos[i + 1], imagen.datos[i + 2], imagen.datos[i + 3] / 255];
  };

  const a = leer(ix, iy);
  const b = leer(ix2, iy);
  const c = leer(ix, iy2);
  const d = leer(ix2, iy2);

  const arriba = mezclar(a, b, px);
  const abajo = mezclar(c, d, px);
  const color = mezclar(arriba, abajo, py);
  const alfa = (a[3] * (1 - px) + b[3] * px) * (1 - py) + (c[3] * (1 - px) + d[3] * px) * py;

  return mezclar(fondo, color, alfa);
}

/* ── Geometría del QR ───────────────────────────────────────────────────────── */

/** Los tres ojos, por la esquina de su bloque de 7×7. El cuarto no existe: así se sabe la rotación. */
function ojosDe(tamano) {
  return [
    { x: 0, y: 0 },
    { x: tamano - 7, y: 0 },
    { x: 0, y: tamano - 7 },
  ];
}

/** La esquina del bloque de 8×8 —ojo más separador— al que pertenece este ojo. */
function bloqueDelOjo(ojo, tamano) {
  return { x0: ojo.x === 0 ? 0 : tamano - 8, y0: ojo.y === 0 ? 0 : tamano - 8 };
}

/**
 * Distancia con signo a un cuadrado de esquinas redondeadas, en módulos. Negativa adentro.
 *
 * Una sola primitiva para todo —módulos, ojos, hueco del logo— porque `redondeo` la lleva de
 * cuadrado a círculo de forma continua. Dos funciones separadas terminarían con un módulo
 * redondo y un ojo cuadrado por descuido de un parámetro.
 */
function distancia(dx, dy, mitad, redondeo) {
  const r = Math.min(redondeo, mitad);
  const qx = Math.abs(dx) - (mitad - r);
  const qy = Math.abs(dy) - (mitad - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/**
 * Si el punto (u, v) —en módulos— cae en un ojo, con qué color se pinta.
 *
 * Los ojos se dibujan como anillos completos en vez de módulo por módulo porque son lo único que
 * la cámara busca antes de saber que hay un QR: un ojo con el borde comido por el medio tono es
 * un QR que no se encuentra, y no uno que se lee mal. Por eso también son los únicos que ignoran
 * la foto por completo.
 *
 * **Redondos del todo no**: se probó y `jsqr` deja de encontrarlos. El ojo es lo que le da la
 * proporción 1:1:3:1:1 al escáner en cada línea que lo cruza, y un círculo solo la cumple en la
 * línea que pasa por el centro. Con `ojos: 0.35` la esquina se ablanda y las líneas siguen
 * midiendo lo que tienen que medir.
 */
function tintaDelOjo(u, v, tamano, redondeo) {
  for (const ojo of ojosDe(tamano)) {
    // El bloque de ojo más separador son 8×8 módulos **pegados a su esquina**, y no 7×7 con medio
    // módulo de aire a cada lado. Centrarlo en el ojo lo corre medio módulo de la grilla y deja la
    // mitad del módulo del separador pintada como dato: un módulo de diferencia entre el PNG y el
    // SVG, que es exactamente lo que el escáner mira para encontrar el código.
    const { x0, y0 } = bloqueDelOjo(ojo, tamano);
    if (u < x0 || u >= x0 + 8 || v < y0 || v >= y0 + 8) continue;
    const dx = u - (ojo.x + 3.5);
    const dy = v - (ojo.y + 3.5);
    if (distancia(dx, dy, 1.5, redondeo * 3) <= 0) return 'oscuro';
    if (distancia(dx, dy, 2.5, redondeo * 5) <= 0) return 'claro';
    if (distancia(dx, dy, 3.5, redondeo * 7) <= 0) return 'oscuro';
    return 'claro'; // el separador blanco de un módulo: sin él, el ojo se funde con el dato
  }
  return null;
}

/**
 * Promedio de la imagen sobre cada módulo. Una muestra por módulo, exacta, calculada una vez.
 *
 * Es el número que ve el escáner cuando decide si un módulo es oscuro: no muestrea el centro,
 * promedia la celda. Sacarlo con `muestrear` en el centro daría el color de un píxel y una foto
 * con un brillo justo ahí mentiría sobre el módulo entero.
 */
export function promedioPorModulo(imagen, tamano, encuadre, fondo) {
  const medios = new Float32Array(tamano * tamano * 3);
  const lado = Math.min(imagen.ancho, imagen.alto);
  const x0 = (imagen.ancho - lado) * encuadre;
  const y0 = (imagen.alto - lado) * encuadre;
  const paso = lado / tamano;

  for (let my = 0; my < tamano; my++) {
    for (let mx = 0; mx < tamano; mx++) {
      let r = 0, g = 0, b = 0, n = 0;
      const desdeX = Math.floor(x0 + mx * paso);
      const desdeY = Math.floor(y0 + my * paso);
      const hastaX = Math.max(desdeX + 1, Math.floor(x0 + (mx + 1) * paso));
      const hastaY = Math.max(desdeY + 1, Math.floor(y0 + (my + 1) * paso));
      for (let y = desdeY; y < hastaY; y++) {
        for (let x = desdeX; x < hastaX; x++) {
          const i = (Math.min(imagen.alto - 1, y) * imagen.ancho + Math.min(imagen.ancho - 1, x)) * 4;
          const a = imagen.datos[i + 3] / 255;
          r += imagen.datos[i] * a + fondo[0] * (1 - a);
          g += imagen.datos[i + 1] * a + fondo[1] * (1 - a);
          b += imagen.datos[i + 2] * a + fondo[2] * (1 - a);
          n++;
        }
      }
      const j = (my * tamano + mx) * 3;
      medios[j] = r / n;
      medios[j + 1] = g / n;
      medios[j + 2] = b / n;
    }
  }
  return medios;
}

/**
 * Cuánto hay que teñir el fondo de este módulo para que el escáner no dude. De 0 a 1.
 *
 * Cero significa que la foto ya estaba del lado correcto y se deja intacta —que es lo que hace
 * que el resultado se parezca a la foto y no a un QR con una foto de fondo—. Uno significa que
 * la foto ahí no sirve para nada y se tapa entera.
 */
function empujeNecesario(fondo, tinta, umbral, margenAbs, oscuro) {
  const objetivo = oscuro ? umbral - margenAbs : umbral + margenAbs;
  const luzFondo = luz(fondo);
  const luzTinta = luz(tinta);
  if (oscuro ? luzFondo <= objetivo : luzFondo >= objetivo) return 0;
  if (Math.abs(luzTinta - luzFondo) < 1) return 1;
  return Math.min(1, Math.max(0, (objetivo - luzFondo) / (luzTinta - luzFondo)));
}

/* ── El dibujo ──────────────────────────────────────────────────────────────── */

/**
 * Normaliza las opciones una sola vez, para que el rasterizador no decida nada por píxel.
 *
 * @param {{modulos: Uint8Array, tamano: number}} qr
 * @param {object} opciones
 *   `estilo` uno de ESTILOS · `oscuro`/`claro`/`acento` colores · `imagen` `{datos,ancho,alto}` ·
 *   `encuadre` 0..1 · `logo` imagen para el centro · `huecoLogo` fracción del lado (tope 0.3) ·
 *   `marco` `{ forma: 'circulo'|'cuadrado'|'ninguno', color, grosor }` · `escala` px por módulo.
 */
export function planDe(qr, opciones = {}) {
  const nombre = opciones.estilo ?? 'generico';
  const estilo = ESTILOS[nombre];
  if (!estilo) throw new Error(`Estilo de QR desconocido: ${nombre}`);

  const oscuro = colorDe(opciones.oscuro ?? '#000000');
  const claro = colorDe(opciones.claro ?? '#ffffff');
  const acento = colorDe(opciones.acento ?? opciones.oscuro ?? '#000000');

  // El marco vive **afuera** de la zona de silencio, nunca adentro. Un anillo de color que se come
  // medio módulo de silencio se ve igual de lindo y deja de leerse en el 20% de los celulares.
  //
  // Por eso el marco redondo agranda tanto el lienzo: un círculo que rodea un cuadrado tiene que
  // pasar por afuera de sus esquinas, y la esquina del silencio está a `√2` del centro. El primer
  // intento lo dibujó al ras del lado y el anillo cruzó las cuatro esquinas del silencio —el QR
  // seguía entero y no se leía—. Quien quiera un marco ajustado usa `redondeado`, que sigue el
  // contorno del QR y solo cuesta su grosor.
  const marco = opciones.marco?.forma && opciones.marco.forma !== 'ninguno' ? opciones.marco : null;
  const grosorMarco = marco ? Math.max(0.5, marco.grosor ?? 1.5) : 0;
  // `AIRE` es el respiro entre el trazo y el borde del archivo. Cuenta contra el silencio igual
  // que el trazo: la primera versión lo olvidó y dejó 3,75 módulos limpios en vez de 4.
  //
  // Y el marco cuesta lugar por sus esquinas. La esquina del silencio está en la diagonal, así
  // que **cuanto más redondeado el marco, más lejos tiene que pasar**: un trazo con esquina de
  // radio `r` invade la diagonal en `r·(1 − 1/√2)`. De ahí sale la fórmula, y de ahí sale que el
  // marco redondo agrande tanto el archivo —para un círculo, `r` es el radio entero y la cuenta
  // se convierte en el √2 de siempre—. El primer intento dibujó el círculo al ras del lado: el
  // QR quedaba entero, se veía bien y no lo leía ningún teléfono.
  const AIRE = 0.25;
  const MARGEN_DIAGONAL = 1 - 1 / Math.SQRT2;
  const ESQUINA_REDONDEADA = 3; // módulos, fijo: proporcional al lado cambia con cada versión
  const silencio = qr.tamano / 2 + ZONA_SILENCIO;
  const radioDentro = !marco
    ? silencio
    : marco.forma === 'circulo'
      ? silencio * Math.SQRT2
      : silencio + ESQUINA_REDONDEADA * MARGEN_DIAGONAL * (marco.forma === 'redondeado' ? 1 : 0);
  const zona = marco
    ? radioDentro + grosorMarco + AIRE + 0.05 - qr.tamano / 2
    : ZONA_SILENCIO;

  const imagen = estilo.usaImagen && opciones.imagen ? reducir(opciones.imagen, qr.tamano * 4) : null;
  const logo = opciones.logo ? reducir(opciones.logo, qr.tamano * 4) : null;
  const hueco = huecoDeLogo(qr, logo ? (opciones.huecoLogo ?? 0.22) : 0);
  const encuadre = opciones.encuadre ?? 0.5;

  // El empuje se resuelve acá, una vez por módulo, y no en el rasterizador: son 700 cuentas
  // contra las 4 millones que tiene una descarga de imprenta.
  const umbral = (luz(oscuro) + luz(claro)) / 2;
  const margenAbs = (estilo.margen * Math.abs(luz(claro) - luz(oscuro))) / 2;
  // **El velo va a negro o a blanco puros, nunca al color de la marca.** Es lo que conserva el
  // color del logo: oscurecer multiplicando mantiene el matiz, y teñir de bordó lo pierde. En el
  // primer intento el sticker naranja de Pizarrita salía en gris azulado — leía perfecto y no era
  // la marca de nadie. Los colores del local entran por el punto de tinta, que va encima.
  const NEGRO = [0, 0, 0];
  const BLANCO = [255, 255, 255];
  const medios = imagen ? promedioPorModulo(imagen, qr.tamano, encuadre, claro) : null;
  const empujes = new Float32Array(qr.tamano * qr.tamano);
  // Sin foto no hay nada que corregir: el fondo ya es el color claro y el punto hace todo el
  // trabajo. Empujarlo igual pintaría el módulo entero y se comería el redondeo de `marca`.
  if (medios) {
    for (let i = 0; i < empujes.length; i++) {
      const esOscuro = qr.modulos[i] === 1;
      empujes[i] = Math.max(
        estilo.empuje,
        empujeNecesario(
          [medios[i * 3], medios[i * 3 + 1], medios[i * 3 + 2]],
          esOscuro ? NEGRO : BLANCO,
          umbral,
          margenAbs,
          esOscuro,
        ),
      );
    }
  }

  return {
    empujes,
    estilo,
    nombreEstilo: nombre,
    oscuro,
    claro,
    acento,
    imagen,
    logo,
    hueco,
    encuadre,
    marco: marco ? { ...marco, grosor: grosorMarco, color: colorDe(marco.color ?? aHex(acento)) } : null,
    zona,
    escala: Math.max(1, Math.round(opciones.escala ?? 12)),
    lado: Math.ceil((qr.tamano + zona * 2) * Math.max(1, Math.round(opciones.escala ?? 12))),
  };
}

/**
 * El QR pintado, en RGBA. Es la salida que baja el cliente y la que lee el arnés.
 *
 * Una sola pasada por píxel y sin capas intermedias: en el navegador esto corre en el hilo de la
 * interfaz cada vez que el dueño mueve un color, y una previa que tarda medio segundo se siente
 * rota aunque el resultado sea correcto.
 */
export function pintar(qr, opciones = {}) {
  const plan = planDe(qr, opciones);
  const { escala, zona, lado, oscuro, claro, acento, estilo } = plan;
  const datos = new Uint8ClampedArray(lado * lado * 4).fill(255);

  // El centro se toma de la matriz y no del lienzo: `lado` está redondeado hacia arriba y usarlo
  // correría el marco medio píxel hacia una esquina.
  const centro = (zona + qr.tamano / 2) * escala;
  const radioMarcoFuera = centro - escala * 0.25;
  const redondeoMarco =
    plan.marco?.forma === 'circulo'
      ? radioMarcoFuera
      : plan.marco?.forma === 'redondeado'
        ? (3 + plan.marco.grosor) * escala
        : 0;

  for (let py = 0; py < lado; py++) {
    for (let px = 0; px < lado; px++) {
      const u = (px + 0.5) / escala - zona;
      const v = (py + 0.5) / escala - zona;
      let color = claro;

      if (plan.marco) {
        // La distancia con signo al contorno, no al centro: es la única que da un trazo de grosor
        // parejo en las tres formas. Medir desde el centro curva el trazo hacia adentro en las
        // esquinas y se come el silencio justo ahí, que fue lo que pasó en el primer intento.
        const d = distancia(px + 0.5 - centro, py + 0.5 - centro, radioMarcoFuera, redondeoMarco);
        if (d <= 0 && d >= -plan.marco.grosor * escala) color = plan.marco.color;
      }

      if (u >= 0 && v >= 0 && u < qr.tamano && v < qr.tamano) {
        color = tintaDe(qr, plan, u, v, escala);
      }

      const i = (py * lado + px) * 4;
      datos[i] = color[0];
      datos[i + 1] = color[1];
      datos[i + 2] = color[2];
      datos[i + 3] = 255;
    }
  }

  return { datos, lado, plan };
}

/** El color de un punto de adentro de la matriz. Separado de `pintar` para poder probarlo solo. */
function tintaDe(qr, plan, u, v, escala) {
  const { estilo, oscuro, claro, acento } = plan;
  const mx = Math.floor(u);
  const my = Math.floor(v);

  const enOjo = tintaDelOjo(u, v, qr.tamano, estilo.ojos);
  if (enOjo) return enOjo === 'oscuro' ? acento : claro;

  // El hueco del logo: los módulos de abajo se pierden a propósito y los recupera la corrección
  // de errores. Es el único lugar donde se tapa dato, y por eso está topeado en `huecoDeLogo`.
  if (plan.hueco && mx >= plan.hueco.desde && mx < plan.hueco.hasta && my >= plan.hueco.desde && my < plan.hueco.hasta) {
    if (!plan.logo) return claro;
    const s = (u - plan.hueco.desde) / plan.hueco.ancho;
    const t = (v - plan.hueco.desde) / plan.hueco.ancho;
    return muestrear(plan.logo, s, t, claro, 0.5);
  }

  const indice = my * qr.tamano + mx;
  const esOscuro = qr.modulos[indice] === 1;
  const tinta = esOscuro ? oscuro : claro;

  const base = plan.imagen
    ? muestrear(plan.imagen, u / qr.tamano, v / qr.tamano, claro, plan.encuadre)
    : claro;
  const fondo = mezclar(base, esOscuro ? [0, 0, 0] : [255, 255, 255], plan.empujes[indice]);

  // Media distancia de píxel de suavizado: sin esto los puntos quedan con escalera y la foto se
  // ve barata; con más, el punto pierde borde y el escáner duda.
  const d = distancia(u - (mx + 0.5), v - (my + 0.5), estilo.punto / 2, estilo.redondeo * estilo.punto);
  const cobertura = Math.min(1, Math.max(0, -d * escala + 0.5));

  return mezclar(fondo, tinta, cobertura);
}

/* ── SVG ────────────────────────────────────────────────────────────────────── */

/**
 * El mismo dibujo en vector, para la imprenta y para el `<img>` del panel.
 *
 * Sale del mismo `planDe` y de la misma geometría que el raster —los mismos centros, los mismos
 * radios, los mismos anillos de ojo—. Si fueran dos dibujos distintos, el arnés estaría
 * verificando el PNG y el local mandaría a imprimir el SVG.
 *
 * La foto va embebida como data URI porque un `<image href>` a una URL externa convierte un
 * archivo que se manda por WhatsApp en un archivo que se ve roto en la imprenta.
 */
export function svgArte(qr, opciones = {}) {
  const plan = planDe(qr, opciones);
  const { zona, oscuro, claro, acento, estilo } = plan;
  const lado = qr.tamano + zona * 2;
  const partes = [`<rect width="${lado}" height="${lado}" fill="${aHex(claro)}"/>`];
  const n = (v) => Number(v.toFixed(3));

  if (plan.marco) {
    const c = zona + qr.tamano / 2;
    const r = c - 0.25 - plan.marco.grosor / 2;
    const rx = plan.marco.forma === 'redondeado' ? n(3 + plan.marco.grosor / 2) : 0;
    partes.push(
      plan.marco.forma === 'circulo'
        ? `<circle cx="${c}" cy="${c}" r="${n(r)}" fill="none" stroke="${aHex(plan.marco.color)}" stroke-width="${plan.marco.grosor}"/>`
        : `<rect x="${n(c - r)}" y="${n(c - r)}" width="${n(r * 2)}" height="${n(r * 2)}" rx="${rx}" fill="none" stroke="${aHex(plan.marco.color)}" stroke-width="${plan.marco.grosor}"/>`,
    );
  }

  if (opciones.imagenDataUri && estilo.usaImagen) {
    partes.push(
      `<clipPath id="area"><rect x="${zona}" y="${zona}" width="${qr.tamano}" height="${qr.tamano}"/></clipPath>`,
      `<g clip-path="url(#area)"><image x="${zona}" y="${zona}" width="${qr.tamano}" height="${qr.tamano}" preserveAspectRatio="xMidYMid slice" href="${opciones.imagenDataUri}"/></g>`,
    );
  }

  const tapado = (x, y) =>
    plan.hueco && x >= plan.hueco.desde && x < plan.hueco.hasta && y >= plan.hueco.desde && y < plan.hueco.hasta;
  const enOjo = (x, y) => tintaDelOjo(x + 0.5, y + 0.5, qr.tamano, estilo.ojos) !== null;

  // La corrección del fondo, cuantizada al 5% para que 700 módulos entren en pocos grupos en vez
  // de en 700 atributos distintos. Es el mismo velo que aplica el raster, con el mismo valor.
  const velos = new Map();
  if (plan.imagen) {
    for (let y = 0; y < qr.tamano; y++) {
      for (let x = 0; x < qr.tamano; x++) {
        if (enOjo(x, y) || tapado(x, y)) continue;
        const i = y * qr.tamano + x;
        const opacidad = Math.round(plan.empujes[i] * 20) / 20;
        if (opacidad <= 0) continue;
        const llave = `${qr.modulos[i] ? 'o' : 'c'}|${opacidad}`;
        if (!velos.has(llave)) velos.set(llave, []);
        velos.get(llave).push(`<rect x="${x + zona}" y="${y + zona}" width="1" height="1"/>`);
      }
    }
    for (const [llave, rects] of velos) {
      const [cual, opacidad] = llave.split('|');
      // Negro y blanco, igual que el raster: un `<rect>` negro con opacidad sobre la foto es
      // exactamente la misma cuenta que oscurecer multiplicando.
      partes.push(
        `<g fill="${cual === 'o' ? '#000000' : '#ffffff'}" fill-opacity="${opacidad}">${rects.join('')}</g>`,
      );
    }
  }

  const p = estilo.punto;
  const rx = n(estilo.redondeo * p);
  partes.push(`<defs><rect id="p" width="${n(p)}" height="${n(p)}" rx="${rx}"/></defs>`);
  for (const cual of ['claro', 'oscuro']) {
    const rects = [];
    for (let y = 0; y < qr.tamano; y++) {
      for (let x = 0; x < qr.tamano; x++) {
        if (enOjo(x, y) || tapado(x, y)) continue;
        const bit = qr.modulos[y * qr.tamano + x];
        if ((bit ? 'oscuro' : 'claro') !== cual) continue;
        // Sin foto detrás, el punto claro sobre fondo claro es tinta que la imprenta cobra y nadie ve.
        if (!bit && !estilo.usaImagen) continue;
        rects.push(`<use href="#p" x="${n(x + zona + (1 - p) / 2)}" y="${n(y + zona + (1 - p) / 2)}"/>`);
      }
    }
    if (rects.length) {
      // Un `<use>` por módulo en vez de un `<rect>` entero: son 700 nodos idénticos salvo por la
      // posición, y el archivo pasa de 39 KB a la mitad. Pesa en la cámara del local, que lo
      // manda dibujado adentro de la página.
      // `href` va en cada `<use>` y no en el `<g>`: no se hereda, y ponerlo arriba deja el SVG
      // en blanco sin que nada falle hasta que alguien abre el archivo.
      partes.push(`<g fill="${aHex(cual === 'oscuro' ? oscuro : claro)}">${rects.join('')}</g>`);
    }
  }

  for (const ojo of ojosDe(qr.tamano)) {
    // **El separador va explícito.** El raster lo pinta porque `tintaDelOjo` devuelve «claro» en
    // la banda de un módulo alrededor del ojo; el SVG salteaba esa banda y dejaba la foto abajo.
    // Con fondo blanco no se veía —el fondo ya era blanco— y con una foto el ojo se funde con la
    // imagen: el escáner deja de encontrar el QR aunque el archivo se vea perfecto.
    const bloque = bloqueDelOjo(ojo, qr.tamano);
    partes.push(
      `<rect x="${bloque.x0 + zona}" y="${bloque.y0 + zona}" width="8" height="8" fill="${aHex(claro)}"/>`,
    );
    const anillo = (mitad, color) => {
      const r = n(estilo.ojos * mitad * 2);
      return `<rect x="${n(ojo.x + 3.5 + zona - mitad)}" y="${n(ojo.y + 3.5 + zona - mitad)}" width="${mitad * 2}" height="${mitad * 2}" rx="${r}" fill="${color}"/>`;
    };
    partes.push(anillo(3.5, aHex(acento)), anillo(2.5, aHex(claro)), anillo(1.5, aHex(acento)));
  }

  if (plan.hueco && opciones.logoDataUri) {
    partes.push(
      `<image x="${plan.hueco.desde + zona}" y="${plan.hueco.desde + zona}" width="${plan.hueco.ancho}" height="${plan.hueco.ancho}" preserveAspectRatio="xMidYMid slice" href="${opciones.logoDataUri}"/>`,
    );
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" width="${lado * 16}" height="${lado * 16}">`,
    ...partes,
    '</svg>',
  ].join('');
}
