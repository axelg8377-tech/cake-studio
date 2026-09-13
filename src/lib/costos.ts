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

/** El piso de abajo y los de arriba, en orden. Una torta de un piso devuelve solo `sel`. */
export function pisosDe(sel: Seleccion): Seleccion[] {
  return [sel, ...(sel.pisos ?? [])];
}

/** Los ids elegidos de un piso, en el orden en que se muestran. */
function idsDelPiso(sel: Seleccion): number[] {
  return [
    sel.masaId,
    ...sel.rellenoIds,
    sel.coberturaId,
    sel.decoracionId,
    ...sel.extraIds,
  ].filter((id): id is number => id !== undefined);
}

/** Los ids elegidos de todos los pisos. */
export function idsElegidos(sel: Seleccion): number[] {
  return pisosDe(sel).flatMap(idsDelPiso);
}

export function calcularTorta(
  sel: Seleccion,
  cat: Catalogo,
  margen: number,
  precioFinal?: number,
): Snapshot {
  const lineas: LineaCosto[] = [];
  const pisos = pisosDe(sel);

  pisos.forEach((piso, i) => {
    const factor = cat.tamanos.get(piso.tamanoId)?.factor ?? 1;
    const prefijo = pisos.length > 1 ? `Piso ${i + 1} · ` : '';
    for (const id of idsDelPiso(piso)) {
      const op = cat.opciones.get(id);
      if (op) lineas.push({ concepto: `${prefijo}${NOMBRE_TIPO[op.tipo]}: ${op.nombre}`, costo: costoOpcion(op, factor, cat) });
    }
    for (const linea of piso.ingredientes ?? []) {
      const ing = cat.ingredientes.get(linea.ingredienteId);
      if (ing) {
        lineas.push({
          concepto: `${prefijo}${ing.nombre} (${mostrarCantidad(linea.cantidad, ing.unidad)})`,
          costo: costoIngrediente(ing, linea.cantidad),
        });
      }
    }
  });
  // La base de cartón y el gas van una vez por torta, tenga los pisos que tenga.
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
  const total = new Map<number, number>();
  const sumar = (id: number, cantidad: number) => total.set(id, (total.get(id) ?? 0) + cantidad);
  for (const piso of pisosDe(sel)) {
    const factor = cat.tamanos.get(piso.tamanoId)?.factor ?? 1;
    for (const id of idsDelPiso(piso)) {
      const op = cat.opciones.get(id);
      if (op?.modo !== 'receta') continue;
      for (const linea of op.receta) sumar(linea.ingredienteId, linea.cantidad * factor);
    }
    for (const linea of piso.ingredientes ?? []) sumar(linea.ingredienteId, linea.cantidad);
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
