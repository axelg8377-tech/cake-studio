import { useEffect, useState } from 'react';

/** Rutas con # porque GitHub Pages no reescribe direcciones: "#/ingredientes/12" → ['ingredientes', '12']. */
function leer(): string[] {
  return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
}

export function useRuta(): string[] {
  const [partes, setPartes] = useState(leer);
  useEffect(() => {
    const cambiar = () => {
      setPartes(leer());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', cambiar);
    return () => window.removeEventListener('hashchange', cambiar);
  }, []);
  return partes;
}

export function ir(ruta: string): void {
  location.hash = `#/${ruta}`;
}
