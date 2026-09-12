/**
 * El cartel del local: la hoja imprimible que va en la mesa, en la barra o en el atril.  P023.
 *
 * **Qué problema resuelve.** El QR de P022 ya sale con la cara del local, pero sale solo: un
 * cuadrado en un archivo. Lo que el local necesita pegar en la mesa es una hoja que además
 * *diga algo* — qué pasa si lo escaneás, y que también se puede apoyar el teléfono. Los atriles
 * de acrílico que se venden hechos traen la marca de Google impresa; este archivo hace el mismo
 * cartel con la marca del local adentro, y con el destino que el dueño elija.
 *
 * **Cuatro plantillas y no una.** La primera versión tenía un solo diseño y el CEO lo llamó
 * genérico el mismo día, con razón: un cartel que sale igual para todos es exactamente lo que ya
 * se compra hecho. Ahora la hoja elige entre cuatro armados —esquinas, banda, marco y bloque—,
 * toma la tipografía que el local eligió para su menú, sus colores, su logo, y prende o apaga
 * las estrellas, la zona del NFC y el pie de marca. Son 4 × 4 × 2 × 2 × 2 armados distintos
 * antes de contar colores y textos.
 *
 * **Una sola geometría para los tres tamaños.** A6, A5 y A4 comparten la proporción √2 de la
 * norma ISO 216, así que la hoja se dibuja una vez en un lienzo de 1000 × 1414 y los tres
 * tamaños son la misma imagen a otra resolución. No hay tres diseños que mantener.
 *
 * **El cuerpo se acomoda solo.** Los bloques se miden y se reparten en el alto disponible: apagar
 * la zona del NFC no deja un hueco, agranda el QR y vuelve a centrar. Sin esto, cada interruptor
 * del panel sería una hoja con un agujero.
 *
 * **Sale en SVG y no en píxeles**, y el PNG se rasteriza desde acá en el panel. Dos motivos:
 * una imprenta pide vector, y el texto de un SVG lo puede corregir cualquiera con un editor si
 * el local quiere cambiar una palabra sin volver a entrar al panel.
 *
 * **El NFC lo graba el dueño (D-36).** Acá se dibuja la zona que dice «apoyá tu móvil»; el tag se
 * compra pegado o se graba con cualquier aplicación gratis del teléfono, con la misma URL que
 * lleva el QR. Escribirlo desde el panel exigiría la Web NFC API, que solo existe en Chrome de
 * Android: la mitad de los dueños no lo podría usar desde su propio teléfono.
 */

/** El lienzo en el que se dibuja todo. Los tres pliegos son este mismo dibujo a otra escala. */
export const ANCHO = 1000;
export const ALTO = 1414;

/**
 * Los tres pliegos, con su medida real y su lado en píxeles a 300 dpi, que es lo que pide una
 * imprenta. El nombre corto es el que ve el dueño; los milímetros están para que pueda
 * comprobarlo contra la hoja que tiene en la mano.
 */
export const PLIEGOS = {
  a6: { titulo: 'A6', pie: 'De mesa, 10,5 × 14,8 cm', mm: [105, 148], ancho: 1240 },
  a5: { titulo: 'A5', pie: 'Folleto o atril, 14,8 × 21 cm', mm: [148, 210], ancho: 1748 },
  a4: { titulo: 'A4', pie: 'De pared, 21 × 29,7 cm', mm: [210, 297], ancho: 2480 },
};

/**
 * Qué dice el cartel según a dónde lleve.
 *
 * El texto cambia entero y no solo el título: «Escaneá para ver la carta» y «Contanos cómo la
 * pasaste» piden cosas distintas, y un cartel que pide dos cosas a la vez no consigue ninguna.
 */
export const TEXTOS = {
  resenas: {
    titulo: 'Reseñas',
    bajada: 'Tu opinión nos importa',
    cierre: 'Apoyá tu móvil o escaneá el QR',
    estrellas: true,
  },
  carta: {
    titulo: 'Nuestra carta',
    bajada: 'Mirala desde tu teléfono',
    cierre: 'Apoyá tu móvil o escaneá el QR',
    estrellas: false,
  },
  instagram: {
    titulo: 'Seguinos',
    bajada: 'Mirá lo que estamos cocinando',
    cierre: 'Apoyá tu móvil o escaneá el QR',
    estrellas: false,
  },
  whatsapp: {
    titulo: 'Escribinos',
    bajada: 'Pedidos y reservas por WhatsApp',
    cierre: 'Apoyá tu móvil o escaneá el QR',
    estrellas: false,
  },
};

