import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { Ayuda, Aviso, Miniatura, Pantalla } from '../componentes/ui';
import { leerCatalogo } from '../datos/catalogo';
import { subirFotos } from '../datos/imagenes';
import { db } from '../db';
import { cartaDelCatalogo, flyerDeTorta } from '../flyer/desdeTorta';
import { flyerCarta } from '../flyer/plantillas/carta';
import { flyerDulce } from '../flyer/plantillas/dulce';
import { ALTO, ANCHO, flyerElegante } from '../flyer/plantillas/elegante';
import { svgQrMarca } from '../flyer/qrMarca';
import { PALETA_PAPEL, PALETA_ROSA } from '../flyer/svg';
import type { Catalogo } from '../lib/costos';
import { bajar, blobADataUri, compartirOBajar, fuenteDataUri, svgAPng } from '../lib/exportar';
import { fechaCorta, leerPesos, pesos } from '../lib/formato';
import { MENSAJE_QR, urlWhatsApp } from '../lib/whatsapp';
import type { Config, Imagen, Torta } from '../tipos';

type Plantilla = Config['plantillaFlyer'];

const PLANTILLAS: { id: Plantilla; nombre: string; detalle: string }[] = [
  { id: 'elegante', nombre: 'Elegante', detalle: 'Papel crema, letra clásica' },
  { id: 'dulce', nombre: 'Dulce', detalle: 'Rosa, cursiva, foto en flor' },
  { id: 'carta', nombre: 'Carta', detalle: 'Tus tamaños con precio' },
];

const fuente = (archivo: string) => fuenteDataUri(`${import.meta.env.BASE_URL}fuentes/${archivo}`);

const SIN_TORTA = { nombre: '', tamano: '', detalle: [], precio: 0 };

/** Con `tortaId` arranca con esa torta elegida (viene del botón "Hacer flyer" del constructor). */
export default function Flyer({ tortaId }: { tortaId?: number }) {
  const cat = useLiveQuery(() => leerCatalogo(), []);
  const config = useLiveQuery(async () => (await db.config.get('unica')) ?? null, []);
  const tortas = useLiveQuery(() => db.tortas.orderBy('fecha').reverse().toArray(), []);
  const imagenes = useLiveQuery(() => db.imagenes.orderBy('creada').reverse().toArray(), []);
  if (!cat || config === undefined || !tortas || !imagenes) return null;
  return <Editor cat={cat} config={config} tortas={tortas} imagenes={imagenes} tortaId={tortaId} />;
}

