import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { confirmar } from '../componentes/confirmar';
import { Ayuda, NoEncontrado, Pantalla } from '../componentes/ui';
import { eliminarGasto, guardarGasto } from '../datos/catalogo';
import { db } from '../db';
import { leerPesos, pesos } from '../lib/formato';
import { ir } from '../lib/ruta';
import type { Gasto } from '../tipos';

export function Gastos() {
  const gastos = useLiveQuery(() => db.gastos.orderBy('nombre').toArray(), []);
  if (!gastos) return null;

  return (
    <Pantalla
      titulo="Gastos"
      volver="mas"
      accion={
        <a className="boton boton-chico" href="#/mas/gastos/nuevo">
          Agregar
        </a>
      }
    >
      <Ayuda id="gastos">
        <p>Lo que gastás además de los ingredientes.</p>
        <ul>
          <li>
            <b>Cada torta:</b> se suma solo al costo de todas (base de cartón, gas y luz).
          </li>
          <li>
            <b>Solo si se elige:</b> se cobra cuando lo lleva una opción extra, como "Caja especial" o "Delivery".
          </li>
        </ul>
      </Ayuda>
      {gastos.length === 0 ? (
        <p className="vacio">Todavía no hay gastos. Tocá Agregar.</p>
      ) : (
        <ul className="lista">
          {gastos.map((g) => (
            <li key={g.id}>
              <a className="fila" href={`#/mas/gastos/${g.id}`}>
                <span className="fila-principal">
                  <b>{g.nombre}</b>
                  <small>
                    {g.categoria} · {g.porTorta ? 'cada torta' : 'solo si se elige'}
                  </small>
                </span>
                <b>{pesos(g.precio)}</b>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Pantalla>
  );
}

export function FormGasto({ id }: { id?: number }) {
  const gasto = useLiveQuery(async () => (id ? ((await db.gastos.get(id)) ?? null) : null), [id]);
  if (id !== undefined && gasto === undefined) return null;
  if (id !== undefined && gasto === null) return <NoEncontrado volver="mas/gastos" />;
  return <EditorGasto inicial={gasto ?? undefined} />;
}

function EditorGasto({ inicial }: { inicial?: Gasto }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [categoria, setCategoria] = useState(inicial?.categoria ?? '');
  const [precio, setPrecio] = useState(inicial ? String(inicial.precio) : '');
  const [porTorta, setPorTorta] = useState(inicial?.porTorta ?? true);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const monto = leerPesos(precio);
    if (!nombre.trim()) return setError('Poné el nombre del gasto.');
    if (monto === null) return setError('Poné cuánto cuesta.');
    await guardarGasto(
      { nombre, categoria: categoria.trim() || 'Otros', precio: monto, porTorta, notas: inicial?.notas },
      inicial?.id,
    );
    ir('mas/gastos');
  }

  async function borrar() {
    if (!inicial || !(await confirmar({ titulo: `¿Borrar ${inicial.nombre}?`, aceptar: 'Borrar', peligro: true }))) return;
    const resultado = await eliminarGasto(inicial.id!);
    if (resultado.ok) ir('mas/gastos');
    else setError(`No se puede borrar: lo usa ${resultado.usadoEn.join(', ')}. Sacalo de esas opciones primero.`);
  }

  return (
    <Pantalla titulo={inicial ? 'Editar gasto' : 'Nuevo gasto'} volver="mas/gastos">
      <form className="formulario" onSubmit={guardar} noValidate>
        <label className="campo" htmlFor="gasto-nombre">
          Nombre
          <input
            id="gasto-nombre"
            autoComplete="off"
            placeholder="Ej: Base de cartón"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
        <label className="campo" htmlFor="gasto-categoria">
          <span>
            Categoría <small>opcional</small>
          </span>
          <input
            id="gasto-categoria"
            list="categorias-gasto"
            autoComplete="off"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <datalist id="categorias-gasto">
            <option value="Packaging" />
            <option value="Servicios" />
            <option value="Envío" />
            <option value="Otros" />
          </datalist>
        </label>
        <label className="campo" htmlFor="gasto-precio">
          Cuánto cuesta
          <input
            id="gasto-precio"
            inputMode="numeric"
            placeholder="$ 900"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </label>
        <label className="check" htmlFor="gasto-por-torta">
          <input
            id="gasto-por-torta"
            type="checkbox"
            checked={porTorta}
            onChange={(e) => setPorTorta(e.target.checked)}
          />
          Se suma a cada torta
        </label>
        <p className="ayuda">
          Destildalo si solo se cobra a veces, como el delivery. Después se lo agregás a una opción extra.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="boton" type="submit">
          {inicial ? 'Guardar cambios' : 'Agregar gasto'}
        </button>
        {inicial && (
          <button className="boton boton-peligro" type="button" onClick={borrar}>
            Borrar gasto
          </button>
        )}
      </form>
    </Pantalla>
  );
}
