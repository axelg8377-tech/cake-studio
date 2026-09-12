import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Ayuda, Aviso, NoEncontrado, Pantalla } from '../componentes/ui';
import { eliminarTorta, guardarTorta, leerCatalogo } from '../datos/catalogo';
import { db } from '../db';
import { calcularTorta, costoIngrediente, costoOpcion, faltantesDeStock, type Catalogo } from '../lib/costos';
import { fechaCorta, leerNumero, leerPesos, pesos, pesosConSigno } from '../lib/formato';
import { ir } from '../lib/ruta';
import { mostrarCantidad } from '../lib/unidades';
import { CATEGORIAS_INGREDIENTE, type Config, type Opcion, type Seleccion, type TipoOpcion, type Torta } from '../tipos';

type Elegidos = Record<TipoOpcion, number[]>;
type Libre = { ingredienteId: number; cantidad: string };
type Modo = 'opciones' | 'ingredientes';

const NADA: Elegidos = { masa: [], relleno: [], cobertura: [], decoracion: [], extra: [] };

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

function elegidosDe(sel: Seleccion): Elegidos {
  const uno = (id?: number) => (id === undefined ? [] : [id]);
  return {
    masa: uno(sel.masaId),
    relleno: sel.rellenoIds,
    cobertura: uno(sel.coberturaId),
    decoracion: uno(sel.decoracionId),
    extra: sel.extraIds,
  };
}