/**
 * Los cuatro armados de la hoja.
 *
 * Cada uno define **el marco y el área útil**, nada más. El cuerpo —cabecera, título, estrellas,
 * las dos zonas, el cierre— lo arma el mismo código para los cuatro: si cada plantilla dibujara
 * su propio cuerpo serían cuatro diseños que se van separando, y el arnés tendría que probar
 * cuatro veces que el QR se lee.
 *
 * `sobreColor` avisa que la cabecera cae sobre el acento y no sobre el papel: es lo que decide
 * si el nombre del local sale en tinta o en blanco. Es la clase de detalle que, mal puesto,
 * imprime cien hojas con un nombre invisible.
 */
export const PLANTILLAS = {
  esquinas: {
    titulo: 'Esquinas',
    pie: 'Hoja blanca con tus colores en las cuatro puntas. La que entra en cualquier impresora.',
    sobreColor: false,
    util: { x: 70, y: 130, ancho: 860, alto: 1180 },
  },
  banda: {
    titulo: 'Banda',
    pie: 'Una franja de tu color arriba, con tu nombre en blanco. La más limpia.',
    sobreColor: true,
    util: { x: 70, y: 330, ancho: 860, alto: 990 },
  },
  marco: {
    titulo: 'Marco',
    pie: 'Un borde grueso de tu color alrededor de toda la hoja.',
    sobreColor: false,
    util: { x: 100, y: 130, ancho: 800, alto: 1170 },
  },
  bloque: {
    titulo: 'Bloque',
    pie: 'Fondo entero de tu color con una tarjeta blanca al centro. La que más se parece a un atril.',
    sobreColor: false,
    util: { x: 105, y: 175, ancho: 790, alto: 1065 },
  },
};

/**
 * Las tipografías, las mismas cuatro que el local puede elegir para su menú.
 *
 * El cartel no inventa una quinta: si la carta está en Playfair, el cartel de la mesa sale en
 * Playfair y los dos se leen como del mismo local. La familia se nombra acá y el archivo llega
 * embebido desde el panel; sin archivo cae a la pila del sistema, que es lo que pasa en el arnés
 * de Node y no cambia nada de lo que ese arnés prueba.
 */
export const SISTEMA = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const FUENTES = {
  moderna: { titulo: 'Moderna', familia: `'Inter', ${SISTEMA}`, archivo: 'inter-latin', peso: 800 },
  elegante: { titulo: 'Elegante', familia: "'Playfair Display', Georgia, serif", archivo: 'playfair-latin', peso: 700 },
  impacto: { titulo: 'Impacto', familia: `'Bebas Neue', ${SISTEMA}`, archivo: 'bebas-latin', peso: 400 },
  redonda: { titulo: 'Redonda', familia: `'Baloo 2', ${SISTEMA}`, archivo: 'baloo2-latin', peso: 700 },
};

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Un hex de 3 o 6 dígitos, o el de repuesto. Lo que entra viene del panel, no de un usuario. */
const color = (v, repuesto) => (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v)) ? v : repuesto);

const n = (v) => Number(v).toFixed(2);

/**
 * Si un color es oscuro, para decidir qué tinta va encima.
 *
 * Es la luminancia relativa de WCAG simplificada. No se importa `runtime/color.js` porque ahí
 * vive el cálculo completo con su corrección de gamma y lo que hace falta acá es una sola
 * pregunta binaria: ¿el nombre del local va en blanco o en negro? Equivocarla imprime cien
 * hojas con el nombre invisible.
 */
function esOscuro(hex) {
  const c = color(hex, '#000000').replace('#', '');
  const largo = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const v = parseInt(largo, 16);
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.55;
}

/**
 * Corta un texto largo antes de que se salga de la hoja.
 *
 * Se mide en caracteres y no en píxeles porque el SVG no sabe medir texto: es una aproximación
 * deliberada, calibrada sobre el ancho medio de una sans a ese cuerpo. El tope se pasa desde
 * cada llamada porque un título en 76 y un pie en 26 no aguantan lo mismo.
 */
