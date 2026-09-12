/**
 * El modelo de datos de PLAN.md. Las fechas van como texto ISO: el backup es JSON y así viajan sin
 * conversión.
 */

/** Unidad en la que se guarda todo. kg y l se convierten a g y ml al cargar (ver lib/unidades.ts). */
export type UnidadBase = 'g' | 'ml' | 'u';

export const CATEGORIAS_INGREDIENTE = [
  'Masas',
  'Rellenos',
  'Coberturas',
  'Decoración',
  'Frutas',
  'Otros',
] as const;

export interface Ingrediente {
  id?: number;
  nombre: string;
  categoria: string;
  unidad: UnidadBase;
  /** Lo que se pagó por `cantidad` unidades base. Harina: $1.500 por 1000 g. */
  precio: number;
  cantidad: number;
  /** Opcional: si no se carga, la app no avisa faltantes de este ingrediente. */
  stock?: number;
  actualizado: string;
  notas?: string;
}

export interface PrecioHistorial {
  id?: number;
  ingredienteId: number;
  precioAnterior: number;
  precioNuevo: number;
  cantidad: number;
  fecha: string;
}

export interface Gasto {
  id?: number;
  nombre: string;
  categoria: string;
  precio: number;
  fecha: string;
  notas?: string;
  /** Se suma solo a cada torta (base de cartón, gas). Si es false, se agrega a mano como extra. */
  porTorta: boolean;
}

export interface Tamano {
  id?: number;
  nombre: string;
  /** Multiplica las recetas. La receta de cada opción está pensada para el tamaño con factor 1. */
  factor: number;
  orden: number;
}

export type TipoOpcion = 'masa' | 'relleno' | 'cobertura' | 'decoracion' | 'extra';

export interface LineaReceta {
  ingredienteId: number;
  /** En la unidad base del ingrediente. */
  cantidad: number;
}

export interface Opcion {
  id?: number;
  tipo: TipoOpcion;
  nombre: string;
  /** `fijo` es para lo que no tiene receta posible: "decoración temática", "velas". */
  modo: 'receta' | 'fijo';
  precioFijo?: number;
  receta: LineaReceta[];
  /** Ids de gastos que arrastra la opción, sin escalar por tamaño (la caja cuesta lo mismo). */
  gastos: number[];
}

export interface Seleccion {
  tamanoId: number;
  masaId?: number;
  rellenoIds: number[];
  coberturaId?: number;
  decoracionId?: number;
  extraIds: number[];
  /** Torta armada tocando ingredientes sueltos: cantidades de esta torta, no se escalan por tamaño. */
  ingredientes?: LineaReceta[];
}

export interface LineaCosto {
  concepto: string;
  costo: number;
}

/** El costo del momento, congelado. Sin esto "Revisar precios" no tiene contra qué comparar. */
export interface Snapshot {
  lineas: LineaCosto[];
  costo: number;
  margen: number;
  precioSugerido: number;
  precioFinal: number;
  ganancia: number;
}

export interface Torta {
  id?: number;
  fecha: string;
  nombre: string;
  clienteId?: number;
  seleccion: Seleccion;
  snapshot: Snapshot;
  estado: 'borrador' | 'realizada';
}

export interface Cliente {
  id?: number;
  nombre: string;
  telefono: string;
  notas?: string;
}

export type CategoriaImagen = 'torta' | 'decoracion' | 'fondo' | 'logo' | 'otro';

export interface Imagen {
  id?: number;
  blob: Blob;
  categoria: CategoriaImagen;
  principal: boolean;
  creada: string;
}

export interface Config {
  id: 'unica';
  negocio: { nombre: string; telefono: string; instagram: string; frase: string };
  /** Ganancia sobre el costo, en %. 50 = el precio sugerido es costo × 1,5. */
  margenDefecto: number;
  /** % de aumento de un ingrediente a partir del cual se avisa. */
  umbralAlerta: number;
  plantillaFlyer: 'elegante' | 'dulce' | 'carta';
  paleta: 'papel' | 'rosa';
  /** Vive solo en el teléfono. Nunca en el código ni en el backup. */
  claveIA?: string;
  ultimoBackup?: string;
}
