import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { Ayuda, Aviso, Pantalla } from '../componentes/ui';
import { db } from '../db';
import { ALTO_A4, ALTO_TARJETA, ANCHO_A4, ANCHO_TARJETA, hojaA4, tarjeta } from '../flyer/plantillas/tarjeta';
import { svgQrMarca } from '../flyer/qrMarca';
import { PALETA_PAPEL } from '../flyer/svg';
import { bajar, compartirOBajar, fuenteDataUri, svgAPng } from '../lib/exportar';
import { MENSAJE_QR, urlWhatsApp } from '../lib/whatsapp';
import type { Config } from '../tipos';

export default function Tarjeta() {
  const config = useLiveQuery(async () => (await db.config.get('unica')) ?? null, []);
  if (config === undefined) return null;
  return <Editor config={config} />;
}

type Negocio = Config['negocio'];

const CAMPOS: { campo: keyof Negocio; titulo: string; opcional?: boolean; placeholder?: string; tel?: boolean }[] = [
  { campo: 'nombre', titulo: 'Nombre del emprendimiento', placeholder: 'Ej: Dulce Hogar' },
  { campo: 'frase', titulo: 'Frase', opcional: true, placeholder: 'Ej: Tortas caseras para tus momentos más dulces' },
  { campo: 'telefono', titulo: 'Tu WhatsApp', placeholder: '11 2345-6789', tel: true },
  { campo: 'instagram', titulo: 'Instagram', opcional: true, placeholder: 'sin @' },
];

function Editor({ config }: { config: Config | null }) {
  const [negocio, setNegocio] = useState<Negocio>(config?.negocio ?? { nombre: '', telefono: '', instagram: '', frase: '' });
  const [fuente, setFuente] = useState<string | null>(null);
  const [estado, setEstado] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    fuenteDataUri(`${import.meta.env.BASE_URL}fuentes/playfair-latin.woff2`).then(setFuente);
  }, []);

  const url = urlWhatsApp(negocio.telefono, MENSAJE_QR);
  const svg = useMemo(
    () => tarjeta(negocio, { paleta: PALETA_PAPEL, qrSvg: svgQrMarca(url ?? 'https://wa.me/', PALETA_PAPEL), fuenteTitulos: fuente }),
    [negocio, url, fuente],
  );

  function guardar() {
    if (config) db.config.update('unica', { negocio });
  }

  async function exportar(que: 'hoja' | 'enviar' | 'bajar') {
    guardar();
    setOcupado(true);
    setEstado('Armando la imagen…');
    try {
      if (que === 'hoja') {
        bajar(await svgAPng(hojaA4(svg), ANCHO_A4, ALTO_A4), 'tarjetas-a4.png');
        return setEstado('Listo: quedó en Descargas. Imprimila al 100%, sin "ajustar a la página".');
      }
      const png = await svgAPng(svg, ANCHO_TARJETA, ALTO_TARJETA);
      if (que === 'bajar') {
        bajar(png, 'tarjeta.png');
        return setEstado('Listo: quedó en Descargas.');
      }
      const resultado = await compartirOBajar(png, 'tarjeta.png');
      setEstado({ compartido: 'Listo, enviada.', descargado: 'Este teléfono no deja compartir desde acá: quedó en Descargas.', cancelado: '' }[resultado]);
    } catch (error) {
      setEstado((error as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Pantalla titulo="Tarjeta" volver="mas">
      <Ayuda id="tarjeta">
        <p>Una tarjeta chica para dar con cada torta, así te recomiendan. El QR abre un chat de WhatsApp con tu número.</p>
        <p>
          <b>Hoja A4</b> trae 10 tarjetas de 9 × 5 cm con marcas para cortar. Imprimila al 100% (tamaño real): si la
          impresora la achica para "ajustar a la página", las tarjetas salen más chicas.
        </p>
        <p>Antes de imprimir muchas, probá una: escaneá el QR impreso con otro teléfono.</p>
      </Ayuda>

      <section className="bloque formulario">
        <h2>Tus datos</h2>
        {CAMPOS.map(({ campo, titulo, opcional, placeholder, tel }) => (
          <label key={campo} className="campo" htmlFor={`tarjeta-${campo}`}>
            <span>
              {titulo} {opcional && <small>opcional</small>}
            </span>
            <input
              id={`tarjeta-${campo}`}
              inputMode={tel ? 'tel' : undefined}
              placeholder={placeholder}
              value={negocio[campo]}
              onChange={(e) => setNegocio({ ...negocio, [campo]: e.target.value })}
              onBlur={guardar}
            />
          </label>
        ))}
        <p className="ayuda">Son los mismos datos del flyer: si los cambiás acá, cambian allá.</p>
      </section>

      {!url && <Aviso alerta>Escribí tu WhatsApp: sin eso el QR no lleva a ningún lado.</Aviso>}

      <img
        className="vista-flyer"
        style={{ aspectRatio: `${ANCHO_TARJETA} / ${ALTO_TARJETA}` }}
        alt="Vista previa de la tarjeta"
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      />
      <button className="boton" type="button" disabled={!url || ocupado} onClick={() => exportar('hoja')}>
        Descargar hoja A4 para imprimir
      </button>
      <div className="accesos">
        <button className="boton boton-secundario" type="button" disabled={!url || ocupado} onClick={() => exportar('enviar')}>
          Enviar tarjeta
        </button>
        <button className="boton boton-secundario" type="button" disabled={!url || ocupado} onClick={() => exportar('bajar')}>
          Descargar tarjeta
        </button>
      </div>
      {estado && <p role="status">{estado}</p>}
    </Pantalla>
  );
}
