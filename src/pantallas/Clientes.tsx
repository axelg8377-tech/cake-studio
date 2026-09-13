import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { confirmar } from '../componentes/confirmar';
import { Ayuda, NoEncontrado, Pantalla } from '../componentes/ui';
import { eliminarCliente, guardarCliente } from '../datos/clientes';
import { db } from '../db';
import { fechaCorta, pesos } from '../lib/formato';
import { ir } from '../lib/ruta';
import { urlWhatsApp } from '../lib/whatsapp';
import type { Cliente, Torta } from '../tipos';

const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function Clientes() {
  const clientes = useLiveQuery(() => db.clientes.orderBy('nombre').toArray(), []);
  const tortas = useLiveQuery(() => db.tortas.toArray(), []);
  const [buscar, setBuscar] = useState('');
  if (!clientes || !tortas) return null;

  const cuantas = new Map<number, number>();
  for (const t of tortas) if (t.clienteId !== undefined) cuantas.set(t.clienteId, (cuantas.get(t.clienteId) ?? 0) + 1);
  const filtro = sinTildes(buscar.trim());
  const visibles = clientes.filter((c) => !filtro || sinTildes(`${c.nombre} ${c.telefono}`).includes(filtro));

  return (
    <Pantalla
      titulo="Clientes"
      volver="mas"
      accion={
        <a className="boton boton-chico" href="#/mas/clientes/nuevo">
          Agregar
        </a>
      }
    >
      <Ayuda id="clientes">
        <p>Una agenda simple: nombre, teléfono y notas (alergias, gustos, fechas de cumpleaños).</p>
        <p>Cuando armás una torta podés elegir para qué cliente es. Acá ves las tortas de cada uno.</p>
      </Ayuda>

      {clientes.length === 0 ? (
        <p className="vacio">
          Todavía no cargaste clientes. <a href="#/mas/clientes/nuevo">Agregá el primero</a>.
        </p>
      ) : (
        <>
          <label className="campo buscador" htmlFor="buscar-cliente">
            <span className="sr">Buscar cliente</span>
            <input id="buscar-cliente" type="search" placeholder="Buscar por nombre o teléfono" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </label>
          {visibles.length === 0 ? (
            <p className="vacio">Nadie coincide con "{buscar}".</p>
          ) : (
            <ul className="lista">
              {visibles.map((c) => (
                <li key={c.id}>
                  <a className="fila" href={`#/mas/clientes/${c.id}`}>
                    <span className="fila-principal">
                      <b>{c.nombre}</b>
                      <small>{c.telefono || 'Sin teléfono'}</small>
                    </span>
                    <small className="vacio">
                      {cuantas.get(c.id!) ?? 0} {cuantas.get(c.id!) === 1 ? 'torta' : 'tortas'}
                    </small>
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

/** Sin `id` da de alta; con `id` edita y muestra las tortas de ese cliente. */
export function FormCliente({ id }: { id?: number }) {
  const cliente = useLiveQuery(async () => (id ? ((await db.clientes.get(id)) ?? null) : null), [id]);
  const tortas = useLiveQuery(async () => (id ? db.tortas.where('clienteId').equals(id).toArray() : []), [id]);
  if (cliente === undefined || !tortas) return null;
  if (id !== undefined && cliente === null) return <NoEncontrado volver="mas/clientes" />;
  return <Formulario inicial={cliente ?? undefined} tortas={tortas.sort((a, b) => b.fecha.localeCompare(a.fecha))} />;
}

function Formulario({ inicial, tortas }: { inicial?: Cliente; tortas: Torta[] }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [telefono, setTelefono] = useState(inicial?.telefono ?? '');
  const [notas, setNotas] = useState(inicial?.notas ?? '');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setOk(null);
    if (!nombre.trim()) return setError('Escribí el nombre.');
    setError(null);
    await guardarCliente({ nombre, telefono, notas }, inicial?.id);
    if (inicial) setOk('Cambios guardados.');
    else ir('mas/clientes');
  }

  async function borrar() {
    if (!inicial) return;
    const ok = await confirmar({
      titulo: `¿Borrar a ${inicial.nombre}?`,
      mensaje: tortas.length > 0 ? `Sus ${tortas.length} tortas quedan en el historial, sin cliente.` : undefined,
      aceptar: 'Borrar',
      peligro: true,
    });
    if (!ok) return;
    await eliminarCliente(inicial.id!);
    ir('mas/clientes');
  }

  const chat = inicial && urlWhatsApp(inicial.telefono);

  return (
    <Pantalla titulo={inicial ? inicial.nombre : 'Nuevo cliente'} volver="mas/clientes">
      <form className="formulario" onSubmit={enviar}>
        <label className="campo" htmlFor="cliente-nombre">
          Nombre
          <input id="cliente-nombre" autoComplete="off" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="campo" htmlFor="cliente-telefono">
          <span>
            Teléfono <small>opcional</small>
          </span>
          <input id="cliente-telefono" inputMode="tel" placeholder="11 2345-6789" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </label>
        <label className="campo" htmlFor="cliente-notas">
          <span>
            Notas <small>opcional</small>
          </span>
          <textarea id="cliente-notas" placeholder="Ej: sin TACC, le gusta el chocolate" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {ok && (
          <p className="ok" role="status">
            {ok}
          </p>
        )}
        <button className="boton" type="submit">
          {inicial ? 'Guardar cambios' : 'Guardar cliente'}
        </button>
      </form>

      {inicial && (
        <>
          {chat && (
            <a className="boton boton-secundario" href={chat} target="_blank" rel="noopener noreferrer">
              Escribirle por WhatsApp
            </a>
          )}
          <section className="grupo-lista">
            <h2>Sus tortas</h2>
            {tortas.length === 0 ? (
              <p className="vacio">Todavía ninguna. Al armar una torta, elegí a este cliente.</p>
            ) : (
              <ul className="lista">
                {tortas.map((t) => (
                  <li key={t.id}>
                    <a className="fila" href={`#/tortas/${t.id}`}>
                      <span className="fila-principal">
                        <b>{t.nombre}</b>
                        <small>
                          {fechaCorta(t.hecha ?? t.fecha)} · {t.estado === 'realizada' ? 'hecha' : 'borrador'}
                        </small>
                      </span>
                      <b>{pesos(t.snapshot.precioFinal)}</b>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <button className="boton boton-peligro" type="button" onClick={borrar}>
            Borrar cliente
          </button>
        </>
      )}
    </Pantalla>
  );
}
