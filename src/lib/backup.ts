import { db, type BaseDatos } from '../db';
import type { Cliente, Config, Gasto, Imagen, Ingrediente, Opcion, PrecioHistorial, Tamano, Torta } from '../tipos';
import { aBase64 } from './exportar';

/**
 * Copia de seguridad: toda la base en un JSON, fotos incluidas. Una copia sin fotos ni configuración
 * restaura la app a medias (BKP-01). La clave de IA no viaja: el archivo termina en WhatsApp o en
 * Descargas, y al restaurar se conserva la del teléfono.
 */

export const FORMATO = 'pasteleria-copia';
export const VERSION = 1;
export const DIAS_AVISO = 14;

type FotoEnTexto = Omit<Imagen, 'blob'> & { blob: { tipo: string; base64: string } };

export type Copia = {
  formato: typeof FORMATO;
  version: number;
  creada: string;
  tablas: {
    ingredientes: Ingrediente[];
    preciosHistorial: PrecioHistorial[];
    gastos: Gasto[];
    tamanos: Tamano[];
    opciones: Opcion[];
    tortas: Torta[];
    clientes: Cliente[];
    imagenes: FotoEnTexto[];
    config: Config[];
  };
};

const dos = (n: number) => String(n).padStart(2, '0');

/** El nombre lleva fecha y hora: una copia nueva nunca pisa a la anterior en Descargas. */
export async function armarCopia(
  base: BaseDatos = db,
  ahora = new Date(),
): Promise<{ texto: string; nombre: string; creada: string }> {
  const creada = ahora.toISOString();
  const t = await base.transaction('r', base.tables, async () => ({
    ingredientes: await base.ingredientes.toArray(),
    preciosHistorial: await base.preciosHistorial.toArray(),
    gastos: await base.gastos.toArray(),
    tamanos: await base.tamanos.toArray(),
    opciones: await base.opciones.toArray(),
    tortas: await base.tortas.toArray(),
    clientes: await base.clientes.toArray(),
    imagenes: await base.imagenes.toArray(),
    config: await base.config.toArray(),
  }));
  // Las fotos se leen fuera de la transacción: esperar un blob adentro la cerraría antes de tiempo.
  const imagenes = await Promise.all(
    t.imagenes.map(async ({ blob, ...resto }) => ({
      ...resto,
      blob: { tipo: blob.type, base64: aBase64(new Uint8Array(await blob.arrayBuffer())) },
    })),
  );
  const copia: Copia = {
    formato: FORMATO,
    version: VERSION,
    creada,
    tablas: { ...t, imagenes, config: t.config.map((c) => ({ ...c, claveIA: undefined, ultimoBackup: creada })) },
  };
  const fecha = `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}-${dos(ahora.getHours())}${dos(ahora.getMinutes())}`;
  return { texto: JSON.stringify(copia), nombre: `pasteleria-copia-${fecha}.json`, creada };
}

/** Se llama recién cuando el archivo salió del teléfono: cancelar el envío no cuenta como copia. */
export async function marcarCopia(fecha: string, base: BaseDatos = db): Promise<void> {
  await base.config.update('unica', { ultimoBackup: fecha });
}

type Tipo = 'string' | 'number' | 'boolean' | 'array' | 'object';

const ESQUEMA: Record<keyof Copia['tablas'], { nombre: string; campos: Record<string, Tipo> }> = {
  ingredientes: { nombre: 'ingredientes', campos: { id: 'number', nombre: 'string', unidad: 'string', precio: 'number', cantidad: 'number' } },
  preciosHistorial: {
    nombre: 'precios anteriores',
    campos: { id: 'number', ingredienteId: 'number', precioAnterior: 'number', precioNuevo: 'number', fecha: 'string' },
  },
  gastos: { nombre: 'gastos', campos: { id: 'number', nombre: 'string', precio: 'number', porTorta: 'boolean' } },
  tamanos: { nombre: 'tamaños', campos: { id: 'number', nombre: 'string', factor: 'number', orden: 'number' } },
  opciones: { nombre: 'opciones', campos: { id: 'number', tipo: 'string', nombre: 'string', receta: 'array', gastos: 'array' } },
  tortas: {
    nombre: 'tortas',
    campos: { id: 'number', fecha: 'string', nombre: 'string', seleccion: 'object', snapshot: 'object', estado: 'string' },
  },
  clientes: { nombre: 'clientes', campos: { id: 'number', nombre: 'string', telefono: 'string' } },
  imagenes: { nombre: 'fotos', campos: { id: 'number', blob: 'object', categoria: 'string', principal: 'boolean', creada: 'string' } },
  config: { nombre: 'configuración', campos: { id: 'string', negocio: 'object', margenDefecto: 'number', umbralAlerta: 'number' } },
};

