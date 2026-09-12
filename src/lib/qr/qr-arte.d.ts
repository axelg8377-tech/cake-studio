// Tipos de `qr-arte.js`, copiado de Pizarrita (C:\Users\axelg\menus\runtime\qr-arte.js).

import type { QR } from './qr.js';

export type ImagenRGBA = { datos: Uint8ClampedArray; ancho: number; alto: number };

export type EstiloQR = 'generico' | 'marca' | 'puntos' | 'trama';

export type OpcionesArte = {
  estilo?: EstiloQR;
  oscuro?: string;
  claro?: string;
  acento?: string;
  imagen?: ImagenRGBA | null;
  logo?: ImagenRGBA | null;
  huecoLogo?: number;
  encuadre?: number;
  escala?: number;
  marco?: { forma: 'circulo' | 'redondeado' | 'cuadrado' | 'ninguno'; color?: string; grosor?: number } | null;
  imagenDataUri?: string | null;
  logoDataUri?: string | null;
};

export const ESTILOS: Record<
  EstiloQR,
  { punto: number; redondeo: number; empuje: number; margen: number; ojos: number; usaImagen: boolean }
>;
export const CONTRASTE_MINIMO: number;

export function contrasteDe(oscuro: string, claro: string): number;
export function svgArte(qr: QR, opciones?: OpcionesArte): string;
export function pintar(qr: QR, opciones?: OpcionesArte): { datos: Uint8ClampedArray; lado: number };
