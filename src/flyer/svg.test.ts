import { describe, expect, it } from 'vitest';
import { fotoEncuadrada } from './svg';

const caja = { x: 100, y: 200, ancho: 800, alto: 400 };
const numero = (svg: string, atributo: string) => Number(svg.match(new RegExp(`<image[^>]* ${atributo}="([\\d.-]+)"`))![1]);

describe('encuadre de la foto', () => {
  it('centrada llena la caja sin deformar la foto', () => {
    // Foto cuadrada en caja apaisada: se escala al ancho y sobra alto parejo arriba y abajo.
    const svg = fotoEncuadrada('data:x', { ancho: 1000, alto: 1000 }, caja, 'c');
    expect(numero(svg, 'width')).toBe(800);
    expect(numero(svg, 'height')).toBe(800);
    expect(numero(svg, 'x')).toBe(100);
    expect(numero(svg, 'y')).toBe(0);
  });

  it('se corre hasta el borde y no más allá', () => {
    const arriba = fotoEncuadrada('data:x', { ancho: 1000, alto: 1000 }, caja, 'c', { zoom: 1, x: 0.5, y: 0 });
    expect(numero(arriba, 'y')).toBe(200);
    const pasada = fotoEncuadrada('data:x', { ancho: 1000, alto: 1000 }, caja, 'c', { zoom: 1, x: 0.5, y: 5 });
    expect(numero(pasada, 'y')).toBe(-200);
  });

  it('agrandar mantiene la foto cubriendo la caja', () => {
    const svg = fotoEncuadrada('data:x', { ancho: 1000, alto: 1000 }, caja, 'c', { zoom: 2, x: 0, y: 1 });
    expect(numero(svg, 'width')).toBe(1600);
    expect(numero(svg, 'x')).toBe(100);
    expect(numero(svg, 'y') + numero(svg, 'height')).toBe(600);
  });

  it('sin el tamaño de la foto queda centrada como antes', () => {
    expect(fotoEncuadrada('data:x', null, caja, 'c')).toContain('xMidYMid slice');
  });
});
