import { db, type BaseDatos } from '../db';
import type { Ingrediente, Opcion, PrecioHistorial } from '../tipos';

export async function crearIngrediente(
  datos: Omit<Ingrediente, 'id' | 'actualizado'>,
  base: BaseDatos = db,
): Promise<number> {
  const id = await base.ingredientes.add({ ...datos, nombre: datos.nombre.trim(), actualizado: new Date().toISOString() });
  return id as number;
}

/** El precio y la presentación no se editan acá: pasan por `actualizarPrecio` para dejar historial. */
export async function editarIngrediente(
  id: number,
  cambios: Pick<Ingrediente, 'nombre' | 'categoria' | 'stock' | 'notas'>,
  base: BaseDatos = db,
): Promise<void> {
  await base.ingredientes.update(id, cambios);
}

/**
 * Nunca pisa el precio: deja una fila con el anterior.
 *
 * Si cambió la presentación (antes $5.000 el kilo, ahora $3.000 el medio kilo), el precio anterior se
 * guarda llevado a la cantidad nueva ($2.500 por 500 g). Si no, la variación compararía un kilo contra
 * medio kilo y diría que bajó.
 */
export async function actualizarPrecio(
  id: number,
  precioNuevo: number,
  cantidadNueva?: number,
  base: BaseDatos = db,
): Promise<void> {
  await base.transaction('rw', base.ingredientes, base.preciosHistorial, async () => {
    const ing = await base.ingredientes.get(id);
    if (!ing) throw new Error('Ese ingrediente ya no existe.');
    const cantidad = cantidadNueva ?? ing.cantidad;
    const fecha = new Date().toISOString();
    await base.preciosHistorial.add({
      ingredienteId: id,
      precioAnterior: (ing.precio * cantidad) / ing.cantidad,
      precioNuevo,
      cantidad,
      fecha,
    });
    await base.ingredientes.update(id, {
      precio: precioNuevo,
      cantidad,
      actualizado: fecha,
      // La nota "precio de ejemplo" deja de ser cierta en cuanto ella carga uno real.
      notas: ing.notas?.startsWith('Precio de ejemplo') ? undefined : ing.notas,
    });
  });
}

/** El cambio más reciente de cada ingrediente. Empates de fecha: gana el id más alto. */
export function ultimosCambios(historial: PrecioHistorial[]): Map<number, PrecioHistorial> {
  const ultimo = new Map<number, PrecioHistorial>();
  for (const h of historial) {
    const previo = ultimo.get(h.ingredienteId);
    if (!previo || h.fecha > previo.fecha || (h.fecha === previo.fecha && (h.id ?? 0) > (previo.id ?? 0))) {
      ultimo.set(h.ingredienteId, h);
    }
  }
  return ultimo;
}

export async function opcionesQueUsan(id: number, base: BaseDatos = db): Promise<Opcion[]> {
  return (await base.opciones.toArray()).filter((o) => o.receta.some((l) => l.ingredienteId === id));
}

export type ResultadoBorrado = { ok: true } | { ok: false; usadoEn: string[] };

/** Un ingrediente que está en una receta no se borra: la torta quedaría con un costo mentiroso. */
export async function eliminarIngrediente(id: number, base: BaseDatos = db): Promise<ResultadoBorrado> {
  return base.transaction('rw', base.ingredientes, base.opciones, base.preciosHistorial, async () => {
    const usan = await opcionesQueUsan(id, base);
    if (usan.length > 0) return { ok: false, usadoEn: usan.map((o) => o.nombre) } as const;
    await base.preciosHistorial.where('ingredienteId').equals(id).delete();
    await base.ingredientes.delete(id);
    return { ok: true } as const;
  });
}
