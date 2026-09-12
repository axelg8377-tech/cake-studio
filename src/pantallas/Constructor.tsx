import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Aviso, Pantalla } from '../componentes/ui';
import { guardarTorta, leerCatalogo } from '../datos/catalogo';
import { db } from '../db';
import { calcularTorta, costoOpcion, faltantesDeStock } from '../lib/costos';
import { fechaCorta, leerNumero, leerPesos, pesos, pesosConSigno } from '../lib/formato';
import { mostrarCantidad } from '../lib/unidades';
import type { Opcion, Seleccion, TipoOpcion } from '../tipos';

type Elegidos = Record<TipoOpcion, number[]>;

const NADA: Elegidos = { masa: [], relleno: [], cobertura: [], decoracion: [], extra: [] };

const PASOS: { tipo: TipoOpcion; titulo: string; varias: boolean }[] = [
  { tipo: 'masa', titulo: 'Masa', varias: false },
  { tipo: 'relleno', titulo: 'Rellenos', varias: true },
  { tipo: 'cobertura', titulo: 'Cobertura', varias: false },
  { tipo: 'decoracion', titulo: 'Decoración', varias: false },
  { tipo: 'extra', titulo: 'Extras', varias: true },
];

export default function Constructor() {
  const cat = useLiveQuery(() => leerCatalogo(), []);
  const config = useLiveQuery(async () => (await db.config.get('unica')) ?? null, []);
  const ultimas = useLiveQuery(() => db.tortas.orderBy('fecha').reverse().limit(5).toArray(), []);
  const [nombre, setNombre] = useState('');
  const [tamanoId, setTamanoId] = useState<number>();
  const [elegidos, setElegidos] = useState<Elegidos>(NADA);
  const [margen, setMargen] = useState<string | null>(null);
  const [precioFinal, setPrecioFinal] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!cat || config === undefined || !ultimas) return null;

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

  // Si una opción se borró desde otra pantalla, deja de contar sin romper nada.
  const vivos = (tipo: TipoOpcion) => elegidos[tipo].filter((id) => cat.opciones.has(id));
  const sel: Seleccion = {
    tamanoId: tamano.id!,
    masaId: vivos('masa')[0],
    rellenoIds: vivos('relleno'),
    coberturaId: vivos('cobertura')[0],
    decoracionId: vivos('decoracion')[0],
    extraIds: vivos('extra'),
  };
  const margenDefecto = config?.margenDefecto ?? 50;
  const margenNum = margen === null ? margenDefecto : (leerNumero(margen) ?? 0);
  const final = leerPesos(precioFinal) ?? undefined;
  const s = calcularTorta(sel, cat, margenNum, final);
  const faltantes = faltantesDeStock(sel, cat);
  const hayElegidas = PASOS.some((p) => vivos(p.tipo).length > 0);

  function elegir(op: Opcion, varias: boolean) {
    setMensaje(null);
    setElegidos((prev) => {
      const actual = prev[op.tipo];
      const esta = actual.includes(op.id!);
      const nuevo = varias ? (esta ? actual.filter((i) => i !== op.id) : [...actual, op.id!]) : esta ? [] : [op.id!];
      return { ...prev, [op.tipo]: nuevo };
    });
  }

  async function guardar(estado: 'borrador' | 'realizada') {
    setError(null);
    setMensaje(null);
    if (!hayElegidas) return setError('Elegí al menos una masa, un relleno o una cobertura.');
    if (estado === 'realizada' && !confirm('Se descuenta del stock lo que lleva esta torta. ¿Guardar como realizada?')) return;
    setGuardando(true);
    try {
      await guardarTorta({ nombre, seleccion: sel, margen: margenNum, precioFinal: final, estado });
      setMensaje(
        `Guardada ${estado === 'realizada' ? 'como realizada' : 'como borrador'}: ${nombre.trim() || 'Torta sin nombre'}, ${pesos(s.precioFinal)}.`,
      );
      setNombre('');
      setElegidos(NADA);
      setPrecioFinal('');
    } catch {
      setError('No se pudo guardar. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Pantalla titulo="Armar torta">
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
      </section>

      {PASOS.map(({ tipo, titulo, varias }) => {
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
            <input
              id="torta-margen"
              inputMode="decimal"
              value={margen ?? String(margenDefecto)}
              onChange={(e) => setMargen(e.target.value)}
            />
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
      <div className="accesos">
        <button className="boton boton-secundario" type="button" disabled={guardando} onClick={() => guardar('borrador')}>
          Guardar borrador
        </button>
        <button className="boton" type="button" disabled={guardando} onClick={() => guardar('realizada')}>
          Ya la hice
        </button>
      </div>

      {ultimas.length > 0 && (
        <section className="grupo-lista">
          <h2>Últimas guardadas</h2>
          <ul className="lista">
            {ultimas.map((t) => (
              <li key={t.id} className="fila">
                <span className="fila-principal">
                  <b>{t.nombre}</b>
                  <small>
                    {fechaCorta(t.fecha)} · {t.estado === 'realizada' ? 'realizada' : 'borrador'}
                  </small>
                </span>
                <b>{pesos(t.snapshot.precioFinal)}</b>
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
