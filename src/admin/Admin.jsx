import { useEffect, useMemo, useState } from 'react'
import { serializzaListino } from '../lib/listino.js'
import { validaListino } from '../lib/preventivo.js'
import { bozzaInListino, differenze, listinoInBozza } from './bozza.js'
import './admin.css'

// In sviluppo, /admin?prova usa un finto GitHub in memoria (vedi backendProva.js)
const modoProva = import.meta.env.DEV && new URLSearchParams(window.location.search).has('prova')
const caricaBackend = () => (modoProva ? import('./backendProva.js') : import('./github.js'))

const LUCIDITA = [
  [0, 'opaca'],
  [0.5, 'satinata'],
  [1, 'lucida'],
]
const nomeLucidita = (v) => LUCIDITA.reduce((a, b) => (Math.abs(b[0] - v) < Math.abs(a[0] - v) ? b : a))[1]

export default function Admin() {
  const [sessione, setSessione] = useState(null) // { token, login, backend }
  const [originale, setOriginale] = useState(null) // { listino, sha }
  const [bozza, setBozza] = useState(null)
  const [stato, setStato] = useState({ fase: 'fuori' })

  useEffect(() => {
    document.title = 'Listino prezzi · Legno & Co.'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  async function entra() {
    setStato({ fase: 'accesso' })
    try {
      const backend = await caricaBackend()
      const token = await backend.accedi()
      const { login } = await backend.utente(token)
      const { testo, sha } = await backend.leggi(token)
      const listino = JSON.parse(testo)
      setSessione({ token, login, backend })
      setOriginale({ listino, sha })
      setBozza(listinoInBozza(listino))
      setStato({
        fase: 'modifica',
        avviso: validaListino(listino).length > 0 ? 'Il listino pubblicato contiene errori: correggili qui sotto.' : null,
      })
    } catch (err) {
      setStato({ fase: 'fuori', errore: err instanceof SyntaxError ? 'Il listino pubblicato non è un JSON valido.' : err.message })
    }
  }

  function esci() {
    setSessione(null)
    setOriginale(null)
    setBozza(null)
    setStato({ fase: 'fuori' })
  }

  const risultato = useMemo(() => (bozza ? bozzaInListino(bozza) : null), [bozza])
  const modifiche = useMemo(
    () => (risultato?.listino && originale ? differenze(originale.listino, risultato.listino) : []),
    [risultato, originale],
  )

  async function pubblica() {
    if (!risultato?.listino || modifiche.length === 0) return
    setStato({ fase: 'salvataggio' })
    try {
      const messaggio = `Listino aggiornato dal pannello admin\n\n${modifiche.map((m) => `- ${m}`).join('\n')}`
      const { sha } = await sessione.backend.salva(sessione.token, serializzaListino(risultato.listino), originale.sha, messaggio)
      setOriginale({ listino: risultato.listino, sha })
      setBozza(listinoInBozza(risultato.listino))
      setStato({ fase: 'modifica', successo: true })
    } catch (err) {
      setStato({ fase: 'modifica', errore: err.message })
    }
  }

  const aggiorna = (campo, valore) => setBozza((b) => ({ ...b, [campo]: valore }))
  const aggiornaVoce = (elenco, i, campo, valore) =>
    setBozza((b) => ({ ...b, [elenco]: b[elenco].map((v, j) => (j === i ? { ...v, [campo]: valore } : v)) }))
  const aggiungiVoce = (elenco, vuota) => setBozza((b) => ({ ...b, [elenco]: [...b[elenco], vuota] }))
  const togliVoce = (elenco, i) => setBozza((b) => ({ ...b, [elenco]: b[elenco].filter((_, j) => j !== i) }))

  return (
    <div className="admin">
      <header className="admin__testata">
        <p className="admin__marchio">
          <a href="/">Legno &amp; Co.</a>
        </p>
        <h1>Listino prezzi</h1>
        {sessione ? (
          <p className="admin__utente">
            Accesso come <strong>@{sessione.login}</strong>
            {modoProva && ' (modalità di prova, nulla viene pubblicato)'}
            <button type="button" className="admin__link" onClick={esci}>
              Esci
            </button>
          </p>
        ) : (
          <p className="admin__intro">
            Qui cambi prezzi, finiture, consegne, IVA e limiti delle misure. Quando pubblichi, il sito si aggiorna da solo in
            circa un minuto.
          </p>
        )}
      </header>

      {!sessione && (
        <section className="admin__accesso">
          <button type="button" className="admin__primario" onClick={entra} disabled={stato.fase === 'accesso'}>
            {stato.fase === 'accesso' ? 'Accesso in corso…' : 'Accedi con GitHub'}
          </button>
          <p className="admin__nota">Serve un account GitHub con permesso di modifica sul progetto del sito.</p>
          {stato.errore && (
            <p className="admin__errore" role="alert">
              {stato.errore}
            </p>
          )}
        </section>
      )}

      {sessione && bozza && (
        <form className="admin__modulo" onSubmit={(e) => e.preventDefault()} noValidate>
          {stato.avviso && <p className="admin__errore">{stato.avviso}</p>}

          <fieldset className="admin__gruppo">
            <legend>Valori generali</legend>
            <div className="admin__generali">
              <Campo etichetta="IVA" unita="%" valore={bozza.iva} onChange={(v) => aggiorna('iva', v)} />
              <Campo etichetta="Misura minima" unita="cm" valore={bozza.minimaCm} onChange={(v) => aggiorna('minimaCm', v)} />
              <Campo etichetta="Misura massima" unita="cm" valore={bozza.massimaCm} onChange={(v) => aggiorna('massimaCm', v)} />
            </div>
          </fieldset>

          <fieldset className="admin__gruppo">
            <legend>Legni</legend>
            <p className="admin__aiuto">Prezzo al m² della superficie totale, IVA esclusa. Il colore serve solo all'anteprima 3D.</p>
            {bozza.legni.map((l, i) => (
              <div className="admin__riga" key={i}>
                <Campo etichetta="Nome" valore={l.nome} testo onChange={(v) => aggiornaVoce('legni', i, 'nome', v)} />
                <Campo etichetta="Prezzo" unita="€/m²" valore={l.prezzoMq} onChange={(v) => aggiornaVoce('legni', i, 'prezzoMq', v)} />
                <label className="admin__campo admin__campo--colore">
                  <span>Colore</span>
                  <input type="color" value={l.colore} onChange={(e) => aggiornaVoce('legni', i, 'colore', e.target.value.toUpperCase())} />
                </label>
                <Togli onClick={() => togliVoce('legni', i)} nome={l.nome} disabilitato={bozza.legni.length === 1} />
              </div>
            ))}
            <button type="button" className="admin__aggiungi" onClick={() => aggiungiVoce('legni', { nome: '', prezzoMq: '', colore: '#B98A5C' })}>
              Aggiungi un legno
            </button>
          </fieldset>

          <fieldset className="admin__gruppo">
            <legend>Finiture</legend>
            <p className="admin__aiuto">Supplemento al m², IVA esclusa. La lucidità serve solo all'anteprima 3D.</p>
            {bozza.finiture.map((f, i) => (
              <div className="admin__riga" key={i}>
                <Campo etichetta="Nome" valore={f.nome} testo onChange={(v) => aggiornaVoce('finiture', i, 'nome', v)} />
                <Campo etichetta="Supplemento" unita="€/m²" valore={f.supplementoMq} onChange={(v) => aggiornaVoce('finiture', i, 'supplementoMq', v)} />
                <label className="admin__campo admin__campo--lucidita">
                  <span>Lucidità: {nomeLucidita(Number(f.lucidita))}</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={f.lucidita}
                    onChange={(e) => aggiornaVoce('finiture', i, 'lucidita', Number(e.target.value))}
                  />
                </label>
                <Togli onClick={() => togliVoce('finiture', i)} nome={f.nome} disabilitato={bozza.finiture.length === 1} />
              </div>
            ))}
            <button type="button" className="admin__aggiungi" onClick={() => aggiungiVoce('finiture', { nome: '', supplementoMq: '', lucidita: 0.2 })}>
              Aggiungi una finitura
            </button>
          </fieldset>

          <fieldset className="admin__gruppo">
            <legend>Consegne</legend>
            <p className="admin__aiuto">Costo fisso, IVA esclusa.</p>
            {bozza.consegne.map((c, i) => (
              <div className="admin__riga admin__riga--consegna" key={i}>
                <Campo etichetta="Zona" valore={c.nome} testo onChange={(v) => aggiornaVoce('consegne', i, 'nome', v)} />
                <Campo etichetta="Costo" unita="€" valore={c.costo} onChange={(v) => aggiornaVoce('consegne', i, 'costo', v)} />
                <Togli onClick={() => togliVoce('consegne', i)} nome={c.nome} disabilitato={bozza.consegne.length === 1} />
              </div>
            ))}
            <button type="button" className="admin__aggiungi" onClick={() => aggiungiVoce('consegne', { nome: '', costo: '' })}>
              Aggiungi una zona di consegna
            </button>
          </fieldset>

          <section className="admin__pubblica" aria-live="polite">
            {risultato.problemi.length > 0 ? (
              <>
                <h2>Da correggere prima di pubblicare</h2>
                <ul className="admin__problemi">
                  {risultato.problemi.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </>
            ) : modifiche.length > 0 ? (
              <>
                <h2>Modifiche da pubblicare</h2>
                <ul className="admin__modifiche">
                  {modifiche.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="admin__nota">
                {stato.successo
                  ? 'Listino pubblicato. Il sito si aggiorna in circa un minuto.'
                  : 'Nessuna modifica: il listino è uguale a quello pubblicato.'}
              </p>
            )}
            {stato.errore && (
              <p className="admin__errore" role="alert">
                {stato.errore}
              </p>
            )}
            <div className="admin__azioni">
              <button
                type="button"
                className="admin__primario"
                onClick={pubblica}
                disabled={!risultato.listino || modifiche.length === 0 || stato.fase === 'salvataggio'}
              >
                {stato.fase === 'salvataggio' ? 'Pubblico…' : 'Pubblica il listino'}
              </button>
              <button
                type="button"
                className="admin__secondario"
                onClick={() => {
                  setBozza(listinoInBozza(originale.listino))
                  setStato({ fase: 'modifica' })
                }}
                disabled={modifiche.length === 0 && risultato.problemi.length === 0}
              >
                Annulla le modifiche
              </button>
            </div>
          </section>
        </form>
      )}
    </div>
  )
}

function Campo({ etichetta, unita, valore, onChange, testo = false }) {
  return (
    <label className={`admin__campo${testo ? ' admin__campo--testo' : ''}`}>
      <span>{etichetta}</span>
      <span className="admin__input">
        <input
          type="text"
          inputMode={testo ? 'text' : 'decimal'}
          autoComplete="off"
          value={valore}
          onChange={(e) => onChange(e.target.value)}
        />
        {unita && <span aria-hidden="true">{unita}</span>}
      </span>
    </label>
  )
}

function Togli({ onClick, nome, disabilitato }) {
  return (
    <button
      type="button"
      className="admin__togli"
      onClick={onClick}
      disabled={disabilitato}
      aria-label={`Togli ${nome || 'questa voce'}`}
      title={disabilitato ? 'Serve almeno una voce' : 'Togli'}
    >
      Togli
    </button>
  )
}
