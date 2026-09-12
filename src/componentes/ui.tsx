import type { ReactNode } from 'react';
import { pesosConSigno, porcentaje } from '../lib/formato';

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