const recortar = (texto, tope) => {
  const t = String(texto ?? '').trim();
  return t.length <= tope ? t : `${t.slice(0, tope - 1).trimEnd()}…`;
};

/**
 * El cuerpo que le toca a un texto para que entre en el ancho disponible.
 *
 * Un nombre de seis letras y uno de veintiséis no pueden salir del mismo tamaño: el largo se
 * sale de la hoja o hay que recortarlo, y recortar el nombre del local es lo último que se
 * quiere hacer. Se achica la letra hasta donde entra, y recién ahí se recorta.
 */
function cuerpoQueEntra(texto, anchoDisponible, cuerpoMaximo, factor = 0.55) {
  const largo = String(texto ?? '').length || 1;
  return Math.max(24, Math.min(cuerpoMaximo, anchoDisponible / (largo * factor)));
}

/** Una estrella de cinco puntas centrada en (cx, cy) con radio r. */
function estrella(cx, cy, r, relleno) {
  const puntos = [];
  for (let i = 0; i < 10; i++) {
    const radio = i % 2 === 0 ? r : r * 0.42;
    const angulo = (Math.PI / 5) * i - Math.PI / 2;
    puntos.push(`${n(cx + radio * Math.cos(angulo))},${n(cy + radio * Math.sin(angulo))}`);
  }
  return `<polygon points="${puntos.join(' ')}" fill="${relleno}"/>`;
}

const fila = (cx, cy, r, hueco, relleno, cuantas = 5) =>
  Array.from({ length: cuantas }, (_, i) => i - (cuantas - 1) / 2)
    .map((i) => estrella(cx + i * hueco, cy, r, relleno))
    .join('');

/**
 * El teléfono con las ondas del NFC y su chapita.
 *
 * Es el dibujo que el comensal ya vio en el cartel de cualquier local que cobra sin contacto, así
 * que no hay que explicarle qué significa. La chapita con la palabra «NFC» está porque el dibujo
 * solo alcanza para el que ya lo conoce; la palabra alcanza para el resto.
 */
function iconoNfc(cx, cy, lado, tinta, acento) {
  const w = lado * 0.44;
  const h = lado * 0.76;
  const x = cx - w / 2 - lado * 0.13;
  const y = cy - h / 2;
  const grosor = Math.max(2, lado * 0.036);
  const ondas = [0.26, 0.38, 0.5]
    .map((f) => {
      const r = lado * f;
      const ox = cx + lado * 0.1;
      return `<path d="M ${n(ox)} ${n(cy - r)} A ${n(r)} ${n(r)} 0 0 1 ${n(ox)} ${n(cy + r)}" fill="none" stroke="${acento}" stroke-width="${n(grosor)}" stroke-linecap="round"/>`;
    })
    .join('');
  return (
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(lado * 0.07)}" fill="none" stroke="${tinta}" stroke-width="${n(grosor)}"/>` +
    `<line x1="${n(x + w * 0.32)}" y1="${n(y + h - lado * 0.085)}" x2="${n(x + w * 0.68)}" y2="${n(y + h - lado * 0.085)}" stroke="${tinta}" stroke-width="${n(grosor)}" stroke-linecap="round"/>` +
    ondas
  );
}

/** Mete el SVG del QR adentro del cartel, en su caja. */
function encajar(svgDelQr, x, y, lado) {
  return svgDelQr.replace(
    /^<svg[^>]*viewBox="([^"]*)"[^>]*>/,
    `<svg x="${n(x)}" y="${n(y)}" width="${n(lado)}" height="${n(lado)}" viewBox="$1" preserveAspectRatio="xMidYMid meet">`,
  );
}

