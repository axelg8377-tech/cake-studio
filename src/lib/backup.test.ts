import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { guardarTorta } from '../datos/catalogo';
import { crearBase, prepararBase, type BaseDatos } from '../db';
import { armarCopia, avisoCopia, leerCopia, restaurarCopia } from './backup';

const nuevaBase = async () => {
  const base = crearBase(`prueba-${crypto.randomUUID()}`);
  await prepararBase(base);
  return base;
};

/** Todo menos las fotos (se comparan por bytes) y la config (la clave y la fecha de copia cambian). */
const volcar = async (b: BaseDatos) => ({
  ingredientes: await b.ingredientes.toArray(),
  preciosHistorial: await b.preciosHistorial.toArray(),
  gastos: await b.gastos.toArray(),
  tamanos: await b.tamanos.toArray(),
  opciones: await b.opciones.toArray(),
  tortas: await b.tortas.toArray(),
  clientes: await b.clientes.toArray(),
});

const BYTES = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 250, 7]);

async function conDatos(): Promise<BaseDatos> {
  const base = await nuevaBase();
  await base.config.update('unica', { claveIA: 'sk-secreta', negocio: { nombre: 'Dulce Hogar', telefono: '1123456789', instagram: 'dh', frase: 'Hola' } });
  const clienteId = (await base.clientes.add({ nombre: 'Martina', telefono: '11 2345-6789', notas: 'Sin TACC' })) as number;
  await base.imagenes.add({ blob: new Blob([BYTES], { type: 'image/jpeg' }), categoria: 'torta', principal: true, creada: '2026-09-01T10:00:00.000Z' });
  const tamano = (await base.tamanos.toArray())[0];
  const masa = (await base.opciones.toArray()).find((o) => o.tipo === 'masa')!;
  await guardarTorta(
    { nombre: 'Cumple', seleccion: { tamanoId: tamano.id!, masaId: masa.id, rellenoIds: [], extraIds: [] }, margen: 50, estado: 'realizada', clienteId },
    undefined,
    base,
  );
  await base.preciosHistorial.add({ ingredienteId: 1, precioAnterior: 1000, precioNuevo: 1300, cantidad: 1000, fecha: '2026-09-02T10:00:00.000Z' });
  return base;
}

describe('copia de seguridad', () => {
  it('exportar, borrar los datos e importar devuelve todo, fotos incluidas', async () => {
    const origen = await conDatos();
    const antes = await volcar(origen);
    const { texto, nombre } = await armarCopia(origen, new Date(2026, 8, 13, 15, 30));

    expect(nombre).toBe('pasteleria-copia-2026-09-13-1530.json');
    expect(texto).not.toContain('sk-secreta');

    // El teléfono con los datos del sitio borrados: la app vuelve a sembrar ejemplos al abrir.
    const destino = await nuevaBase();
    await destino.config.update('unica', { claveIA: 'sk-del-telefono' });
    await restaurarCopia(leerCopia(texto), destino);

    expect(await volcar(destino)).toEqual(antes);
    const [foto] = await destino.imagenes.toArray();
    expect(foto.blob.type).toBe('image/jpeg');
    expect(new Uint8Array(await foto.blob.arrayBuffer())).toEqual(BYTES);
    expect(foto.principal).toBe(true);
    const config = (await destino.config.get('unica'))!;
    expect(config.negocio.nombre).toBe('Dulce Hogar');
    expect(config.claveIA).toBe('sk-del-telefono');
    expect(config.ultimoBackup).toBe(new Date(2026, 8, 13, 15, 30).toISOString());
  });

  it.each([
    ['texto que no es JSON', () => 'hola', 'no es una copia'],
    ['JSON de otra cosa', () => JSON.stringify({ a: 1 }), 'no es una copia'],
    ['copia de una versión nueva', (t: string) => t.replace('"version":1', '"version":9'), 'versión más nueva'],
    ['un precio que no es número', (t: string) => t.replace(/"precio":\d+/, '"precio":"mil"'), 'dañada'],
    ['sin tabla de clientes', (t: string) => t.replace('"clientes":', '"clientas":'), 'faltan clientes'],
  ])('rechaza %s', async (_caso, romper, mensaje) => {
    const { texto } = await armarCopia(await conDatos());
    expect(() => leerCopia(romper(texto))).toThrow(mensaje);
  });

  it('una foto rota en la copia no toca los datos del teléfono', async () => {
    const { texto } = await armarCopia(await conDatos());
    const copia = leerCopia(texto);
    copia.tablas.imagenes[0].blob.base64 = '%%%no-es-base64%%%';
    const destino = await nuevaBase();
    const antes = await volcar(destino);
    await expect(restaurarCopia(copia, destino)).rejects.toThrow();
    expect(await volcar(destino)).toEqual(antes);
  });

  it('avisa si nunca hubo copia con datos cargados, o si pasaron 14 días', () => {
    const hoy = new Date('2026-09-20T12:00:00.000Z');
    expect(avisoCopia(undefined, false, hoy)).toBeNull();
    expect(avisoCopia(undefined, true, hoy)).toBe('nunca');
    expect(avisoCopia('2026-09-07T12:00:00.000Z', true, hoy)).toBeNull();
    expect(avisoCopia('2026-09-06T12:00:00.000Z', true, hoy)).toBe('vieja');
  });
});
