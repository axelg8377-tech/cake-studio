import { NavInferior } from './componentes/NavInferior';
import { useRuta } from './lib/ruta';
import PruebaFlyer from './PruebaFlyer';
import FichaIngrediente from './pantallas/FichaIngrediente';
import FormIngrediente from './pantallas/FormIngrediente';
import Ingredientes from './pantallas/Ingredientes';
import Inicio from './pantallas/Inicio';
import Constructor from './pantallas/Constructor';
import { FormGasto, Gastos } from './pantallas/Gastos';
import Mas from './pantallas/Mas';
import { FormOpcion, Opciones } from './pantallas/Opciones';
import { FormTamano, Tamanos } from './pantallas/Tamanos';

/** "nuevo" → alta (sin id); un número → edición. */
const idDe = (parte: string) => (parte === 'nuevo' ? undefined : Number(parte));

function Contenido({ ruta }: { ruta: string[] }) {
  const [seccion, id, accion] = ruta;
  if (seccion === 'ingredientes') {
    if (id === 'nuevo') return <FormIngrediente key="nuevo" />;
    if (id && accion === 'editar') return <FormIngrediente key={`editar-${id}`} id={Number(id)} />;
    if (id) return <FichaIngrediente key={id} id={Number(id)} />;
    return <Ingredientes />;
  }
  if (seccion === 'tortas') return <Constructor key={id ?? 'nueva'} id={id ? Number(id) : undefined} />;
  if (seccion === 'flyer') return <PruebaFlyer />;
  if (seccion === 'mas') {
    if (id === 'gastos') return accion ? <FormGasto key={accion} id={idDe(accion)} /> : <Gastos />;
    if (id === 'tamanos') return accion ? <FormTamano key={accion} id={idDe(accion)} /> : <Tamanos />;
    if (id === 'opciones') return accion ? <FormOpcion key={accion} id={idDe(accion)} /> : <Opciones />;
    return <Mas />;
  }
  return <Inicio />;
}

export default function App() {
  const ruta = useRuta();
  return (
    <>
      <div className="app">
        <Contenido ruta={ruta} />
      </div>
      <NavInferior actual={ruta[0] ?? 'inicio'} />
    </>
  );
}
