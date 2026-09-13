import { logoTorta } from '../logo';
import { encajar } from '../qrMarca';
import { ajustar, escapar, estrella, feston, formatoPrecio, fotoEncuadrada, fuenteFace, partir, pie, SANS, SERIF } from '../svg';
import { ALTO, ANCHO, type DatosFlyer, type RecursosFlyer } from './elegante';

const GUION = "'Guion', 'Great Vibes', 'Brush Script MT', cursive";
/** El rosa del acento no llega a 4.5:1 sobre el papel: los rótulos chicos van en este, más hondo. */
const ROSA_HONDO = '#A85A64';
const CREMA_DORADA = '#F7E3C7';

/** Plantilla Dulce (referencia Dough Daze): rosa empolvado, nombre en cursiva, foto recortada en flor. */
export function flyerDulce(d: DatosFlyer, r: RecursosFlyer): string {
  const { papel, tinta, acento, detalle: dorado } = r.paleta;
  const { lineas: titulo, tamano: letra } = ajustar(
    d.nombre,
    [
      { caracteres: 16, tamano: 120 },
      { caracteres: 22, tamano: 92 },
    ],
    2,
  );
  const interlineado = Math.round(letra * 0.95);
  const yTitulo = 250;
  const finTitulo = yTitulo + (titulo.length - 1) * interlineado;
  const ySubtitulo = finTitulo + 62;
  const fin = d.tamano ? ySubtitulo : finTitulo;
  const subtitulo = d.tamano ? partir(d.tamano.toUpperCase(), 22, 1)[0] : '';

  // La flor llena el espacio entre el título y el pie (y=1104); los datos van a su derecha.
  const radio = Math.min(280, Math.round((1080 - fin) / 2 - 20));
  const flor = { cx: 350, cy: Math.round((fin + 1080) / 2) + 10 };
  const contorno = feston(flor.cx, flor.cy, radio);
  const fotoSvg = r.fotoDataUri
    ? fotoEncuadrada(
        r.fotoDataUri,
        r.fotoTam,
        { x: flor.cx - radio, y: flor.cy - radio, ancho: radio * 2, alto: radio * 2 },
        'dl-flor',
        r.encuadre,
      )
    : `<path d="${contorno}" fill="${CREMA_DORADA}"/>` +
      encajar(logoTorta(acento, CREMA_DORADA), flor.cx - radio / 2, flor.cy - radio / 2, radio);
  // El sello pisa el borde de la flor abajo a la derecha y termina antes de la columna de datos (x=690).
  const sello = { cx: Math.round(flor.cx + radio * 0.72), cy: Math.round(flor.cy + radio * 0.72), radio: 100 };

  // La columna mide 300 px: un valor largo ("Dulce de leche + crema") baja a una segunda línea.
  const filas = d.detalle
    .filter((f) => f.valor.trim())
    .slice(0, 5)
    .map((f) => ({ etiqueta: f.etiqueta, valor: partir(f.valor, 18, 2) }));
  const alto = (valor: string[]) => 84 + (valor.length - 1) * 32;
  let y = flor.cy - filas.reduce((suma, f) => suma + alto(f.valor), 0) / 2 + 30;
  let datos = '';
  for (const f of filas) {
    datos +=
      `<text x="690" y="${y}" font-family="${SANS}" font-size="20" font-weight="700" letter-spacing="3" fill="${ROSA_HONDO}">${escapar(f.etiqueta.toUpperCase())}</text>` +
      f.valor
        .map(
          (linea, i) =>
            `<text x="690" y="${y + 34 + i * 32}" font-family="${SERIF}" font-size="28" fill="${tinta}">${escapar(linea)}</text>`,
        )
        .join('') +
      `<line x1="690" y1="${y + alto(f.valor) - 30}" x2="990" y2="${y + alto(f.valor) - 30}" stroke="${dorado}" stroke-width="3" stroke-dasharray="1 9" stroke-linecap="round"/>`;
    y += alto(f.valor);
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${ALTO}" width="${ANCHO}" height="${ALTO}">`,
    `<defs><style>${fuenteFace('Titulos', r.fuenteTitulos)}${fuenteFace('Guion', r.fuenteGuion ?? null)}</style>`,
    `<clipPath id="dl-flor"><path d="${contorno}"/></clipPath></defs>`,
    `<rect width="${ANCHO}" height="${ALTO}" fill="${papel}"/>`,
    `<path d="M${ANCHO} 380C780 520 600 820 740 1060S1000 ${ALTO} ${ANCHO} ${ALTO}Z" fill="${acento}" opacity=".16"/>`,
    `<text x="${ANCHO / 2}" y="120" text-anchor="middle" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="8" fill="${tinta}">${escapar(d.negocio.nombre.toUpperCase())}</text>`,
    ...titulo.map(
      (linea, i) =>
        `<text x="${ANCHO / 2}" y="${yTitulo + i * interlineado}" text-anchor="middle" font-family="${GUION}" font-size="${letra}" fill="${tinta}">${escapar(linea)}</text>`,
    ),
    subtitulo
      ? `<line x1="150" y1="${ySubtitulo - 8}" x2="290" y2="${ySubtitulo - 8}" stroke="${acento}" stroke-width="3"/>` +
        `<line x1="790" y1="${ySubtitulo - 8}" x2="930" y2="${ySubtitulo - 8}" stroke="${acento}" stroke-width="3"/>` +
        `<text x="${ANCHO / 2}" y="${ySubtitulo}" text-anchor="middle" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="6" fill="${tinta}">${escapar(subtitulo)}</text>`
      : '',
    `<path d="${feston(flor.cx + 16, flor.cy - 16, radio)}" fill="${acento}" opacity=".35"/>`,
    fotoSvg,
    `<path d="${estrella(sello.cx, sello.cy, sello.radio)}" fill="${dorado}"/>`,
    `<text x="${sello.cx}" y="${sello.cy + 14}" text-anchor="middle" font-family="${SERIF}" font-size="${d.precio >= 100000 ? 34 : 40}" font-weight="700" fill="${tinta}">${escapar(formatoPrecio(d.precio))}</text>`,
    datos,
    pie(r.qrSvg, d.negocio, r.paleta, { familia: GUION, tamano: 64, peso: 400 }),
    '</svg>',
  ].join('');
}
