import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { crearBase, prepararBase } from '../db';
import { calcularTorta, costoOpcion } from '../lib/costos';
import {
  eliminarGasto,
  eliminarTamano,
  guardarOpcion,
  guardarTorta,
  leerCatalogo,
} from './catalogo';

const baseSembrada = async () => {
  const base = crearBase(`prueba-${crypto.randomUUID()}`);
  await prepararBase(base);
  return base;
};

const buscar = <T extends { nombre: string; id?: number }>(filas: Map<number, T>, nombre: string) =>
  [...filas.values()].find((f) => f.nombre === nombre)!;

describe('constructor con los datos de ejemplo', () => {
  it('vainilla + dulce de leche + ganache en 20 cm coincide con la cuenta a mano', async () => {
    const cat = await leerCatalogo(await baseSembrada());
    const sel = {
      tamanoId: buscar(cat.tamanos, '20 cm').id!,
      masaId: buscar(cat.opciones, 'Vainilla').id!,
      rellenoIds: [buscar(cat.opciones, 'Dulce de leche').id!],
      coberturaId: buscar(cat.opciones, 'Ganache de chocolate').id!,
      extraIds: [],
    };
    // Vainilla: harina 250×1,5 + azúcar 200×1,4 + huevos 4×4000/12 + manteca 150×3500/200 + leche 120×1,6
    const vainilla = 375 + 280 + 4000 / 3 + 2625 + 192;
    const ddl = 400 * 5.5;
    const ganache = 250 * 9 + (200 * 3800) / 350;
    const gastosPorTorta = 900 + 1500; // base de cartón + gas y luz
    const aMano = vainilla + ddl + ganache + gastosPorTorta; // 13.826,76

    const s = calcularTorta(sel, cat, 50);
    expect(s.costo).toBeCloseTo(aMano, 6);
    expect(s.precioSugerido).toBe(20800); // 20.740,14 redondeado arriba de a $100
    expect(s.lineas).toHaveLength(5);
  });

  it('en 24 cm la receta escala por 1,44 y los gastos no', async () => {
    const cat = await leerCatalogo(await baseSembrada());
    const ddl = buscar(cat.opciones, 'Dulce de leche');
    expect(costoOpcion(ddl, 1.44, cat)).toBeCloseTo(2200 * 1.44, 6);
  });
});

describe('guardar tortas', () => {
  it('realizada descuenta stock; borrador no toca nada', async () => {
    const base = await baseSembrada();
    const cat = await leerCatalogo(base);
    const harina = buscar(cat.ingredientes, 'Harina 0000');
    await base.ingredientes.update(harina.id!, { stock: 1000 });
    const sel = { tamanoId: buscar(cat.tamanos, '24 cm').id!, masaId: buscar(cat.opciones, 'Vainilla').id!, rellenoIds: [], extraIds: [] };

    await guardarTorta({ nombre: 'Prueba', seleccion: sel, margen: 50, estado: 'borrador' }, undefined, base);
    expect((await base.ingredientes.get(harina.id!))?.stock).toBe(1000);

    const id = await guardarTorta({ nombre: '', seleccion: sel, margen: 50, precioFinal: 9000, estado: 'realizada' }, undefined, base);
    expect((await base.ingredientes.get(harina.id!))?.stock).toBeCloseTo(1000 - 250 * 1.44, 6);
    // El chocolate no tiene stock cargado: sigue sin stock.
    expect((await base.ingredientes.get(buscar(cat.ingredientes, 'Manteca').id!))?.stock).toBeUndefined();

    const torta = await base.tortas.get(id);
    expect(torta?.nombre).toBe('Torta sin nombre');
    expect(torta?.snapshot.precioFinal).toBe(9000);
    expect(torta?.snapshot.ganancia).toBeCloseTo(9000 - torta!.snapshot.costo, 6);
  });

  it('editar una torta ya realizada no descuenta stock otra vez y conserva la fecha', async () => {
    const base = await baseSembrada();
    const cat = await leerCatalogo(base);
    const harina = buscar(cat.ingredientes, 'Harina 0000');
    await base.ingredientes.update(harina.id!, { stock: 1000 });
    const sel = { tamanoId: buscar(cat.tamanos, '20 cm').id!, masaId: buscar(cat.opciones, 'Vainilla').id!, rellenoIds: [], extraIds: [] };

    const id = await guardarTorta({ nombre: 'A', seleccion: sel, margen: 50, estado: 'borrador' }, undefined, base);
    const fecha = (await base.tortas.get(id))!.fecha;
    await guardarTorta({ nombre: 'A', seleccion: sel, margen: 50, estado: 'realizada' }, id, base);
    await guardarTorta({ nombre: 'A editada', seleccion: sel, margen: 60, estado: 'realizada' }, id, base);

    expect((await base.ingredientes.get(harina.id!))?.stock).toBe(750);
    expect(await base.tortas.count()).toBe(1);
    expect(await base.tortas.get(id)).toMatchObject({ nombre: 'A editada', fecha, snapshot: { margen: 60 } });
  });

  it('el stock nunca queda negativo', async () => {
    const base = await baseSembrada();
    const cat = await leerCatalogo(base);
    const ddl = buscar(cat.ingredientes, 'Dulce de leche repostero');
    await base.ingredientes.update(ddl.id!, { stock: 100 });
    const sel = { tamanoId: buscar(cat.tamanos, '20 cm').id!, rellenoIds: [buscar(cat.opciones, 'Dulce de leche').id!], extraIds: [] };
    await guardarTorta({ nombre: 'x', seleccion: sel, margen: 50, estado: 'realizada' }, undefined, base);
    expect((await base.ingredientes.get(ddl.id!))?.stock).toBe(0);
  });
});

describe('gastos, tamaños y opciones', () => {
  it('no deja borrar un gasto que arrastra una opción', async () => {
    const base = await baseSembrada();
    const cat = await leerCatalogo(base);
    expect(await eliminarGasto(buscar(cat.gastos, 'Caja para torta').id!, base)).toEqual({ ok: false, usadoEn: ['Caja especial'] });
    expect(await eliminarGasto(buscar(cat.gastos, 'Gas y luz').id!, base)).toEqual({ ok: true });
  });

  it('el último tamaño no se borra', async () => {
    const base = await baseSembrada();
    const ids = (await base.tamanos.toArray()).map((t) => t.id!);
    for (const id of ids.slice(1)) expect(await eliminarTamano(id, base)).toBe(true);
    expect(await eliminarTamano(ids[0], base)).toBe(false);
  });

  it('pasar una opción a precio fijo le borra la receta', async () => {
    const base = await baseSembrada();
    const vainilla = buscar((await leerCatalogo(base)).opciones, 'Vainilla');
    await guardarOpcion({ ...vainilla, modo: 'fijo', precioFijo: 5000 }, vainilla.id, base);
    const guardada = await base.opciones.get(vainilla.id!);
    expect(guardada).toMatchObject({ modo: 'fijo', precioFijo: 5000, receta: [] });
  });
});