const esObjeto = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

function filaValida(fila: unknown, campos: Record<string, Tipo>): boolean {
  if (!esObjeto(fila)) return false;
  return Object.entries(campos).every(([campo, tipo]) => {
    const v = fila[campo];
    if (tipo === 'array') return Array.isArray(v);
    if (tipo === 'object') return esObjeto(v);
    return typeof v === tipo && (tipo !== 'number' || Number.isFinite(v));
  });
}

/**
 * Lee y revisa el archivo entero antes de tocar nada. Si algo no cierra, tira un error con un texto
 * para mostrar, y los datos del teléfono quedan como estaban.
 */
export function leerCopia(texto: string): Copia {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('Ese archivo no es una copia de la app.');
  }
  if (!esObjeto(datos) || datos.formato !== FORMATO) throw new Error('Ese archivo no es una copia de la app.');
  if (typeof datos.version !== 'number' || datos.version > VERSION) {
    throw new Error('Esa copia es de una versión más nueva de la app. Actualizala y probá de nuevo.');
  }
  const tablas = datos.tablas;
  if (!esObjeto(tablas)) throw new Error('La copia está dañada: no tiene datos.');
  for (const [tabla, { nombre, campos }] of Object.entries(ESQUEMA)) {
    const filas = tablas[tabla];
    if (!Array.isArray(filas)) throw new Error(`La copia está incompleta: faltan ${nombre}.`);
    for (const fila of filas) {
      const valida =
        filaValida(fila, campos) &&
        (tabla !== 'imagenes' || filaValida((fila as FotoEnTexto).blob, { tipo: 'string', base64: 'string' }));
      if (!valida) throw new Error(`La copia está dañada: hay ${nombre} que no se pueden leer.`);
    }
  }
  const config = tablas.config as Config[];
  if (config.length !== 1 || config[0].id !== 'unica') throw new Error('La copia está dañada: falta la configuración.');
  return datos as unknown as Copia;
}

/** Reemplaza todo por lo de la copia, en una sola transacción: o entra entera o no cambia nada. */
export async function restaurarCopia(copia: Copia, base: BaseDatos = db): Promise<void> {
  // Las fotos se decodifican antes: si una está rota, falla acá y la base ni se abre.
  const imagenes: Imagen[] = copia.tablas.imagenes.map(({ blob, ...resto }) => ({
    ...resto,
    blob: new Blob([Uint8Array.from(atob(blob.base64), (c) => c.charCodeAt(0))], { type: blob.tipo }),
  }));
  const t = copia.tablas;
  await base.transaction('rw', base.tables, async () => {
    const clave = (await base.config.get('unica'))?.claveIA;
    for (const tabla of base.tables) await tabla.clear();
    await base.ingredientes.bulkAdd(t.ingredientes);
    await base.preciosHistorial.bulkAdd(t.preciosHistorial);
    await base.gastos.bulkAdd(t.gastos);
    await base.tamanos.bulkAdd(t.tamanos);
    await base.opciones.bulkAdd(t.opciones);
    await base.tortas.bulkAdd(t.tortas);
    await base.clientes.bulkAdd(t.clientes);
    await base.imagenes.bulkAdd(imagenes);
    await base.config.bulkAdd(t.config.map((c) => ({ ...c, claveIA: clave })));
  });
}

/** `null` si no hace falta avisar. Sin datos propios cargados todavía no tiene sentido pedir copia. */
export function avisoCopia(ultimo: string | undefined, hayDatos: boolean, hoy = new Date()): 'nunca' | 'vieja' | null {
  if (!ultimo) return hayDatos ? 'nunca' : null;
  const dias = (hoy.getTime() - new Date(ultimo).getTime()) / 86_400_000;
  return dias >= DIAS_AVISO ? 'vieja' : null;
}
