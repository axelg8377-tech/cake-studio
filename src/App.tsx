import { NavInferior } from './componentes/NavInferior';
import { useRuta } from './lib/ruta';
import PruebaFlyer from './PruebaFlyer';
import FichaIngrediente from './pantallas/FichaIngrediente';
import FormIngrediente from './pantallas/FormIngrediente';
import Ingredientes from './pantallas/Ingredientes';
import Inicio from './pantallas/Inicio';
import { Mas, Tortas } from './pantallas/Pendientes';

function Contenido({ ruta }: { ruta: string[] }) {
  const [seccion, id, accion] = ruta;
  if (seccion === 'ingredientes') {
    if (id === 'nuevo') return <FormIngrediente key="nuevo" />;
    if (id && accion === 'editar') return <FormIngrediente key={`editar-${id}`} id={Number(id)} />;
    if (id) return <FichaIngrediente key={id} id={Number(id)} />;
    return <Ingredientes />;
  }
  if (seccion === 'tortas') return <Tortas />;
  if (seccion === 'flyer') return <PruebaFlyer />;
  if (seccion === 'mas') return <Mas />;
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
