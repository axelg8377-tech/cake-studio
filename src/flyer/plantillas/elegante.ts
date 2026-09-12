import { encajar } from '../qrMarca';
import {
  ajustar,
  escapar,
  estrella,
  formatoPrecio,
  fuenteFace,
  partir,
  type Paleta,
} from '../svg';

export const ANCHO = 1080;
export const ALTO = 1350;

/** Lo que ve el cliente. No hay campo de costo ni de ganancia: no pueden filtrarse al flyer. */
export type DatosFlyer = {
  nombre: string;
  tamano: string;
  detalle: { etiqueta: string; valor: string }[];
  precio: number;
  negocio: { nombre: string; telefono: string; instagram?: string };
};

export type RecursosFlyer = {
  paleta: Paleta;
  qrSvg: string;
  fotoDataUri: string | null;
  fuenteTitulos: string | null;
};

const SERIF = "'Titulos', 'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

/** Plantilla Elegante: papel crema, serif grande, foto protagonista, QR junto a los contactos. */
export function flyerElegante(d: DatosFlyer, r: RecursosFlyer): string {
  const { papel, tinta, acento, detalle } = r.paleta;
  // Nombres largos achican la letra antes de cortarse: "Chocolate y frutillas especial" entra entero.
  const { lineas: titulo, tamano: letraTitulo } = ajustar(
    d.nombre.toUpperCase(),
    [
      { caracteres: 18, tamano: 80 },
      { caracteres: 24, tamano: 60 },
    ],
    2,
  );
  const interlineado = Math.round(letraTitulo * 1.1);
  const yTitulo = titulo.length === 1 ? 220 : 195;
  const ySubtitulo = yTitulo + (titulo.length - 1) * interlineado + 48;
  const finTitulo = d.tamano ? ySubtitulo : yTitulo + (titulo.length - 1) * interlineado;

  // La foto arranca donde termina el título y siempre termina en y=890: lo de abajo no se mueve.
  const yFoto = finTitulo + 40;
  const foto = { x: 110, y: yFoto, ancho: 860, alto: 890 - yFoto };
  // El sello va sobre la esquina de la foto y termina antes de la primera etiqueta (y=960).
  const sello = { x: 856, y: 790, radio: 124 };
  const fotoSvg = r.fotoDataUri
    ? `<image href="${r.fotoDataUri}" x="${foto.x}" y="${foto.y}" width="${foto.ancho}" height="${foto.alto}" preserveAspectRatio="xMidYMid slice" clip-path="url(#fl-foto)"/>`
    : `<rect x="${foto.x}" y="${foto.y}" width="${foto.ancho}" height="${foto.alto}" rx="36" fill="${detalle}"/>`;

  const filas = d.detalle.filter((f) => f.valor.trim()).slice(0, 6);
  const mitad = Math.ceil(filas.length / 2);
  const columna = (items: typeof filas, x: number) =>
    items
      .map((f, i) => {
        const y = 960 + i * 80;
        const valor = partir(f.valor, 24, 1)[0];
        return (
          `<text x="${x}" y="${y}" font-family="${SANS}" font-size="22" font-weight="700" letter-spacing="3" fill="${acento}">${escapar(f.etiqueta.toUpperCase())}</text>` +
          `<text x="${x}" y="${y + 36}" font-family="${SERIF}" font-size="32" fill="${tinta}">${escapar(valor)}</text>`
        );
      })
      .join('');

  const contacto = [
    d.negocio.telefono && `WhatsApp ${d.negocio.telefono}`,
    d.negocio.instagram && `@${d.negocio.instagram.replace(/^@/, '')}`,
  ].filter(Boolean) as string[];

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${ALTO}" width="${ANCHO}" height="${ALTO}">`,
    `<defs><style>${fuenteFace('Titulos', r.fuenteTitulos)}</style>`,
    `<clipPath id="fl-foto"><rect x="${foto.x}" y="${foto.y}" width="${foto.ancho}" height="${foto.alto}" rx="36"/></clipPath></defs>`,
    `<rect width="${ANCHO}" height="${ALTO}" fill="${papel}"/>`,
    `<rect x="36" y="36" width="${ANCHO - 72}" height="${ALTO - 72}" rx="8" fill="none" stroke="${detalle}" stroke-width="3"/>`,
    `<text x="${ANCHO / 2}" y="112" text-anchor="middle" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="8" fill="${acento}">${escapar(d.negocio.nombre.toUpperCase())}</text>`,
    ...titulo.map(
      (linea, i) =>
        `<text x="${ANCHO / 2}" y="${yTitulo + i * interlineado}" text-anchor="middle" font-family="${SERIF}" font-size="${letraTitulo}" font-weight="700" fill="${tinta}">${escapar(linea)}</text>`,
    ),
    d.tamano
      ? `<text x="${ANCHO / 2}" y="${ySubtitulo}" text-anchor="middle" font-family="${SERIF}" font-size="32" font-style="italic" fill="${tinta}">${escapar(d.tamano)}</text>`
      : '',
    fotoSvg,
    `<path d="${estrella(sello.x, sello.y, sello.radio)}" fill="${acento}"/>`,
    `<text x="${sello.x}" y="${sello.y + 15}" text-anchor="middle" font-family="${SERIF}" font-size="${d.precio >= 100000 ? 36 : 42}" font-weight="700" fill="${papel}">${escapar(formatoPrecio(d.precio))}</text>`,
    columna(filas.slice(0, mitad), 130),
    columna(filas.slice(mitad), 580),
    `<line x1="110" y1="1150" x2="${ANCHO - 110}" y2="1150" stroke="${detalle}" stroke-width="2"/>`,
    encajar(r.qrSvg, 104, 1168, 132),
    `<text x="262" y="1218" font-family="${SERIF}" font-size="34" font-weight="700" fill="${tinta}">Encargos</text>`,
    ...contacto.map(
      (linea, i) =>
        `<text x="262" y="${1256 + i * 32}" font-family="${SANS}" font-size="24" fill="${tinta}">${escapar(linea)}</text>`,
    ),
    '</svg>',
  ].join('');
}
