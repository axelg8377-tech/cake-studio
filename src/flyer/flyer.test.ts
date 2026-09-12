import { mkdirSync, writeFileSync } from 'node:fs';
import jsQR from 'jsqr';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import type { Catalogo } from '../lib/costos';
import { MENSAJE_QR, normalizarTelefonoAR, urlWhatsApp } from '../lib/whatsapp';
import type { Ingrediente, Opcion, Tamano } from '../tipos';
import { cartaDelCatalogo } from './desdeTorta';
import { flyerCarta, type DatosCarta } from './plantillas/carta';
import { flyerDulce } from './plantillas/dulce';
import { ALTO, ANCHO, flyerElegante, type DatosFlyer, type RecursosFlyer } from './plantillas/elegante';
import { svgQrMarca } from './qrMarca';
import { PALETA_PAPEL, PALETA_ROSA, type Paleta } from './svg';

const NEGOCIO = { nombre: 'Dulce Hogar', telefono: '11 2345-6789', instagram: 'dulcehogar' };

const DATOS: DatosFlyer = {
  nombre: 'Chocolate & frutillas <especial>',
  tamano: '20 cm · 12 porciones',
  detalle: [
    { etiqueta: 'Masa', valor: 'Chocolate' },
    { etiqueta: 'Relleno', valor: 'Dulce de leche + crema' },
    { etiqueta: 'Cobertura', valor: 'Ganache' },
    { etiqueta: 'Decoración', valor: 'Frutillas y chocolate' },
    // Cinco datos: el caso más apretado de las columnas.
    { etiqueta: 'Extras', valor: 'Velas y caja especial' },
  ],
  precio: 25000,
  negocio: NEGOCIO,
};

// Seis tamaños y siete masas: el caso más apretado de la carta (la última fila dice "y 2 más").
const CARTA: DatosCarta = {
  titulo: 'Tortas & <postres>',
  tamanos: [
    { nombre: '15 cm', precio: 18000 },
    { nombre: '18 cm', precio: 24000 },
    { nombre: '20 cm', precio: 29500 },
    { nombre: '24 cm', precio: 41000 },
    { nombre: 'Dos pisos', precio: 98000 },
    { nombre: 'Tres pisos', precio: 150000 },
  ],
  masas: ['Vainilla', 'Chocolate', 'Limón', 'Red velvet', 'Zanahoria', 'Coco', 'Naranja'],
  rellenos: ['Dulce de leche', 'Crema y frutillas', 'Mousse de chocolate', 'Ganache'],
  coberturas: ['Ganache de chocolate', 'Crema chantilly', 'Merengue italiano'],
  negocio: NEGOCIO,
};

const PLANTILLAS: [string, Paleta, (r: RecursosFlyer) => string][] = [
  ['elegante', PALETA_PAPEL, (r) => flyerElegante(DATOS, r)],
  ['dulce', PALETA_ROSA, (r) => flyerDulce(DATOS, r)],
  ['carta', PALETA_PAPEL, (r) => flyerCarta(CARTA, r)],
];

async function leerQR(png: Buffer): Promise<string | null> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
}

let foto: Promise<string> | undefined;
const fotoDePrueba = () =>
  (foto ??= sharp({ create: { width: 1200, height: 900, channels: 3, background: '#6b3f2a' } })
    .jpeg()
    .toBuffer()
    .then((b) => `data:image/jpeg;base64,${b.toString('base64')}`));

describe('teléfono para wa.me', () => {
  it.each([
    ['11 2345-6789', '5491123456789'],
    ['011 15 2345-6789', '5491123456789'],
    ['+54 9 11 2345 6789', '5491123456789'],
    ['54 11 2345 6789', '5491123456789'],
    ['0351 15 612 3456', '5493516123456'],
  ])('%s → %s', (entrada, esperado) => {
    expect(normalizarTelefonoAR(entrada)).toBe(esperado);
  });

  it('un número incompleto no genera enlace', () => {
    expect(urlWhatsApp('1234')).toBeNull();
  });
});

