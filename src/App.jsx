import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  calcolaPreventivo,
  formattaEuro,
  formattaMq,
  validaListino,
  validaMisura,
} from './lib/preventivo.js'

const URL_LISTINO = `${import.meta.env.BASE_URL}listino.json`

const CAMPI_MISURA = [
  { id: 'larghezza', etichetta: 'Larghezza', nomeErrore: 'la larghezza', esempio: '120' },
  { id: 'altezza', etichetta: 'Altezza', nomeErrore: "l'altezza", esempio: '80' },
  { id: 'profondita', etichetta: 'Profondità', nomeErrore: 'la profondità', esempio: '40' },
]

/** Scarica e controlla il listino. Restituisce sempre uno stato, mai un'eccezione. */
async function scaricaListino() {
  let risposta
  try {
    risposta = await fetch(URL_LISTINO, { cache: 'no-store' })
  } catch {
    return { fase: 'errore', dettagli: ['Non è stato possibile caricare il listino (rete assente?).'] }
  }
  if (!risposta.ok) {
    return { fase: 'errore', dettagli: [`Il file del listino non è stato trovato (errore ${risposta.status}).`] }
  }
  let dati
  try {
    dati = await risposta.json()
  } catch {
    return { fase: 'errore', dettagli: ['Il file del listino contiene un errore di scrittura (JSON non valido).'] }
  }
  const problemi = validaListino(dati)
  if (problemi.length > 0) return { fase: 'errore', dettagli: problemi }
  return { fase: 'pronto', listino: dati }
}

function useListino() {
  const [stato, setStato] = useState({ fase: 'caricamento' })

  useEffect(() => {
    let attivo = true
    scaricaListino().then((nuovo) => {
      if (attivo) setStato(nuovo)
    })
    return () => {
      attivo = false
    }
  }, [])

  const ricarica = useCallback(() => {
    setStato({ fase: 'caricamento' })
    scaricaListino().then(setStato)
  }, [])

  return [stato, ricarica]
}

export default function App() {
  const [statoListino, ricarica] = useListino()

  return (
    <div className="pagina">
      <header className="testata">
        <p className="marchio">Legno &amp; Co.</p>
        <h1>Quanto costa il tuo mobile su misura?</h1>
        <p className="sottotitolo">
          Scrivi le misure, scegli legno, finitura e consegna: il prezzo compare subito.
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
        <p>
          I dati che inserisci restano sul tuo dispositivo: non vengono salvati né inviati.
        </p>
      </footer>
    </div>
  )
}

