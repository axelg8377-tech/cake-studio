import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type FormEvent } from 'react';
import { Pantalla } from '../componentes/ui';
import { crearIngrediente, editarIngrediente, eliminarIngrediente } from '../datos/ingredientes';
import { db } from '../db';
import { leerNumero, leerPesos } from '../lib/formato';
import { ir } from '../lib/ruta';
import { aBase, desdeBase, NOMBRE_UNIDAD, UNIDADES_CARGA, unidadesDe, type UnidadCarga } from '../lib/unidades';
import { CATEGORIAS_INGREDIENTE } from '../tipos';

/** Alta (sin `id`) o edición. Al editar no se toca el precio: eso va por la ficha y deja historial. */
export default function FormIngrediente({ id }: { id?: number }) {
  const existente = useLiveQuery(async () => (id ? ((await db.ingredientes.get(id)) ?? null) : null), [id]);
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_INGREDIENTE[0]);
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [unidad, setUnidad] = useState<UnidadCarga>('kg');
  const [stock, setStock] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (!existente || cargado) return;
    const referencia = desdeBase(existente.stock ?? existente.cantidad, existente.unidad);
    setNombre(existente.nombre);
    setCategoria(existente.categoria);
    setUnidad(referencia.unidad);
    setStock(existente.stock !== undefined ? String(referencia.cantidad).replace('.', ',') : '');
    setNotas(existente.notas ?? '');
    setCargado(true);
  }, [existente, cargado]);

  const editando = id !== undefined;
  if (editando && existente === undefined) return null;
  if (editando && existente === null) {
    return (
      <Pantalla titulo="No encontrado" volver="ingredientes">
        <p className="vacio">Ese ingrediente ya no existe.</p>
      </Pantalla>
    );
  }

  const unidades = existente ? unidadesDe(existente.unidad) : UNIDADES_CARGA.map((u) => u.valor);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError('Poné el nombre del ingrediente.');

    let stockBase: number | undefined;
    if (stock.trim()) {
      const n = leerNumero(stock);
      if (n === null || n < 0) return setError('El stock tiene que ser un número.');
      stockBase = aBase(n, unidad).cantidad;
    }

    if (existente) {
      await editarIngrediente(existente.id!, {
        nombre: nombre.trim(),
        categoria,
        stock: stockBase,
        notas: notas.trim() || undefined,
      });
      return ir(`ingredientes/${existente.id}`);
    }

    const pagado = leerPesos(precio);
    const c = leerNumero(cantidad);
    if (!pagado) return setError('Poné cuánto pagaste.');
    if (!c || c <= 0) return setError('Poné la cantidad que compraste por ese precio.');
    const base = aBase(c, unidad);
    const nuevoId = await crearIngrediente({
      nombre: nombre.trim(),
      categoria,
      unidad: base.unidad,
      precio: pagado,
      cantidad: base.cantidad,
      stock: stockBase,
      notas: notas.trim() || undefined,
    });
    ir(`ingredientes/${nuevoId}`);
  }

  async function borrar() {
    if (!existente || !confirm(`¿Borrar ${existente.nombre}? También se borra su historial de precios.`)) return;
    const resultado = await eliminarIngrediente(existente.id!);
    if (resultado.ok) ir('ingredientes');
    else setError(`No se puede borrar: está en ${resultado.usadoEn.join(', ')}. Sacalo de esas recetas primero.`);
  }

  const selectorUnidad = (idCampo: string) => (
    <select id={idCampo} value={unidad} onChange={(e) => setUnidad(e.target.value as UnidadCarga)}>
      {unidades.map((u) => (
        <option key={u} value={u}>
          {NOMBRE_UNIDAD[u]}
        </option>
      ))}
    </select>
  );

  return (
    <Pantalla
      titulo={editando ? 'Editar ingrediente' : 'Nuevo ingrediente'}
      volver={editando ? `ingredientes/${id}` : 'ingredientes'}
    >
      <form className="formulario" onSubmit={guardar} noValidate>
        <label className="campo" htmlFor="ing-nombre">
          Nombre
          <input
            id="ing-nombre"
            autoComplete="off"
            placeholder="Ej: Dulce de leche repostero"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>

        <label className="campo" htmlFor="ing-categoria">
          Categoría
          <select id="ing-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS_INGREDIENTE.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        {!editando && (
          <>
            <label className="campo" htmlFor="ing-precio">
              Cuánto pagaste
              <input
                id="ing-precio"
                inputMode="numeric"
                placeholder="$ 5.500"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </label>
            <div className="fila-campos">
              <label className="campo" htmlFor="ing-cantidad">
                Por cuánto
                <input
                  id="ing-cantidad"
                  inputMode="decimal"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                />
              </label>
              <label className="campo" htmlFor="ing-unidad">
                Unidad
                {selectorUnidad('ing-unidad')}
              </label>
            </div>
            <p className="ayuda">Ej: $5.500 por 1 kilo. Huevos: $4.000 por 12 unidades.</p>
          </>
        )}

        {editando ? (
          <div className="fila-campos">
            <label className="campo" htmlFor="ing-stock">
              <span>
                Stock <small>opcional</small>
              </span>
              <input id="ing-stock" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} />
            </label>
            <label className="campo" htmlFor="ing-unidad-stock">
              Unidad
              {selectorUnidad('ing-unidad-stock')}
            </label>
          </div>
        ) : (
          <label className="campo" htmlFor="ing-stock">
            <span>
              Cuánto tenés <small>opcional, en {NOMBRE_UNIDAD[unidad]}</small>
            </span>
            <input id="ing-stock" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} />
          </label>
        )}

        <label className="campo" htmlFor="ing-notas">
          <span>
            Notas <small>opcional</small>
          </span>
          <textarea id="ing-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="boton" type="submit">
          {editando ? 'Guardar cambios' : 'Agregar ingrediente'}
        </button>
        {editando && (
          <button className="boton boton-peligro" type="button" onClick={borrar}>
            Borrar ingrediente
          </button>
        )}
      </form>
      {editando && <p className="vacio">El precio se cambia desde la ficha del ingrediente, así queda el historial.</p>}
    </Pantalla>
  );
}
