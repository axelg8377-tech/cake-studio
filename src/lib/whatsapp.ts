/**
 * Enlace de WhatsApp para el QR.
 *
 * `wa.me` exige el número internacional sin signos. Una persona en Argentina escribe
 * "11 2345-6789" o "011 15 2345-6789", así que se normaliza acá y no se le pide que sepa del 549.
 */

export function normalizarTelefonoAR(telefono: string): string {
  let d = telefono.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54')) return d.startsWith('549') ? d : `549${d.slice(2)}`;
  if (d.startsWith('0')) d = d.slice(1);
  // "15" después del código de área es el prefijo viejo de celular: wa.me no lo quiere.
  d = d.replace(/^(\d{2,4})15(\d{6,8})$/, (_, area: string, resto: string) =>
    area.length + resto.length === 10 ? area + resto : `${area}15${resto}`,
  );
  return d.length === 10 ? `549${d}` : d;
}

export function urlWhatsApp(telefono: string, texto?: string): string | null {
  const numero = normalizarTelefonoAR(telefono);
  if (numero.length < 8) return null;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

/** Corto a propósito: el QR crece con cada letra y un QR chico con muchos módulos no se lee. */
export const MENSAJE_PEDIDO = 'Hola! Vi tu torta y quiero encargar una';
