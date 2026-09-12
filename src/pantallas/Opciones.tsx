import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { NoEncontrado, Pantalla } from '../componentes/ui';
import { eliminarOpcion, guardarOpcion, leerCatalogo } from '../datos/catalogo';
import { costoOpcion, NOMBRE_TIPO, type Catalogo } from '../lib/costos';
import { leerNumero, leerPesos, pesos } from '../lib/formato';
import { ir } from '../lib/ruta';
import type { LineaReceta, Opcion, TipoOpcion } from '../tipos';

export const TIPOS = Object.keys(NOMBRE_TIPO) as TipoOpcion[];

const PLURAL: Record<TipoOpcion, string> = {
  masa: 'Masas',
  relleno: 'Rellenos',
  cobertura: 'Coberturas',
  decoracion: 'Decoración',
  extra: 'Extras',
};

const porNombre = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre);

export function Opciones() {
  const cat = useLiveQuery(() => leerCatalogo(), []);
  if (!cat) return null;

  const base = [...cat.tamanos.values()].find((t) => t.factor === 1);
  const opciones = [...cat.opciones.values()].sort(porNombre);

  return (
    <Pantalla
      titulo="Opciones"
      volver="mas"
      accion={
        <a className="boton boton-chico" href="#/mas/opciones/nuevo">
          Agregar
        </a>
      }
    >
      <p className="vacio">
        Costo de cada una para {base ? `el molde de ${base.nombre}` : 'la receta base'}. Al armar la torta se ajusta al
        tamaño elegido.
      </p>
      {opciones.length === 0 && <p className="vacio">Todavía no hay opciones. Tocá Agregar.</p>}
      {TIPOS.map((tipo) => {
        const deTipo = opciones.filter((o) => o.tipo === tipo);
        if (deTipo.length === 0) return null;
        return (
          <section key={tipo} className="grupo-lista">
            <h2>{PLURAL[tipo]}</h2>
            <ul className="lista">
              {deTipo.map((op) => (
                <li key={op.id}>
                  <a className="fila" href={`#/mas/opciones/${op.id}`}>
                    <span className="fila-principal">
                      <b>{op.nombre}</b>
                      <small>
                        {op.modo === 'receta'
                          ? `Receta · ${op.receta.length} ingrediente${op.receta.length === 1 ? '' : 's'}`
                          : 'Precio fijo'}
                      </small>
                    </span>
                    <b>{pesos(costoOpcion(op, 1, cat))}</b>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </Pantalla>
  );
}

export function FormOpcion({ id }: { id?: number }) {
  const cat = useLiveQuery(() => leerCatalogo(), []);
  if (!cat) return null;
  const opcion = id !== undefined ? cat.opciones.get(id) : undefined;
  if (id !== undefined && !opcion) return <NoEncontrado volver="mas/opciones" />;
  return <EditorOpcion inicial={opcion} cat={cat} />;
}

type Linea = { ingredienteId: string; cantidad: string };

function EditorOpcion({ inicial, cat }: { inicial?: Opcion; cat: Catalogo }) {
  const [tipo, setTipo] = useState<TipoOpcion>(inicial?.tipo ?? 'masa');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [modo, setModo] = useState<Opcion['modo']>(inicial?.modo ?? 'receta');
  const [precio, setPrecio] = useState(inicial?.precioFijo !== undefined ? String(inicial.precioFijo) : '');
  const [lineas, setLineas] = useState<Linea[]>(
    inicial?.receta.length
      ? inicial.receta.map((l) => ({ ingredienteId: String(l.ingredienteId), cantidad: String(l.cantidad).replace('.', ',') }))
      : [{ ingredienteId: '', cantidad: '' }],
  );
  const [gastos, setGastos] = useState<number[]>(inicial?.gastos ?? []);
  const [error, setError] = useState<string | null>(null);

  const ingredientes = [...cat.ingredientes.values()].sort(porNombre);
  // Los gastos "de cada torta" ya se suman solos: agregarlos acá los cobraría dos veces.
  const gastosElegibles = [...cat.gastos.values()].filter((g) => !g.porTorta || gastos.includes(g.id!)).sort(porNombre);

  const valida = (l: Linea) => l.ingredienteId !== '' && (leerNumero(l.cantidad) ?? 0) > 0;
  const receta: LineaReceta[] = lineas
    .filter(valida)
    .map((l) => ({ ingredienteId: Number(l.ingredienteId), cantidad: leerNumero(l.cantidad)! }));
  const borrador: Opcion = { tipo, nombre, modo, precioFijo: leerPesos(precio) ?? 0, receta, gastos };
  const costo = costoOpcion(borrador, 1, cat);

  const cambiarLinea = (i: number, cambio: Partial<Linea>) =>
    setLineas((prev) => prev.map((l, j) => (j === i ? { ...l, ...cambio } : l)));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError('Poné el nombre de la opción.');
    if (modo === 'receta') {
      if (lineas.some((l) => (l.ingredienteId !== '' || l.cantidad.trim() !== '') && !valida(l))) {
        return setError('Revisá la receta: cada ingrediente necesita una cantidad mayor a cero.');
      }
      if (receta.length === 0) return setError('Agregá al menos un ingrediente con su cantidad.');
    } else if (leerPesos(precio) === null && gastos.length === 0) {
      return setError('Poné el precio, o elegí un gasto que la opción arrastre.');
    }
    await guardarOpcion(borrador, inicial?.id);
    ir('mas/opciones');
  }

  async function borrar() {
    if (!inicial || !confirm(`¿Borrar ${inicial.nombre}? Las tortas ya guardadas no cambian.`)) return;
    await eliminarOpcion(inicial.id!);
    ir('mas/opciones');
  }

  return (
    <Pantalla titulo={inicial ? 'Editar opción' : 'Nueva opción'} volver="mas/opciones">
      <form className="formulario" onSubmit={guardar} noValidate>
        <div className="fila-campos">
          <label className="campo" htmlFor="op-tipo">
            Tipo
            <select id="op-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoOpcion)}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="campo" htmlFor="op-nombre">
            Nombre
            <input
              id="op-nombre"
              autoComplete="off"
              placeholder="Ej: Chocotorta"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
        </div>

        <div className="paso">
          <span className="rotulo">Cómo se calcula</span>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={modo === 'receta'} onClick={() => setModo('receta')}>
              Por receta
            </button>
            <button type="button" className="chip" aria-pressed={modo === 'fijo'} onClick={() => setModo('fijo')}>
              Precio fijo
            </button>
          </div>
        </div>

        {modo === 'receta' ? (
          <fieldset className="bloque">
            <legend className="sr">Receta</legend>
            <h2>Receta</h2>
            <p className="ayuda">Cantidades para el tamaño de factor 1. Al armar la torta se escalan solas.</p>
            {lineas.map((l, i) => {
              const ing = l.ingredienteId ? cat.ingredientes.get(Number(l.ingredienteId)) : undefined;
              return (
                <div key={i} className="linea-receta">
                  <label className="sr" htmlFor={`op-ing-${i}`}>
                    Ingrediente {i + 1}
                  </label>
                  <select
                    id={`op-ing-${i}`}
                    value={l.ingredienteId}
                    onChange={(e) => cambiarLinea(i, { ingredienteId: e.target.value })}
                  >
                    <option value="">Elegí…</option>
                    {ingredientes.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nombre}
                      </option>
                    ))}
                  </select>
                  <label className="sr" htmlFor={`op-cant-${i}`}>
                    Cantidad {i + 1}
                  </label>
                  <input
                    id={`op-cant-${i}`}
                    inputMode="decimal"
                    placeholder={ing?.unidad ?? 'cant.'}
                    value={l.cantidad}
                    onChange={(e) => cambiarLinea(i, { cantidad: e.target.value })}
                  />
                  <span className="unidad">{ing?.unidad ?? ''}</span>
                  <button
                    type="button"
                    className="boton-quitar"
                    aria-label={`Quitar ${ing?.nombre ?? 'ingrediente'}`}
                    onClick={() => setLineas((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => setLineas((prev) => [...prev, { ingredienteId: '', cantidad: '' }])}
            >
              Agregar ingrediente
            </button>
          </fieldset>
        ) : (
          <label className="campo" htmlFor="op-precio">
            Precio
            <input
              id="op-precio"
              inputMode="numeric"
              placeholder="$ 6.000"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </label>
        )}

        {gastosElegibles.length > 0 && (
          <fieldset className="paso">
            <legend className="rotulo">
              Gastos que suma <small>opcional</small>
            </legend>
            {gastosElegibles.map((g) => (
              <label key={g.id} className="check" htmlFor={`op-gasto-${g.id}`}>
                <input
                  id={`op-gasto-${g.id}`}
                  type="checkbox"
                  checked={gastos.includes(g.id!)}
                  onChange={(e) =>
                    setGastos((prev) => (e.target.checked ? [...prev, g.id!] : prev.filter((x) => x !== g.id)))
                  }
                />
                {g.nombre} · {pesos(g.precio)}
              </label>
            ))}
          </fieldset>
        )}

        <p className="costo-opcion">
          Costo: <b>{pesos(costo)}</b>
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="boton" type="submit">
          {inicial ? 'Guardar cambios' : 'Agregar opción'}
        </button>
        {inicial && (
          <button className="boton boton-peligro" type="button" onClick={borrar}>
            Borrar opción
          </button>
        )}
      </form>
    </Pantalla>
  );
}
