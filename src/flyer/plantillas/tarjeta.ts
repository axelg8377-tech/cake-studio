import { logoTorta } from '../logo';
import { encajar } from '../qrMarca';
import { ajustar, escapar, fuenteFace, partir, SANS, SERIF, type Paleta } from '../svg';

/**
 * Tarjeta de recomendación de 9 × 5 cm: 1063 × 591 px es esa medida a 300 dpi, lo que pide una imprenta.
 *
 * De `cartel.js` de Pizarrita se toma el método (el QR encajado como SVG, el texto que achica la letra antes
 * de cortarse) y no la hoja: el cartel es vertical, de A6 a A4, con zona de NFC y pie de marca. En una tarjeta
 * apaisada de 9 × 5 no hay lugar para nada de eso.
 */
export const ANCHO_TARJETA = 1063;
export const ALTO_TARJETA = 591;

export type DatosTarjeta = { nombre: string; frase: string; telefono: string; instagram: string };
export type RecursosTarjeta = { paleta: Paleta; qrSvg: string; fuenteTitulos: string | null };

const texto = (x: number, y: number, atributos: string, contenido: string) =>
  `<text x="${x}" y="${y.toFixed(1)}" ${atributos}>${escapar(contenido)}</text>`;

export function tarjeta(d: DatosTarjeta, { paleta, qrSvg, fuenteTitulos }: RecursosTarjeta): string {
  const { papel, tinta, acento, detalle } = paleta;
  const nombre = ajustar(
    d.nombre.trim() || 'Tu pastelería',
    [
      { caracteres: 15, tamano: 60 },
      { caracteres: 19, tamano: 48 },
      { caracteres: 24, tamano: 38 },
    ],
    2,
  );
  const alto = nombre.tamano * 1.08;
  const finNombre = 232 + (nombre.lineas.length - 1) * alto;
  // 32 px en 9 cm son 7,7 pt: el mínimo cómodo de leer en papel. Con 28 quedaba en 6,7.
  const frase = d.frase.trim() ? partir(d.frase, 30, 2) : [];
  const instagram = d.instagram.trim().replace(/^@/, '');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO_TARJETA} ${ALTO_TARJETA}" width="${ANCHO_TARJETA}" height="${ALTO_TARJETA}">`,
    `<defs><style>${fuenteFace('Titulos', fuenteTitulos)}</style></defs>`,
    `<rect width="${ANCHO_TARJETA}" height="${ALTO_TARJETA}" fill="${papel}"/>`,
    encajar(logoTorta(papel, acento), 72, 64, 104),
    ...nombre.lineas.map((l, i) =>
      texto(72, 232 + i * alto, `font-family="${SERIF}" font-size="${nombre.tamano}" font-weight="700" fill="${tinta}"`, l),
    ),
    ...frase.map((l, i) =>
      texto(72, finNombre + 52 + i * 42, `font-family="${SERIF}" font-size="32" font-style="italic" fill="${tinta}"`, l),
    ),
    `<line x1="72" y1="440" x2="560" y2="440" stroke="${detalle}" stroke-width="3"/>`,
    d.telefono.trim() && texto(72, 494, `font-family="${SANS}" font-size="32" font-weight="700" fill="${tinta}"`, `WhatsApp ${d.telefono.trim()}`),
    instagram && texto(72, 540, `font-family="${SANS}" font-size="30" fill="${acento}"`, `@${instagram}`),
    // El QR va sobre su propio cuadrado de papel: la zona de silencio no depende del color del panel.
    `<rect x="610" y="0" width="${ANCHO_TARJETA - 610}" height="${ALTO_TARJETA}" fill="${detalle}"/>`,
    `<rect x="646" y="52" width="380" height="380" rx="24" fill="${papel}"/>`,
    encajar(qrSvg, 666, 72, 340),
    texto(836, 508, `text-anchor="middle" font-family="${SANS}" font-size="30" font-weight="700" fill="${tinta}"`, 'Escaneá y pedí tu torta'),
    '</svg>',
  ]
    .filter(Boolean)
    .join('');
}

/** A4 a 300 dpi. */
export const ANCHO_A4 = 2480;
export const ALTO_A4 = 3508;
const COLUMNAS = 2;
const FILAS = 5;

/**
 * Diez tarjetas en una hoja A4, pegadas, con marcas de corte en el margen (pedido del CEO, 2026-09-13).
 * La tarjeta se dibuja una vez y se repite con <use>: la fuente y el QR van una sola vez en el archivo.
 * Sale a medida real solo si se imprime al 100%, sin "ajustar a la página": lo dice el pie de la hoja.
 */
export function hojaA4(svgTarjeta: string): string {
  const x0 = Math.round((ANCHO_A4 - COLUMNAS * ANCHO_TARJETA) / 2);
  const y0 = Math.round((ALTO_A4 - FILAS * ALTO_TARJETA) / 2);
  const xFin = x0 + COLUMNAS * ANCHO_TARJETA;
  const yFin = y0 + FILAS * ALTO_TARJETA;
  const interior = svgTarjeta.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const marca = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8A8A8A" stroke-width="3"/>`;

  const usos: string[] = [];
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLUMNAS; c++) {
      const x = x0 + c * ANCHO_TARJETA;
      const y = y0 + f * ALTO_TARJETA;
      usos.push(`<use href="#tarjeta" xlink:href="#tarjeta" x="${x}" y="${y}"/>`);
    }
  }
  const marcas: string[] = [];
  for (let c = 0; c <= COLUMNAS; c++) {
    const x = x0 + c * ANCHO_TARJETA;
    marcas.push(marca(x, y0 - 70, x, y0 - 20), marca(x, yFin + 20, x, yFin + 70));
  }
  for (let f = 0; f <= FILAS; f++) {
    const y = y0 + f * ALTO_TARJETA;
    marcas.push(marca(x0 - 70, y, x0 - 20, y), marca(xFin + 20, y, xFin + 70, y));
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${ANCHO_A4} ${ALTO_A4}" width="${ANCHO_A4}" height="${ALTO_A4}">`,
    `<rect width="${ANCHO_A4}" height="${ALTO_A4}" fill="#FFFFFF"/>`,
    `<defs><g id="tarjeta">${interior}</g></defs>`,
    ...usos,
    ...marcas,
    `<text x="${ANCHO_A4 / 2}" y="${ALTO_A4 - 110}" text-anchor="middle" font-family="${SANS}" font-size="40" fill="#6E6E6E">Imprimir en A4 al 100% (tamaño real). Cortar por las marcas: cada tarjeta mide 9 × 5 cm.</text>`,
    '</svg>',
  ].join('');
}