/** El marco de cada plantilla: lo que se pinta antes del cuerpo. */
function marcoDe(plantilla, { acento, hondo, papel }) {
  if (plantilla === 'banda') {
    return (
      `<rect width="${ANCHO}" height="${ALTO}" fill="${papel}"/>` +
      `<path d="M 0 0 H ${ANCHO} V 250 Q ${ANCHO / 2} 340 0 250 Z" fill="${acento}"/>` +
      `<rect x="0" y="${ALTO - 26}" width="${ANCHO}" height="26" fill="${hondo}"/>`
    );
  }
  if (plantilla === 'marco') {
    const g = 34;
    return (
      `<rect width="${ANCHO}" height="${ALTO}" fill="${acento}"/>` +
      `<rect x="${g}" y="${g}" width="${ANCHO - g * 2}" height="${ALTO - g * 2}" rx="26" fill="${papel}"/>` +
      `<rect x="${g + 18}" y="${g + 18}" width="${ANCHO - (g + 18) * 2}" height="${ALTO - (g + 18) * 2}" rx="14" fill="none" stroke="${hondo}" stroke-width="3" stroke-opacity="0.35"/>`
    );
  }
  if (plantilla === 'bloque') {
    return (
      `<rect width="${ANCHO}" height="${ALTO}" fill="${hondo}"/>` +
      `<circle cx="${ANCHO}" cy="0" r="380" fill="${acento}" fill-opacity="0.35"/>` +
      `<circle cx="0" cy="${ALTO}" r="300" fill="${acento}" fill-opacity="0.3"/>` +
      `<rect x="70" y="140" width="${ANCHO - 140}" height="${ALTO - 280}" rx="34" fill="${papel}"/>`
    );
  }
  // esquinas
  const r = 205;
  return (
    `<rect width="${ANCHO}" height="${ALTO}" fill="${papel}"/>` +
    `<path d="M 0 0 L ${r} 0 A ${r} ${r} 0 0 1 0 ${r} Z" fill="${acento}"/>` +
    `<path d="M ${ANCHO} 0 L ${ANCHO} ${r * 0.72} A ${n(r * 0.72)} ${n(r * 0.72)} 0 0 1 ${n(ANCHO - r * 0.72)} 0 Z" fill="${hondo}"/>` +
    `<path d="M 0 ${ALTO} L 0 ${n(ALTO - r * 0.62)} A ${n(r * 0.62)} ${n(r * 0.62)} 0 0 0 ${n(r * 0.62)} ${ALTO} Z" fill="${hondo}"/>` +
    `<path d="M ${ANCHO} ${ALTO} L ${n(ANCHO - r * 0.95)} ${ALTO} A ${n(r * 0.95)} ${n(r * 0.95)} 0 0 0 ${ANCHO} ${n(ALTO - r * 0.95)} Z" fill="${acento}"/>`
  );
}

/** La cabecera de la plantilla `banda`, que va sobre el color y fuera del área útil. */
function cabeceraDeBanda(nombre, logoDataUri, familia, peso, sobre) {
  if (logoDataUri) {
    return (
      `<image x="360" y="52" width="280" height="120" href="${logoDataUri}" preserveAspectRatio="xMidYMid meet"/>` +
      `<text x="500" y="228" text-anchor="middle" font-family="${familia}" font-size="34" font-weight="600" fill="${sobre}" fill-opacity="0.92">${esc(nombre)}</text>`
    );
  }
  const cuerpo = cuerpoQueEntra(nombre, 830, 66);
  return `<text x="500" y="${n(150 + cuerpo * 0.35)}" text-anchor="middle" font-family="${familia}" font-size="${n(cuerpo)}" font-weight="${peso}" fill="${sobre}">${esc(nombre)}</text>`;
}

/**
 * El cartel entero, en SVG.
 *
 * @param {string} svgDelQr  Lo que devuelve `svgArte`, ya con el estilo y los colores del local.
 * @param {object} o         Plantilla, textos, colores, logo, tipografía y los interruptores.
 */
