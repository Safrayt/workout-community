import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./styles/globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles/components/maplibre-overrides.css";
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
