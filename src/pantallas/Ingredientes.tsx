import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Aviso, Ayuda, Pantalla, Variacion } from '../componentes/ui';
import { ultimosCambios } from '../datos/ingredientes';
import { db } from '../db';
import { variacion } from '../lib/costos';
import { pesos } from '../lib/formato';
import { mostrarCantidad } from '../lib/unidades';
import { CATEGORIAS_INGREDIENTE } from '../tipos';

const sinTildes = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Ingredientes() {
  const ingredientes = useLiveQuery(() => db.ingredientes.orderBy('nombre').toArray(), []);
  const historial = useLiveQuery(() => db.preciosHistorial.toArray(), []);
  const config = useLiveQuery(() => db.config.get('unica'), []);
  const [busqueda, setBusqueda] = useState('');
  const cambios = useMemo(() => ultimosCambios(historial ?? []), [historial]);

  if (!ingredientes) return null;

  const umbral = config?.umbralAlerta ?? 20;
  const alertas = ingredientes.flatMap((ing) => {
    const c = cambios.get(ing.id!);
    const pct = c && variacion(c.precioAnterior, c.precioNuevo).pct;
    return pct != null && pct >= umbral ? [{ id: ing.id!, nombre: ing.nombre, pct }] : [];
  });

  const texto = sinTildes(busqueda.trim());
  const visibles = ingredientes.filter((i) => sinTildes(i.nombre).includes(texto));
  const categorias = [
    ...CATEGORIAS_INGREDIENTE,
    ...new Set(visibles.map((i) => i.categoria).filter((c) => !(CATEGORIAS_INGREDIENTE as readonly string[]).includes(c))),
  ];

  return (
    <Pantalla
      titulo="Ingredientes"
      accion={
        <a className="boton boton-chico" href="#/ingredientes/nuevo">
          Agregar
        </a>
      }
    >
      <Ayuda id="ingredientes">
        <p>Acá están los precios de lo que comprás. Todo el cálculo de las tortas sale de estos números.</p>
        <ul>
          <li>Tocá un ingrediente para cambiarle el precio. Se guarda el anterior y ves cuánto subió.</li>
          <li>En rojo lo que aumentó, en verde lo que bajó. Si algo sube más de 20%, aparece un aviso arriba.</li>
          <li>"Agregar" carga uno nuevo: cuánto pagaste y por cuánto (ej: $4.000 por 12 huevos).</li>
        </ul>
      </Ayuda>

      {alertas.map((a) => (
        <Aviso key={a.id} alerta>
          <a href={`#/ingredientes/${a.id}`}>{a.nombre}</a> aumentó {Math.round(a.pct)}% desde la última
          actualización. Conviene revisar el precio de las tortas que lo usan.
        </Aviso>
      ))}

      <label className="buscador" htmlFor="buscar-ingrediente">
        <span className="sr">Buscar ingrediente</span>
        <input
          id="buscar-ingrediente"
          type="search"
          placeholder="Buscar: harina, crema…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </label>

      {visibles.length === 0 && (
        <p className="vacio">
          {busqueda ? `No hay ingredientes con "${busqueda}".` : 'Todavía no hay ingredientes. Tocá Agregar.'}
        </p>
      )}

      {categorias.map((categoria) => {
        const deCategoria = visibles.filter((i) => i.categoria === categoria);
        if (deCategoria.length === 0) return null;
        return (
          <section key={categoria} className="grupo-lista">
            <h2>{categoria}</h2>
            <ul className="lista">
              {deCategoria.map((ing) => {
                const c = cambios.get(ing.id!);
                const v = c && variacion(c.precioAnterior, c.precioNuevo);
                return (
                  <li key={ing.id}>
                    <a className="fila" href={`#/ingredientes/${ing.id}`}>
                      <span className="fila-principal">
                        <b>{ing.nombre}</b>
                        <small>
                          {pesos(ing.precio)} por {mostrarCantidad(ing.cantidad, ing.unidad)}
                        </small>
                      </span>
                      {v && <Variacion abs={v.abs} pct={v.pct} />}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Pantalla>
  );
}
