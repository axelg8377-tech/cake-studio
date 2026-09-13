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

export default function Mas() {
  const [ayudas, setAyudas] = useState(false);
  return (
    <Pantalla titulo="Más">
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