function Armador({ cat, config, inicial }: { cat: Catalogo; config: Config | null; inicial?: Torta }) {
  const ultimas = useLiveQuery(() => db.tortas.orderBy('fecha').reverse().limit(10).toArray(), []);
  const margenDefecto = config?.margenDefecto ?? 50;
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [modo, setModo] = useState<Modo>(inicial?.seleccion.ingredientes?.length ? 'ingredientes' : 'opciones');
  const [tamanoId, setTamanoId] = useState<number | undefined>(inicial?.seleccion.tamanoId);
  const [elegidos, setElegidos] = useState<Elegidos>(inicial ? elegidosDe(inicial.seleccion) : NADA);
  const [libres, setLibres] = useState<Libre[]>(
    inicial?.seleccion.ingredientes?.map((l) => ({ ingredienteId: l.ingredienteId, cantidad: texto(l.cantidad) })) ?? [],
  );
  const [margen, setMargen] = useState(texto(inicial?.snapshot.margen ?? margenDefecto));
  const [precioFinal, setPrecioFinal] = useState(
    inicial && inicial.snapshot.precioFinal !== inicial.snapshot.precioSugerido ? String(inicial.snapshot.precioFinal) : '',
  );
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const tamanos = [...cat.tamanos.values()];
  const tamano = (tamanoId !== undefined && cat.tamanos.get(tamanoId)) || tamanos[0];
  if (!tamano) {
    return (
      <Pantalla titulo="Armar torta">
        <Aviso alerta>
          No hay tamaños cargados. <a href="#/mas/tamanos/nuevo">Cargá uno</a> para empezar.
        </Aviso>
      </Pantalla>
    );
  }

  // Si una opción o un ingrediente se borró desde otra pantalla, deja de contar sin romper nada.
  const vivos = (tipo: TipoOpcion) => elegidos[tipo].filter((x) => cat.opciones.has(x));
  const librosValidos = libres
    .filter((l) => cat.ingredientes.has(l.ingredienteId) && (leerNumero(l.cantidad) ?? 0) > 0)
    .map((l) => ({ ingredienteId: l.ingredienteId, cantidad: leerNumero(l.cantidad)! }));
  const porOpciones = modo === 'opciones';
  const sel: Seleccion = {
    tamanoId: tamano.id!,
    masaId: porOpciones ? vivos('masa')[0] : undefined,
    rellenoIds: porOpciones ? vivos('relleno') : [],
    coberturaId: porOpciones ? vivos('cobertura')[0] : undefined,
    decoracionId: porOpciones ? vivos('decoracion')[0] : undefined,
    extraIds: vivos('extra'),
    ingredientes: porOpciones ? undefined : librosValidos,
  };
  const margenNum = leerNumero(margen) ?? 0;
  const final = leerPesos(precioFinal) ?? undefined;
  const s = calcularTorta(sel, cat, margenNum, final);
  const faltantes = faltantesDeStock(sel, cat);
  const hayElegidas = porOpciones
    ? PASOS.some((p) => p.tipo !== 'extra' && vivos(p.tipo).length > 0)
    : librosValidos.length > 0;
  const pasosVisibles = porOpciones ? PASOS : PASOS.filter((p) => p.tipo === 'extra');

  function elegir(op: Opcion, varias: boolean) {
    setMensaje(null);
    setElegidos((prev) => {
      const actual = prev[op.tipo];
      const esta = actual.includes(op.id!);
      const nuevo = varias ? (esta ? actual.filter((i) => i !== op.id) : [...actual, op.id!]) : esta ? [] : [op.id!];
      return { ...prev, [op.tipo]: nuevo };
    });
  }

  function alternarIngrediente(ingredienteId: number) {
    setMensaje(null);
    setLibres((prev) =>
      prev.some((l) => l.ingredienteId === ingredienteId)
        ? prev.filter((l) => l.ingredienteId !== ingredienteId)
        : [...prev, { ingredienteId, cantidad: '' }],
    );
  }

  async function guardar(estado: Torta['estado'], comoNueva = false) {
    setError(null);
    setMensaje(null);
    if (!hayElegidas) {
      return setError(
        porOpciones ? 'Elegí al menos una masa, un relleno o una cobertura.' : 'Tocá al menos un ingrediente y escribí cuánto lleva.',
      );
    }
    const primeraVezHecha = estado === 'realizada' && (comoNueva || inicial?.estado !== 'realizada');
    if (primeraVezHecha && !confirm('Se descuenta del stock lo que lleva esta torta. ¿Marcarla como hecha?')) return;
    setGuardando(true);
    try {
      const datos = { nombre: comoNueva ? `${nombre.trim() || 'Torta'} (copia)` : nombre, seleccion: sel, margen: margenNum, precioFinal: final, estado };
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
      setElegidos(NADA);
      setLibres([]);
      setPrecioFinal('');
    } catch {
      setError('No se pudo guardar. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!inicial) return;
    const aviso = inicial.estado === 'realizada' ? ' El stock que se descontó no vuelve.' : '';
    if (!confirm(`¿Borrar ${inicial.nombre}?${aviso}`)) return;
    await eliminarTorta(inicial.id!);
    ir('tortas');
  }

  const ingredientes = [...cat.ingredientes.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const categorias = [
    ...CATEGORIAS_INGREDIENTE,
    ...new Set(ingredientes.map((i) => i.categoria).filter((c) => !(CATEGORIAS_INGREDIENTE as readonly string[]).includes(c))),
  ];

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
        <Ayuda id="tortas">
          <p>Hay dos formas de armar una torta:</p>
          <ul>
            <li>
              <b>Elegir opciones:</b> masas, rellenos y coberturas que ya tienen su receta (se cargan en Más › Opciones).
              El costo se ajusta solo al tamaño.
            </li>
            <li>
              <b>Elegir ingredientes:</b> tocás lo que lleva y escribís cuánto. Sirve para una torta distinta, sin cargar
              nada antes.
            </li>
          </ul>
          <p>
            Abajo ves siempre el <b>costo</b>, la <b>ganancia</b> y el <b>precio</b>. "Ganancia sobre el costo" 50% quiere
            decir que cobrás el costo más la mitad. La base de cartón y el gas se suman solos (Más › Gastos).
          </p>
          <p>
            <b>Guardar borrador</b> no toca nada. <b>Ya la hice</b> descuenta del stock lo que usó. Las tortas guardadas
            aparecen abajo: tocá una para abrirla y cambiarla.
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

      <section className="paso">
        <h2 className="rotulo">Cómo la armás</h2>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={porOpciones} onClick={() => setModo('opciones')}>
            Elegir opciones
          </button>
          <button type="button" className="chip" aria-pressed={!porOpciones} onClick={() => setModo('ingredientes')}>
            Elegir ingredientes
          </button>
        </div>
      </section>

      <section className="paso">
        <h2 className="rotulo">Tamaño</h2>
        <div className="chips">
          {tamanos.map((t) => (
            <button
              key={t.id}
              type="button"
              className="chip"
              aria-pressed={t.id === tamano.id}
              onClick={() => setTamanoId(t.id)}
            >
              {t.nombre}
            </button>
          ))}
        </div>
        {!porOpciones && <p className="ayuda">Con ingredientes, el tamaño queda anotado; las cantidades son las que escribas.</p>}
      </section>

      {!porOpciones && (
        <section className="paso">
          <h2 className="rotulo">
            Ingredientes <small>· tocá los que lleva</small>
          </h2>
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
                      aria-pressed={libres.some((l) => l.ingredienteId === ing.id)}
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
        </section>
      )}

      {!porOpciones && libres.length > 0 && (
        <section className="bloque">
          <h2>Cuánto lleva</h2>
          {libres.map((l, i) => {
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
                    autoFocus={!inicial && i === libres.length - 1}
                    value={l.cantidad}
                    onChange={(e) =>
                      setLibres((prev) =>
                        prev.map((x) => (x.ingredienteId === l.ingredienteId ? { ...x, cantidad: e.target.value } : x)),
                      )
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
          <p className="ayuda">En gramos (g), mililitros (ml) o unidades (u). 4 huevos = 4.</p>
        </section>
      )}

      {pasosVisibles.map(({ tipo, titulo, varias }) => {
        const opciones = [...cat.opciones.values()]
          .filter((o) => o.tipo === tipo)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        const marcadas = vivos(tipo);
        return (
          <section key={tipo} className="paso">
            <h2 className="rotulo">
              {titulo}
              {varias && <small> · una o varias</small>}
            </h2>
            {opciones.length === 0 ? (
              <p className="vacio">
                Todavía no hay opciones de este tipo. <a href="#/mas/opciones/nuevo">Agregar</a>
              </p>
            ) : (
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
              </div>
            )}
          </section>
        );
      })}

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
                    <b>Total ({tamano.nombre})</b>
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
