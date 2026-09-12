import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos.css'
import PruebaFlyer from './PruebaFlyer.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PruebaFlyer />
  </StrictMode>,
)
