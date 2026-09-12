import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Ayuda, Miniatura, Pantalla } from '../componentes/ui';
import { CATEGORIAS_IMAGEN, marcarPrincipal, subirFotos } from '../datos/imagenes';
import { db } from '../db';
import type { CategoriaImagen } from '../tipos';

const CATEGORIAS = Object.entries(CATEGORIAS_IMAGEN) as [CategoriaImagen, string][];

export default function Galeria() {
  const imagenes = useLiveQuery(() => db.imagenes.orderBy('creada').reverse().toArray(), []);
  const [categoria, setCategoria] = useState<CategoriaImagen>('torta');
  const [filtro, setFiltro] = useState<CategoriaImagen | 'todas'>('todas');
  const [estado, setEstado] = useState('');
  if (!imagenes) return null;
  const visibles = filtro === 'todas' ? imagenes : imagenes.filter((i) => i.categoria === filtro);

  async function subir(archivos: File[]) {
    if (archivos.length === 0) return;
    setEstado('Guardando…');
    try {
      const ids = await subirFotos(archivos, categoria);
      setEstado(ids.length === 1 ? 'Foto guardada.' : `${ids.length} fotos guardadas.`);
    } catch {
      setEstado('Una de las fotos no se pudo abrir. Probá con otra.');
    }
  }

  return (
    <Pantalla titulo="Galería" volver="mas">
      <Ayuda id="galeria">
        <p>Las fotos de tus tortas, para usarlas en el flyer. Se achican al subirlas para no llenar el teléfono.</p>
        <p>
          La foto <b>principal</b> es la que aparece elegida cuando abrís el flyer.
        </p>
      </Ayuda>

      <div className="fila-campos">
        <label className="campo" htmlFor="galeria-categoria">
          Categoría
          <select id="galeria-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaImagen)}>
            {CATEGORIAS.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="boton">
          Subir fotos
          <input
            className="sr"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              subir(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {estado && <p role="status">{estado}</p>}

      {imagenes.length > 0 && (
        <div className="chips">
          <button type="button" className="chip" aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>
            Todas
          </button>
          {CATEGORIAS.map(([id, nombre]) => (
            <button key={id} type="button" className="chip" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>
              {nombre}
            </button>
          ))}
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="vacio">{imagenes.length ? 'No hay fotos en esta categoría.' : 'Todavía no subiste fotos.'}</p>
      ) : (
        <ul className="galeria">
          {visibles.map((img) => (
            <li key={img.id} className="foto">
              <Miniatura blob={img.blob} alt={`Foto de ${CATEGORIAS_IMAGEN[img.categoria].toLowerCase()}`} />
              <select
                aria-label="Categoría de la foto"
                value={img.categoria}
                onChange={(e) => db.imagenes.update(img.id!, { categoria: e.target.value as CategoriaImagen })}
              >
                {CATEGORIAS.map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="boton boton-chico boton-secundario"
                aria-pressed={img.principal}
                onClick={() => marcarPrincipal(img.id!)}
              >
                {img.principal ? 'Principal' : 'Hacer principal'}
              </button>
              <button
                type="button"
                className="boton boton-chico boton-peligro"
                onClick={() => {
                  if (confirm('¿Borrar esta foto?')) db.imagenes.delete(img.id!);
                }}
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}
    </Pantalla>
  );
}