export function svgCartel(svgDelQr, o = {}) {
  const textos = TEXTOS[o.destino] || TEXTOS.resenas;
  const plantilla = PLANTILLAS[o.plantilla] ? o.plantilla : 'esquinas';
  const armado = PLANTILLAS[plantilla];

  const acento = color(o.acento, '#1a73e8');
  const hondo = color(o.hondo, acento);
  const papel = color(o.papel, '#ffffff');
  const tinta = color(o.tinta, '#16202b');
  const suave = color(o.suave, '#5f6b7a');
  // Sobre la banda o el bloque el nombre cae sobre el acento, no sobre el papel. Se decide por
  // luminancia y no por una lista de colores: el local elige el suyo, no uno de los nuestros.
  const sobreAcento = esOscuro(acento) ? '#ffffff' : tinta;

  const fuente = FUENTES[o.fuente] || FUENTES.moderna;
  const familia = o.fuenteDataUri ? `'CartelPropia', ${fuente.familia}` : fuente.familia;
  const peso = o.fuenteDataUri ? fuente.peso : 800;
  const embebida = o.fuenteDataUri
    ? `<defs><style>@font-face{font-family:'CartelPropia';font-style:normal;font-weight:100 900;src:url(${o.fuenteDataUri}) format('woff2');}</style></defs>`
    : '';

  const nombre = recortar(o.nombre || 'Tu local', 34);
  const titulo = recortar(o.titulo || textos.titulo, 24);
  const bajada = recortar(o.bajada || textos.bajada, 40);
  // El cierre por defecto nombra las dos formas de llegar, y sin NFC nombra una sola: un cartel
  // que dice «apoyá tu móvil» sin zona de NFC manda al comensal a apoyar el teléfono contra
  // una hoja que no tiene tag.
  const conNfc = o.nfc !== false;
  const cierrePorDefecto = conNfc ? textos.cierre : 'Escaneá el QR con tu cámara';
  const cierre = recortar(o.cierre || cierrePorDefecto, 44);
  const marca = recortar(o.marca || 'Pizarrita', 24);

  const conEstrellas = o.estrellas ?? textos.estrellas;
  const conPie = o.pie !== false;

  const { x: ux, y: uy, ancho: uw, alto: uh } = armado.util;
  const centro = ux + uw / 2;
  const enBanda = plantilla === 'banda';

  /**
   * El cuerpo, como una lista de bloques con su alto.
   *
   * Se miden todos, se suman, y el sobrante se reparte como aire entre ellos. Es lo que hace que
   * apagar el NFC o las estrellas no deje un agujero en la hoja: los bloques que quedan se
   * vuelven a repartir el alto. Cada bloque recibe la `y` de su tope y devuelve su SVG.
   */
  const bloques = [];

  if (!enBanda) {
    if (o.logoDataUri) {
      bloques.push({ alto: 150, dibujar: (y) => `<image x="${n(centro - 150)}" y="${n(y)}" width="300" height="150" href="${o.logoDataUri}" preserveAspectRatio="xMidYMid meet"/>` });
      bloques.push({
        alto: 46,
        dibujar: (y) => `<text x="${n(centro)}" y="${n(y + 34)}" text-anchor="middle" font-family="${familia}" font-size="36" font-weight="600" fill="${suave}">${esc(nombre)}</text>`,
      });
    } else {
      const cuerpo = cuerpoQueEntra(nombre, uw - 40, 68);
      bloques.push({
        alto: cuerpo * 1.15,
        dibujar: (y) => `<text x="${n(centro)}" y="${n(y + cuerpo * 0.84)}" text-anchor="middle" font-family="${familia}" font-size="${n(cuerpo)}" font-weight="${peso}" fill="${tinta}">${esc(nombre)}</text>`,
      });
    }
  }

  const cuerpoTitulo = cuerpoQueEntra(titulo, uw - 30, 82, 0.52);
  bloques.push({
    alto: cuerpoTitulo * 1.1,
    dibujar: (y) =>
      `<text x="${n(centro)}" y="${n(y + cuerpoTitulo * 0.82)}" text-anchor="middle" font-family="${familia}" font-size="${n(cuerpoTitulo)}" font-weight="${peso}" fill="${plantilla === 'marco' ? acento : tinta}">${esc(titulo)}</text>`,
  });

  if (conEstrellas) {
    bloques.push({ alto: 62, dibujar: (y) => fila(centro, y + 31, 27, 64, acento) });
  }

  bloques.push({
    alto: 48,
    dibujar: (y) => `<text x="${n(centro)}" y="${n(y + 34)}" text-anchor="middle" font-family="${SISTEMA}" font-size="36" font-weight="500" fill="${suave}">${esc(bajada)}</text>`,
  });

  // Las dos zonas. La del NFC va a la izquierda porque es la que menos gente conoce: en un cartel
  // se mira primero lo de la izquierda, y el QR ya se entiende solo. Sin NFC el QR se centra y
  // crece: una hoja con un cuadrado chico arrinconado a la derecha se ve rota.
  const ladoQr = conNfc ? 300 : 400;
  const altoZona = ladoQr + 74;
  bloques.push({
    alto: altoZona,
    dibujar: (y) => {
      const fondo = (cx, ancho) =>
        `<rect x="${n(cx - ancho / 2)}" y="${n(y - 14)}" width="${n(ancho)}" height="${n(altoZona + 4)}" rx="26" fill="${acento}" fill-opacity="0.07"/>`;
      if (!conNfc) {
        return (
          fondo(centro, ladoQr + 80) +
          encajar(svgDelQr, centro - ladoQr / 2, y, ladoQr) +
          `<text x="${n(centro)}" y="${n(y + ladoQr + 48)}" text-anchor="middle" font-family="${SISTEMA}" font-size="32" font-weight="600" fill="${tinta}">Escaneá el código</text>`
        );
      }
      // Las dos cajas del mismo ancho. Con anchos distintos la hoja se lee torcida, y es lo
      // primero que se nota en una mesa antes que cualquier otra cosa del diseño.
      const anchoCaja = uw * 0.47;
      const izq = ux + anchoCaja / 2;
      const der = ux + uw - anchoCaja / 2;
      // La chapita «NFC» va de etiqueta arriba de su caja y no debajo del teléfono: ahí chocaba
      // con «Apoyá tu móvil». El dibujo solo alcanza para el que ya conoce el símbolo; la
      // palabra alcanza para el resto.
      return (
        fondo(izq, anchoCaja) +
        fondo(der, anchoCaja) +
        `<rect x="${n(izq - 48)}" y="${n(y - 33)}" width="96" height="40" rx="20" fill="${acento}"/>` +
        `<text x="${n(izq)}" y="${n(y - 5)}" text-anchor="middle" font-family="${SISTEMA}" font-size="24" font-weight="800" letter-spacing="1.5" fill="${sobreAcento}">NFC</text>` +
        iconoNfc(izq, y + ladoQr / 2, 236, tinta, acento) +
        `<text x="${n(izq)}" y="${n(y + ladoQr + 48)}" text-anchor="middle" font-family="${SISTEMA}" font-size="32" font-weight="600" fill="${tinta}">Apoyá tu móvil</text>` +
        encajar(svgDelQr, der - ladoQr / 2, y, ladoQr) +
        `<text x="${n(der)}" y="${n(y + ladoQr + 48)}" text-anchor="middle" font-family="${SISTEMA}" font-size="32" font-weight="600" fill="${tinta}">Escaneá el código</text>`
      );
    },
  });

  const cuerpoCierre = cuerpoQueEntra(cierre, uw - 20, 42, 0.5);
  bloques.push({
    alto: cuerpoCierre * 1.25,
    dibujar: (y) =>
      `<text x="${n(centro)}" y="${n(y + cuerpoCierre * 0.9)}" text-anchor="middle" font-family="${SISTEMA}" font-size="${n(cuerpoCierre)}" font-weight="700" fill="${tinta}">${esc(cierre)}</text>`,
  });

  if (conEstrellas) {
    bloques.push({ alto: 46, dibujar: (y) => fila(centro, y + 23, 20, 48, acento) });
  }

  if (conPie) {
    bloques.push({
      alto: 34,
      dibujar: (y) => `<text x="${n(centro)}" y="${n(y + 24)}" text-anchor="middle" font-family="${SISTEMA}" font-size="26" font-weight="500" fill="${suave}">hecho con ${esc(marca)}</text>`,
    });
  }

  const usado = bloques.reduce((t, b) => t + b.alto, 0);
  // El aire se reparte entre los bloques y nunca es negativo: con todo prendido y un nombre largo
  // el cuerpo puede pasarse del área útil, y en ese caso conviene que se apile pegado antes que
  // que los bloques se superpongan.
  const aire = Math.max(6, (uh - usado) / (bloques.length + 1));
  let y = uy + aire;
  const cuerpo = bloques
    .map((b) => {
      const trozo = b.dibujar(y);
      y += b.alto + aire;
      return trozo;
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${ALTO}" width="${ANCHO}" height="${ALTO}">`,
    embebida,
    marcoDe(plantilla, { acento, hondo, papel }),
    enBanda ? cabeceraDeBanda(nombre, o.logoDataUri, familia, peso, sobreAcento) : '',
    cuerpo,
    '</svg>',
  ]
    .filter(Boolean)
    .join('');
}

/** El alto en píxeles que le toca a un pliego, con la proporción de la norma ISO. */
export const altoDe = (ancho) => Math.round((ancho * ALTO) / ANCHO);
