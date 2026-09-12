import { codificar } from '../lib/qr/qr.js';
import { svgArte } from '../lib/qr/qr-arte.js';
import { dataUriSvg, logoTorta } from './logo';

export type ColoresQR = { tinta: string; papel: string };

/**
 * `qr-arte.js` reserva el hueco del logo solo si recibe los píxeles del logo, porque en Pizarrita
 * también los usa para el raster. Acá el logo es vectorial y se dibuja por `logoDataUri`, así que
 * alcanza con un píxel que diga "hay logo".
 */
const HAY_LOGO = { datos: new Uint8ClampedArray([255, 255, 255, 255]), ancho: 1, alto: 1 };

/** QR con corrección H y la torta al centro. 0.22 es el hueco que Pizarrita verificó con jsqr. */
export function svgQrMarca(url: string, { tinta, papel }: ColoresQR): string {
  const qr = codificar(url, { correccion: 'H' });
  return svgArte(qr, {
    estilo: 'marca',
    oscuro: tinta,
    claro: papel,
    acento: tinta,
    logo: HAY_LOGO,
    huecoLogo: 0.22,
    logoDataUri: dataUriSvg(logoTorta(papel, tinta)),
  });
}

/** Mete el SVG del QR adentro de otro SVG, en un cuadrado. Igual que `encajar` de `cartel.js`. */
export function encajar(svgQr: string, x: number, y: number, lado: number): string {
  return svgQr.replace(
    /^<svg[^>]*viewBox="([^"]*)"[^>]*>/,
    `<svg x="${x}" y="${y}" width="${lado}" height="${lado}" viewBox="$1" preserveAspectRatio="xMidYMid meet">`,
  );
}
