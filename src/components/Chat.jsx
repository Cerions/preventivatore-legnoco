import { useEffect, useRef, useState } from 'react'
import { CONTESTO_VUOTO, ErroreChat, inviaMessaggio, LUNGHEZZA_MASSIMA, nuovaSessione } from '../lib/chat.js'
import './chat.css'

const SALUTO =
  'Ciao! Sono l’assistente di Legno & Co. Posso rispondere su legni, finiture e consegne. ' +
  'Il prezzo ufficiale è quello del preventivatore qui sopra.'

/**
 * Chat facoltativa, chiusa di default. Nulla parte dal dispositivo prima che il cliente
 * legga l'avviso e scriva il primo messaggio. La conversazione resta solo in memoria.
 */
export default function Chat() {
  const [aperta, setAperta] = useState(false)
  const [avvisoLetto, setAvvisoLetto] = useState(false)
  const [messaggi, setMessaggi] = useState([])
  const [testo, setTesto] = useState('')
  const [inInvio, setInInvio] = useState(false)
  const [errore, setErrore] = useState(null)
  const sessione = useRef(null)
  const contesto = useRef(CONTESTO_VUOTO) // storia e riassunto per il server, solo in memoria
  const fondo = useRef(null)
  const campo = useRef(null)
  const bottoneApri = useRef(null)

  useEffect(() => {
    fondo.current?.scrollIntoView?.({ block: 'end' })
  }, [messaggi, inInvio, errore])

  useEffect(() => {
    if (aperta && avvisoLetto) campo.current?.focus()
  }, [aperta, avvisoLetto])

  useEffect(() => {
    if (!aperta) return undefined
    const alTasto = (e) => {
      if (e.key === 'Escape') chiudi()
    }
    window.addEventListener('keydown', alTasto)
    return () => window.removeEventListener('keydown', alTasto)
  }, [aperta])

  function chiudi() {
    setAperta(false)
    bottoneApri.current?.focus()
  }

  function ricomincia() {
    sessione.current = null
    contesto.current = CONTESTO_VUOTO
    setMessaggi([])
    setErrore(null)
    setTesto('')
  }

  async function invia(e) {
    e.preventDefault()
    const domanda = testo.trim()
    if (domanda === '' || inInvio) return

    sessione.current ??= nuovaSessione()
    setMessaggi((m) => [...m, { ruolo: 'cliente', testo: domanda }])
    setTesto('')
    setErrore(null)
    setInInvio(true)
    try {
      const risposta = await inviaMessaggio(sessione.current, domanda, contesto.current)
      contesto.current = risposta.contesto
      setMessaggi((m) => [...m, { ruolo: 'assistente', testo: risposta.testo }])
    } catch (err) {
      setErrore(err instanceof ErroreChat ? err.message : 'Qualcosa non ha funzionato. Riprova.')
      setTesto(domanda) // il messaggio non è andato perso: si può rimandare
      setMessaggi((m) => m.slice(0, -1))
    } finally {
      setInInvio(false)
    }
  }

  return (
    <>
      {!aperta && (
        <button
          ref={bottoneApri}
          type="button"
          className="chat-apri"
          aria-expanded="false"
          aria-controls="chat-pannello"
          onClick={() => setAperta(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="chat-apri__icona">
            <path d="M4 5h16v11H9l-5 4z" />
          </svg>
          Chiedi all’assistente
        </button>
      )}

      {aperta && (
        <section id="chat-pannello" className="chat" role="dialog" aria-label="Chat con l’assistente">
          <header className="chat__testata">
            <h2>Assistente</h2>
            <div className="chat__azioni">
              {messaggi.length > 0 && (
                <button type="button" className="chat__link" onClick={ricomincia}>
                  Nuova conversazione
                </button>
              )}
              <button type="button" className="chat__link" onClick={chiudi}>
                Chiudi
              </button>
            </div>
          </header>

          {!avvisoLetto ? (
            <div className="chat__avviso">
              <p>
                <strong>Prima di scrivere</strong>
              </p>
              <p>
                I messaggi della chat vengono inviati al nostro assistente, un servizio di intelligenza artificiale,
                per ricevere la risposta. Non scrivere dati personali come cognome, telefono o indirizzo.
              </p>
              <p>
                Il preventivo qui sopra resta sul tuo dispositivo. Le risposte della chat possono contenere errori:
                il prezzo ufficiale è quello del preventivatore.
              </p>
              <button type="button" className="bottone" onClick={() => setAvvisoLetto(true)}>
                Ho capito, inizia
              </button>
            </div>
          ) : (
            <>
              <div className="chat__messaggi" role="log" aria-live="polite">
                <p className="chat__bolla chat__bolla--assistente">{SALUTO}</p>
                {messaggi.map((m, i) => (
                  <p key={i} className={`chat__bolla chat__bolla--${m.ruolo}`}>
                    {m.testo}
                  </p>
                ))}
                {inInvio && (
                  <p className="chat__bolla chat__bolla--assistente chat__bolla--attesa" role="status">
                    Sto scrivendo…
                  </p>
                )}
                {errore && (
                  <p className="chat__errore" role="alert">
                    {errore}
                  </p>
                )}
                <div ref={fondo} />
              </div>

              <form className="chat__form" onSubmit={invia}>
                <label className="chat__etichetta" htmlFor="chat-testo">
                  Il tuo messaggio
                </label>
                <input
                  id="chat-testo"
                  ref={campo}
                  type="text"
                  className="chat__campo"
                  value={testo}
                  maxLength={LUNGHEZZA_MASSIMA}
                  autoComplete="off"
                  placeholder="Scrivi qui la tua domanda"
                  onChange={(e) => setTesto(e.target.value)}
                />
                <button type="submit" className="bottone chat__invia" disabled={inInvio || testo.trim() === ''}>
                  Invia
                </button>
              </form>
            </>
          )}
        </section>
      )}
    </>
  )
}
