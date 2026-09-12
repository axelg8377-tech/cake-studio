/**
 * Todo el cálculo de plata de la app. Funciones puras: reciben datos, devuelven números. Nada lee la
 * base, así se prueban sin navegador y la pantalla no puede calcular distinto que el test.
 */

import type {
  Gasto,
  Ingrediente,
  LineaCosto,
  Opcion,
  Seleccion,
  Snapshot,
  Tamano,
  TipoOpcion,
} from '../tipos';
import { mostrarCantidad } from './unidades';

export type Catalogo = {
  ingredientes: Map<number, Ingrediente>;
  gastos: Map<number, Gasto>;
  opciones: Map<number, Opcion>;
  tamanos: Map<number, Tamano>;
};

export const NOMBRE_TIPO: Record<TipoOpcion, string> = {
  masa: 'Masa',
  relleno: 'Relleno',
  cobertura: 'Cobertura',
  decoracion: 'Decoración',
  extra: 'Extra',
};

/** Harina $1.500 por 1000 g, se usan 500 g → $750. */
export function costoIngrediente(ing: Pick<Ingrediente, 'precio' | 'cantidad'>, usada: number): number {
  return ing.cantidad > 0 ? (ing.precio / ing.cantidad) * usada : 0;
}

/** Chocolate $5.000 → $7.000 = +$2.000 y +40%. Sin precio anterior no hay porcentaje. */
export function variacion(anterior: number, nuevo: number): { abs: number; pct: number | null } {
  return { abs: nuevo - anterior, pct: anterior > 0 ? ((nuevo - anterior) / anterior) * 100 : null };
}

export function redondearArriba(valor: number, paso = 100): number {
  return Math.ceil(valor / paso) * paso;
}

function sumaGastos(ids: number[], gastos: Map<number, Gasto>): number {
  return ids.reduce((suma, id) => suma + (gastos.get(id)?.precio ?? 0), 0);
}

/** La receta se escala por tamaño; el precio fijo y los gastos de la opción, no. */
export function costoOpcion(op: Opcion, factor: number, cat: Pick<Catalogo, 'ingredientes' | 'gastos'>): number {
  const gastos = sumaGastos(op.gastos, cat.gastos);
  if (op.modo === 'fijo') return (op.precioFijo ?? 0) + gastos;
  const receta = op.receta.reduce((suma, linea) => {
    const ing = cat.ingredientes.get(linea.ingredienteId);
    return ing ? suma + costoIngrediente(ing, linea.cantidad) : suma;
  }, 0);
  return receta * factor + gastos;
}

/** Los ids elegidos, en el orden en que se muestran. */
export function idsElegidos(sel: Seleccion): number[] {
  return [
    sel.masaId,
    ...sel.rellenoIds,
    sel.coberturaId,
    sel.decoracionId,
    ...sel.extraIds,
  ].filter((id): id is number => id !== undefined);
}

export function calcularTorta(
  sel: Seleccion,
  cat: Catalogo,
  margen: number,
  precioFinal?: number,
): Snapshot {
  const factor = cat.tamanos.get(sel.tamanoId)?.factor ?? 1;
  const lineas: LineaCosto[] = [];

  for (const id of idsElegidos(sel)) {
    const op = cat.opciones.get(id);
    if (op) lineas.push({ concepto: `${NOMBRE_TIPO[op.tipo]}: ${op.nombre}`, costo: costoOpcion(op, factor, cat) });
  }
  for (const linea of sel.ingredientes ?? []) {
    const ing = cat.ingredientes.get(linea.ingredienteId);
    if (ing) {
      lineas.push({
        concepto: `${ing.nombre} (${mostrarCantidad(linea.cantidad, ing.unidad)})`,
        costo: costoIngrediente(ing, linea.cantidad),
      });
    }
  }
  for (const gasto of cat.gastos.values()) {
    if (gasto.porTorta) lineas.push({ concepto: gasto.nombre, costo: gasto.precio });
  }

  const costo = lineas.reduce((suma, l) => suma + l.costo, 0);
  const precioSugerido = redondearArriba(costo * (1 + margen / 100));
  const final = precioFinal ?? precioSugerido;
  return { lineas, costo, margen, precioSugerido, precioFinal: final, ganancia: final - costo };
}

/** Cuánto de cada ingrediente se usa en la torta, ya escalado. */
export function consumo(sel: Seleccion, cat: Catalogo): Map<number, number> {
  const factor = cat.tamanos.get(sel.tamanoId)?.factor ?? 1;
  const total = new Map<number, number>();
  for (const id of idsElegidos(sel)) {
    const op = cat.opciones.get(id);
    if (op?.modo !== 'receta') continue;
    for (const linea of op.receta) {
      total.set(linea.ingredienteId, (total.get(linea.ingredienteId) ?? 0) + linea.cantidad * factor);
    }
  }
  for (const linea of sel.ingredientes ?? []) {
    total.set(linea.ingredienteId, (total.get(linea.ingredienteId) ?? 0) + linea.cantidad);
  }
  return total;
}

export type Faltante = { ingredienteId: number; nombre: string; necesita: number; hay: number };

/** Solo avisa de ingredientes con stock cargado. Nunca bloquea: es un aviso. */
export function faltantesDeStock(sel: Seleccion, cat: Catalogo): Faltante[] {
  const faltantes: Faltante[] = [];
  for (const [id, necesita] of consumo(sel, cat)) {
    const ing = cat.ingredientes.get(id);
    if (ing?.stock !== undefined && ing.stock < necesita) {
      faltantes.push({ ingredienteId: id, nombre: ing.nombre, necesita, hay: ing.stock });
    }
  }
  return faltantes;
}