describe.each(PLANTILLAS)('flyer %s', (nombre, paleta, dibujar) => {
  const url = urlWhatsApp(NEGOCIO.telefono, MENSAJE_QR)!;

  async function flyerPng(conFoto: boolean): Promise<{ svg: string; png: Buffer }> {
    const svg = dibujar({
      paleta,
      qrSvg: svgQrMarca(url, { tinta: paleta.tinta, papel: paleta.papel }),
      fotoDataUri: conFoto ? await fotoDePrueba() : null,
      fuenteTitulos: null,
    });
    return { svg, png: await sharp(Buffer.from(svg)).png().toBuffer() };
  }

  it('sale en 1080×1350 y con texto escapado', async () => {
    const { svg, png } = await flyerPng(true);
    // Para mirarlo a ojo: salida-pruebas/ está en .gitignore.
    mkdirSync('salida-pruebas', { recursive: true });
    writeFileSync(`salida-pruebas/flyer-${nombre}.png`, png);
    writeFileSync(`salida-pruebas/flyer-${nombre}-sin-foto.png`, (await flyerPng(false)).png);
    const meta = await sharp(png).metadata();
    expect([meta.width, meta.height]).toEqual([ANCHO, ALTO]);
    expect(svg).toContain('&amp;');
    expect(svg).not.toMatch(/<(especial|postres)>/i);
  });

  it('el QR con el logo de torta se lee y lleva al WhatsApp con el mensaje', async () => {
    expect(await leerQR((await flyerPng(true)).png)).toBe(url);
  });

  it('el QR se sigue leyendo después de la compresión de WhatsApp (JPEG 60)', async () => {
    const comprimido = await sharp((await flyerPng(true)).png).jpeg({ quality: 60 }).toBuffer();
    expect(await leerQR(comprimido)).toBe(url);
  });

  it.each([540, 480])('el QR se lee con el flyer achicado a %i px, como en la pantalla de un celular', async (ancho) => {
    const enPantalla = await sharp((await flyerPng(true)).png).resize(ancho).jpeg({ quality: 70 }).toBuffer();
    expect(await leerQR(enPantalla)).toBe(url);
  });

  it('sin foto también se dibuja y el QR se lee', async () => {
    expect(await leerQR((await flyerPng(false)).png)).toBe(url);
  });
});

describe('carta desde el catálogo', () => {
  it('cada tamaño cuesta desde la masa y el relleno más baratos, con la ganancia', () => {
    const op = (id: number, tipo: Opcion['tipo'], nombre: string, gramos: number): Opcion => ({
      id,
      tipo,
      nombre,
      modo: 'receta',
      receta: [{ ingredienteId: 1, cantidad: gramos }],
      gastos: [],
    });
    const cat: Catalogo = {
      ingredientes: new Map<number, Ingrediente>([
        [1, { id: 1, nombre: 'Harina', categoria: 'Masas', unidad: 'g', precio: 1000, cantidad: 1000, actualizado: '' }],
      ]),
      gastos: new Map(),
      opciones: new Map<number, Opcion>(
        [op(1, 'masa', 'Vainilla', 200), op(2, 'masa', 'Chocolate', 100), op(3, 'relleno', 'Dulce de leche', 50)].map(
          (o) => [o.id!, o],
        ),
      ),
      tamanos: new Map<number, Tamano>([
        [1, { id: 1, nombre: '20 cm', factor: 1, orden: 1 }],
        [2, { id: 2, nombre: '28 cm', factor: 2, orden: 2 }],
      ]),
    };
    const carta = cartaDelCatalogo(cat, 50);
    // 20 cm: (100 + 50) × 1,5 = 225 → 300. 28 cm: (200 + 100) × 1,5 = 450 → 500.
    expect(carta.tamanos).toEqual([
      { nombre: '20 cm', precio: 300 },
      { nombre: '28 cm', precio: 500 },
    ]);
    expect(carta.masas).toEqual(['Chocolate', 'Vainilla']);
    expect(carta.coberturas).toEqual([]);
  });
});
