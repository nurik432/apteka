import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Шрифт лежит в сборке: приложение работает без интернета
import '@fontsource-variable/inter/wght.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
