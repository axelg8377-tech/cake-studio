import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { confirmar } from '../componentes/confirmar';
import { Ayuda, Aviso, NoEncontrado, Pantalla } from '../componentes/ui';
import { eliminarTorta, guardarTorta, leerCatalogo } from '../datos/catalogo';
import { db } from '../db';
import { calcularTorta, costoIngrediente, costoOpcion, faltantesDeStock, pisosDe, type Catalogo } from '../lib/costos';
import { fechaCorta, leerNumero, leerPesos, pesos, pesosConSigno } from '../lib/formato';
import { ir } from '../lib/ruta';
import { mostrarCantidad } from '../lib/unidades';
import { CATEGORIAS_INGREDIENTE, type Config, type Opcion, type Seleccion, type Tamano, type TipoOpcion, type Torta } from '../tipos';

type Elegidos = Record<TipoOpcion, number[]>;
type Libre = { ingredienteId: number; cantidad: string };
/** Lo que se está armando en un piso. El piso 1 es el de abajo. */
type Piso = { tamanoId?: number; elegidos: Elegidos; libres: Libre[] };

const NADA: Elegidos = { masa: [], relleno: [], cobertura: [], decoracion: [], extra: [] };
const PISO_VACIO: Piso = { elegidos: NADA, libres: [] };

const PASOS: { tipo: TipoOpcion; titulo: string; varias: boolean }[] = [
  { tipo: 'masa', titulo: 'Masa', varias: false },
  { tipo: 'relleno', titulo: 'Rellenos', varias: true },
  { tipo: 'cobertura', titulo: 'Cobertura', varias: false },
  { tipo: 'decoracion', titulo: 'Decoración', varias: false },
  { tipo: 'extra', titulo: 'Extras', varias: true },
];

const texto = (n: number) => String(n).replace('.', ',');

/** Sin `id` arma una torta nueva; con `id` abre una guardada para editarla. */
export default function Constructor({ id }: { id?: number }) {
  const cat = useLiveQuery(() => leerCatalogo(), []);
  const config = useLiveQuery(async () => (await db.config.get('unica')) ?? null, []);
  const torta = useLiveQuery(async () => (id ? ((await db.tortas.get(id)) ?? null) : null), [id]);
  if (!cat || config === undefined || torta === undefined) return null;
  if (id !== undefined && torta === null) return <NoEncontrado volver="tortas" />;
  return <Armador cat={cat} config={config} inicial={torta ?? undefined} />;
}

function pisoDe(sel: Seleccion): Piso {
  const uno = (id?: number) => (id === undefined ? [] : [id]);
  return {
    tamanoId: sel.tamanoId,
    elegidos: {
      masa: uno(sel.masaId),
      relleno: sel.rellenoIds,
      cobertura: uno(sel.coberturaId),
      decoracion: uno(sel.decoracionId),
      extra: sel.extraIds,
    },
    libres: sel.ingredientes?.map((l) => ({ ingredienteId: l.ingredienteId, cantidad: texto(l.cantidad) })) ?? [],
  };
}

