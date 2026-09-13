import { useLiveQuery } from 'dexie-react-hooks';
import { Aviso, Ayuda, Pantalla, Variacion } from '../componentes/ui';
import { leerCatalogo } from '../datos/catalogo';
import { db } from '../db';
import { avisoCopia, DIAS_AVISO } from '../lib/backup';
import { pesos, pesosConSigno } from '../lib/formato';
import { aumentos, resumenDelMes, revisarPrecios } from '../lib/resumen';

export default function Inicio() {
  const config = useLiveQuery(() => db.config.get('unica'), []);
  const ingredientes = useLiveQuery(() => db.ingredientes.toArray(), []);
  const historial = useLiveQuery(() => db.preciosHistorial.toArray(), []);
  const tortas = useLiveQuery(() => db.tortas.toArray(), []);
  const cat = useLiveQuery(() => leerCatalogo(), []);
  if (!ingredientes || !historial || !tortas || !cat) return null;

  const subas = aumentos(historial, ingredientes);
  const umbral = config?.umbralAlerta ?? 20;
  const fuertes = subas.filter((a) => a.pct > umbral);
  const mes = resumenDelMes(tortas);
  const nombreMes = new Date().toLocaleDateString('es-AR', { month: 'long' });
  const aRevisar = revisarPrecios(tortas, cat).filter((r) => r.conviene).length;
  const copia = avisoCopia(config?.ultimoBackup, tortas.length > 0 || historial.length > 0);
  const deEjemplo = ingredientes.filter((i) => i.notas?.startsWith('Precio de ejemplo')).length;

  return (
    <Pantalla titulo={config?.negocio.nombre || 'Pastelería'}>
      <Ayuda id="inicio" titulo="Primeros pasos">
        <ol>
          <li>
            En <a href="#/ingredientes">Ingredientes</a>, cargá lo que pagaste. Los precios que vienen son de ejemplo.
          </li>
          <li>
            En <a href="#/tortas">Tortas</a>, armá una: con opciones ya armadas o tocando los ingredientes uno por uno.
          </li>
          <li>La app te dice cuánto te cuesta, cuánto ganás y un precio sugerido. Si cobrás otro, lo escribís.</li>
          <li>Guardala como borrador. Cuando la entregues, tocá "Ya la hice" y se descuenta el stock.</li>
        </ol>
        <p>Cada pantalla tiene su explicación arriba. Se cierra con "Entendido" y se vuelve a ver desde Más.</p>
      </Ayuda>

      {copia && (
        <Aviso alerta>
          {copia === 'nunca'
            ? 'Todavía no hiciste una copia de seguridad: si perdés el teléfono, se pierde todo.'
            : `Pasaron más de ${DIAS_AVISO} días desde tu última copia de seguridad.`}{' '}
          <a href="#/mas/copia">Hacer copia</a>
        </Aviso>
      )}

      {fuertes.length > 0 && (
        <Aviso alerta>
          Subieron más del {umbral}%: {fuertes.slice(0, 3).map((a) => a.nombre).join(', ')}
          {fuertes.length > 3 && ` y ${fuertes.length - 3} más`}. <a href="#/ingredientes">Ver ingredientes</a>
        </Aviso>
      )}

      {aRevisar > 0 && (
        <Aviso alerta>
          {aRevisar === 1 ? 'Una torta hecha hoy te costaría' : `${aRevisar} tortas hechas hoy te costarían`} más de lo que
          cobraste.{' '}
          <a href="#/mas/revisar-precios">Revisar precios</a>
        </Aviso>
      )}

      {deEjemplo > 0 && (
        <Aviso alerta>
          {deEjemplo} de {ingredientes.length} ingredientes tienen precio de ejemplo. Empezá por actualizar los que
          más usás.
        </Aviso>
      )}

      <section className="grupo-lista">
        <h2>Este mes · {nombreMes}</h2>
        <div className="cifras">
          <div className="cifra">
            <span>Tortas hechas</span>
            <b>{mes.tortas}</b>
          </div>
          <div className="cifra principal">
            <span>Ventas</span>
            <b>{pesos(mes.ventas)}</b>
          </div>
          <div className="cifra">
            <span>Costos</span>
            <b>{pesos(mes.costos)}</b>
          </div>
          <div className="cifra">
            <span>Ganancia</span>
            <b className={mes.ganancia < 0 ? 'sube' : 'baja'}>{mes.ganancia < 0 ? pesosConSigno(mes.ganancia) : pesos(mes.ganancia)}</b>
          </div>
        </div>
        {mes.tortas === 0 && <p className="vacio">Se completa cuando marcás una torta como hecha.</p>}
      </section>

      <div className="accesos">
        <a className="boton" href="#/ingredientes">
          Actualizar precios
        </a>
        <a className="boton boton-secundario" href="#/flyer">
          Hacer un flyer
        </a>
      </div>

      <section className="bloque">
        <h2>Mayores aumentos</h2>
        {subas.length === 0 ? (
          <p className="vacio">Todavía no hubo aumentos. Aparecen cuando actualices un precio.</p>
        ) : (
          <ul className="lista">
            {subas.slice(0, 3).map((a) => (
              <li key={a.id}>
                <a className="fila" href={`#/ingredientes/${a.id}`}>
                  <b>{a.nombre}</b>
                  <Variacion abs={a.abs} pct={a.pct} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Pantalla>
  );
}
