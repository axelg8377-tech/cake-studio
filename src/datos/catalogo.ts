import { db, type BaseDatos } from '../db';
import { calcularTorta, consumo, type Catalogo } from '../lib/costos';
import type { Gasto, Opcion, Seleccion, Tamano, Torta } from '../tipos';
import type { ResultadoBorrado } from './ingredientes';

const porId = <T extends { id?: number }>(filas: T[]) => new Map(filas.map((f) => [f.id!, f]));

/** Todo lo que necesita el cálculo, en Maps. Los tamaños quedan en su orden (un Map respeta el de carga). */
export async function leerCatalogo(base: BaseDatos = db): Promise<Catalogo> {
  const [ingredientes, gastos, opciones, tamanos] = await Promise.all([
    base.ingredientes.toArray(),
    base.gastos.toArray(),
    base.opciones.toArray(),
    base.tamanos.orderBy('orden').toArray(),
  ]);
  return { ingredientes: porId(ingredientes), gastos: porId(gastos), opciones: porId(opciones), tamanos: porId(tamanos) };
}

// ── Gastos ──

export async function guardarGasto(datos: Omit<Gasto, 'id' | 'fecha'>, id?: number, base: BaseDatos = db): Promise<number> {
  const fila: Gasto = { ...datos, nombre: datos.nombre.trim(), fecha: new Date().toISOString() };
  return (await base.gastos.put(id ? { ...fila, id } : fila)) as number;
}

/** Un gasto que arrastra una opción (la caja de "Caja especial") no se borra: esa opción costaría menos. */
export async function eliminarGasto(id: number, base: BaseDatos = db): Promise<ResultadoBorrado> {
  return base.transaction('rw', base.gastos, base.opciones, async () => {
    const usan = (await base.opciones.toArray()).filter((o) => o.gastos.includes(id));
    if (usan.length > 0) return { ok: false, usadoEn: usan.map((o) => o.nombre) } as const;
    await base.gastos.delete(id);
    return { ok: true } as const;
  });
}

// ── Tamaños ──

export async function guardarTamano(datos: Omit<Tamano, 'id'>, id?: number, base: BaseDatos = db): Promise<number> {
  const fila: Tamano = { ...datos, nombre: datos.nombre.trim() };
  return (await base.tamanos.put(id ? { ...fila, id } : fila)) as number;
}

/** Sin tamaños no se puede armar ninguna torta: el último no se borra. Las tortas guardadas no se afectan. */
export async function eliminarTamano(id: number, base: BaseDatos = db): Promise<boolean> {
  return base.transaction('rw', base.tamanos, async () => {
    if ((await base.tamanos.count()) <= 1) return false;
    await base.tamanos.delete(id);
    return true;
  });
}

// ── Opciones ──

/** Guarda solo lo que corresponde al modo: una opción fija no arrastra una receta vieja escondida. */
export async function guardarOpcion(datos: Omit<Opcion, 'id'>, id?: number, base: BaseDatos = db): Promise<number> {
  const fila: Opcion =
    datos.modo === 'fijo'
      ? { tipo: datos.tipo, nombre: datos.nombre.trim(), modo: 'fijo', precioFijo: datos.precioFijo ?? 0, receta: [], gastos: datos.gastos }
      : { tipo: datos.tipo, nombre: datos.nombre.trim(), modo: 'receta', receta: datos.receta, gastos: datos.gastos };
  return (await base.opciones.put(id ? { ...fila, id } : fila)) as number;
}

/** Las tortas guardadas tienen su costo congelado: borrar una opción no las cambia. */
export async function eliminarOpcion(id: number, base: BaseDatos = db): Promise<void> {
  await base.opciones.delete(id);
}

// ── Tortas ──

export type DatosTorta = {
  nombre: string;
  seleccion: Seleccion;
  margen: number;
  precioFinal?: number;
  estado: Torta['estado'];
};

/**
 * Calcula el costo con los precios de ahora y lo congela. Si la torta está realizada descuenta lo usado
 * del stock de los ingredientes que lo tienen cargado, sin bajar de cero.
 */
export async function guardarTorta(datos: DatosTorta, base: BaseDatos = db): Promise<number> {
  return base.transaction('rw', [base.ingredientes, base.gastos, base.opciones, base.tamanos, base.tortas], async () => {
    const cat = await leerCatalogo(base);
    const snapshot = calcularTorta(datos.seleccion, cat, datos.margen, datos.precioFinal);
    if (datos.estado === 'realizada') {
      for (const [ingredienteId, usado] of consumo(datos.seleccion, cat)) {
        const stock = cat.ingredientes.get(ingredienteId)?.stock;
        if (stock !== undefined) await base.ingredientes.update(ingredienteId, { stock: Math.max(0, stock - usado) });
      }
    }
    const id = await base.tortas.add({
      fecha: new Date().toISOString(),
      nombre: datos.nombre.trim() || 'Torta sin nombre',
      seleccion: datos.seleccion,
      snapshot,
      estado: datos.estado,
    });
    return id as number;
  });
}
