import { lazy, Suspense } from 'react'
import App from './App.jsx'

// Seconda pagina: /admin, per il titolare. Caricata solo se si apre quell'indirizzo.
const Admin = lazy(() => import('./admin/Admin.jsx'))

export default function Radice() {
  const percorso = window.location.pathname.replace(/\/+$/, '')
  if (!percorso.endsWith('/admin')) return <App />
  return (
    <Suspense fallback={null}>
      <Admin />
    </Suspense>
  )
}
