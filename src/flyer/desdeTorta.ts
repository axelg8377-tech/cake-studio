import { calcularTorta, costoOpcion, type Catalogo } from '../lib/costos';
import type { Opcion, TipoOpcion, Torta } from '../tipos';
import type { DatosCarta } from './plantillas/carta';
import type { DatosFlyer } from './plantillas/elegante';

/** Lo de una torta guardada que puede ver el cliente. Del snapshot sale solo el precio final. */
export function flyerDeTorta(t: Torta, cat: Catalogo): Omit<DatosFlyer, 'negocio'> {
  const nombres = (ids: (number | undefined)[]) =>
    ids
      .map((id) => (id === undefined ? undefined : cat.opciones.get(id)?.nombre))
      .filter(Boolean)
      .join(' + ');
  const s = t.seleccion;
  return {
    nombre: t.nombre,
    tamano: cat.tamanos.get(s.tamanoId)?.nombre ?? '',
    detalle: [
      { etiqueta: 'Masa', valor: nombres([s.masaId]) },
      { etiqueta: s.rellenoIds.length > 1 ? 'Rellenos' : 'Relleno', valor: nombres(s.rellenoIds) },
      { etiqueta: 'Cobertura', valor: nombres([s.coberturaId]) },
      { etiqueta: 'Decoración', valor: nombres([s.decoracionId]) },
      { etiqueta: 'Extras', valor: nombres(s.extraIds) },
    ],
    precio: t.snapshot.precioFinal,
  };
}

const nombresDe = (cat: Catalogo, tipo: TipoOpcion) =>
  [...cat.opciones.values()]
    .filter((o) => o.tipo === tipo)
    .map((o) => o.nombre)
    .sort((a, b) => a.localeCompare(b));

/**
 * Precio "desde" de cada tamaño: la masa, el relleno y la cobertura más baratos a ese tamaño, con la
 * ganancia por defecto y los gastos de cada torta. Es el piso honesto; en la pantalla se puede cambiar.
 */
export function cartaDelCatalogo(cat: Catalogo, margen: number): Omit<DatosCarta, 'titulo' | 'negocio'> {
  const masBarata = (tipo: TipoOpcion, factor: number) => {
    let mejor: Opcion | undefined;
    for (const op of cat.opciones.values()) {
      if (op.tipo === tipo && (!mejor || costoOpcion(op, factor, cat) < costoOpcion(mejor, factor, cat))) mejor = op;
    }
    return mejor?.id;
  };
  return {
    tamanos: [...cat.tamanos.values()].map((t) => {
      const relleno = masBarata('relleno', t.factor);
      const seleccion = {
        tamanoId: t.id!,
        masaId: masBarata('masa', t.factor),
        rellenoIds: relleno === undefined ? [] : [relleno],
        coberturaId: masBarata('cobertura', t.factor),
        extraIds: [],
      };
      return { nombre: t.nombre, precio: calcularTorta(seleccion, cat, margen).precioSugerido };
    }),
    masas: nombresDe(cat, 'masa'),
    rellenos: nombresDe(cat, 'relleno'),
    coberturas: nombresDe(cat, 'cobertura'),
  };
}
