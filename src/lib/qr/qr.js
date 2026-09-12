/**
 * Codificador de QR propio. ISO/IEC 18004, modo byte, versiones 1 a 10.
 *
 * Por qué escrito y no traído: la aceptación 6 de P009 pide cero peticiones a terceros, y el
 * antecedente ya se pagó — el QR de Comandera colgaba de `api.qrserver.com` y el CSP lo volteó en
 * producción. Una librería npm no rompe el CSP, pero sí entra al bundle del panel y a la cadena de
 * suministro de algo que se imprime en papel y se pega en una mesa. Son 300 líneas de un formato
 * congelado desde 2006: se escriben una vez y no se tocan nunca más.
 *
 * El límite de la versión 10 es deliberado: a nivel Q entran 122 bytes, y la URL más larga que
 * este producto genera —`https://qr.pizarrita.com/{codigo}` con código de 8— son 32. Subir a la 40
 * agregaría tablas que nadie va a ejercitar.
 *
 * Lo verifica `scripts/verificar-qr.mjs` decodificando la salida con un decodificador ajeno.
 * Que nuestro encoder y nuestro test se pongan de acuerdo no prueba nada.
 */

/** Bits de formato de cada nivel. No es el orden de las tablas: la norma los numera así. */
const BITS_NIVEL = { L: 1, M: 0, Q: 3, H: 2 };

