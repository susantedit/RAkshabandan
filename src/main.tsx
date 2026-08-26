/**
 * main.tsx — the single entry point. Mounts <App/> into #root and pulls in the
 * Tailwind/theme stylesheet. Everything past here lives in the browser only.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
