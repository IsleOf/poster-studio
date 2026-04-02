import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import './assets/fonts/fonts.css'
import './index.css'
import App from './App.tsx'

// Register tile cache service worker — caches all OpenFreeMap tiles on disk
// so pan/zoom/stitch operations are instant after first load.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/tile-sw.js', { scope: '/' })
        .catch(() => { /* non-fatal — SW just won't cache */ });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </StrictMode>,
)
