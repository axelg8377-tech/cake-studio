import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Ayuda, Pantalla } from '../componentes/ui';
import { db } from '../db';
import { fechaCorta, pesos } from '../lib/formato';
import { diaHecha } from '../lib/resumen';
import type { Torta } from '../tipos';

type Filtro = Torta['estado'];

export default function Historial() {
  const tortas = useLiveQuery(() => db.tortas.toArray(), []);
  const clientes = useLiveQuery(() => db.clientes.toArray(), []);
  const [filtro, setFiltro] = useState<Filtro>('realizada');
  if (!tortas || !clientes) return null;

  const nombres = new Map(clientes.map((c) => [c.id!, c.nombre]));
  const lista = tortas.filter((t) => t.estado === filtro).sort((a, b) => diaHecha(b).localeCompare(diaHecha(a)));
  const meses = new Map<string, Torta[]>();
  for (const t of lista) {
    const d = new Date(diaHecha(t));
    const mes = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    meses.set(mes, [...(meses.get(mes) ?? []), t]);
  }

  return (
    <Pantalla titulo="Historial" volver="mas">
      <Ayuda id="historial">
        <p>Todas las tortas guardadas, agrupadas por mes. Las hechas van por el día en que tocaste "Ya la hice".</p>
        <p>El precio y el costo son los del momento en que la guardaste. Tocá una para abrirla.</p>
      </Ayuda>

      <div className="chips">
        <button type="button" className="chip" aria-pressed={filtro === 'realizada'} onClick={() => setFiltro('realizada')}>
          Hechas
        </button>
        <button type="button" className="chip" aria-pressed={filtro === 'borrador'} onClick={() => setFiltro('borrador')}>
          Borradores
        </button>
      </div>

      {lista.length === 0 && (
        <p className="vacio">
          {filtro === 'realizada' ? 'Todavía no marcaste ninguna torta como hecha.' : 'No hay borradores.'}{' '}
          <a href="#/tortas">Armar una torta</a>
        </p>
      )}

      {[...meses].map(([mes, delMes]) => (
        <section key={mes} className="grupo-lista">
          <h2>
            {mes} · {delMes.length} {delMes.length === 1 ? 'torta' : 'tortas'}
            {filtro === 'realizada' && ` · ${pesos(delMes.reduce((s, t) => s + t.snapshot.precioFinal, 0))}`}
          </h2>
          <ul className="lista">
            {delMes.map((t) => (
              <li key={t.id}>
                <a className="fila" href={`#/tortas/${t.id}`}>
                  <span className="fila-principal">
                    <b>{t.nombre}</b>
                    <small>
                      {fechaCorta(diaHecha(t))}
                      {t.clienteId !== undefined && nombres.has(t.clienteId) && ` · ${nombres.get(t.clienteId)}`}
                    </small>
                  </span>
                  <b>{pesos(t.snapshot.precioFinal)}</b>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Pantalla>
  );
}