/** Codewords de corrección por bloque, indexado por versión. El 0 no se usa. */
const ECC_POR_BLOQUE = {
  L: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  M: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
  Q: [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
  H: [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
};

/** Cantidad de bloques de corrección, indexado por versión. */
const BLOQUES = {
  L: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  M: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
  Q: [0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
  H: [0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
};

export const VERSION_MAXIMA = 10;
export const NIVELES = ['L', 'M', 'Q', 'H'];

/**
 * Codifica un texto en una matriz de módulos.
 *
 * @param {string} texto  lo que lee el celular. Se codifica en UTF-8.
 * @param {{ correccion?: 'L'|'M'|'Q'|'H', mascara?: number }} opciones
 * @returns {{ modulos: Uint8Array, tamano: number, version: number, correccion: string, mascara: number }}
 *          `modulos[y * tamano + x]` es 1 si el módulo es oscuro. Sin zona de silencio: la agrega
 *          quien dibuja, porque depende del medio (la hoja A4 ya tiene margen de papel).
 */
export function codificar(texto, { correccion = 'M', mascara = null } = {}) {
  if (typeof texto !== 'string' || texto.length === 0) {
    throw new Error('El QR necesita un texto no vacío');
  }
  if (!NIVELES.includes(correccion)) {
    throw new Error(`Nivel de corrección desconocido: ${correccion}`);
  }

  const datos = new TextEncoder().encode(texto);
  const version = elegirVersion(datos.length, correccion);
  const codewords = codewordsDe(datos, version, correccion);
  const tamano = version * 4 + 17;

  const modulos = new Uint8Array(tamano * tamano);
  const esFuncion = new Uint8Array(tamano * tamano);
  const lienzo = { modulos, esFuncion, tamano, version, correccion };

  dibujarPatrones(lienzo);
  dibujarCodewords(lienzo, codewords);

  const elegida = mascara === null ? mejorMascara(lienzo) : mascara;
  aplicarMascara(lienzo, elegida);
  dibujarFormato(lienzo, elegida);

  // `esFuncion` sale junto con los módulos porque quien dibuja necesita distinguir el dato de la
  // estructura: `qr-arte.js` puede tapar datos con una foto —para eso está la corrección de
  // errores— pero no puede tocar un ojo ni el sincronismo sin que el QR deje de encontrarse.
  return { modulos, esFuncion, tamano, version, correccion, mascara: elegida };
}

/** La versión más chica donde entra el dato. Falla explícito en vez de recortar el texto. */
function elegirVersion(largo, nivel) {
  for (let version = 1; version <= VERSION_MAXIMA; version++) {
    const capacidad = codewordsDeDatos(version, nivel);
    const bitsCuenta = version < 10 ? 8 : 16;
    if (4 + bitsCuenta + largo * 8 <= capacidad * 8) return version;
  }
  throw new Error(`${largo} bytes no entran en un QR versión ${VERSION_MAXIMA} nivel ${nivel}`);
}

/**
 * Módulos que quedan para datos, antes de dividir por 8.
 *
 * Se calcula en vez de tabularse: la tabla de la norma son 40 filas y cada una es una oportunidad
 * de tipear mal un número que después falla en un solo tamaño de QR.
 */
function modulosCrudos(version) {
  let total = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alineaciones = Math.floor(version / 7) + 2;
    total -= (25 * alineaciones - 10) * alineaciones - 55;
    if (version >= 7) total -= 36;
  }
  return total;
}

const codewordsTotales = (version) => Math.floor(modulosCrudos(version) / 8);

const codewordsDeDatos = (version, nivel) =>
  codewordsTotales(version) - ECC_POR_BLOQUE[nivel][version] * BLOQUES[nivel][version];

/** Bits de datos -> codewords con relleno, corrección por bloque, e intercalado. */
function codewordsDe(datos, version, nivel) {
  const capacidad = codewordsDeDatos(version, nivel);
  const bits = [];
  const empujar = (valor, cantidad) => {
    for (let i = cantidad - 1; i >= 0; i--) bits.push((valor >>> i) & 1);
  };

  empujar(0b0100, 4); // modo byte
  empujar(datos.length, version < 10 ? 8 : 16);
  for (const byte of datos) empujar(byte, 8);

  // Terminador, relleno hasta byte entero, y los dos rellenos que alterna la norma.
  empujar(0, Math.min(4, capacidad * 8 - bits.length));
  empujar(0, (8 - (bits.length % 8)) % 8);
  for (let relleno = 0xec; bits.length < capacidad * 8; relleno ^= 0xec ^ 0x11) empujar(relleno, 8);

  const datosCompletos = new Uint8Array(capacidad);
  for (let i = 0; i < bits.length; i++) datosCompletos[i >>> 3] |= bits[i] << (7 - (i & 7));

  return intercalar(datosCompletos, version, nivel);
}

/**
 * Corrección por bloque + intercalado.
 *
 * El intercalado es lo que hace que una mancha de café sobre el papel se reparta entre todos los
 * bloques en vez de destruir uno solo: cada bloque corrige hasta la mitad de sus codewords de
 * corrección, y un daño concentrado se lleva un bloque entero.
 */
function intercalar(datos, version, nivel) {
  const cantidadBloques = BLOQUES[nivel][version];
  const largoEcc = ECC_POR_BLOQUE[nivel][version];
  const totales = codewordsTotales(version);
  const largoBloqueCorto = Math.floor(totales / cantidadBloques);
  const bloquesCortos = cantidadBloques - (totales % cantidadBloques);

  const bloques = [];
  let leidos = 0;
  for (let i = 0; i < cantidadBloques; i++) {
    const largoDatos = largoBloqueCorto - largoEcc + (i < bloquesCortos ? 0 : 1);
    const parte = [...datos.slice(leidos, leidos + largoDatos)];
    leidos += largoDatos;
    const ecc = correccion(parte, largoEcc);
    // Al bloque corto se le mete un byte de relleno para que todos midan igual. Sin él, el índice
    // del intercalado se corre justo al pasar de datos a corrección y el QR no lo lee nadie: es el
    // defecto que tuvo este archivo hasta que lo cazó el decodificador ajeno.
    if (i < bloquesCortos) parte.push(0);
    bloques.push([...parte, ...ecc]);
  }

  const salida = [];
  for (let i = 0; i < bloques[0].length; i++) {
    for (let j = 0; j < bloques.length; j++) {
      // Y acá se saltea ese relleno, que no viaja en el QR.
      if (i === largoBloqueCorto - largoEcc && j < bloquesCortos) continue;
      salida.push(bloques[j][i]);
    }
  }
  return Uint8Array.from(salida);
}

/* ── Reed-Solomon sobre GF(256), polinomio 0x11D ────────────────────────────── */

const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
}

const multiplicar = (a, b) => (a === 0 || b === 0 ? 0 : EXP[(LOG[a] + LOG[b]) % 255]);

/** Divide el bloque por el polinomio generador y devuelve el resto: eso son los codewords de ECC. */
function correccion(bloque, grado) {
  const generador = new Uint8Array(grado);
  generador[grado - 1] = 1;
  for (let i = 0, raiz = 1; i < grado; i++) {
    for (let j = 0; j < grado; j++) {
      generador[j] = multiplicar(generador[j], raiz);
      if (j + 1 < grado) generador[j] ^= generador[j + 1];
    }
    raiz = multiplicar(raiz, 0x02);
  }

  const resto = new Uint8Array(grado);
  for (const byte of bloque) {
    const factor = byte ^ resto[0];
    resto.copyWithin(0, 1);
    resto[grado - 1] = 0;
    for (let i = 0; i < grado; i++) resto[i] ^= multiplicar(generador[i], factor);
  }
  return resto;
}

/* ── Dibujo ─────────────────────────────────────────────────────────────────── */

function poner(l, x, y, oscuro, funcional = true) {
  l.modulos[y * l.tamano + x] = oscuro ? 1 : 0;
  if (funcional) l.esFuncion[y * l.tamano + x] = 1;
}

const leer = (l, x, y) => l.modulos[y * l.tamano + x];

function dibujarPatrones(l) {
  const n = l.tamano;

  // Sincronismo: la línea alternada que le dice al lector cuánto mide un módulo.
  for (let i = 0; i < n; i++) {
    poner(l, 6, i, i % 2 === 0);
    poner(l, i, 6, i % 2 === 0);
  }

  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) dibujarFinder(l, cx, cy);

  const posiciones = posicionesAlineacion(l.version);
  for (let i = 0; i < posiciones.length; i++) {
    for (let j = 0; j < posiciones.length; j++) {
      // Las tres esquinas ya las ocupa un patrón de búsqueda.
      const esquina = (i === 0 && j === 0) || (i === 0 && j === posiciones.length - 1) || (i === posiciones.length - 1 && j === 0);
      if (!esquina) dibujarAlineacion(l, posiciones[i], posiciones[j]);
    }
  }

  dibujarFormato(l, 0); // provisorio: reserva las celdas. El definitivo se escribe con la máscara.
  dibujarVersion(l);
}

function dibujarFinder(l, cx, cy) {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= l.tamano || y >= l.tamano) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      poner(l, x, y, d !== 2 && d <= 3); // el anillo de distancia 2 es el blanco de adentro
    }
  }
}

