import { mkdirSync, writeFileSync } from 'node:fs';
import jsQR from 'jsqr';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { MENSAJE_QR, normalizarTelefonoAR, urlWhatsApp } from '../lib/whatsapp';
import { ALTO, ANCHO, flyerElegante, type DatosFlyer } from './plantillas/elegante';
import { svgQrMarca } from './qrMarca';
import { PALETA_PAPEL } from './svg';

const DATOS: DatosFlyer = {
  nombre: 'Chocolate & frutillas <especial>',
  tamano: '20 cm · 12 porciones',
  detalle: [
    { etiqueta: 'Masa', valor: 'Chocolate' },
    { etiqueta: 'Relleno', valor: 'Dulce de leche + crema' },
    { etiqueta: 'Cobertura', valor: 'Ganache' },
    { etiqueta: 'Decoración', valor: 'Frutillas y chocolate' },
    // Cinco datos = tres filas en la primera columna: el caso más apretado del pie.
    { etiqueta: 'Extras', valor: 'Velas y caja especial' },
  ],
  precio: 25000,
  negocio: { nombre: 'Dulce Hogar', telefono: '11 2345-6789', instagram: 'dulcehogar' },
};

async function leerQR(png: Buffer): Promise<string | null> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
}

async function flyerPng(foto: boolean): Promise<{ svg: string; png: Buffer; url: string }> {
  const url = urlWhatsApp(DATOS.negocio.telefono, MENSAJE_QR)!;
  const fotoDataUri = foto
    ? `data:image/jpeg;base64,${(
        await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#6b3f2a' } })
          .jpeg()
          .toBuffer()
      ).toString('base64')}`
    : null;
  const svg = flyerElegante(DATOS, {
    paleta: PALETA_PAPEL,
    qrSvg: svgQrMarca(url, { tinta: PALETA_PAPEL.tinta, papel: PALETA_PAPEL.papel }),
    fotoDataUri,
    fuenteTitulos: null,
  });
  return { svg, png: await sharp(Buffer.from(svg)).png().toBuffer(), url };
}

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

describe('flyer elegante', () => {
  it('sale en 1080×1350 y con texto escapado', async () => {
    const { svg, png } = await flyerPng(true);
    // Para mirarlo a ojo: salida-pruebas/ está en .gitignore.
    mkdirSync('salida-pruebas', { recursive: true });
    writeFileSync('salida-pruebas/flyer-elegante.png', png);
    const meta = await sharp(png).metadata();
    expect([meta.width, meta.height]).toEqual([ANCHO, ALTO]);
    expect(svg).toContain('&amp;');
    expect(svg).not.toContain('<ESPECIAL>');
  });

  it('el QR con el logo de torta se lee y lleva al WhatsApp con el mensaje', async () => {
    const { png, url } = await flyerPng(true);
    expect(await leerQR(png)).toBe(url);
  });

  it('el QR se sigue leyendo después de la compresión de WhatsApp (JPEG 60)', async () => {
    const { png, url } = await flyerPng(true);
    const comprimido = await sharp(png).jpeg({ quality: 60 }).toBuffer();
    expect(await leerQR(comprimido)).toBe(url);
  });

  it.each([540, 480])(
    'el QR con mensaje se lee con el flyer achicado a %i px, como en la pantalla de un celular',
    async (ancho) => {
      const { png, url } = await flyerPng(true);
      const enPantalla = await sharp(png).resize(ancho).jpeg({ quality: 70 }).toBuffer();
      expect(await leerQR(enPantalla)).toBe(url);
    },
  );

  it('sin foto también se dibuja y el QR se lee', async () => {
    const { png, url } = await flyerPng(false);
    expect(await leerQR(png)).toBe(url);
  });
});
