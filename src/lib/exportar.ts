/**
 * De SVG a PNG y del PNG a WhatsApp. Mismo camino que el cartel de Pizarrita
 * (menus/panel-react/src/modules/qr/dibujo.ts): el SVG se carga en un <img> como data URI y se
 * pasa a un canvas. Un data URI no ensucia el canvas, así que `toBlob` funciona.
 */

export async function svgAPng(svg: string, ancho: number, alto: number): Promise<Blob> {
  const imagen = new Image();
  await new Promise<void>((listo, falla) => {
    imagen.onload = () => listo();
    imagen.onerror = () => falla(new Error('El flyer no se pudo dibujar'));
    imagen.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  // Algunos navegadores disparan onload antes de aplicar la fuente embebida.
  await imagen.decode().catch(() => undefined);

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const pincel = lienzo.getContext('2d')!;
  pincel.fillStyle = '#ffffff';
  pincel.fillRect(0, 0, ancho, alto);
  pincel.drawImage(imagen, 0, 0, ancho, alto);

  const blob = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, 'image/png'));
  if (!blob) throw new Error('El flyer no se pudo convertir en imagen');
  return blob;
}

export type ResultadoEnvio = 'compartido' | 'descargado' | 'cancelado';

/** Abre el menú de compartir de Android con la imagen adentro. Si no se puede, la descarga. */
export async function compartirOBajar(blob: Blob, nombre: string): Promise<ResultadoEnvio> {
  const archivo = new File([blob], nombre, { type: blob.type });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] });
      return 'compartido';
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return 'cancelado';
    }
  }
  bajar(blob, nombre);
  return 'descargado';
}

export function bajar(blob: Blob, nombre: string): void {
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);
}

const fuentes = new Map<string, Promise<string | null>>();

/** La fuente viaja adentro del SVG: sin eso, el PNG sale con la tipografía del sistema. */
export function fuenteDataUri(url: string): Promise<string | null> {
  if (!fuentes.has(url)) {
    fuentes.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
        .then((buffer) => `data:font/woff2;base64,${aBase64(new Uint8Array(buffer))}`)
        .catch(() => null),
    );
  }
  return fuentes.get(url)!;
}

/** Foto del celular reducida a `ladoMaximo`: una foto de 4 MB no entra cien veces en IndexedDB. */
export async function fotoDataUri(archivo: Blob, ladoMaximo = 1200): Promise<string> {
  const mapa = await createImageBitmap(archivo);
  const factor = Math.min(1, ladoMaximo / Math.max(mapa.width, mapa.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(mapa.width * factor);
  lienzo.height = Math.round(mapa.height * factor);
  lienzo.getContext('2d')!.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);
  mapa.close();
  return lienzo.toDataURL('image/jpeg', 0.85);
}

function aBase64(bytes: Uint8Array): string {
  let binario = '';
  // De a trozos: `String.fromCharCode(...bytes)` con 40 KB desborda la pila de argumentos.
  for (let i = 0; i < bytes.length; i += 8192) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binario);
}
