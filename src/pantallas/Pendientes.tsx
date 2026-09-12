import { Aviso, Pantalla } from '../componentes/ui';

/** Secciones del menú que todavía no están construidas. Dicen qué falta, sin simular que andan. */

export function Tortas() {
  return (
    <Pantalla titulo="Tortas">
      <Aviso>
        Armar una torta y ver su costo llega en la próxima entrega. Mientras tanto, cargá los precios reales en{' '}
        <a href="#/ingredientes">Ingredientes</a>: el cálculo va a usar esos.
      </Aviso>
    </Pantalla>
  );
}

const PROXIMAS = [
  'Gastos (caja, base, gas y luz)',
  'Opciones de torta: masas, rellenos, coberturas',
  'Galería de fotos',
  'Tortas realizadas',
  'Clientes',
  'Revisar precios de tortas',
  'Tarjeta de recomendación',
  'Configuración y copia de seguridad',
];

export function Mas() {
  return (
    <Pantalla titulo="Más">
      <p className="vacio">Estas secciones se van sumando en las próximas entregas:</p>
      <ul className="lista">
        {PROXIMAS.map((nombre) => (
          <li key={nombre} className="fila">
            <span>{nombre}</span>
          </li>
        ))}
      </ul>
    </Pantalla>
  );
}
