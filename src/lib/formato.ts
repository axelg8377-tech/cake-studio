/** Cómo se muestran y se leen números en la app. Pesos sin centavos, como se cobra una torta. */

export function pesos(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-AR')}`;
}

function signo(n: number): string {
  return n > 0 ? '+' : n < 0 ? '−' : '';
}

export function pesosConSigno(valor: number): string {
  const r = Math.round(valor);
  return `${signo(r)}$${Math.abs(r).toLocaleString('es-AR')}`;
}

export function porcentaje(pct: number): string {
  const r = Math.round(pct);
  return `${signo(r)}${Math.abs(r)}%`;
}

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' });
}

/** Plata: "$ 12.500" → 12500. Se ignora todo lo que no sea dígito. Vacío → null. */
export function leerPesos(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '');
  return digitos ? Number(digitos) : null;
}

/** Cantidades: "1,5" o "1.5" → 1.5. El teclado del celular pone uno u otro según el idioma. */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  const n = Number(limpio);
  return limpio && Number.isFinite(n) ? n : null;
}
