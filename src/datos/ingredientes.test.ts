import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { crearBase, prepararBase } from '../db';
import { variacion } from '../lib/costos';
import { actualizarPrecio, crearIngrediente, eliminarIngrediente, ultimosCambios } from './ingredientes';

const nuevaBase = () => crearBase(`prueba-${crypto.randomUUID()}`);

describe('precios de ingredientes', () => {
  it('actualizar el precio guarda el anterior: chocolate $5.000 → $7.000 = +40%', async () => {
    const base = nuevaBase();
    const id = await crearIngrediente(
      { nombre: 'Chocolate', categoria: 'Coberturas', unidad: 'g', precio: 5000, cantidad: 1000 },
      base,
    );
    await actualizarPrecio(id, 7000, undefined, base);

    const historial = await base.preciosHistorial.where('ingredienteId').equals(id).toArray();
    expect(historial).toHaveLength(1);
    expect(variacion(historial[0].precioAnterior, historial[0].precioNuevo)).toEqual({ abs: 2000, pct: 40 });
    expect((await base.ingredientes.get(id))?.precio).toBe(7000);
  });

  it('si cambia la presentación, compara a igual cantidad', async () => {
    const base = nuevaBase();
    const id = await crearIngrediente(
      { nombre: 'Crema', categoria: 'Rellenos', unidad: 'ml', precio: 5000, cantidad: 1000 },
      base,
    );
    // Antes $5.000 el litro; ahora $3.000 el medio litro = +20%, no −40%.
    await actualizarPrecio(id, 3000, 500, base);
    const [h] = await base.preciosHistorial.toArray();
    expect(h.precioAnterior).toBe(2500);
    expect(variacion(h.precioAnterior, h.precioNuevo).pct).toBe(20);
    expect((await base.ingredientes.get(id))?.cantidad).toBe(500);
  });

  it('al cargar un precio real se borra la nota de "precio de ejemplo"', async () => {
    const base = nuevaBase();
    await prepararBase(base);
    const harina = await base.ingredientes.where('nombre').equals('Harina 0000').first();
    await actualizarPrecio(harina!.id!, 1800, undefined, base);
    expect((await base.ingredientes.get(harina!.id!))?.notas).toBeUndefined();
  });

  it('no deja borrar un ingrediente que está en una receta', async () => {
    const base = nuevaBase();
    await prepararBase(base);
    const harina = await base.ingredientes.where('nombre').equals('Harina 0000').first();
    expect(await eliminarIngrediente(harina!.id!, base)).toEqual({ ok: false, usadoEn: ['Vainilla', 'Chocolate'] });
    const colorante = await base.ingredientes.where('nombre').equals('Colorante en gel').first();
    expect(await eliminarIngrediente(colorante!.id!, base)).toEqual({ ok: true });
  });

  it('el último cambio de cada ingrediente es el más nuevo', () => {
    const cambios = ultimosCambios([
      { id: 1, ingredienteId: 5, precioAnterior: 100, precioNuevo: 120, cantidad: 1, fecha: '2026-09-01' },
      { id: 2, ingredienteId: 5, precioAnterior: 120, precioNuevo: 150, cantidad: 1, fecha: '2026-09-10' },
      { id: 3, ingredienteId: 5, precioAnterior: 150, precioNuevo: 160, cantidad: 1, fecha: '2026-09-10' },
    ]);
    expect(cambios.get(5)?.id).toBe(3);
  });
});