function Preventivatore({ listino }) {
  const [misure, setMisure] = useState({ larghezza: '', altezza: '', profondita: '' })
  const [toccati, setToccati] = useState({})
  const [scelte, setScelte] = useState({
    legno: listino.legni[0].nome,
    finitura: listino.finiture[0].nome,
    consegna: listino.consegne[0].nome,
  })

  const esiti = useMemo(() => {
    const risultato = {}
    for (const campo of CAMPI_MISURA) {
      risultato[campo.id] = validaMisura(misure[campo.id], campo.nomeErrore, listino.misure)
    }
    return risultato
  }, [misure, listino])

  const tutteValide = CAMPI_MISURA.every((c) => esiti[c.id].valore !== undefined)
  const qualcunaScritta = CAMPI_MISURA.some((c) => misure[c.id].trim() !== '')

  const preventivo = useMemo(() => {
    if (!tutteValide) return null
    return calcolaPreventivo(
      {
        larghezza: esiti.larghezza.valore,
        altezza: esiti.altezza.valore,
        profondita: esiti.profondita.valore,
        ...scelte,
      },
      listino,
    )
  }, [tutteValide, esiti, scelte, listino])

  // Un errore si mostra quando il campo è stato lasciato o contiene già qualcosa
  const mostraErrore = (id) =>
    esiti[id].errore && (toccati[id] || misure[id].trim() !== '') ? esiti[id].errore : null

  const ciSonoErroriVisibili = CAMPI_MISURA.some((c) => mostraErrore(c.id))

  return (
    <div className="layout">
      <form className="scheda" noValidate onSubmit={(e) => e.preventDefault()}>
        <fieldset className="gruppo">
          <legend>
            Misure del mobile <span className="unita">in cm</span>
          </legend>
          <p className="aiuto" id="aiuto-misure">
            Ogni misura tra {listino.misure.minimaCm} e {listino.misure.massimaCm} cm.
          </p>
          <div className="misure">
            {CAMPI_MISURA.map((campo) => {
              const errore = mostraErrore(campo.id)
              const idErrore = `errore-${campo.id}`
              return (
                <div className={`campo${errore ? ' campo--errore' : ''}`} key={campo.id}>
                  <label htmlFor={campo.id}>{campo.etichetta}</label>
                  <div className="input-con-unita">
                    <input
                      id={campo.id}
                      name={campo.id}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder={campo.esempio}
                      value={misure[campo.id]}
                      aria-invalid={errore ? 'true' : 'false'}
                      aria-describedby={errore ? `${idErrore} aiuto-misure` : 'aiuto-misure'}
                      onChange={(e) => setMisure((m) => ({ ...m, [campo.id]: e.target.value }))}
                      onBlur={() => setToccati((t) => ({ ...t, [campo.id]: true }))}
                    />
                    <span className="suffisso" aria-hidden="true">cm</span>
                  </div>
                  {errore && (
                    <p className="errore" id={idErrore}>
                      {errore}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="gruppo">
          <legend>Materiale e consegna</legend>
          <div className="scelte">
            <Scelta
              id="legno"
              etichetta="Tipo di legno"
              voci={listino.legni}
              valore={scelte.legno}
              onChange={(v) => setScelte((s) => ({ ...s, legno: v }))}
            />
            <Scelta
              id="finitura"
              etichetta="Finitura"
              voci={listino.finiture}
              valore={scelte.finitura}
              onChange={(v) => setScelte((s) => ({ ...s, finitura: v }))}
            />
            <Scelta
              id="consegna"
              etichetta="Consegna"
              voci={listino.consegne}
              valore={scelte.consegna}
              onChange={(v) => setScelte((s) => ({ ...s, consegna: v }))}
            />
          </div>
        </fieldset>
      </form>

      <section className="risultato" aria-live="polite" aria-labelledby="titolo-risultato">
        <h2 id="titolo-risultato">Il tuo preventivo</h2>

        {preventivo ? (
          <>
            <dl className="righe">
              <div className="riga">
                <dt>Superficie totale</dt>
                <dd>{formattaMq(preventivo.superficieMq)} m²</dd>
              </div>
              <div className="riga riga--dettaglio">
                <dt>
                  Mobile <span className="nota">({formattaEuro(preventivo.prezzoMq * 100)}/m²)</span>
                </dt>
                <dd>{formattaEuro(preventivo.mobileCent)}</dd>
              </div>
              <div className="riga riga--dettaglio">
                <dt>Consegna</dt>
                <dd>{formattaEuro(preventivo.consegnaCent)}</dd>
              </div>
              <div className="riga riga--separata">
                <dt>Imponibile (IVA esclusa)</dt>
                <dd>{formattaEuro(preventivo.imponibileCent)}</dd>
              </div>
              <div className="riga">
                <dt>IVA {Math.round(preventivo.aliquotaIva * 100)}%</dt>
                <dd>{formattaEuro(preventivo.ivaCent)}</dd>
              </div>
            </dl>
            <div className="totale">
              <span>Totale IVA inclusa</span>
              <strong>{formattaEuro(preventivo.totaleCent)}</strong>
            </div>
          </>
        ) : (
          <p className={`segnaposto${ciSonoErroriVisibili ? ' segnaposto--errore' : ''}`}>
            {ciSonoErroriVisibili
              ? 'Correggi le misure evidenziate per vedere il prezzo.'
              : qualcunaScritta
                ? 'Completa tutte e tre le misure per vedere il prezzo.'
                : 'Inserisci larghezza, altezza e profondità per vedere il prezzo.'}
          </p>
        )}
      </section>
    </div>
  )
}

function Scelta({ id, etichetta, voci, valore, onChange }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etichetta}</label>
      <div className="select">
        <select id={id} value={valore} onChange={(e) => onChange(e.target.value)}>
          {voci.map((v) => (
            <option key={v.nome} value={v.nome}>
              {v.nome}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
