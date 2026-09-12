import Dexie, { type EntityTable } from 'dexie';
import { sembrar } from './datos/semilla';
import type {
  Cliente,
  Config,
  Gasto,
  Imagen,
  Ingrediente,
  Opcion,
  PrecioHistorial,
  Tamano,
  Torta,
} from './tipos';

export type BaseDatos = Dexie & {
  ingredientes: EntityTable<Ingrediente, 'id'>;
  preciosHistorial: EntityTable<PrecioHistorial, 'id'>;
  gastos: EntityTable<Gasto, 'id'>;
  tamanos: EntityTable<Tamano, 'id'>;
  opciones: EntityTable<Opcion, 'id'>;
  tortas: EntityTable<Torta, 'id'>;
  clientes: EntityTable<Cliente, 'id'>;
  imagenes: EntityTable<Imagen, 'id'>;
  config: EntityTable<Config, 'id'>;
};

/** Recibe el nombre para que los tests abran una base propia cada uno. */
export function crearBase(nombre = 'pasteleria'): BaseDatos {
  const base = new Dexie(nombre) as BaseDatos;
  // Solo se indexa lo que se busca u ordena. IndexedDB no indexa booleanos: `principal` y `porTorta`
  // se filtran en memoria, son pocas filas.
  base.version(1).stores({
    ingredientes: '++id, nombre, categoria',
    preciosHistorial: '++id, ingredienteId, fecha',
    gastos: '++id, nombre, categoria, fecha',
    tamanos: '++id, orden',
    opciones: '++id, tipo, nombre',
    tortas: '++id, fecha, estado, clienteId',
    clientes: '++id, nombre',
    imagenes: '++id, categoria, creada',
    config: 'id',
  });
  return base;
}

export const db = crearBase();

/**
 * La primera vez que se abre la app carga ingredientes, opciones y tamaños de ejemplo, para que no
 * arranque con pantallas vacías. Si ya hay configuración, no toca nada.
 */
export async function prepararBase(base: BaseDatos = db): Promise<void> {
  await base.transaction('rw', base.tables, async () => {
    if ((await base.config.count()) === 0) await sembrar(base);
  });
}
