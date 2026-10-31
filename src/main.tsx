import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted Fredoka (variable) so the game has zero third-party requests and the
// installed PWA renders with its real typeface offline.
import '@fontsource-variable/fredoka'
import './styles.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
