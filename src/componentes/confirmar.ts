/**
 * Reemplaza al `confirm()` del navegador, que en Android muestra "axelg8377-tech.github.io dice" y no se
 * parece a la app. Es un <dialog> nativo: Esc, "atrás" y tocar afuera cancelan. El texto va con
 * `textContent`, nunca como HTML: puede traer nombres que escribió la usuaria.
 */
export function confirmar({
  titulo,
  mensaje,
  aceptar,
  peligro = false,
}: {
  titulo: string;
  mensaje?: string;
  /** El verbo de la acción: "Borrar", "Quitar piso". Nunca "Aceptar". */
  aceptar: string;
  /** Borra o pisa datos: el botón va en rojo. */
  peligro?: boolean;
}): Promise<boolean> {
  return new Promise((resolver) => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'dialogo';

    const h = document.createElement('h2');
    h.textContent = titulo;
    dialogo.append(h);
    if (mensaje) {
      const p = document.createElement('p');
      p.textContent = mensaje;
      dialogo.append(p);
    }

    const botones = document.createElement('div');
    botones.className = 'dialogo-botones';
    const boton = (texto: string, clase: string, valor: boolean) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = clase;
      b.textContent = texto;
      b.addEventListener('click', () => cerrar(valor));
      return b;
    };
    // Cancelar primero: es el que recibe el foco, así un toque de más no borra nada.
    botones.append(
      boton('Cancelar', 'boton boton-secundario', false),
      boton(aceptar, peligro ? 'boton boton-borrar' : 'boton', true),
    );
    dialogo.append(botones);

    let resuelto = false;
    function cerrar(valor: boolean) {
      if (resuelto) return;
      resuelto = true;
      dialogo.close();
      dialogo.remove();
      resolver(valor);
    }
    dialogo.addEventListener('cancel', (e) => {
      e.preventDefault();
      cerrar(false);
    });
    // Un toque en el fondo oscuro llega al propio <dialog>, fuera de su caja.
    dialogo.addEventListener('click', (e) => {
      const r = dialogo.getBoundingClientRect();
      const afuera = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (e.target === dialogo && afuera) cerrar(false);
    });

    document.body.append(dialogo);
    dialogo.showModal();
  });
}
