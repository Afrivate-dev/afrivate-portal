import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { assertProductionConfig } from '@/lib/productionGuard'
import './styles/index.css'
import App from './App'

assertProductionConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
