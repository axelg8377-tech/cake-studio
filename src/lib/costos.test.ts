import { describe, expect, it } from 'vitest';
import type { Gasto, Ingrediente, Opcion, Seleccion, Tamano } from '../tipos';
import {
  calcularTorta,
  consumo,
  costoIngrediente,
  costoOpcion,
  faltantesDeStock,
  redondearArriba,
  variacion,
  type Catalogo,
} from './costos';
import { aBase, mostrarCantidad } from './unidades';

const ing = (id: number, nombre: string, precio: number, cantidad: number, stock?: number): Ingrediente => ({
  id,
  nombre,
  categoria: 'Masas',
  unidad: 'g',
  precio,
  cantidad,
  stock,
  actualizado: '2026-09-12',
});

describe('unidades', () => {
  it('convierte a la unidad base', () => {
    expect(aBase(1, 'kg')).toEqual({ cantidad: 1000, unidad: 'g' });
    expect(aBase(2, 'l')).toEqual({ cantidad: 2000, unidad: 'ml' });
    expect(aBase(12, 'u')).toEqual({ cantidad: 12, unidad: 'u' });
  });

  it('muestra en la unidad que se entiende', () => {
    expect(mostrarCantidad(1500, 'g')).toBe('1,5 kg');
    expect(mostrarCantidad(350, 'ml')).toBe('350 ml');
    expect(mostrarCantidad(12, 'u')).toBe('12 u');
  });
});

describe('costo proporcional (casos del brief)', () => {
  it('harina $2.000 por 1 kg, se usan 500 g → $1.000', () => {
    expect(costoIngrediente({ precio: 2000, cantidad: aBase(1, 'kg').cantidad }, 500)).toBe(1000);
  });

  it('huevos $4.000 la docena, se usan 4 → $1.333', () => {
    expect(Math.round(costoIngrediente({ precio: 4000, cantidad: 12 }, 4))).toBe(1333);
  });

  it('cantidad cero no divide por cero', () => {
    expect(costoIngrediente({ precio: 4000, cantidad: 0 }, 4)).toBe(0);
  });
});

describe('variación de precio', () => {
  it('chocolate $5.000 → $7.000 = +$2.000 y +40%', () => {
    expect(variacion(5000, 7000)).toEqual({ abs: 2000, pct: 40 });
  });

  it('bajas dan negativo', () => {
    expect(variacion(5000, 4000)).toEqual({ abs: -1000, pct: -20 });
  });

  it('sin precio anterior no hay porcentaje', () => {
    expect(variacion(0, 7000)).toEqual({ abs: 7000, pct: null });
  });
});

describe('torta completa', () => {
  const harina = ing(1, 'Harina', 2000, 1000, 600);
  const huevos = ing(2, 'Huevos', 4000, 12);
  const caja: Gasto = { id: 1, nombre: 'Caja', categoria: 'Packaging', precio: 1800, fecha: '', porTorta: false };
  const base: Gasto = { id: 2, nombre: 'Base de cartón', categoria: 'Packaging', precio: 1500, fecha: '', porTorta: true };
  const masa: Opcion = {
    id: 10,
    tipo: 'masa',
    nombre: 'Vainilla',
    modo: 'receta',
    receta: [
      { ingredienteId: 1, cantidad: 500 },
      { ingredienteId: 2, cantidad: 4 },
    ],
    gastos: [],
  };
  const relleno: Opcion = { id: 11, tipo: 'relleno', nombre: 'DDL', modo: 'fijo', precioFijo: 3000, receta: [], gastos: [] };
  const conCaja: Opcion = { id: 12, tipo: 'extra', nombre: 'Caja especial', modo: 'fijo', precioFijo: 0, receta: [], gastos: [1] };
  const grande: Tamano = { id: 1, nombre: '24 cm', factor: 1.5, orden: 1 };

  const cat: Catalogo = {
    ingredientes: new Map([[1, harina], [2, huevos]]),
    gastos: new Map([[1, caja], [2, base]]),
    opciones: new Map([[10, masa], [11, relleno], [12, conCaja]]),
    tamanos: new Map([[1, grande]]),
  };
  const sel: Seleccion = { tamanoId: 1, masaId: 10, rellenoIds: [11], extraIds: [] };

  it('la receta escala por tamaño; el precio fijo no', () => {
    // (1000 + 1333,33) × 1,5 = 3500
    expect(costoOpcion(masa, 1.5, cat)).toBeCloseTo(3500);
    expect(costoOpcion(relleno, 1.5, cat)).toBe(3000);
  });

  it('una opción de precio fijo arrastra sus gastos', () => {
    expect(costoOpcion(conCaja, 1.5, cat)).toBe(1800);
  });

  it('costo = opciones + gastos por torta; sugerido = costo × (1 + margen)', () => {
    const s = calcularTorta(sel, cat, 50);
    // 3500 + 3000 + 1500 de la base de cartón
    expect(s.costo).toBeCloseTo(8000);
    expect(s.precioSugerido).toBe(12000);
    expect(s.precioFinal).toBe(12000);
    expect(s.ganancia).toBeCloseTo(4000);
    expect(s.lineas.map((l) => l.concepto)).toEqual(['Masa: Vainilla', 'Relleno: DDL', 'Base de cartón']);
  });

  it('el precio final se puede fijar a mano y la ganancia sale de ahí', () => {
    const s = calcularTorta(sel, cat, 50, 15000);
    expect(s.precioSugerido).toBe(12000);
    expect(s.ganancia).toBeCloseTo(7000);
  });

  it('el sugerido redondea hacia arriba de a $100', () => {
    expect(redondearArriba(12001)).toBe(12100);
    expect(redondearArriba(12000)).toBe(12000);
  });

  it('armada con ingredientes sueltos: se cobran tal cual, sin escalar por tamaño', () => {
    const libre: Seleccion = {
      tamanoId: 1,
      rellenoIds: [],
      extraIds: [],
      ingredientes: [
        { ingredienteId: 1, cantidad: 500 },
        { ingredienteId: 2, cantidad: 6 },
      ],
    };
    const s = calcularTorta(libre, cat, 50);
    // 1000 de harina + 2000 de huevos + 1500 de la base de cartón, aunque el tamaño tenga factor 1,5
    expect(s.costo).toBeCloseTo(4500);
    expect(s.lineas.map((l) => l.concepto)).toEqual(['Harina (500 g)', 'Huevos (6 g)', 'Base de cartón']);
    expect(consumo(libre, cat).get(1)).toBe(500);
  });

  it('avisa de stock insuficiente solo donde hay stock cargado', () => {
    expect(consumo(sel, cat).get(1)).toBe(750);
    expect(faltantesDeStock(sel, cat)).toEqual([{ ingredienteId: 1, nombre: 'Harina', necesita: 750, hay: 600 }]);
  });
});
