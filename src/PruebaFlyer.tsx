import { useEffect, useMemo, useState } from 'react';
import { ALTO, ANCHO, flyerElegante } from './flyer/plantillas/elegante';
import { svgQrMarca } from './flyer/qrMarca';
import { PALETA_PAPEL } from './flyer/svg';
import { compartirOBajar, fotoDataUri, fuenteDataUri, svgAPng } from './lib/exportar';
import { urlWhatsApp } from './lib/whatsapp';

/**
 * T1 del PLAN.md: prueba del riesgo técnico #1. Un flyer real → PNG → menú de compartir de Android.
 * Se reemplaza por la app en T5; lo que queda de acá es `flyer/` y `lib/exportar.ts`.
 */
export default function PruebaFlyer() {
  const [nombre, setNombre] = useState('Chocolate especial');
  const [telefono, setTelefono] = useState('');
  const [precio, setPrecio] = useState(25000);
  const [foto, setFoto] = useState<string | null>(null);
  const [fuente, setFuente] = useState<string | null>(null);
  const [estado, setEstado] = useState('');

  useEffect(() => {
    fuenteDataUri(`${import.meta.env.BASE_URL}fuentes/playfair-latin.woff2`).then(setFuente);
  }, []);

  const svg = useMemo(() => {
    const url = urlWhatsApp(telefono) ?? 'https://wa.me/';
    return flyerElegante(
      {
        nombre,
        tamano: '20 cm · 12 porciones',
        detalle: [
          { etiqueta: 'Masa', valor: 'Chocolate' },
          { etiqueta: 'Relleno', valor: 'Dulce de leche + crema' },
          { etiqueta: 'Cobertura', valor: 'Ganache' },
          { etiqueta: 'Decoración', valor: 'Frutillas' },
        ],
        precio,
        negocio: { nombre: 'Dulce Hogar', telefono, instagram: 'dulcehogar' },
      },
      {
        paleta: PALETA_PAPEL,
        qrSvg: svgQrMarca(url, { tinta: PALETA_PAPEL.tinta, papel: PALETA_PAPEL.papel }),
        fotoDataUri: foto,
        fuenteTitulos: fuente,
      },
    );
  }, [nombre, telefono, precio, foto, fuente]);

  async function enviar() {
    setEstado('Generando…');
    try {
      const png = await svgAPng(svg, ANCHO, ALTO);
      const resultado = await compartirOBajar(png, 'flyer-torta.png');
      setEstado(
        { compartido: 'Listo, compartido.', descargado: 'Descargado en el teléfono.', cancelado: '' }[resultado],
      );
    } catch (error) {
      setEstado((error as Error).message);
    }
  }

  return (
    <main className="prueba">
      <h1>Prueba de flyer</h1>
      <label>
        Nombre de la torta
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label>
        WhatsApp de ella
        <input
          inputMode="tel"
          placeholder="11 2345-6789"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
      </label>
      <label>
        Precio
        <input inputMode="numeric" value={precio} onChange={(e) => setPrecio(Number(e.target.value.replace(/\D/g, '')) || 0)} />
      </label>
      <label>
        Foto
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const archivo = e.target.files?.[0];
            if (archivo) setFoto(await fotoDataUri(archivo));
          }}
        />
      </label>
      <img
        className="vista"
        alt="Vista previa del flyer"
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      />
      <button onClick={enviar}>Enviar por WhatsApp</button>
      <p role="status">{estado}</p>
    </main>
  );
}
