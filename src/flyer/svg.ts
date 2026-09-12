/** Utilidades compartidas por las plantillas. Todas devuelven texto: nada toca el DOM. */
import { encajar } from './qrMarca';

export type Paleta = { papel: string; tinta: string; acento: string; detalle: string };

export type Negocio = { nombre: string; telefono: string; instagram?: string };

/** Dirección A. */
export const PALETA_PAPEL: Paleta = {
  papel: '#F5EDE0',
  tinta: '#3B2A22',
  acento: '#A8553A',
  detalle: '#D9C3A5',
};

/** Dirección B, la de la plantilla Dulce. `detalle` es el dorado. */
export const PALETA_ROSA: Paleta = {
  papel: '#FFF7EC',
  tinta: '#3B2A26',
  acento: '#D98E96',
  detalle: '#E9B872',
};

export const SERIF = "'Titulos', 'Playfair Display', Georgia, 'Times New Roman', serif";
export const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

/**
 * Pie de las tres plantillas: línea, QR abajo a la izquierda, "Encargos" y contactos.
 * 196 px: con 132 no se leía desde la pantalla de un celular (prueba del CEO, 2026-09-12), y el
 * mensaje prearmado agrega módulos que hay que compensar con tamaño. flyer.test.ts lo lee a 480 px.
 */
export function pie(
  qrSvg: string,
  negocio: Negocio,
  { tinta, detalle }: Paleta,
  encargos: { familia: string; tamano: number; peso: number } = { familia: SERIF, tamano: 36, peso: 700 },
): string {
  const contacto = [
    negocio.telefono && `WhatsApp ${negocio.telefono}`,
    negocio.instagram && `@${negocio.instagram.replace(/^@/, '')}`,
  ].filter(Boolean) as string[];
  return [
    `<line x1="110" y1="1104" x2="970" y2="1104" stroke="${detalle}" stroke-width="2"/>`,
    encajar(qrSvg, 100, 1112, 196),
    `<text x="324" y="1188" font-family="${encargos.familia}" font-size="${encargos.tamano}" font-weight="${encargos.peso}" fill="${tinta}">Encargos</text>`,
    ...contacto.map(
      (linea, i) =>
        `<text x="324" y="${1230 + i * 36}" font-family="${SANS}" font-size="26" fill="${tinta}">${escapar(linea)}</text>`,
    ),
  ].join('');
}

/** Borde de flor de la referencia Dough Daze: un círculo con `ondas` semicírculos hacia afuera. */
export function feston(cx: number, cy: number, radio: number, ondas = 10): string {
  const seno = Math.sin(Math.PI / ondas);
  const base = radio / (1 + seno);
  const onda = (base * seno).toFixed(1);
  const punto = (i: number) => {
    const a = (2 * Math.PI * i) / ondas - Math.PI / 2;
    return `${(cx + base * Math.cos(a)).toFixed(1)},${(cy + base * Math.sin(a)).toFixed(1)}`;
  };
  let d = `M${punto(0)}`;
  for (let i = 1; i <= ondas; i++) d += `A${onda},${onda} 0 0 1 ${punto(i)}`;
  return `${d}Z`;
}

export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatoPrecio(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-AR')}`;
}

/** Corta por palabras. Si no entra en `maxLineas`, la última línea termina en "…" sin partir palabras. */
export function partir(texto: string, maxCaracteres: number, maxLineas: number): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.trim().split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (prueba.length <= maxCaracteres || !actual) {
      actual = prueba;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  if (lineas.length <= maxLineas) return lineas;
  const recorte = lineas.slice(0, maxLineas);
  recorte[maxLineas - 1] = `${recorte[maxLineas - 1]}…`;
  return recorte;
}

/** Elige el tamaño de letra más grande con el que el texto entra entero en `maxLineas`. */
export function ajustar(
  texto: string,
  escalones: { caracteres: number; tamano: number }[],
  maxLineas: number,
): { lineas: string[]; tamano: number } {
  for (const { caracteres, tamano } of escalones) {
    const lineas = partir(texto, caracteres, Number.POSITIVE_INFINITY);
    if (lineas.length <= maxLineas) return { lineas, tamano };
  }
  const ultimo = escalones[escalones.length - 1];
  return { lineas: partir(texto, ultimo.caracteres, maxLineas), tamano: ultimo.tamano };
}

/** El sello de precio de la referencia Bruniva: estrella de `puntas` puntas. */
export function estrella(cx: number, cy: number, radio: number, puntas = 18, hondo = 0.84): string {
  const pasos = puntas * 2;
  const puntos: string[] = [];
  for (let i = 0; i < pasos; i++) {
    const r = i % 2 === 0 ? radio : radio * hondo;
    const a = (Math.PI * i) / puntas - Math.PI / 2;
    puntos.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${puntos.join('L')}Z`;
}

export function fuenteFace(familia: string, dataUri: string | null): string {
  return dataUri
    ? `@font-face{font-family:'${familia}';font-weight:400 900;src:url(${dataUri}) format('woff2');}`
    : '';
}
