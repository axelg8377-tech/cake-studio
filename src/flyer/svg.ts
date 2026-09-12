/** Utilidades compartidas por las plantillas. Todas devuelven texto: nada toca el DOM. */

export type Paleta = { papel: string; tinta: string; acento: string; detalle: string };

export const PALETA_PAPEL: Paleta = {
  papel: '#F5EDE0',
  tinta: '#3B2A22',
  acento: '#A8553A',
  detalle: '#D9C3A5',
};

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
