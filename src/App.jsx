import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import Preventivatore from './components/Preventivatore.jsx'
import { chatDisponibile } from './lib/chat.js'
import { caricaListino } from './lib/listino.js'

// La chat è facoltativa: arriva in un file separato e solo se il server è configurato
const Chat = lazy(() => import('./components/Chat.jsx'))

function useListino() {
  const [stato, setStato] = useState({ fase: 'caricamento' })

  useEffect(() => {
    let attivo = true
    caricaListino().then((nuovo) => {
      if (attivo) setStato(nuovo)
    })
    return () => {
      attivo = false
    }
  }, [])

  const ricarica = useCallback(() => {
    setStato({ fase: 'caricamento' })
    caricaListino().then(setStato)
  }, [])

  return [stato, ricarica]
}

export default function App() {
  const [statoListino, ricarica] = useListino()

  return (
    <div className="pagina">
      <header className="testata">
        <p className="marchio">
          <svg viewBox="0 0 32 32" aria-hidden="true" className="marchio__segno">
            <rect x="3" y="9" width="26" height="14" rx="2" />
            <path d="M8 9v5M13 9v3M18 9v5M23 9v3" />
          </svg>
          Legno &amp; Co.
        </p>
        <h1>Quanto costa il tuo mobile su misura?</h1>
        <p className="testata__sottotitolo">
          Scrivi le misure e scegli legno, finitura e consegna: prezzo e anteprima si aggiornano mentre scrivi.
        </p>
      </header>

      <main>
        {statoListino.fase === 'caricamento' && (
          <p className="avviso" role="status">Carico il listino…</p>
        )}

        {statoListino.fase === 'errore' && (
          <div className="avviso avviso--errore" role="alert">
            <p>
              <strong>Il preventivatore non è disponibile in questo momento.</strong>
            </p>
            <p>Il listino dei prezzi non è leggibile, quindi non mostriamo nessun prezzo.</p>
            <details>
              <summary>Dettagli per il titolare</summary>
              <ul>
                {statoListino.dettagli.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </details>
            <button type="button" className="bottone" onClick={ricarica}>
              Riprova
            </button>
          </div>
        )}

        {statoListino.fase === 'pronto' && <Preventivatore listino={statoListino.listino} />}
      </main>

      <footer className="piede">
        <p>I dati che inserisci nel preventivatore restano sul tuo dispositivo: non vengono salvati né inviati.</p>
        {chatDisponibile && (
          <p>La chat con l’assistente è facoltativa: se la usi, i tuoi messaggi vengono inviati per ricevere la risposta.</p>
        )}
      </footer>

      {/* Senza un listino valido non mostriamo prezzi, quindi nemmeno la chat che li racconterebbe */}
      {chatDisponibile && statoListino.fase === 'pronto' && (
        <Suspense fallback={null}>
          <Chat />
        </Suspense>
      )}
    </div>
  )
}
