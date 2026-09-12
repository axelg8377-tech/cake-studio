import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos.css'
import PruebaFlyer from './PruebaFlyer.tsx'
import { prepararBase } from './db'
import { pedirPersistencia } from './lib/almacenamiento'

void prepararBase()
void pedirPersistencia()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PruebaFlyer />
  </StrictMode>,
)
