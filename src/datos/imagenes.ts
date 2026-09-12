import { db, type BaseDatos } from '../db';
import { reducirFoto } from '../lib/exportar';
import type { CategoriaImagen } from '../tipos';

export const CATEGORIAS_IMAGEN: Record<CategoriaImagen, string> = {
  torta: 'Tortas',
  decoracion: 'Decoración',
  fondo: 'Fondos',
  logo: 'Logo',
  otro: 'Otras',
};

/** Cada foto se achica a 1200 px antes de guardarla. Devuelve los ids en el orden en que llegaron. */
export async function subirFotos(archivos: Blob[], categoria: CategoriaImagen, base: BaseDatos = db): Promise<number[]> {
  const ids: number[] = [];
  for (const archivo of archivos) {
    const blob = await reducirFoto(archivo);
    ids.push((await base.imagenes.add({ blob, categoria, principal: false, creada: new Date().toISOString() })) as number);
  }
  return ids;
}

/** Hay una sola principal: es la foto que el flyer trae elegida al abrirlo. */
export async function marcarPrincipal(id: number, base: BaseDatos = db): Promise<void> {
  await base.transaction('rw', base.imagenes, async () => {
    await base.imagenes.toCollection().modify({ principal: false });
    await base.imagenes.update(id, { principal: true });
  });
}
