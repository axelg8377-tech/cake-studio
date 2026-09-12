import { logoTorta } from '../logo';
import { encajar } from '../qrMarca';
import { ajustar, escapar, formatoPrecio, fuenteFace, partir, pie, SANS, SERIF, type Negocio } from '../svg';
import { ALTO, ANCHO, type RecursosFlyer } from './elegante';

/** La carta de precios. Tampoco tiene costo ni ganancia: solo lo que se le cobra al cliente. */
export type DatosCarta = {
  titulo: string;
  tamanos: { nombre: string; precio: number }[];
  masas: string[];
  rellenos: string[];
  coberturas: string[];
  negocio: Negocio;
};

const MAX_ITEMS = 6;

/** Una columna de nombres. Si no entran, la última fila dice cuántos quedaron afuera. */
function lista(titulo: string, items: string[], x: number, tinta: string, acento: string): string {
  if (items.length === 0) return '';
  const visibles =
    items.length > MAX_ITEMS ? [...items.slice(0, MAX_ITEMS - 1), `y ${items.length - MAX_ITEMS + 1} más`] : items;
  return [
    `<text x="${x}" y="826" font-family="${SERIF}" font-size="38" font-weight="700" fill="${tinta}">${escapar(titulo)}</text>`,
    `<line x1="${x}" y1="844" x2="${x + 56}" y2="844" stroke="${acento}" stroke-width="4" stroke-linecap="round"/>`,
    // Seis filas terminan en y=1066, antes de la línea del pie (1104).
    ...visibles.map(
      (item, i) =>
        `<text x="${x}" y="${886 + i * 36}" font-family="${SANS}" font-size="25" fill="${tinta}">${escapar(partir(item, 20, 1)[0])}</text>`,
    ),
  ].join('');
}

/** Plantilla Carta (referencia Cardápio Bolos): tamaños con precio y todo lo que se puede elegir. */
export function flyerCarta(d: DatosCarta, r: RecursosFlyer): string {
  const { papel, tinta, acento, detalle } = r.paleta;
  const { lineas, tamano: letra } = ajustar(
    d.titulo,
    [
      { caracteres: 12, tamano: 120 },
      { caracteres: 18, tamano: 84 },
      { caracteres: 26, tamano: 60 },
    ],
    1,
  );
  const foto = { x: 640, y: 360, ancho: 330, alto: 380 };
  const fotoSvg = r.fotoDataUri
    ? `<image href="${r.fotoDataUri}" x="${foto.x}" y="${foto.y}" width="${foto.ancho}" height="${foto.alto}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cr-foto)"/>`
    : `<rect x="${foto.x}" y="${foto.y}" width="${foto.ancho}" height="${foto.alto}" rx="28" fill="${detalle}"/>` +
      encajar(logoTorta(papel, detalle), foto.x + 65, foto.y + 90, 200);

  const tamanos = d.tamanos
    .slice(0, 6)
    .map((t, i) => {
      const y = 490 + i * 50;
      const precio = formatoPrecio(t.precio);
      // Sin medir texto: 19 px por carácter a 30 px de serif alcanza para que los puntos no pisen el precio.
      const finPuntos = 580 - precio.length * 19 - 14;
      return (
        `<text x="110" y="${y}" font-family="${SANS}" font-size="28" fill="${tinta}">${escapar(partir(t.nombre, 12, 1)[0])}</text>` +
        (finPuntos > 320
          ? `<line x1="310" y1="${y - 8}" x2="${finPuntos}" y2="${y - 8}" stroke="${detalle}" stroke-width="3" stroke-dasharray="1 9" stroke-linecap="round"/>`
          : '') +
        `<text x="580" y="${y}" text-anchor="end" font-family="${SERIF}" font-size="30" font-weight="700" fill="${acento}">${escapar(precio)}</text>`
      );
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${ALTO}" width="${ANCHO}" height="${ALTO}">`,
    `<defs><style>${fuenteFace('Titulos', r.fuenteTitulos)}</style>`,
    `<clipPath id="cr-foto"><rect x="${foto.x}" y="${foto.y}" width="${foto.ancho}" height="${foto.alto}" rx="28"/></clipPath></defs>`,
    `<rect width="${ANCHO}" height="${ALTO}" fill="${papel}"/>`,
    `<rect x="36" y="36" width="${ANCHO - 72}" height="${ALTO - 72}" rx="8" fill="none" stroke="${detalle}" stroke-width="3"/>`,
    `<text x="${ANCHO / 2}" y="130" text-anchor="middle" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="8" fill="${acento}">${escapar(d.negocio.nombre.toUpperCase())}</text>`,
    `<text x="${ANCHO / 2}" y="260" text-anchor="middle" font-family="${SERIF}" font-size="${letra}" font-weight="700" fill="${acento}">${escapar(lineas[0] ?? '')}</text>`,
    `<line x1="440" y1="300" x2="640" y2="300" stroke="${detalle}" stroke-width="3"/>`,
    d.tamanos.length
      ? `<text x="110" y="390" font-family="${SERIF}" font-size="38" font-weight="700" fill="${tinta}">Tamaños</text>` +
        `<line x1="110" y1="408" x2="166" y2="408" stroke="${acento}" stroke-width="4" stroke-linecap="round"/>` +
        `<text x="110" y="444" font-family="${SANS}" font-size="20" fill="${tinta}">Precio desde, según relleno y decoración</text>`
      : '',
    tamanos,
    fotoSvg,
    lista('Masas', d.masas, 110, tinta, acento),
    lista('Rellenos', d.rellenos, 420, tinta, acento),
    lista('Coberturas', d.coberturas, 730, tinta, acento),
    pie(r.qrSvg, d.negocio, r.paleta),
    '</svg>',
  ].join('');
}
