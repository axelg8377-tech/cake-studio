import { useLiveQuery } from 'dexie-react-hooks';
import { Aviso, Ayuda, Pantalla, Variacion } from '../componentes/ui';
import { ultimosCambios } from '../datos/ingredientes';
import { db } from '../db';
import { variacion } from '../lib/costos';

export default function Inicio() {
  const config = useLiveQuery(() => db.config.get('unica'), []);
  const ingredientes = useLiveQuery(() => db.ingredientes.toArray(), []);
  const historial = useLiveQuery(() => db.preciosHistorial.toArray(), []);
  if (!ingredientes || !historial) return null;

  const nombres = new Map(ingredientes.map((i) => [i.id!, i.nombre]));
  const aumentos = [...ultimosCambios(historial).values()]
    .map((h) => ({ id: h.ingredienteId, nombre: nombres.get(h.ingredienteId), ...variacion(h.precioAnterior, h.precioNuevo) }))
    .filter((a) => a.nombre !== undefined && a.pct !== null && a.pct > 0)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
    .slice(0, 3);
  const deEjemplo = ingredientes.filter((i) => i.notas?.startsWith('Precio de ejemplo')).length;

  return (
    <Pantalla titulo={config?.negocio.nombre || 'Pastelería'}>
      <Ayuda id="inicio" titulo="Primeros pasos">
        <ol>
          <li>
            En <a href="#/ingredientes">Ingredientes</a>, cargá lo que pagaste. Los precios que vienen son de ejemplo.
          </li>
          <li>
            En <a href="#/tortas">Tortas</a>, armá una: con opciones ya armadas o tocando los ingredientes uno por uno.
          </li>
          <li>La app te dice cuánto te cuesta, cuánto ganás y un precio sugerido. Si cobrás otro, lo escribís.</li>
          <li>Guardala como borrador. Cuando la entregues, tocá "Ya la hice" y se descuenta el stock.</li>
        </ol>
        <p>Cada pantalla tiene su explicación arriba. Se cierra con "Entendido" y se vuelve a ver desde Más.</p>
      </Ayuda>

      {deEjemplo > 0 && (
        <Aviso alerta>
          {deEjemplo} de {ingredientes.length} ingredientes tienen precio de ejemplo. Empezá por actualizar los que
          más usás.
        </Aviso>
      )}

      <div className="accesos">
        <a className="boton" href="#/ingredientes">
          Actualizar precios
        </a>
        <a className="boton boton-secundario" href="#/flyer">
          Hacer un flyer
        </a>
      </div>

      <section className="bloque">
        <h2>Mayores aumentos</h2>
        {aumentos.length === 0 ? (
          <p className="vacio">Todavía no hubo aumentos. Aparecen cuando actualices un precio.</p>
        ) : (
          <ul className="lista">
            {aumentos.map((a) => (
              <li key={a.id}>
                <a className="fila" href={`#/ingredientes/${a.id}`}>
                  <b>{a.nombre}</b>
                  <Variacion abs={a.abs} pct={a.pct} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Pantalla>
  );
}
