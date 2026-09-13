import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { guardarTorta } from '../datos/catalogo';
import { eliminarCliente, guardarCliente } from '../datos/clientes';
import { crearBase, prepararBase } from '../db';
import type { Ingrediente, Opcion, Snapshot, Tamano, Torta } from '../tipos';
import { calcularTorta, type Catalogo } from './costos';
import { aumentos, resumenDelMes, revisarPrecios } from './resumen';

const snap = (costo: number, precioFinal: number): Snapshot => ({ lineas: [], costo, margen: 50, precioSugerido: precioFinal, precioFinal, ganancia: precioFinal - costo });
const torta = (id: number, estado: Torta['estado'], fecha: string, s: Snapshot, hecha?: string): Torta => ({
  id,
  fecha,
  hecha,
  nombre: `T${id}`,
  estado,
  snapshot: s,
  seleccion: { tamanoId: 1, rellenoIds: [], extraIds: [] },
});

describe('números del mes', () => {
  it('cuenta solo las hechas en el mes, por el día en que se hicieron', () => {
    const hoy = new Date(2026, 8, 20);
    const tortas = [
      torta(1, 'realizada', new Date(2026, 7, 28).toISOString(), snap(10000, 20000), new Date(2026, 8, 2).toISOString()),
      torta(2, 'realizada', new Date(2026, 8, 5).toISOString(), snap(8000, 15000)),
      torta(3, 'borrador', new Date(2026, 8, 6).toISOString(), snap(9000, 30000)),
      torta(4, 'realizada', new Date(2026, 7, 10).toISOString(), snap(5000, 9000)),
    ];
    expect(resumenDelMes(tortas, hoy)).toEqual({ tortas: 2, ventas: 35000, costos: 18000, ganancia: 17000 });
  });

  it('aumentos toma el último cambio de cada ingrediente y ordena de mayor a menor', () => {
    const ings = [1, 2, 3].map((id) => ({ id, nombre: `I${id}` }) as Ingrediente);
    const h = (id: number, ingredienteId: number, antes: number, despues: number, fecha: string) => ({
      id,
      ingredienteId,
      precioAnterior: antes,
      precioNuevo: despues,
      cantidad: 1000,
      fecha,
    });
    const lista = aumentos(
      [h(1, 1, 1000, 1500, '2026-09-01'), h(2, 1, 1500, 1650, '2026-09-10'), h(3, 2, 1000, 1250, '2026-09-05'), h(4, 3, 1000, 900, '2026-09-05')],
      ings,
    );
    expect(lista.map((a) => [a.nombre, Math.round(a.pct)])).toEqual([
      ['I2', 25],
      ['I1', 10],
    ]);
  });
});

describe('revisar precios', () => {
  const harina = (precio: number): Ingrediente => ({ id: 1, nombre: 'Harina', categoria: 'Masas', unidad: 'g', precio, cantidad: 1000, actualizado: '' });
  const masa: Opcion = { id: 1, tipo: 'masa', nombre: 'Vainilla', modo: 'receta', receta: [{ ingredienteId: 1, cantidad: 1000 }], gastos: [] };
  const cat = (precio: number, opciones = [masa]): Catalogo => ({
    ingredientes: new Map([[1, harina(precio)]]),
    gastos: new Map(),
    opciones: new Map(opciones.map((o) => [o.id!, o])),
    tamanos: new Map<number, Tamano>([[1, { id: 1, nombre: '20 cm', factor: 1, orden: 1 }]]),
  });
  const sel = { tamanoId: 1, masaId: 1, rellenoIds: [], extraIds: [] };
  const hecha = (precioFinal?: number): Torta => ({
    id: 1,
    fecha: '2026-09-01',
    nombre: 'Vainilla',
    estado: 'realizada',
    seleccion: sel,
    snapshot: calcularTorta(sel, cat(10000), 50, precioFinal),
  });

  it('avisa cuando el costo subió y lo que cobró ya no llega al sugerido de hoy', () => {
    // Antes: costo 10.000, cobró 15.000. Hoy: costo 12.000, sugerido 18.000.
    const [r] = revisarPrecios([hecha()], cat(12000));
    expect([r.costoAntes, r.costoHoy, r.diferencia, r.pct, r.precioHoy, r.conviene]).toEqual([10000, 12000, 2000, 20, 18000, true]);
  });

  it('no avisa si cobró de más y todavía cubre el sugerido, ni si el costo no subió', () => {
    expect(revisarPrecios([hecha(20000)], cat(12000))[0].conviene).toBe(false);
    expect(revisarPrecios([hecha()], cat(10000))[0].conviene).toBe(false);
  });

  it('una torta con una opción borrada queda como incompleta y sin aviso', () => {
    const [r] = revisarPrecios([hecha()], cat(12000, []));
    expect([r.incompleta, r.conviene]).toEqual([true, false]);
  });

  it('los borradores no se revisan', () => {
    expect(revisarPrecios([{ ...hecha(), estado: 'borrador' }], cat(12000))).toEqual([]);
  });
});

describe('tortas y clientes en la base', () => {
  it('guarda cuándo se hizo una sola vez, y borrar el cliente deja la torta sin cliente', async () => {
    const base = crearBase(`prueba-${crypto.randomUUID()}`);
    await prepararBase(base);
    const clienteId = await guardarCliente({ nombre: ' Martina ', telefono: '11 2345-6789', notas: '  ' }, undefined, base);
    expect(await base.clientes.get(clienteId)).toEqual({ id: clienteId, nombre: 'Martina', telefono: '11 2345-6789', notas: undefined });

    const tamano = (await base.tamanos.toArray())[0];
    const datos = { nombre: 'Cumple', seleccion: { tamanoId: tamano.id!, rellenoIds: [], extraIds: [] }, margen: 50, clienteId };
    const id = await guardarTorta({ ...datos, estado: 'borrador' }, undefined, base);
    expect((await base.tortas.get(id))!.hecha).toBeUndefined();

    await guardarTorta({ ...datos, estado: 'realizada' }, id, base);
    const primera = (await base.tortas.get(id))!.hecha;
    expect(primera).toBeTypeOf('string');
    await new Promise((r) => setTimeout(r, 5));
    await guardarTorta({ ...datos, estado: 'realizada' }, id, base);
    expect((await base.tortas.get(id))!.hecha).toBe(primera);

    await eliminarCliente(clienteId, base);
    expect(await base.clientes.count()).toBe(0);
    const t = (await base.tortas.get(id))!;
    expect(t.clienteId).toBeUndefined();
    expect(t.nombre).toBe('Cumple');
  });
});
