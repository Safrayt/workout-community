import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./styles/globals.css";
import "leaflet/dist/leaflet.css";
import "./styles/components/leaflet-attribution.css";
import App from './App.tsx'
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet сам вычисляет путь к своим иконкам маркера (marker-icon.png
// и т.д.) исходя из того, где лежит подключённый leaflet.css — это
// работает, если файлы просто скопированы на сервер как есть, но
// ломается при сборке через Vite/webpack: собранный бандл кладёт
// картинки по другим, хешированным именам и путям, поэтому Leaflet
// обращается по несуществующему адресу, и маркер остаётся без иконки
// (именно это и происходило — img 404 на marker-icon.png).
// Стандартное решение (из документации react-leaflet) — импортировать
// картинки как обычные модули (тогда Vite сам подставит правильный
// путь после сборки) и один раз подставить их в опции иконки по
// умолчанию до того, как где-либо в приложении будет создан
// `new L.Icon.Default()` (см. MapPicker.tsx).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
    ._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
