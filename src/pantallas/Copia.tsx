import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Ayuda, Aviso, Pantalla } from '../componentes/ui';
import { db } from '../db';
import { armarCopia, DIAS_AVISO, leerCopia, marcarCopia, restaurarCopia } from '../lib/backup';
import { compartirOBajar } from '../lib/exportar';
import { fechaCorta } from '../lib/formato';

export default function Copia() {
  const config = useLiveQuery(async () => (await db.config.get('unica')) ?? null, []);
  const [estado, setEstado] = useState<{ texto: string; tipo: 'ok' | 'error' | '' }>({ texto: '', tipo: '' });
  const [ocupado, setOcupado] = useState(false);
  if (config === undefined) return null;

  async function exportar() {
    setOcupado(true);
    setEstado({ texto: 'Armando la copia…', tipo: '' });
    try {
      const { texto, nombre, creada } = await armarCopia();
      const resultado = await compartirOBajar(new Blob([texto], { type: 'application/json' }), nombre);
      if (resultado === 'cancelado') return setEstado({ texto: '', tipo: '' });
      await marcarCopia(creada);
      setEstado({
        texto: resultado === 'compartido' ? 'Copia enviada.' : `Copia guardada en Descargas: ${nombre}.`,
        tipo: 'ok',
      });
    } catch {
      setEstado({ texto: 'No se pudo armar la copia. Probá de nuevo.', tipo: 'error' });
    } finally {
      setOcupado(false);
    }
  }

  async function importar(archivo: File | undefined) {
    if (!archivo) return;
    setOcupado(true);
    try {
      const copia = leerCopia(await archivo.text());
      const t = copia.tablas;
      const cuantos = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
      const detalle = `${cuantos(t.tortas.length, 'torta', 'tortas')}, ${cuantos(t.ingredientes.length, 'ingrediente', 'ingredientes')}, ${cuantos(t.clientes.length, 'cliente', 'clientes')} y ${cuantos(t.imagenes.length, 'foto', 'fotos')}`;
      if (!confirm(`Esto reemplaza TODOS tus datos por los de la copia del ${fechaCorta(copia.creada)} (${detalle}). Lo que cargaste después se pierde. ¿Seguir?`)) {
        return setEstado({ texto: '', tipo: '' });
      }
      await restaurarCopia(copia);
      setEstado({ texto: `Listo: volvieron ${detalle}.`, tipo: 'ok' });
    } catch (error) {
      setEstado({ texto: (error as Error).message || 'No se pudo leer la copia.', tipo: 'error' });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Pantalla titulo="Copia de seguridad" volver="mas">
      <Ayuda id="copia">
        <p>
          Todo lo que cargás vive solo en este teléfono. Si se rompe, se pierde o borrás los datos de Chrome, se va con él.
          La copia es un archivo con todo adentro: ingredientes, tortas, clientes, fotos y tus datos.
        </p>
        <p>
          Hacé una cada dos semanas y mandátela a un lugar tuyo: tu propio WhatsApp, tu mail o Google Drive.{' '}
          <b>Tiene los teléfonos de tus clientes</b>: no la compartas con nadie más.
        </p>
        <p>
          <b>Restaurar</b> reemplaza todo lo que hay en el teléfono por lo de la copia.
        </p>
      </Ayuda>

      {config?.ultimoBackup ? (
        <Aviso>Última copia: {fechaCorta(config.ultimoBackup)}.</Aviso>
      ) : (
        <Aviso alerta>Todavía no hiciste ninguna copia.</Aviso>
      )}

      <button className="boton" type="button" disabled={ocupado} onClick={exportar}>
        Hacer copia ahora
      </button>
      <label className="boton boton-secundario" aria-disabled={ocupado}>
        Restaurar desde un archivo
        <input
          className="sr"
          type="file"
          accept=".json,application/json"
          disabled={ocupado}
          onChange={(e) => {
            importar(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      <p className="ayuda">Inicio te avisa si pasaron {DIAS_AVISO} días sin copia.</p>
      {estado.texto && (
        <p className={estado.tipo} role={estado.tipo === 'error' ? 'alert' : 'status'}>
          {estado.texto}
        </p>
      )}
    </Pantalla>
  );
}
