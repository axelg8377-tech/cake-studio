import { db, type BaseDatos } from '../db';
import type { Cliente } from '../tipos';

export async function guardarCliente(datos: Omit<Cliente, 'id'>, id?: number, base: BaseDatos = db): Promise<number> {
  const fila: Cliente = { nombre: datos.nombre.trim(), telefono: datos.telefono.trim(), notas: datos.notas?.trim() || undefined };
  return (await base.clientes.put(id ? { ...fila, id } : fila)) as number;
}

/** Las tortas del cliente no se borran: quedan en el historial, sin cliente. */
export async function eliminarCliente(id: number, base: BaseDatos = db): Promise<void> {
  await base.transaction('rw', base.clientes, base.tortas, async () => {
    await base.tortas
      .where('clienteId')
      .equals(id)
      .modify((t) => {
        delete t.clienteId;
      });
    await base.clientes.delete(id);
  });
}
