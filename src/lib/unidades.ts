import type { UnidadBase } from '../tipos';

export type UnidadCarga = 'kg' | 'g' | 'l' | 'ml' | 'u';

export const UNIDADES_CARGA: { valor: UnidadCarga; nombre: string }[] = [
  { valor: 'kg', nombre: 'kilos' },
  { valor: 'g', nombre: 'gramos' },
  { valor: 'l', nombre: 'litros' },
  { valor: 'ml', nombre: 'mililitros' },
  { valor: 'u', nombre: 'unidades' },
];

const A_BASE: Record<UnidadCarga, { base: UnidadBase; factor: number }> = {
  kg: { base: 'g', factor: 1000 },
  g: { base: 'g', factor: 1 },
  l: { base: 'ml', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  u: { base: 'u', factor: 1 },
};

/** "1 kg" → 1000 g. Todo se guarda en g, ml o u para que el costo sea una sola división. */
export function aBase(cantidad: number, unidad: UnidadCarga): { cantidad: number; unidad: UnidadBase } {
  const { base, factor } = A_BASE[unidad];
  return { cantidad: cantidad * factor, unidad: base };
}

export const NOMBRE_UNIDAD = Object.fromEntries(UNIDADES_CARGA.map((u) => [u.valor, u.nombre])) as Record<
  UnidadCarga,
  string
>;

/** Para cargar en un formulario: 1000 g → 1 kg, 750 g → 750 g. */
export function desdeBase(cantidad: number, unidad: UnidadBase): { cantidad: number; unidad: UnidadCarga } {
  if (unidad !== 'u' && cantidad >= 1000 && cantidad % 100 === 0) {
    return { cantidad: cantidad / 1000, unidad: unidad === 'g' ? 'kg' : 'l' };
  }
  return { cantidad, unidad };
}

/** Un ingrediente en gramos se puede cargar en kg o g, nunca en litros. */
export function unidadesDe(base: UnidadBase): UnidadCarga[] {
  return base === 'g' ? ['kg', 'g'] : base === 'ml' ? ['l', 'ml'] : ['u'];
}

/** Lo contrario, para mostrar: 1500 g → "1,5 kg", 350 ml → "350 ml", 12 u → "12 u". */
export function mostrarCantidad(cantidad: number, unidad: UnidadBase): string {
  const numero = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  if (unidad === 'g' && cantidad >= 1000) return `${numero(cantidad / 1000)} kg`;
  if (unidad === 'ml' && cantidad >= 1000) return `${numero(cantidad / 1000)} l`;
  return `${numero(cantidad)} ${unidad}`;
}
