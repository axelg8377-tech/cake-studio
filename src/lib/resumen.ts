/** Las cuentas de Inicio y de Revisar precios. Puras, como costos.ts: se prueban sin navegador. */
import { ultimosCambios } from '../datos/ingredientes';
import type { Ingrediente, PrecioHistorial, Torta } from '../tipos';
import { calcularTorta, idsElegidos, variacion, type Catalogo } from './costos';

export const diaHecha = (t: Torta) => t.hecha ?? t.fecha;

export type ResumenMes = { tortas: number; ventas: number; costos: number; ganancia: number };

/** Solo tortas hechas en el mes de `hoy`, con su precio y costo congelados. */
export function resumenDelMes(tortas: Torta[], hoy = new Date()): ResumenMes {
  const delMes = tortas.filter((t) => {
    if (t.estado !== 'realizada') return false;
    const d = new Date(diaHecha(t));
    return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
  });
  const ventas = delMes.reduce((s, t) => s + t.snapshot.precioFinal, 0);
  const costos = delMes.reduce((s, t) => s + t.snapshot.costo, 0);
  return { tortas: delMes.length, ventas, costos, ganancia: ventas - costos };
}

export type Aumento = { id: number; nombre: string; abs: number; pct: number };

/** El último cambio de cada ingrediente, solo los que subieron, de mayor a menor. */
export function aumentos(historial: PrecioHistorial[], ingredientes: Ingrediente[]): Aumento[] {
  const nombres = new Map(ingredientes.map((i) => [i.id!, i.nombre]));
  const lista: Aumento[] = [];
  for (const h of ultimosCambios(historial).values()) {
    const nombre = nombres.get(h.ingredienteId);
    const { abs, pct } = variacion(h.precioAnterior, h.precioNuevo);
    if (nombre !== undefined && pct !== null && pct > 0) lista.push({ id: h.ingredienteId, nombre, abs, pct });
  }
  return lista.sort((a, b) => b.pct - a.pct);
}

export type Revision = {
  torta: Torta;
  costoAntes: number;
  costoHoy: number;
  diferencia: number;
  pct: number | null;
  /** Lo que sugeriría hoy la app con la misma ganancia que usó esa vez. */
  precioHoy: number;
  conviene: boolean;
  /** Se borró una opción, un ingrediente o el tamaño: el costo de hoy saldría más bajo y mentiría. */
  incompleta: boolean;
};

/**
 * Para cada torta hecha, costo congelado contra costo con precios de hoy. Avisa cuando el costo subió y lo
 * que cobró esa vez ya no llega al precio sugerido de hoy. Solo informa: no cambia nada.
 */
export function revisarPrecios(tortas: Torta[], cat: Catalogo): Revision[] {
  return tortas
    .filter((t) => t.estado === 'realizada')
    .sort((a, b) => diaHecha(b).localeCompare(diaHecha(a)))
    .map((torta) => {
      const sel = torta.seleccion;
      const incompleta =
        !cat.tamanos.has(sel.tamanoId) ||
        idsElegidos(sel).some((id) => !cat.opciones.has(id)) ||
        (sel.ingredientes ?? []).some((l) => !cat.ingredientes.has(l.ingredienteId));
      const hoy = calcularTorta(sel, cat, torta.snapshot.margen);
      const costoAntes = torta.snapshot.costo;
      const { abs, pct } = variacion(costoAntes, hoy.costo);
      return {
        torta,
        costoAntes,
        costoHoy: hoy.costo,
        diferencia: abs,
        pct,
        precioHoy: hoy.precioSugerido,
        conviene: !incompleta && Math.round(abs) > 0 && torta.snapshot.precioFinal < hoy.precioSugerido,
        incompleta,
      };
    });
}