function Editor({
  cat,
  config,
  tortas,
  imagenes,
  tortaId,
}: {
  cat: Catalogo;
  config: Config | null;
  tortas: Torta[];
  imagenes: Imagen[];
  tortaId?: number;
}) {
  const inicial = tortas.find((t) => t.id === tortaId) ?? tortas[0];
  const [plantilla, setPlantilla] = useState<Plantilla>(config?.plantillaFlyer ?? 'elegante');
  const [elegida, setElegida] = useState(inicial?.id);
  const [datos, setDatos] = useState(() => (inicial ? flyerDeTorta(inicial, cat) : SIN_TORTA));
  const [imagenId, setImagenId] = useState(() => (imagenes.find((i) => i.principal) ?? imagenes[0])?.id ?? null);
  const [foto, setFoto] = useState<string | null>(null);
  const [negocio, setNegocio] = useState(config?.negocio ?? { nombre: '', telefono: '', instagram: '', frase: '' });
  const [titulo, setTitulo] = useState('Tortas');
  const [preciosCarta, setPreciosCarta] = useState<Record<number, string>>({});
  const [fuentes, setFuentes] = useState<{ titulos: string | null; guion: string | null }>({ titulos: null, guion: null });
  const [estado, setEstado] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    Promise.all([fuente('playfair-latin.woff2'), fuente('greatvibes-latin.woff2')]).then(([titulos, guion]) =>
      setFuentes({ titulos, guion }),
    );
  }, []);

  const blob = imagenes.find((i) => i.id === imagenId)?.blob;
  useEffect(() => {
    if (!blob) return setFoto(null);
    let vigente = true;
    blobADataUri(blob).then((uri) => vigente && setFoto(uri));
    return () => {
      vigente = false;
    };
  }, [blob]);

  const carta = useMemo(() => cartaDelCatalogo(cat, config?.margenDefecto ?? 50), [cat, config]);
  const url = urlWhatsApp(negocio.telefono, MENSAJE_QR);

  const svg = useMemo(() => {
    const paleta = plantilla === 'dulce' ? PALETA_ROSA : PALETA_PAPEL;
    const recursos = {
      paleta,
      qrSvg: svgQrMarca(url ?? 'https://wa.me/', { tinta: paleta.tinta, papel: paleta.papel }),
      fotoDataUri: foto,
      fuenteTitulos: fuentes.titulos,
      fuenteGuion: fuentes.guion,
    };
    const neg = { nombre: negocio.nombre, telefono: negocio.telefono, instagram: negocio.instagram };
    if (plantilla === 'carta') {
      const tamanos = carta.tamanos.map((t, i) => ({ ...t, precio: leerPesos(preciosCarta[i] ?? '') ?? t.precio }));
      return flyerCarta({ ...carta, tamanos, titulo, negocio: neg }, recursos);
    }
    return (plantilla === 'dulce' ? flyerDulce : flyerElegante)({ ...datos, negocio: neg }, recursos);
  }, [plantilla, url, foto, fuentes, negocio, carta, preciosCarta, titulo, datos]);

  function cambiarPlantilla(p: Plantilla) {
    setPlantilla(p);
    if (config) db.config.update('unica', { plantillaFlyer: p });
  }

  function elegirTorta(id: number) {
    const t = tortas.find((x) => x.id === id);
    setElegida(id);
    if (t) setDatos(flyerDeTorta(t, cat));
  }

  function guardarNegocio() {
    if (config) db.config.update('unica', { negocio });
  }

  async function subir(archivos: File[]) {
    if (archivos.length === 0) return;
    setEstado('Guardando la foto…');
    try {
      const [id] = await subirFotos(archivos, 'torta');
      setImagenId(id);
      setEstado('');
    } catch {
      setEstado('Esa foto no se pudo abrir. Probá con otra.');
    }
  }

  async function exportar(enviar: boolean) {
    guardarNegocio();
    setOcupado(true);
    setEstado('Armando la imagen…');
    try {
      const png = await svgAPng(svg, ANCHO, ALTO);
      const base = (plantilla === 'carta' ? titulo : datos.nombre)
        .normalize('NFD')
        .replace(/[^\w]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      const nombre = `flyer-${base || 'torta'}.png`;
      if (!enviar) {
        bajar(png, nombre);
        return setEstado('Listo: quedó en Descargas.');
      }
      const resultado = await compartirOBajar(png, nombre);
      setEstado(
        {
          compartido: 'Listo, enviado.',
          descargado: 'Este teléfono no deja compartir desde acá: quedó en Descargas.',
          cancelado: '',
        }[resultado],
      );
    } catch (error) {
      setEstado((error as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Pantalla titulo="Flyer">
      <Ayuda id="flyer">
        <p>Armá la imagen para mandarle al cliente: elegí el diseño, la torta y la foto, y revisá el texto.</p>
        <p>
          El QR abre un chat de WhatsApp con tu número. <b>El costo y la ganancia nunca salen en el flyer</b>: solo el
          precio.
        </p>
        <p>
          <b>Enviar por WhatsApp</b> abre el menú de compartir del teléfono. <b>Descargar</b> la guarda en el celular.
        </p>
      </Ayuda>

      <section className="paso">
        <h2 className="rotulo">Diseño</h2>
        <div className="chips">
          {PLANTILLAS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip"
              aria-pressed={p.id === plantilla}
              onClick={() => cambiarPlantilla(p.id)}
            >
              <span>{p.nombre}</span>
              <small>{p.detalle}</small>
            </button>
          ))}
        </div>
      </section>

      {plantilla === 'carta' ? (
        <section className="bloque formulario">
          <h2>Carta</h2>
          <label className="campo" htmlFor="carta-titulo">
            Título
            <input id="carta-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </label>
          {carta.tamanos.length === 0 && (
            <p className="vacio">
              No hay tamaños cargados. <a href="#/mas/tamanos/nuevo">Cargá uno</a>.
            </p>
          )}
          {carta.tamanos.map((t, i) => (
            <label key={i} className="campo" htmlFor={`carta-precio-${i}`}>
              {t.nombre} · desde
              <input
                id={`carta-precio-${i}`}
                inputMode="numeric"
                placeholder={pesos(t.precio)}
                value={preciosCarta[i] ?? ''}
                onChange={(e) => setPreciosCarta((prev) => ({ ...prev, [i]: e.target.value }))}
              />
            </label>
          ))}
          <p className="ayuda">
            El precio sugerido es la masa, el relleno y la cobertura más baratos, con tu ganancia de{' '}
            {config?.margenDefecto ?? 50}%. Si cobrás otro, escribilo. Las listas salen de Más › Opciones.
          </p>
        </section>
      ) : (
        <section className="bloque formulario">
          <h2>Torta</h2>
          {tortas.length === 0 ? (
            <p className="vacio">
              Todavía no guardaste tortas. <a href="#/tortas">Armá una</a> o completá a mano.
            </p>
          ) : (
            <label className="campo" htmlFor="flyer-torta">
              Torta guardada
              <select id="flyer-torta" value={elegida ?? ''} onChange={(e) => elegirTorta(Number(e.target.value))}>
                {tortas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} · {fechaCorta(t.fecha)} · {pesos(t.snapshot.precioFinal)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="campo" htmlFor="flyer-nombre">
            Nombre en el flyer
            <input
              id="flyer-nombre"
              placeholder="Ej: Chocolate y frutillas"
              value={datos.nombre}
              onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            />
          </label>
          <label className="campo" htmlFor="flyer-texto">
            <span>
              Texto debajo del nombre <small>opcional</small>
            </span>
            <input
              id="flyer-texto"
              placeholder="Ej: 20 cm · 12 porciones"
              value={datos.tamano}
              onChange={(e) => setDatos({ ...datos, tamano: e.target.value })}
            />
          </label>
          <label className="campo" htmlFor="flyer-precio">
            Precio
            <input
              id="flyer-precio"
              inputMode="numeric"
              value={datos.precio ? String(datos.precio) : ''}
              onChange={(e) => setDatos({ ...datos, precio: leerPesos(e.target.value) ?? 0 })}
            />
          </label>
        </section>
      )}

      <section className="paso">
        <h2 className="rotulo">Foto</h2>
        <div className="fotos-elegir">
          <button
            type="button"
            className="foto-opcion"
            aria-pressed={imagenId === null}
            onClick={() => setImagenId(null)}
          >
            Sin foto
          </button>
          {imagenes.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className="foto-opcion"
              aria-pressed={img.id === imagenId}
              aria-label={`Foto ${i + 1}`}
              onClick={() => setImagenId(img.id!)}
            >
              <Miniatura blob={img.blob} alt="" />
            </button>
          ))}
          <label className="foto-opcion foto-subir">
            + Subir
            <input
              className="sr"
              type="file"
              accept="image/*"
              onChange={(e) => {
                subir(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </section>

      <section className="bloque formulario">
        <h2>Tus datos</h2>
        <label className="campo" htmlFor="negocio-nombre">
          Nombre del emprendimiento
          <input
            id="negocio-nombre"
            value={negocio.nombre}
            onChange={(e) => setNegocio({ ...negocio, nombre: e.target.value })}
            onBlur={guardarNegocio}
          />
        </label>
        <label className="campo" htmlFor="negocio-telefono">
          Tu WhatsApp
          <input
            id="negocio-telefono"
            inputMode="tel"
            placeholder="11 2345-6789"
            value={negocio.telefono}
            onChange={(e) => setNegocio({ ...negocio, telefono: e.target.value })}
            onBlur={guardarNegocio}
          />
        </label>
        <label className="campo" htmlFor="negocio-instagram">
          <span>
            Instagram <small>opcional</small>
          </span>
          <input
            id="negocio-instagram"
            placeholder="sin @"
            value={negocio.instagram}
            onChange={(e) => setNegocio({ ...negocio, instagram: e.target.value })}
            onBlur={guardarNegocio}
          />
        </label>
        <p className="ayuda">Quedan guardados en este teléfono para el próximo flyer.</p>
      </section>

      {!url && <Aviso alerta>Escribí tu WhatsApp: sin eso el QR no lleva a ningún lado.</Aviso>}

      <img
        className="vista-flyer"
        alt="Vista previa del flyer"
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      />
      <div className="accesos">
        <button className="boton" type="button" disabled={!url || ocupado} onClick={() => exportar(true)}>
          Enviar por WhatsApp
        </button>
        <button className="boton boton-secundario" type="button" disabled={!url || ocupado} onClick={() => exportar(false)}>
          Descargar
        </button>
      </div>
      {estado && <p role="status">{estado}</p>}
    </Pantalla>
  );
}
