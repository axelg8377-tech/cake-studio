import { describe, expect, it } from 'vitest';
import { leerNumero, leerPesos, pesos, pesosConSigno, porcentaje } from './formato';
import { desdeBase, unidadesDe } from './unidades';

describe('formato', () => {
  it('muestra pesos argentinos sin centavos', () => {
    expect(pesos(26200)).toBe('$26.200');
    expect(pesosConSigno(2000)).toBe('+$2.000');
    expect(pesosConSigno(-1000)).toBe('−$1.000');
    expect(porcentaje(40)).toBe('+40%');
  });

  it('lee la plata como la escribe una persona', () => {
    expect(leerPesos('$ 12.500')).toBe(12500);
    expect(leerPesos('')).toBeNull();
  });

  it('lee cantidades con coma o punto', () => {
    expect(leerNumero('1,5')).toBe(1.5);
    expect(leerNumero('1.5')).toBe(1.5);
    expect(leerNumero('abc')).toBeNull();
    expect(leerNumero('')).toBeNull();
  });
});

describe('unidades para editar', () => {
  it('vuelve a la unidad cómoda', () => {
    expect(desdeBase(1000, 'g')).toEqual({ cantidad: 1, unidad: 'kg' });
    expect(desdeBase(1500, 'ml')).toEqual({ cantidad: 1.5, unidad: 'l' });
    expect(desdeBase(350, 'ml')).toEqual({ cantidad: 350, unidad: 'ml' });
    expect(desdeBase(12, 'u')).toEqual({ cantidad: 12, unidad: 'u' });
  });

  it('solo ofrece unidades de la misma familia', () => {
    expect(unidadesDe('g')).toEqual(['kg', 'g']);
    expect(unidadesDe('u')).toEqual(['u']);
  });
});
