import { useState, type ReactNode } from 'react';
import { pesosConSigno, porcentaje } from '../lib/formato';

const PREFIJO_AYUDA = 'ayuda-vista:';

/**
 * Explicación de la pantalla. Abierta hasta que se toca "Entendido"; eso se recuerda en este teléfono.
 * Si el navegador no deja guardar (modo privado), se muestra abierta siempre: mejor de más que de menos.
 */
export function Ayuda({ id, titulo = 'Cómo se usa esta pantalla', children }: { id: string; titulo?: string; children: ReactNode }) {
  const [abierta, setAbierta] = useState(() => {
    try {
      return localStorage.getItem(PREFIJO_AYUDA + id) === null;
    } catch {
      return true;
    }
  });

  function entendido() {
    try {
      localStorage.setItem(PREFIJO_AYUDA + id, '1');
    } catch {
      // Sin almacenamiento: se cierra igual por ahora.
    }
    setAbierta(false);
  }

  return (
    <details className="ayuda-caja" open={abierta} onToggle={(e) => setAbierta(e.currentTarget.open)}>
      <summary>{titulo}</summary>
      <div className="ayuda-cuerpo">
        {children}
        <button className="boton boton-chico boton-secundario" type="button" onClick={entendido}>
          Entendido
        </button>
      </div>
    </details>
  );
}

export function mostrarAyudasDeNuevo(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIJO_AYUDA))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // Sin almacenamiento las ayudas ya se ven siempre.
  }
}

export function Pantalla({
  titulo,
  volver,
  accion,
  children,
}: {
  titulo: string;
  volver?: string;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="pantalla">
      {volver && (
        <a className="volver" href={`#/${volver}`}>
          ‹ Volver
        </a>
      )}
      <header className="pantalla-cab">
        <h1>{titulo}</h1>
        {accion}
      </header>
      {children}
    </main>
  );
}

export function NoEncontrado({ volver }: { volver: string }) {
  return (
    <Pantalla titulo="No encontrado" volver={volver}>
      <p className="vacio">Eso ya no existe. Puede que se haya borrado.</p>
    </Pantalla>
  );
}

export function Aviso({ alerta = false, children }: { alerta?: boolean; children: ReactNode }) {
  return <p className={alerta ? 'aviso aviso-alerta' : 'aviso'}>{children}</p>;
}

/** Subió en rojo, bajó en verde: para quien compra, que suba es la mala noticia. */
export function Variacion({ abs, pct }: { abs: number; pct: number | null }) {
  if (Math.round(abs) === 0) return <span className="variacion igual">Igual</span>;
  return (
    <span className={`variacion ${abs > 0 ? 'sube' : 'baja'}`}>
      {pct === null ? pesosConSigno(abs) : porcentaje(pct)}
    </span>
  );
}

export function claseCambio(abs: number | undefined): string {
  if (abs === undefined || Math.round(abs) === 0) return '';
  return abs > 0 ? 'sube' : 'baja';
}
