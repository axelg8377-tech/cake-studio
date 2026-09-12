// Tipos de `qr.js`, copiado de Pizarrita (C:\Users\axelg\menus\runtime\qr.js). El JS no se toca.

export type Correccion = 'L' | 'M' | 'Q' | 'H';

export type QR = { modulos: Uint8Array; tamano: number; version: number };

export const VERSION_MAXIMA: number;
export const NIVELES: readonly Correccion[];

export function codificar(
  texto: string,
  opciones?: { correccion?: Correccion; mascara?: number | null },
): QR;

export function svgDe(
  qr: QR,
  opciones?: { zona?: number; oscuro?: string; claro?: string; huecoLogo?: number },
): string;

export function huecoDeLogo(
  qr: QR,
  fraccion: number,
): { desde: number; hasta: number; ancho: number } | null;
