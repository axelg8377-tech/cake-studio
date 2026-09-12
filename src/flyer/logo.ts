/** Logo de torta de dos pisos con vela. Va al centro del QR y en la tarjeta. */
export function logoTorta(tinta: string, fondo: string): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256">',
    `<rect width="64" height="64" rx="14" fill="${fondo}"/>`,
    `<ellipse cx="32" cy="12.5" rx="2.2" ry="3.4" fill="${tinta}"/>`,
    `<rect x="31" y="16" width="2" height="8" rx="1" fill="${tinta}"/>`,
    `<rect x="20" y="24" width="24" height="11" rx="3" fill="${tinta}"/>`,
    `<rect x="13" y="35" width="38" height="14" rx="3" fill="${tinta}"/>`,
    `<path d="M13 40.5q3.2 3.2 6.3 0t6.3 0 6.3 0 6.3 0 6.3 0 6.3 0" fill="none" stroke="${fondo}" stroke-width="2" stroke-linecap="round"/>`,
    `<path d="M20 29q3 2.6 6 0t6 0 6 0 6 0" fill="none" stroke="${fondo}" stroke-width="1.8" stroke-linecap="round"/>`,
    `<rect x="9" y="50" width="46" height="3.2" rx="1.6" fill="${tinta}"/>`,
    '</svg>',
  ].join('');
}

export function dataUriSvg(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
