import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { NoEncontrado, Pantalla } from '../componentes/ui';
import { eliminarTamano, guardarTamano } from '../datos/catalogo';
import { db } from '../db';
import { leerNumero } from '../lib/formato';
import { ir } from '../lib/ruta';
import type { Tamano } from '../tipos';

const factorTexto = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

export function Tamanos() {
  const tamanos = useLiveQuery(() => db.tamanos.orderBy('orden').toArray(), []);
  if (!tamanos) return null;

  return (
    <Pantalla
      titulo="Tamaños"
      volver="mas"
      accion={
        <a className="boton boton-chico" href="#/mas/tamanos/nuevo">
          Agregar
        </a>
      }
    >
      <p className="vacio">
        Las recetas están pensadas para el tamaño de factor 1. Uno de factor 1,44 lleva 44% más de cada ingrediente.
      </p>
      <ul className="lista">
        {tamanos.map((t) => (
          <li key={t.id}>
            <a className="fila" href={`#/mas/tamanos/${t.id}`}>
              <b>{t.nombre}</b>
              <span className="fila-principal">
                <small>× {factorTexto(t.factor)}</small>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Pantalla>
  );
}

export function FormTamano({ id }: { id?: number }) {
  const tamanos = useLiveQuery(() => db.tamanos.toArray(), []);
  if (!tamanos) return null;
  const tamano = id !== undefined ? tamanos.find((t) => t.id === id) : undefined;
  if (id !== undefined && !tamano) return <NoEncontrado volver="mas/tamanos" />;
  const siguienteOrden = Math.max(0, ...tamanos.map((t) => t.orden)) + 1;
  return <EditorTamano inicial={tamano} siguienteOrden={siguienteOrden} />;
}

function EditorTamano({ inicial, siguienteOrden }: { inicial?: Tamano; siguienteOrden: number }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [factor, setFactor] = useState(inicial ? factorTexto(inicial.factor) : '');
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = leerNumero(factor);
    if (!nombre.trim()) return setError('Poné el nombre, por ejemplo "22 cm" o "2 kg".');
    if (n === null || n <= 0) return setError('El factor tiene que ser un número mayor a cero.');
    await guardarTamano({ nombre, factor: n, orden: inicial?.orden ?? siguienteOrden }, inicial?.id);
    ir('mas/tamanos');
  }

  async function borrar() {
    if (!inicial || !confirm(`¿Borrar el tamaño ${inicial.nombre}?`)) return;
    if (await eliminarTamano(inicial.id!)) ir('mas/tamanos');
    else setError('Es el único tamaño: sin tamaños no se puede armar ninguna torta.');
  }

  return (
    <Pantalla titulo={inicial ? 'Editar tamaño' : 'Nuevo tamaño'} volver="mas/tamanos">
      <form className="formulario" onSubmit={guardar} noValidate>
        <label className="campo" htmlFor="tamano-nombre">
          Nombre
          <input
            id="tamano-nombre"
            autoComplete="off"
            placeholder="Ej: 22 cm"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
        <label className="campo" htmlFor="tamano-factor">
          Factor
          <input
            id="tamano-factor"
            inputMode="decimal"
            placeholder="1,21"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
          />
        </label>
        <p className="ayuda">
          Para un molde redondo: (diámetro ÷ 20) × (diámetro ÷ 20). 22 cm → 1,21. 24 cm → 1,44.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="boton" type="submit">
          {inicial ? 'Guardar cambios' : 'Agregar tamaño'}
        </button>
        {inicial && (
          <button className="boton boton-peligro" type="button" onClick={borrar}>
            Borrar tamaño
          </button>
        )}
      </form>
    </Pantalla>
  );
}
