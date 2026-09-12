import type { ReactNode } from 'react';

const SECCIONES: { ruta: string; nombre: string; icono: ReactNode }[] = [
  { ruta: 'inicio', nombre: 'Inicio', icono: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> },
  {
    ruta: 'tortas',
    nombre: 'Tortas',
    icono: (
      <>
        <path d="M4 21h16" />
        <path d="M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
        <path d="M5 16.5c1.5 1 3 1 4.5 0s3-1 4.5 0 3.5 1 5 0" />
        <path d="M12 12V8" />
        <path d="M12 5.5c.9-.9.9-1.7 0-2.5-.9.8-.9 1.6 0 2.5z" />
      </>
    ),
  },
  {
    ruta: 'ingredientes',
    nombre: 'Ingredientes',
    icono: (
      <>
        <path d="M9 6h12M9 12h12M9 18h12" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
  },
  {
    ruta: 'flyer',
    nombre: 'Flyer',
    icono: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <circle cx="9.5" cy="9" r="2" />
        <path d="m20 15-4-4-9 9" />
      </>
    ),
  },
  {
    ruta: 'mas',
    nombre: 'Más',
    icono: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  },
];

export function NavInferior({ actual }: { actual: string }) {
  return (
    <nav className="nav" aria-label="Secciones">
      {SECCIONES.map((s) => (
        <a
          key={s.ruta}
          className="nav-item"
          href={`#/${s.ruta}`}
          aria-current={actual === s.ruta ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ strokeWidth: s.ruta === 'mas' || s.ruta === 'ingredientes' ? 3 : undefined }}>
            {s.icono}
          </svg>
          <span>{s.nombre}</span>
        </a>
      ))}
    </nav>
  );
}
