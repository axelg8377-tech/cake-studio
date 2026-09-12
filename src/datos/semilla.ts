import type { BaseDatos } from '../db';
import type { Gasto, Ingrediente, LineaReceta, Opcion } from '../tipos';

/**
 * Datos de ejemplo de la primera apertura. Los precios son de referencia y cada ingrediente lo dice
 * en sus notas: la idea es que ella los reemplace, no que los use.
 */

const NOTA = 'Precio de ejemplo: actualizalo con lo que pagaste.';

const INGREDIENTES = {
  harina: { nombre: 'Harina 0000', categoria: 'Masas', unidad: 'g', precio: 1500, cantidad: 1000 },
  azucar: { nombre: 'Azúcar', categoria: 'Masas', unidad: 'g', precio: 1400, cantidad: 1000 },
  huevos: { nombre: 'Huevos', categoria: 'Masas', unidad: 'u', precio: 4000, cantidad: 12 },
  manteca: { nombre: 'Manteca', categoria: 'Masas', unidad: 'g', precio: 3500, cantidad: 200 },
  cacao: { nombre: 'Cacao amargo', categoria: 'Masas', unidad: 'g', precio: 4500, cantidad: 150 },
  leche: { nombre: 'Leche', categoria: 'Masas', unidad: 'ml', precio: 1600, cantidad: 1000 },
  ddl: { nombre: 'Dulce de leche repostero', categoria: 'Rellenos', unidad: 'g', precio: 5500, cantidad: 1000 },
  crema: { nombre: 'Crema de leche', categoria: 'Rellenos', unidad: 'ml', precio: 3800, cantidad: 350 },
  chocolate: { nombre: 'Chocolate semiamargo', categoria: 'Coberturas', unidad: 'g', precio: 9000, cantidad: 1000 },
  frutillas: { nombre: 'Frutillas', categoria: 'Frutas', unidad: 'g', precio: 4000, cantidad: 500 },
  nueces: { nombre: 'Nueces', categoria: 'Decoración', unidad: 'g', precio: 6000, cantidad: 250 },
  colorante: { nombre: 'Colorante en gel', categoria: 'Decoración', unidad: 'u', precio: 2500, cantidad: 1 },
} satisfies Record<string, Omit<Ingrediente, 'id' | 'actualizado'>>;

const GASTOS = {
  caja: { nombre: 'Caja para torta', categoria: 'Packaging', precio: 1800, porTorta: false },
  base: { nombre: 'Base de cartón', categoria: 'Packaging', precio: 900, porTorta: true },
  gas: { nombre: 'Gas y luz', categoria: 'Servicios', precio: 1500, porTorta: true },
  delivery: { nombre: 'Delivery', categoria: 'Envío', precio: 3000, porTorta: false },
} satisfies Record<string, Omit<Gasto, 'id' | 'fecha'>>;

type ClaveIngrediente = keyof typeof INGREDIENTES;
type ClaveGasto = keyof typeof GASTOS;

/** `{ clave: id }` con los ids que devolvió `bulkAdd`, que vienen en el mismo orden que las claves. */
function idsPorClave<K extends string>(claves: K[], ids: (number | undefined)[]): Record<K, number> {
  return Object.fromEntries(claves.map((k, i) => [k, ids[i]!])) as Record<K, number>;
}

export async function sembrar(db: BaseDatos): Promise<void> {
  const hoy = new Date().toISOString();

  const clavesIng = Object.keys(INGREDIENTES) as ClaveIngrediente[];
  const ing = idsPorClave(
    clavesIng,
    await db.ingredientes.bulkAdd(
      clavesIng.map((k) => ({ ...INGREDIENTES[k], actualizado: hoy, notas: NOTA })),
      { allKeys: true },
    ),
  );
  const clavesGasto = Object.keys(GASTOS) as ClaveGasto[];
  const gasto = idsPorClave(
    clavesGasto,
    await db.gastos.bulkAdd(
      clavesGasto.map((k) => ({ ...GASTOS[k], fecha: hoy })),
      { allKeys: true },
    ),
  );

  // Factor = área relativa al molde de 20 cm: (diámetro / 20)².
  await db.tamanos.bulkAdd([
    { nombre: '15 cm', factor: 0.56, orden: 1 },
    { nombre: '18 cm', factor: 0.81, orden: 2 },
    { nombre: '20 cm', factor: 1, orden: 3 },
    { nombre: '24 cm', factor: 1.44, orden: 4 },
  ]);

  const receta = (...lineas: [ClaveIngrediente, number][]): LineaReceta[] =>
    lineas.map(([clave, cantidad]) => ({ ingredienteId: ing[clave], cantidad }));
  const porReceta = (tipo: Opcion['tipo'], nombre: string, lineas: LineaReceta[]): Opcion => ({
    tipo,
    nombre,
    modo: 'receta',
    receta: lineas,
    gastos: [],
  });
  const fijo = (tipo: Opcion['tipo'], nombre: string, precioFijo: number, gastos: ClaveGasto[] = []): Opcion => ({
    tipo,
    nombre,
    modo: 'fijo',
    precioFijo,
    receta: [],
    gastos: gastos.map((g) => gasto[g]),
  });

  // Recetas pensadas para el molde de 20 cm.
  await db.opciones.bulkAdd([
    porReceta('masa', 'Vainilla', receta(['harina', 250], ['azucar', 200], ['huevos', 4], ['manteca', 150], ['leche', 120])),
    porReceta(
      'masa',
      'Chocolate',
      receta(['harina', 200], ['azucar', 220], ['huevos', 4], ['manteca', 150], ['cacao', 60], ['leche', 150]),
    ),
    porReceta('relleno', 'Dulce de leche', receta(['ddl', 400])),
    porReceta('relleno', 'Crema y frutillas', receta(['crema', 350], ['frutillas', 250], ['azucar', 40])),
    porReceta('cobertura', 'Ganache de chocolate', receta(['chocolate', 250], ['crema', 200])),
    porReceta('cobertura', 'Crema chantilly', receta(['crema', 350], ['azucar', 50])),
    porReceta('decoracion', 'Frutillas y nueces', receta(['frutillas', 150], ['nueces', 60])),
    fijo('decoracion', 'Temática personalizada', 6000),
    fijo('extra', 'Velas', 1500),
    fijo('extra', 'Caja especial', 0, ['caja']),
    fijo('extra', 'Delivery', 0, ['delivery']),
  ]);

  await db.config.put({
    id: 'unica',
    negocio: { nombre: '', telefono: '', instagram: '', frase: '' },
    margenDefecto: 50,
    umbralAlerta: 20,
    plantillaFlyer: 'elegante',
    paleta: 'papel',
  });
}
