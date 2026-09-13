import { useState } from 'react';
import { mostrarAyudasDeNuevo, Pantalla } from '../componentes/ui';

/** Agrupado por para qué se entra: lo del día a día arriba, lo que se configura una vez abajo. */
const GRUPOS = [
  {
    titulo: 'Tu negocio',
    secciones: [
      { ruta: 'mas/historial', nombre: 'Historial', detalle: 'Las tortas que hiciste, mes por mes' },
      { ruta: 'mas/clientes', nombre: 'Clientes', detalle: 'Nombre, teléfono y notas' },
      { ruta: 'mas/revisar-precios', nombre: 'Revisar precios', detalle: 'Tortas que hoy te costarían más' },
      { ruta: 'mas/tarjeta', nombre: 'Tarjeta de recomendación', detalle: 'Para imprimir y dar con cada torta' },
      { ruta: 'mas/galeria', nombre: 'Galería de fotos', detalle: 'Las fotos de tus tortas para el flyer' },
    ],
  },
  {
    titulo: 'Cómo calculás',
    secciones: [
      { ruta: 'mas/opciones', nombre: 'Opciones de torta', detalle: 'Masas, rellenos, coberturas, decoración y extras' },
      { ruta: 'mas/tamanos', nombre: 'Tamaños', detalle: 'Moldes y cuánto rinde cada uno' },
      { ruta: 'mas/gastos', nombre: 'Gastos', detalle: 'Caja, base de cartón, gas y luz' },
    ],
  },
  {
    titulo: 'Tus datos',
    secciones: [{ ruta: 'mas/copia', nombre: 'Copia de seguridad', detalle: 'Guardar todo en un archivo y recuperarlo' }],
  },
];

declare const __COMPILADA__: string;

/** Espera a que el service worker nuevo quede activo, con techo: sin internet o sin versión nueva no traba. */
function esperarActivo(sw: ServiceWorker | null | undefined, ms = 10_000): Promise<void> {
  return new Promise((listo) => {
    if (!sw || sw.state === 'activated') return listo();
    const techo = setTimeout(listo, ms);
    sw.addEventListener('statechange', () => {
      if (sw.state === 'activated' || sw.state === 'redundant') {
        clearTimeout(techo);
        listo();
      }
    });
  });
}

async function actualizarApp(): Promise<void> {
  try {
    const registro = await navigator.serviceWorker?.getRegistration();
    await registro?.update();
    await esperarActivo(registro?.installing ?? registro?.waiting);
  } catch {
    // Sin internet: se recarga igual con lo que ya está guardado.
  }
  location.reload();
}

export default function Mas() {
  const [ayudas, setAyudas] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  return (
    <Pantalla titulo="Más">
      <section className="bloque">
        <h2>Versión de la app</h2>
        <p className="ayuda">
          Versión del {__COMPILADA__}
          <br />
          Si te avisamos de un cambio y no lo ves, tocá el botón: busca la versión nueva y vuelve a abrir la app.
        </p>
        <button
          className="boton"
          type="button"
          disabled={actualizando}
          onClick={() => {
            setActualizando(true);
            actualizarApp();
          }}
        >
          {actualizando ? 'Buscando…' : 'Buscar actualización'}
        </button>
      </section>
      {GRUPOS.map((g) => (
        <section key={g.titulo} className="grupo-lista">
          <h2>{g.titulo}</h2>
          <ul className="lista">
            {g.secciones.map((s) => (
              <li key={s.ruta}>
                <a className="fila" href={`#/${s.ruta}`}>
                  <span className="fila-principal">
                    <b>{s.nombre}</b>
                    <small>{s.detalle}</small>
                  </span>
                  <span aria-hidden="true">›</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <button
        className="boton boton-secundario"
        type="button"
        onClick={() => {
          mostrarAyudasDeNuevo();
          setAyudas(true);
        }}
      >
        Volver a ver las explicaciones
      </button>
      {ayudas && (
        <p className="ok" role="status">
          Listo: cada pantalla vuelve a mostrar su explicación.
        </p>
      )}
    </Pantalla>
  );
}
