/**
 * Genera los íconos de la app desde el logo de torta. Correr con `node scripts/iconos.ts` cuando
 * cambie el logo o la paleta; los PNG quedan commiteados en public/iconos/.
 */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { logoTorta } from '../src/flyer/logo.ts';

const TINTA = '#3B2A22';
const PAPEL = '#F5EDE0';
const DESTINO = 'public/iconos';

mkdirSync(DESTINO, { recursive: true });
const logo = Buffer.from(logoTorta(PAPEL, TINTA));
const raster = (lado: number) => sharp(logo, { density: 600 }).resize(lado).png();

await raster(192).toFile(`${DESTINO}/icono-192.png`);
await raster(512).toFile(`${DESTINO}/icono-512.png`);
await raster(180).toFile(`${DESTINO}/apple-touch-icon.png`);

// Maskable: Android recorta el ícono en círculo o gota; el dibujo tiene que entrar en el 80% central.
const interno = await raster(400).toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: TINTA } })
  .composite([{ input: interno, gravity: 'center' }])
  .png()
  .toFile(`${DESTINO}/icono-maskable-512.png`);

console.log('íconos generados en', DESTINO);
