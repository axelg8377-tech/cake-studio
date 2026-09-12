import { useState } from 'react';
import { mostrarAyudasDeNuevo, Pantalla } from '../componentes/ui';

const SECCIONES = [
  { ruta: 'mas/opciones', nombre: 'Opciones de torta', detalle: 'Masas, rellenos, coberturas, decoración y extras' },
  { ruta: 'mas/tamanos', nombre: 'Tamaños', detalle: 'Moldes y cuánto rinde cada uno' },
  { ruta: 'mas/gastos', nombre: 'Gastos', detalle: 'Caja, base de cartón, gas y luz' },
  { ruta: 'mas/galeria', nombre: 'Galería de fotos', detalle: 'Las fotos de tus tortas para el flyer' },
];

/** Lo que todavía no está construido se lista sin link: dice qué falta, sin simular que anda. */
const PROXIMAS = [
  'Tortas realizadas',
  'Clientes',
  'Revisar precios de tortas',
  'Tarjeta de recomendación',
  'Configuración y copia de seguridad',
];

export default function Mas() {
  const [ayudas, setAyudas] = useState(false);
  return (
    <Pantalla titulo="Más">
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
      <ul className="lista">
        {SECCIONES.map((s) => (
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
      <section className="grupo-lista">
        <h2>Próximas entregas</h2>
        <ul className="lista">
          {PROXIMAS.map((nombre) => (
            <li key={nombre} className="fila">
              <span className="vacio">{nombre}</span>
            </li>
          ))}
        </ul>
      </section>
    </Pantalla>
  );
}
