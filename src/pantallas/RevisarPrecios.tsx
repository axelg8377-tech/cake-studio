import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Ayuda, Aviso, Pantalla, Variacion } from '../componentes/ui';
import { leerCatalogo } from '../datos/catalogo';
import { db } from '../db';
import { fechaCorta, pesos } from '../lib/formato';
import { diaHecha, revisarPrecios } from '../lib/resumen';

export default function RevisarPrecios() {
  const cat = useLiveQuery(() => leerCatalogo(), []);
  const tortas = useLiveQuery(() => db.tortas.toArray(), []);
  const [todas, setTodas] = useState(false);
  if (!cat || !tortas) return null;

  const revisiones = revisarPrecios(tortas, cat);
  const convienen = revisiones.filter((r) => r.conviene).length;
  const visibles = todas ? revisiones : revisiones.filter((r) => r.conviene);

  return (
    <Pantalla titulo="Revisar precios" volver="mas">
      <Ayuda id="revisar-precios">
        <p>
          Para cada torta hecha, compara lo que te costó ese día con lo que te costaría hoy, con los precios de ingredientes
          que cargaste.
        </p>
        <p>
          Si hoy te cuesta más y lo que cobraste ya no llega al precio sugerido, dice <b>conviene revisar el precio</b>.
          No cambia nada solo: la próxima vez que la hagas, decidís vos cuánto cobrar.
        </p>
      </Ayuda>

      {revisiones.length === 0 ? (
        <p className="vacio">
          Todavía no hay tortas hechas para comparar. Aparecen cuando tocás "Ya la hice" en <a href="#/tortas">Tortas</a>.
        </p>
      ) : (
        <>
          {convienen > 0 ? (
            <Aviso alerta>
              {convienen === 1 ? 'Una torta' : `${convienen} tortas`}: conviene revisar el precio.
            </Aviso>
          ) : (
            <Aviso>Con los precios de hoy, lo que cobraste sigue alcanzando.</Aviso>
          )}
          <div className="chips">
            <button type="button" className="chip" aria-pressed={!todas} onClick={() => setTodas(false)}>
              Conviene revisar ({convienen})
            </button>
            <button type="button" className="chip" aria-pressed={todas} onClick={() => setTodas(true)}>
              Todas ({revisiones.length})
            </button>
          </div>
          {visibles.length > 0 && (
            <ul className="lista">
              {visibles.map((r) => (
                <li key={r.torta.id}>
                  <a className="fila" href={`#/tortas/${r.torta.id}`}>
                    <span className="fila-principal">
                      <b>{r.torta.nombre}</b>
                      <small>
                        {fechaCorta(diaHecha(r.torta))} · costo {pesos(r.costoAntes)} → hoy {pesos(r.costoHoy)}
                      </small>
                      {r.incompleta ? (
                        <small>Se borró una opción o un ingrediente de esta torta: no se puede comparar.</small>
                      ) : (
                        <small>
                          Cobraste {pesos(r.torta.snapshot.precioFinal)} · hoy sugerido {pesos(r.precioHoy)}
                        </small>
                      )}
                      {r.conviene && <small className="c-perdida">Conviene revisar el precio</small>}
                    </span>
                    {!r.incompleta && <Variacion abs={r.diferencia} pct={r.pct} />}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Pantalla>
  );
}