function dibujarAlineacion(l, cx, cy) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      poner(l, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function posicionesAlineacion(version) {
  if (version === 1) return [];
  const cantidad = Math.floor(version / 7) + 2;
  const paso = Math.ceil((version * 4 + 4) / (cantidad * 2 - 2)) * 2;
  const posiciones = [6];
  for (let pos = version * 4 + 10; posiciones.length < cantidad; pos -= paso) posiciones.splice(1, 0, pos);
  return posiciones;
}

/** Los 15 bits de formato, con BCH(15,5) y la máscara fija de la norma. Van dos veces. */
function dibujarFormato(l, mascara) {
  const datos = (BITS_NIVEL[l.correccion] << 3) | mascara;
  let resto = datos;
  for (let i = 0; i < 10; i++) resto = (resto << 1) ^ ((resto >>> 9) * 0x537);
  const bits = (((datos << 10) | resto) ^ 0x5412) & 0x7fff;
  const bit = (i) => ((bits >>> i) & 1) !== 0;
  const n = l.tamano;

  for (let i = 0; i <= 5; i++) poner(l, 8, i, bit(i));
  poner(l, 8, 7, bit(6));
  poner(l, 8, 8, bit(7));
  poner(l, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) poner(l, 14 - i, 8, bit(i));

  for (let i = 0; i < 8; i++) poner(l, n - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) poner(l, 8, n - 15 + i, bit(i));
  poner(l, 8, n - 8, true); // módulo oscuro: siempre 1, siempre acá
}

/** Los 18 bits de versión, con BCH(18,6). Solo desde la versión 7. */
function dibujarVersion(l) {
  if (l.version < 7) return;
  let resto = l.version;
  for (let i = 0; i < 12; i++) resto = (resto << 1) ^ ((resto >>> 11) * 0x1f25);
  const bits = (l.version << 12) | resto;

  for (let i = 0; i < 18; i++) {
    const oscuro = ((bits >>> i) & 1) !== 0;
    const a = l.tamano - 11 + (i % 3);
    const b = Math.floor(i / 3);
    poner(l, a, b, oscuro);
    poner(l, b, a, oscuro);
  }
}

/** Zigzag de dos columnas desde abajo a la derecha, salteando la columna de sincronismo. */
function dibujarCodewords(l, codewords) {
  let i = 0;
  for (let derecha = l.tamano - 1; derecha >= 1; derecha -= 2) {
    if (derecha === 6) derecha = 5;
    for (let alto = 0; alto < l.tamano; alto++) {
      for (let col = 0; col < 2; col++) {
        const x = derecha - col;
        const haciaArriba = ((derecha + 1) & 2) === 0;
        const y = haciaArriba ? l.tamano - 1 - alto : alto;
        if (l.esFuncion[y * l.tamano + x]) continue;
        const oscuro = i < codewords.length * 8 && ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
        poner(l, x, y, oscuro, false);
        i++;
      }
    }
  }
}

const MASCARAS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function aplicarMascara(l, mascara) {
  const invertir = MASCARAS[mascara];
  for (let y = 0; y < l.tamano; y++) {
    for (let x = 0; x < l.tamano; x++) {
      if (l.esFuncion[y * l.tamano + x]) continue;
      if (invertir(x, y)) l.modulos[y * l.tamano + x] ^= 1;
    }
  }
}

/**
 * Prueba las 8 máscaras y se queda con la de menor penalización.
 *
 * No es cosmético: la penalización castiga rachas largas, bloques macizos y falsos patrones de
 * búsqueda, que es exactamente lo que confunde a la cámara de un celular barato bajo luz de bar.
 */
function mejorMascara(l) {
  let mejor = 0;
  let menor = Infinity;
  for (let m = 0; m < 8; m++) {
    aplicarMascara(l, m);
    dibujarFormato(l, m);
    const puntos = penalizacion(l);
    aplicarMascara(l, m); // la máscara es su propia inversa
    if (puntos < menor) {
      menor = puntos;
      mejor = m;
    }
  }
  return mejor;
}

function penalizacion(l) {
  const n = l.tamano;
  let puntos = 0;

  // Reglas 1 y 3: rachas de 5 o más, y el patrón 1:1:3:1:1 que imita un finder.
  for (let eje = 0; eje < 2; eje++) {
    for (let a = 0; a < n; a++) {
      const en = (b) => (eje === 0 ? leer(l, b, a) : leer(l, a, b));
      let racha = 1;
      const historia = [];
      for (let b = 1; b <= n; b++) {
        if (b < n && en(b) === en(b - 1)) {
          racha++;
          continue;
        }
        if (racha >= 5) puntos += 3 + (racha - 5);
        historia.push(racha);
        racha = 1;
      }
      for (let i = 0; i + 4 < historia.length; i++) {
        const [p, q, r, s, t] = historia.slice(i, i + 5);
        if (q === p && r === p * 3 && s === p && t === p) puntos += 40;
      }
    }
  }

  // Regla 2: bloques de 2x2 del mismo color.
  for (let y = 0; y + 1 < n; y++) {
    for (let x = 0; x + 1 < n; x++) {
      const v = leer(l, x, y);
      if (v === leer(l, x + 1, y) && v === leer(l, x, y + 1) && v === leer(l, x + 1, y + 1)) puntos += 3;
    }
  }

  // Regla 4: desbalance entre oscuros y claros.
  let oscuros = 0;
  for (const m of l.modulos) oscuros += m;
  const desvio = Math.abs(oscuros * 20 - l.modulos.length * 10) / l.modulos.length;
  puntos += Math.floor(desvio) * 10;

  return puntos;
}

/* ── Salidas ────────────────────────────────────────────────────────────────── */

/**
 * SVG de un solo `path`. Un rectángulo por módulo daría 1.500 nodos y una impresora casera deja
 * costuras blancas entre ellos; el path se imprime macizo.
 *
 * @param {{modulos: Uint8Array, tamano: number}} qr
 * @param {{ zona?: number, oscuro?: string, claro?: string, huecoLogo?: number }} opciones
 *        `huecoLogo` es la fracción del lado que se deja en blanco al centro, topeada en 0.3
 *        (aceptación de P009: más que eso y deja de leerse).
 */
export function svgDe(qr, { zona = 4, oscuro = '#000000', claro = '#ffffff', huecoLogo = 0 } = {}) {
  const lado = qr.tamano + zona * 2;
  const hueco = huecoDeLogo(qr, huecoLogo);
  const partes = [];

  for (let y = 0; y < qr.tamano; y++) {
    for (let x = 0; x < qr.tamano; x++) {
      if (!qr.modulos[y * qr.tamano + x]) continue;
      if (hueco && x >= hueco.desde && x < hueco.hasta && y >= hueco.desde && y < hueco.hasta) continue;
      partes.push(`M${x + zona} ${y + zona}h1v1h-1z`);
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges">`,
    `<rect width="${lado}" height="${lado}" fill="${claro}"/>`,
    `<path fill="${oscuro}" d="${partes.join('')}"/>`,
    '</svg>',
  ].join('');
}

/**
 * Ventana central que se deja libre para el logo, en módulos.
 *
 * El tope del 30% del lado no es estético: a nivel H la corrección recupera hasta el 30% de los
 * codewords, y el logo tapa área de datos. Se topea acá y no en la interfaz para que ningún camino
 * —ni un script, ni una hoja A4 generada aparte— pueda emitir un QR ilegible.
 */
export function huecoDeLogo(qr, fraccion) {
  if (!fraccion || fraccion <= 0) return null;
  const usada = Math.min(fraccion, 0.3);
  const ancho = Math.floor(qr.tamano * usada);
  const desde = Math.floor((qr.tamano - ancho) / 2);
  return { desde, hasta: desde + ancho, ancho };
}