function Armador({ cat, config, inicial }: { cat: Catalogo; config: Config | null; inicial?: Torta }) {
  const ultimas = useLiveQuery(() => db.tortas.orderBy('fecha').reverse().limit(10).toArray(), []);
  const clientes = useLiveQuery(() => db.clientes.orderBy('nombre').toArray(), []);
  const margenDefecto = config?.margenDefecto ?? 50;
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [clienteId, setClienteId] = useState<number | undefined>(inicial?.clienteId);
  const [pisos, setPisos] = useState<Piso[]>(inicial ? pisosDe(inicial.seleccion).map(pisoDe) : [PISO_VACIO]);
  const [activo, setActivo] = useState(0);
  const [margen, setMargen] = useState(texto(inicial?.snapshot.margen ?? margenDefecto));
  const [precioFinal, setPrecioFinal] = useState(
    inicial && inicial.snapshot.precioFinal !== inicial.snapshot.precioSugerido ? String(inicial.snapshot.precioFinal) : '',
  );
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const tamanos = [...cat.tamanos.values()];
  if (tamanos.length === 0) {
    return (
      <Pantalla titulo="Armar torta">
        <Aviso alerta>
          No hay tamaños cargados. <a href="#/mas/tamanos/nuevo">Cargá uno</a> para empezar.
        </Aviso>
      </Pantalla>
    );
  }

  const tamanoDe = (p: Piso): Tamano => (p.tamanoId !== undefined && cat.tamanos.get(p.tamanoId)) || tamanos[0];
  // Si una opción o un ingrediente se borró desde otra pantalla, deja de contar sin romper nada.
  const vivos = (p: Piso, tipo: TipoOpcion) => p.elegidos[tipo].filter((x) => cat.opciones.has(x));
  const validos = (p: Piso) =>
    p.libres
      .filter((l) => cat.ingredientes.has(l.ingredienteId) && (leerNumero(l.cantidad) ?? 0) > 0)
      .map((l) => ({ ingredienteId: l.ingredienteId, cantidad: leerNumero(l.cantidad)! }));
  const seleccionDe = (p: Piso): Seleccion => {
    const ingredientes = validos(p);
    return {
      tamanoId: tamanoDe(p).id!,
      masaId: vivos(p, 'masa')[0],
      rellenoIds: vivos(p, 'relleno'),
      coberturaId: vivos(p, 'cobertura')[0],
      decoracionId: vivos(p, 'decoracion')[0],
      extraIds: vivos(p, 'extra'),
      ingredientes: ingredientes.length > 0 ? ingredientes : undefined,
    };
  };
  const [abajo, ...arriba] = pisos.map(seleccionDe);
  const sel: Seleccion = { ...abajo, pisos: arriba.length > 0 ? arriba : undefined };

  const piso = pisos[Math.min(activo, pisos.length - 1)];
  const tamano = tamanoDe(piso);
  const margenNum = leerNumero(margen) ?? 0;
  const final = leerPesos(precioFinal) ?? undefined;
  const s = calcularTorta(sel, cat, margenNum, final);
  const faltantes = faltantesDeStock(sel, cat);
  const hayElegidas = pisos.some(
    (p) => PASOS.some((paso) => paso.tipo !== 'extra' && vivos(p, paso.tipo).length > 0) || validos(p).length > 0,
  );

  function cambiarPiso(cambio: (p: Piso) => Piso) {
    setMensaje(null);
    setPisos((prev) => prev.map((p, i) => (i === Math.min(activo, prev.length - 1) ? cambio(p) : p)));
  }

  function elegir(op: Opcion, varias: boolean) {
    cambiarPiso((p) => {
      const actual = p.elegidos[op.tipo];
      const esta = actual.includes(op.id!);
      const nuevo = varias ? (esta ? actual.filter((i) => i !== op.id) : [...actual, op.id!]) : esta ? [] : [op.id!];
      return { ...p, elegidos: { ...p.elegidos, [op.tipo]: nuevo } };
    });
  }

  function alternarIngrediente(ingredienteId: number) {
    cambiarPiso((p) => ({
      ...p,
      libres: p.libres.some((l) => l.ingredienteId === ingredienteId)
        ? p.libres.filter((l) => l.ingredienteId !== ingredienteId)
        : [...p.libres, { ingredienteId, cantidad: '' }],
    }));
  }

  function agregarPiso() {
    // El piso nuevo arranca un tamaño más chico que el de abajo, que es lo más común.
    const i = tamanos.findIndex((t) => t.id === tamanoDe(pisos[pisos.length - 1]).id);
    const tamanoId = tamanos[Math.max(0, i - 1)].id;
    setPisos((prev) => [...prev, { ...PISO_VACIO, tamanoId }]);
    setActivo(pisos.length);
    setMensaje(null);
  }

  async function quitarPiso() {
    if (pisos.length < 2) return;
    const ok = await confirmar({
      titulo: `¿Quitar el piso ${activo + 1}?`,
      mensaje: 'Se pierde lo que elegiste en ese piso.',
      aceptar: 'Quitar piso',
      peligro: true,
    });
    if (!ok) return;
    setPisos((prev) => prev.filter((_, i) => i !== activo));
    setActivo(Math.max(0, activo - 1));
  }

  async function guardar(estado: Torta['estado'], comoNueva = false) {
    setError(null);
    setMensaje(null);
    if (!hayElegidas) return setError('Elegí al menos una masa, un relleno, una cobertura o un ingrediente con su cantidad.');
    const primeraVezHecha = estado === 'realizada' && (comoNueva || inicial?.estado !== 'realizada');
    if (
      primeraVezHecha &&
      !(await confirmar({
        titulo: '¿Marcarla como hecha?',
        mensaje: 'Se descuenta del stock lo que lleva esta torta.',
        aceptar: 'Sí, la hice',
      }))
    )
      return;
    setGuardando(true);
    try {
      const datos = {
        nombre: comoNueva ? `${nombre.trim() || 'Torta'} (copia)` : nombre,
        seleccion: sel,
        margen: margenNum,
        precioFinal: final,
        estado,
        clienteId,
      };
      const guardadaId = await guardarTorta(datos, comoNueva ? undefined : inicial?.id);
      if (comoNueva) return ir(`tortas/${guardadaId}`);
      if (inicial) {
        setMensaje(estado === 'realizada' && inicial.estado !== 'realizada' ? 'Marcada como hecha.' : 'Cambios guardados.');
        return;
      }
      setMensaje(
        `Guardada ${estado === 'realizada' ? 'como hecha' : 'como borrador'}: ${nombre.trim() || 'Torta sin nombre'}, ${pesos(s.precioFinal)}.`,
      );
      setNombre('');
      setClienteId(undefined);
      setPisos([PISO_VACIO]);
      setActivo(0);
      setPrecioFinal('');
    } catch {
      setError('No se pudo guardar. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!inicial) return;
    const ok = await confirmar({
      titulo: `¿Borrar ${inicial.nombre}?`,
      mensaje: inicial.estado === 'realizada' ? 'El stock que se descontó no vuelve.' : undefined,
      aceptar: 'Borrar',
      peligro: true,
    });
    if (!ok) return;
    await eliminarTorta(inicial.id!);
    ir('tortas');
  }

  const ingredientes = [...cat.ingredientes.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const categorias = [
    ...CATEGORIAS_INGREDIENTE,
    ...new Set(ingredientes.map((i) => i.categoria).filter((c) => !(CATEGORIAS_INGREDIENTE as readonly string[]).includes(c))),
  ];
  const variosPisos = pisos.length > 1;
  const nombrePiso = variosPisos ? ` · piso ${activo + 1}` : '';

  return (
    <Pantalla
      titulo={inicial ? 'Editar torta' : 'Armar torta'}
      volver={inicial ? 'tortas' : undefined}
      accion={
        inicial && (
          <a className="boton boton-chico boton-secundario" href="#/tortas">
            Nueva
          </a>
        )
      }
    >
      {!inicial && (
        <Ayuda id="tortas-v2">
          <p>
            Tocá la <b>masa</b>, los <b>rellenos</b> y la <b>cobertura</b>. Son las opciones con receta de Más › Opciones: el
            costo se ajusta solo al tamaño.
          </p>
          <p>
            Si lleva algo que no está en las opciones, abrí <b>Ingredientes sueltos</b> y escribí cuánto usás. Eso se suma tal
            cual, sin ajustar por tamaño.
          </p>
          <p>
            ¿Es de <b>varios pisos</b>? Tocá <b>+ Agregar piso</b>: cada piso tiene su tamaño y lo suyo. El piso 1 es el de
            abajo.
          </p>
          <p>
            Abajo ves siempre el <b>costo</b>, la <b>ganancia</b> y el <b>precio</b>. <b>Guardar borrador</b> no toca nada.{' '}
            <b>Ya la hice</b> descuenta del stock lo que usó.
          </p>
        </Ayuda>
      )}

      {inicial && (
        <p className="vacio">
          Guardada el {fechaCorta(inicial.fecha)} · {inicial.estado === 'realizada' ? 'hecha' : 'borrador'}. El costo se
          recalcula con los precios de hoy.
        </p>
      )}

      <label className="campo" htmlFor="torta-nombre">
        <span>
          Nombre o para quién <small>opcional</small>
        </span>
        <input
          id="torta-nombre"
          autoComplete="off"
          placeholder="Ej: Cumple de Martina"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </label>

      <label className="campo" htmlFor="torta-cliente">
        <span>
          Cliente <small>opcional</small>
        </span>
        <select
          id="torta-cliente"
          value={clienteId ?? ''}
          onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Sin cliente</option>
          {clientes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      {clientes?.length === 0 && (
        <p className="ayuda">
          Los clientes se cargan en <a href="#/mas/clientes/nuevo">Más › Clientes</a>.
        </p>
      )}

      <section className="paso">
        <h2 className="rotulo">Pisos</h2>
        <div className="chips">
          {pisos.map((p, i) => (
            <button key={i} type="button" className="chip" aria-pressed={i === activo} onClick={() => setActivo(i)}>
              <span>Piso {i + 1}</span>
              <small>{tamanoDe(p).nombre}</small>
            </button>
          ))}
          <button type="button" className="chip chip-agregar" onClick={agregarPiso}>
            + Agregar piso
          </button>
        </div>
        {variosPisos && (
          <p className="ayuda">
            Estás armando el <b>piso {activo + 1}</b>
            {activo === 0 ? ' (el de abajo)' : ''}.{' '}
            <button type="button" className="enlace" onClick={quitarPiso}>
              Quitar este piso
            </button>
          </p>
        )}
      </section>

      <section className="paso">
        <h2 className="rotulo">Tamaño{nombrePiso}</h2>
        <div className="chips">
          {tamanos.map((t) => (
            <button
              key={t.id}
              type="button"
              className="chip"
              aria-pressed={t.id === tamano.id}
              onClick={() => cambiarPiso((p) => ({ ...p, tamanoId: t.id }))}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      </section>

      {PASOS.map(({ tipo, titulo, varias }) => {
        const opciones = [...cat.opciones.values()]
          .filter((o) => o.tipo === tipo)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        const marcadas = vivos(piso, tipo);
        return (
          <section key={tipo} className="paso">
            <h2 className="rotulo">
              {titulo}
              {varias && <small> · una o varias</small>}
            </h2>
            <div className="chips">
              {opciones.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  className="chip"
                  aria-pressed={marcadas.includes(op.id!)}
                  onClick={() => elegir(op, varias)}
                >
                  <span>{op.nombre}</span>
                  <small>{pesos(costoOpcion(op, tamano.factor, cat))}</small>
                </button>
              ))}
              <a className="chip chip-agregar" href={`#/mas/opciones/nuevo`}>
                + Nueva
              </a>
            </div>
          </section>
        );
      })}

      <details className="bloque" open={piso.libres.length > 0}>
        <summary>
          <b>Ingredientes sueltos{nombrePiso}</b>
          {piso.libres.length > 0 && <small> · {piso.libres.length} elegidos</small>}
        </summary>
        <p className="ayuda">
          Para lo que no está en las opciones de arriba. Tocá el ingrediente y escribí cuánto lleva: se suma tal cual, sin
          ajustar por tamaño. Si lo vas a usar seguido, conviene crear una opción con esa receta.
        </p>
        {ingredientes.length === 0 && (
          <p className="vacio">
            Todavía no hay ingredientes. <a href="#/ingredientes/nuevo">Agregar</a>
          </p>
        )}
        {categorias.map((categoria) => {
          const deCategoria = ingredientes.filter((i) => i.categoria === categoria);
          if (deCategoria.length === 0) return null;
          return (
            <div key={categoria} className="paso">
              <span className="subrotulo">{categoria}</span>
              <div className="chips">
                {deCategoria.map((ing) => (
                  <button
                    key={ing.id}
                    type="button"
                    className="chip"
                    aria-pressed={piso.libres.some((l) => l.ingredienteId === ing.id)}
                    onClick={() => alternarIngrediente(ing.id!)}
                  >
                    <span>{ing.nombre}</span>
                    <small>
                      {pesos(ing.precio)} / {mostrarCantidad(ing.cantidad, ing.unidad)}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {piso.libres.map((l, i) => {
          const ing = cat.ingredientes.get(l.ingredienteId);
          if (!ing) return null;
          const n = leerNumero(l.cantidad);
          return (
            <div key={l.ingredienteId} className="linea-libre">
              <div className="linea-libre-cab">
                <label htmlFor={`libre-${l.ingredienteId}`}>{ing.nombre}</label>
                <span>{pesos(n && n > 0 ? costoIngrediente(ing, n) : 0)}</span>
              </div>
              <div className="linea-libre-campos">
                <input
                  id={`libre-${l.ingredienteId}`}
                  inputMode="decimal"
                  placeholder="Cantidad"
                  autoFocus={!inicial && i === piso.libres.length - 1 && l.cantidad === ''}
                  value={l.cantidad}
                  onChange={(e) =>
                    cambiarPiso((p) => ({
                      ...p,
                      libres: p.libres.map((x) => (x.ingredienteId === l.ingredienteId ? { ...x, cantidad: e.target.value } : x)),
                    }))
                  }
                />
                <span className="unidad">{ing.unidad}</span>
                <button
                  type="button"
                  className="boton-quitar"
                  aria-label={`Quitar ${ing.nombre}`}
                  onClick={() => alternarIngrediente(ing.id!)}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
        {piso.libres.length > 0 && <p className="ayuda">En gramos (g), mililitros (ml) o unidades (u). 4 huevos = 4.</p>}
      </details>

      {faltantes.length > 0 && (
        <Aviso alerta>
          No alcanza el stock de{' '}
          {faltantes
            .map((f) => `${f.nombre} (faltan ${mostrarCantidad(f.necesita - f.hay, cat.ingredientes.get(f.ingredienteId)!.unidad)})`)
            .join(', ')}
          . Podés guardarla igual.
        </Aviso>
      )}

      <section className="bloque formulario">
        <h2>Precio</h2>
        <div className="fila-campos">
          <label className="campo" htmlFor="torta-margen">
            Ganancia sobre el costo (%)
            <input id="torta-margen" inputMode="decimal" value={margen} onChange={(e) => setMargen(e.target.value)} />
          </label>
          <label className="campo" htmlFor="torta-final">
            <span>
              Precio final <small>opcional</small>
            </span>
            <input
              id="torta-final"
              inputMode="numeric"
              placeholder={pesos(s.precioSugerido)}
              value={precioFinal}
              onChange={(e) => setPrecioFinal(e.target.value)}
            />
          </label>
        </div>
        <p className="ayuda">
          Precio sugerido: <b>{pesos(s.precioSugerido)}</b>, redondeado de a $100. Si cobrás otro, escribilo.
        </p>
        <details>
          <summary>De qué sale el costo</summary>
          <div className="tabla-caja">
            <table>
              <tbody>
                {s.lineas.map((l, i) => (
                  <tr key={i}>
                    <td>{l.concepto}</td>
                    <td className="num">{pesos(l.costo)}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <b>Total ({variosPisos ? `${pisos.length} pisos` : tamano.nombre})</b>
                  </td>
                  <td className="num">
                    <b>{pesos(s.costo)}</b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </section>

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

      {inicial ? (
        <>
          <div className="accesos">
            <button
              className={inicial.estado === 'realizada' ? 'boton' : 'boton boton-secundario'}
              type="button"
              disabled={guardando}
              onClick={() => guardar(inicial.estado)}
            >
              Guardar cambios
            </button>
            {inicial.estado === 'borrador' ? (
              <button className="boton" type="button" disabled={guardando} onClick={() => guardar('realizada')}>
                Ya la hice
              </button>
            ) : (
              <button className="boton boton-secundario" type="button" disabled={guardando} onClick={() => guardar('borrador', true)}>
                Hacer otra igual
              </button>
            )}
          </div>
          {inicial.estado === 'borrador' && (
            <button className="boton boton-secundario" type="button" disabled={guardando} onClick={() => guardar('borrador', true)}>
              Guardar como torta nueva
            </button>
          )}
          <a className="boton boton-secundario" href={`#/flyer/${inicial.id}`}>
            Hacer flyer
          </a>
          <button className="boton boton-peligro" type="button" onClick={borrar}>
            Borrar torta
          </button>
        </>
      ) : (
        <div className="accesos">
          <button className="boton boton-secundario" type="button" disabled={guardando} onClick={() => guardar('borrador')}>
            Guardar borrador
          </button>
          <button className="boton" type="button" disabled={guardando} onClick={() => guardar('realizada')}>
            Ya la hice
          </button>
        </div>
      )}

      {ultimas && ultimas.length > 0 && (
        <section className="grupo-lista">
          <h2>Tortas guardadas</h2>
          <ul className="lista">
            {ultimas.map((t) => (
              <li key={t.id}>
                <a className="fila" href={`#/tortas/${t.id}`} aria-current={t.id === inicial?.id ? 'page' : undefined}>
                  <span className="fila-principal">
                    <b>{t.nombre}</b>
                    <small>
                      {fechaCorta(t.fecha)} · {t.estado === 'realizada' ? 'hecha' : 'borrador'}
                      {t.seleccion.pisos?.length ? ` · ${t.seleccion.pisos.length + 1} pisos` : ''}
                    </small>
                  </span>
                  <b>{pesos(t.snapshot.precioFinal)}</b>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="resumen" aria-live="polite">
        <div>
          <span>Costo</span>
          <b className="c-costo">{pesos(s.costo)}</b>
        </div>
        <div>
          <span>Ganancia</span>
          <b className={s.ganancia < 0 ? 'c-perdida' : 'c-ganancia'}>
            {s.ganancia < 0 ? pesosConSigno(s.ganancia) : pesos(s.ganancia)}
          </b>
          {s.costo > 0 && <small>{Math.round((s.ganancia / s.costo) * 100)}% del costo</small>}
        </div>
        <div>
          <span>Precio</span>
          <b className="c-precio">{pesos(s.precioFinal)}</b>
        </div>
      </div>
    </Pantalla>
  );
}
