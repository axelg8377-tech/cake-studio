import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { crearBase, prepararBase } from './db';
import { calcularTorta, type Catalogo } from './lib/costos';

const porId = <T extends { id?: number }>(filas: T[]) => new Map(filas.map((f) => [f.id!, f]));

describe('base local', () => {
  it('la primera apertura carga los ejemplos y la segunda no los duplica', async () => {
    const base = crearBase(`prueba-${crypto.randomUUID()}`);
    await prepararBase(base);
    await prepararBase(base);

    expect(await base.config.count()).toBe(1);
    expect(await base.ingredientes.count()).toBe(12);
    expect(await base.tamanos.count()).toBe(4);
    expect(await base.opciones.count()).toBe(11);
  });

  it('las recetas de ejemplo apuntan a ingredientes reales y dan un costo con sentido', async () => {
    const base = crearBase(`prueba-${crypto.randomUUID()}`);
    await prepararBase(base);

    const cat: Catalogo = {
      ingredientes: porId(await base.ingredientes.toArray()),
      gastos: porId(await base.gastos.toArray()),
      opciones: porId(await base.opciones.toArray()),
      tamanos: porId(await base.tamanos.toArray()),
    };
    for (const op of cat.opciones.values()) {
      for (const linea of op.receta) expect(cat.ingredientes.has(linea.ingredienteId)).toBe(true);
    }

    const opcion = (nombre: string) => [...cat.opciones.values()].find((o) => o.nombre === nombre)!.id!;
    const veinte = [...cat.tamanos.values()].find((t) => t.nombre === '20 cm')!.id!;
    const s = calcularTorta(
      {
        tamanoId: veinte,
        masaId: opcion('Chocolate'),
        rellenoIds: [opcion('Dulce de leche')],
        coberturaId: opcion('Ganache de chocolate'),
        extraIds: [opcion('Caja especial')],
      },
      cat,
      50,
    );
    // Masa 6.606,33 + relleno 2.200 + ganache 4.421,43 + caja 1.800 + base 900 + gas y luz 1.500 = 17.427,76
    expect(Math.round(s.costo)).toBe(17428);
    expect(s.precioSugerido).toBe(26200);
  });
});
