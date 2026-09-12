import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { Ayuda, claseCambio, Pantalla } from '../componentes/ui';
import { actualizarPrecio } from '../datos/ingredientes';
import { db } from '../db';
import { variacion } from '../lib/costos';
import { fechaCorta, leerNumero, leerPesos, pesos, pesosConSigno, porcentaje } from '../lib/formato';
import { aBase, desdeBase, mostrarCantidad, NOMBRE_UNIDAD, unidadesDe, type UnidadCarga } from '../lib/unidades';

export default function FichaIngrediente({ id }: { id: number }) {
  // undefined = cargando, null = no existe.
  const ing = useLiveQuery(async () => (await db.ingredientes.get(id)) ?? null, [id]);
  const historial = useLiveQuery(() => db.preciosHistorial.where('ingredienteId').equals(id).toArray(), [id]);
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState<UnidadCarga | ''>('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (ing === undefined || historial === undefined) return null;
  if (ing === null) {
    return (
      <Pantalla titulo="No encontrado" volver="ingredientes">
        <p className="vacio">Ese ingrediente ya no existe.</p>
      </Pantalla>
    );
  }

  const cambios = [...historial].sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.id ?? 0) - (a.id ?? 0));
  const ultimo = cambios[0];
  const cambio = ultimo && variacion(ultimo.precioAnterior, ultimo.precioNuevo);
  const presentacion = desdeBase(ing.cantidad, ing.unidad);
  const unidadElegida = unidad || presentacion.unidad;

  async function guardarPrecio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    if (!ing) return;
    const nuevo = leerPesos(precio);
    if (!nuevo) return setError('Escribí el precio nuevo.');
    let cantidadBase: number | undefined;
    if (cantidad.trim()) {
      const c = leerNumero(cantidad);
      if (!c || c <= 0) return setError('La cantidad tiene que ser un número mayor a cero.');
      cantidadBase = aBase(c, unidadElegida).cantidad;
    }
    const anterior = (ing.precio * (cantidadBase ?? ing.cantidad)) / ing.cantidad;
    await actualizarPrecio(id, nuevo, cantidadBase);
    const v = variacion(anterior, nuevo);
    setMensaje(
      Math.round(v.abs) === 0
        ? 'Guardado. El precio quedó igual.'
        : `Guardado: ${v.abs > 0 ? 'subió' : 'bajó'} ${pesosConSigno(Math.abs(v.abs)).replace('+', '')}` +
            (v.pct !== null ? ` (${porcentaje(v.pct)})` : '') +
            '.',
    );
    setPrecio('');
    setCantidad('');
    setUnidad('');
  }

  return (
    <Pantalla
      titulo={ing.nombre}
      volver="ingredientes"
      accion={
        <a className="boton boton-chico boton-secundario" href={`#/ingredientes/${id}/editar`}>
          Editar
        </a>
      }
    >
      <Ayuda id="ficha-ingrediente">
        <ul>
          <li>
            <b>Precio nuevo:</b> lo que pagaste ahora. <b>Por cuánto</b> solo si cambió el paquete (antes 1 kg, ahora
            500 g): la app compara a igual cantidad.
          </li>
          <li>El historial de abajo guarda cada cambio con su fecha.</li>
          <li>
            Con <b>Editar</b> cambiás nombre, categoría y stock. El stock es opcional: si lo cargás, la app avisa cuando
            no alcanza para una torta.
          </li>
        </ul>
      </Ayuda>

      <div className="cifras">
        <div className="cifra principal">
          <span>Precio actual</span>
          <b>{pesos(ing.precio)}</b>
          <small>por {mostrarCantidad(ing.cantidad, ing.unidad)}</small>
        </div>
        <div className="cifra">
          <span>Precio anterior</span>
          <b>{ultimo ? pesos(ultimo.precioAnterior) : '—'}</b>
          <small>{ultimo ? fechaCorta(ultimo.fecha) : 'sin cambios todavía'}</small>
        </div>
        <div className="cifra">
          <span>Variación</span>
          <b className={claseCambio(cambio?.abs)}>{cambio ? pesosConSigno(cambio.abs) : '—'}</b>
        </div>
        <div className="cifra">
          <span>Variación %</span>
          <b className={claseCambio(cambio?.abs)}>{cambio?.pct != null ? porcentaje(cambio.pct) : '—'}</b>
        </div>
      </div>

      {ing.stock !== undefined && <p className="vacio">Stock: {mostrarCantidad(ing.stock, ing.unidad)}</p>}

      <form className="bloque formulario" onSubmit={guardarPrecio} noValidate>
        <h2>Actualizar precio</h2>
        <label className="campo" htmlFor="precio-nuevo">
          Precio nuevo
          <input
            id="precio-nuevo"
            inputMode="numeric"
            placeholder={pesos(ing.precio)}
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </label>
        <div className="fila-campos">
          <label className="campo" htmlFor="precio-cantidad">
            <span>
              Por cuánto <small>solo si cambió</small>
            </span>
            <input
              id="precio-cantidad"
              inputMode="decimal"
              placeholder={String(presentacion.cantidad).replace('.', ',')}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </label>
          <label className="campo" htmlFor="precio-unidad">
            Unidad
            <select id="precio-unidad" value={unidadElegida} onChange={(e) => setUnidad(e.target.value as UnidadCarga)}>
              {unidadesDe(ing.unidad).map((u) => (
                <option key={u} value={u}>
                  {NOMBRE_UNIDAD[u]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {mensaje && (
          <p className="ok" role="status">
            {mensaje}
          </p>
        )}
        <button className="boton" type="submit">
          Guardar precio
        </button>
      </form>

      <section className="bloque">
        <h2>Historial</h2>
        {cambios.length === 0 ? (
          <p className="vacio">Cada vez que actualices el precio, el cambio queda anotado acá.</p>
        ) : (
          <div className="tabla-caja">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="num">Antes</th>
                  <th className="num">Después</th>
                  <th className="num">Cambio</th>
                </tr>
              </thead>
              <tbody>
                {cambios.map((h) => {
                  const v = variacion(h.precioAnterior, h.precioNuevo);
                  return (
                    <tr key={h.id}>
                      <td>{fechaCorta(h.fecha)}</td>
                      <td className="num">{pesos(h.precioAnterior)}</td>
                      <td className="num">{pesos(h.precioNuevo)}</td>
                      <td className="num">{v.pct !== null ? porcentaje(v.pct) : pesosConSigno(v.abs)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {ing.notas && <p className="vacio">{ing.notas}</p>}
    </Pantalla>
  );
}
