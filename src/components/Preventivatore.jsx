import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  calcolaPreventivo,
  COLORE_PREDEFINITO,
  formattaEuro,
  formattaMq,
  validaMisura,
} from '../lib/preventivo.js'

// three.js è pesante: il visualizzatore arriva in un file separato, dopo il resto della pagina
const Mobile3D = lazy(() => import('./Mobile3D.jsx'))

const CAMPI_MISURA = [
  { id: 'larghezza', etichetta: 'Larghezza', nomeErrore: 'la larghezza', esempio: 120 },
  { id: 'altezza', etichetta: 'Altezza', nomeErrore: "l'altezza", esempio: 80 },
  { id: 'profondita', etichetta: 'Profondità', nomeErrore: 'la profondità', esempio: 40 },
]

/** Misura da usare nell'anteprima mentre il cliente scrive (riportata nei limiti). */
function misuraAnteprima(testo, { minimaCm, massimaCm }) {
  const pulito = String(testo ?? '').trim().replace(',', '.')
  const n = Number(pulito)
  if (pulito === '' || !Number.isFinite(n) || n <= 0) return null
  return Math.min(Math.max(n, minimaCm), massimaCm)
}

const prezzoBreve = (euro) => formattaEuro(Math.round(euro * 100)).replace(',00', '')

export default function Preventivatore({ listino }) {
  const [misure, setMisure] = useState({ larghezza: '', altezza: '', profondita: '' })
  const [toccati, setToccati] = useState({})
  const [scelte, setScelte] = useState({
    legno: listino.legni[0].nome,
    finitura: listino.finiture[0].nome,
    consegna: listino.consegne[0].nome,
  })
  const [statoPdf, setStatoPdf] = useState({ fase: 'pronto' })
  const vista3d = useRef(null)
  const riepilogo = useRef(null)
  const [riepilogoVisibile, setRiepilogoVisibile] = useState(false)

  const esiti = useMemo(() => {
    const r = {}
    for (const c of CAMPI_MISURA) r[c.id] = validaMisura(misure[c.id], c.nomeErrore, listino.misure)
    return r
  }, [misure, listino])

  const tutteValide = CAMPI_MISURA.every((c) => esiti[c.id].valore !== undefined)
  const qualcunaScritta = CAMPI_MISURA.some((c) => misure[c.id].trim() !== '')

  const preventivo = useMemo(() => {
    if (!tutteValide) return null
    return calcolaPreventivo(
      { larghezza: esiti.larghezza.valore, altezza: esiti.altezza.valore, profondita: esiti.profondita.valore, ...scelte },
      listino,
    )
  }, [tutteValide, esiti, scelte, listino])

  const mostraErrore = (id) =>
    esiti[id].errore && (toccati[id] || misure[id].trim() !== '') ? esiti[id].errore : null
  const ciSonoErroriVisibili = CAMPI_MISURA.some((c) => mostraErrore(c.id))

  // Anteprima 3D: misure scritte (anche incomplete) oppure un mobile di esempio
  const anteprima = {}
  let esempio = false
  for (const c of CAMPI_MISURA) {
    const m = misuraAnteprima(misure[c.id], listino.misure)
    if (m === null) esempio = true
    anteprima[c.id] = m ?? c.esempio
  }
  const voceLegno = listino.legni.find((l) => l.nome === scelte.legno)
  const voceFinitura = listino.finiture.find((f) => f.nome === scelte.finitura)

  // Barra del totale su telefono: nascosta quando il riepilogo è già sullo schermo
  useEffect(() => {
    const el = riepilogo.current
    if (!el || !('IntersectionObserver' in window)) return undefined
    const oss = new IntersectionObserver(([voce]) => setRiepilogoVisibile(voce.isIntersecting), { threshold: 0.25 })
    oss.observe(el)
    return () => oss.disconnect()
  }, [])

  async function scaricaIlPdf() {
    if (!preventivo) return
    setStatoPdf({ fase: 'in-corso' })
    try {
      const { scaricaPdf } = await import('../lib/pdf.js')
      await scaricaPdf({
        preventivo,
        misure: { larghezza: esiti.larghezza.valore, altezza: esiti.altezza.valore, profondita: esiti.profondita.valore },
        scelte,
        immagine: vista3d.current?.istantanea() ?? null,
        sito: window.location.host,
      })
      setStatoPdf({ fase: 'pronto' })
    } catch {
      setStatoPdf({ fase: 'errore' })
    }
  }

  return (
    <div className="layout">
      <form className="modulo" noValidate onSubmit={(e) => e.preventDefault()}>
        <fieldset className="sezione">
          <legend className="sezione__titolo">Misure</legend>
          <p className="sezione__aiuto" id="aiuto-misure">
            In centimetri, ognuna tra {listino.misure.minimaCm} e {listino.misure.massimaCm}.
          </p>
          <div className="metro">
            {CAMPI_MISURA.map((campo) => {
              const errore = mostraErrore(campo.id)
              const idErrore = `errore-${campo.id}`
              return (
                <div className={`metro__campo${errore ? ' metro__campo--errore' : ''}`} key={campo.id}>
                  <label htmlFor={campo.id}>{campo.etichetta}</label>
                  <div className="metro__input">
                    <input
                      id={campo.id}
                      name={campo.id}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder={String(campo.esempio)}
                      value={misure[campo.id]}
                      aria-invalid={errore ? 'true' : 'false'}
                      aria-describedby={errore ? `${idErrore} aiuto-misure` : 'aiuto-misure'}
                      onChange={(e) => setMisure((m) => ({ ...m, [campo.id]: e.target.value }))}
                      onBlur={() => setToccati((t) => ({ ...t, [campo.id]: true }))}
                    />
                    <span aria-hidden="true">cm</span>
                  </div>
                </div>
              )
            })}
          </div>
          {CAMPI_MISURA.map((c) =>
            mostraErrore(c.id) ? (
              <p className="errore" id={`errore-${c.id}`} key={c.id}>
                {mostraErrore(c.id)}
              </p>
            ) : null,
          )}
        </fieldset>

        <fieldset className="sezione">
          <legend className="sezione__titolo">Legno</legend>
          <p className="sezione__aiuto">Prezzo al m² della superficie totale, IVA esclusa.</p>
          <div className="legni">
            {listino.legni.map((l) => (
              <label className="legno" key={l.nome}>
                <input
                  type="radio"
                  name="legno"
                  value={l.nome}
                  checked={scelte.legno === l.nome}
                  onChange={() => setScelte((s) => ({ ...s, legno: l.nome }))}
                />
                <span className="legno__campione" style={{ '--legno': l.colore ?? COLORE_PREDEFINITO }} aria-hidden="true" />
                <span className="legno__nome">{l.nome}</span>
                <span className="legno__prezzo">{prezzoBreve(l.prezzoMq)}/m²</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="sezione">
          <legend className="sezione__titolo">Finitura</legend>
          <div className="pillole">
            {listino.finiture.map((f) => (
              <label className="pillola" key={f.nome}>
                <input
                  type="radio"
                  name="finitura"
                  value={f.nome}
                  checked={scelte.finitura === f.nome}
                  onChange={() => setScelte((s) => ({ ...s, finitura: f.nome }))}
                />
                <span className="pillola__nome">{f.nome}</span>
                <span className="pillola__prezzo">
                  {f.supplementoMq > 0 ? `+${prezzoBreve(f.supplementoMq)}/m²` : 'senza supplemento'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="sezione">
          <legend className="sezione__titolo">Consegna</legend>
          <div className="consegne">
            {listino.consegne.map((c) => (
              <label className="consegna" key={c.nome}>
                <input
                  type="radio"
                  name="consegna"
                  value={c.nome}
                  checked={scelte.consegna === c.nome}
                  onChange={() => setScelte((s) => ({ ...s, consegna: c.nome }))}
                />
                <span className="consegna__nome">{c.nome}</span>
                <span className="consegna__prezzo">{c.costo > 0 ? formattaEuro(Math.round(c.costo * 100)) : 'gratuita'}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>

      <aside className="anteprima">
        <div className="palco">
          <Suspense fallback={<div className="vista3d vista3d--caricamento">Preparo l'anteprima…</div>}>
            <Mobile3D
              ref={vista3d}
              larghezza={anteprima.larghezza}
              altezza={anteprima.altezza}
              profondita={anteprima.profondita}
              colore={voceLegno?.colore ?? COLORE_PREDEFINITO}
              lucidita={voceFinitura?.lucidita ?? 0.2}
              esempio={esempio}
            />
          </Suspense>
          <p className="palco__nota">
            {esempio
              ? 'Mobile di esempio: scrivi le tue misure e cambia forma.'
              : `${scelte.legno}, ${scelte.finitura.toLowerCase()}. Trascina per girarlo.`}
          </p>
        </div>

        <section className="riepilogo" ref={riepilogo} aria-live="polite" aria-labelledby="titolo-riepilogo">
          <h2 id="titolo-riepilogo">Il tuo preventivo</h2>
          {preventivo ? (
            <>
              <p className="riepilogo__totale">
                <span className="riepilogo__cifra">{formattaEuro(preventivo.totaleCent)}</span>
                <span className="riepilogo__dicitura">IVA inclusa</span>
              </p>
              <dl className="riepilogo__righe">
                <div>
                  <dt>Superficie totale</dt>
                  <dd>{formattaMq(preventivo.superficieMq)} m²</dd>
                </div>
                <div>
                  <dt>Mobile, {formattaEuro(preventivo.prezzoMq * 100)}/m²</dt>
                  <dd>{formattaEuro(preventivo.mobileCent)}</dd>
                </div>
                <div>
                  <dt>Consegna</dt>
                  <dd>{formattaEuro(preventivo.consegnaCent)}</dd>
                </div>
                <div className="riepilogo__forte">
                  <dt>Imponibile (IVA esclusa)</dt>
                  <dd>{formattaEuro(preventivo.imponibileCent)}</dd>
                </div>
                <div>
                  <dt>IVA {Math.round(preventivo.aliquotaIva * 100)}%</dt>
                  <dd>{formattaEuro(preventivo.ivaCent)}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="bottone"
                onClick={scaricaIlPdf}
                disabled={statoPdf.fase === 'in-corso'}
              >
                {statoPdf.fase === 'in-corso' ? 'Preparo il PDF…' : 'Scarica il preventivo in PDF'}
              </button>
              {statoPdf.fase === 'errore' && (
                <p className="errore" role="alert">
                  Non è stato possibile creare il PDF. Riprova; se succede ancora, prova da un altro browser.
                </p>
              )}
            </>
          ) : (
            <p className={`riepilogo__vuoto${ciSonoErroriVisibili ? ' riepilogo__vuoto--errore' : ''}`}>
              {ciSonoErroriVisibili
                ? 'Correggi le misure segnate in rosso per vedere il prezzo.'
                : qualcunaScritta
                  ? 'Completa tutte e tre le misure per vedere il prezzo.'
                  : 'Scrivi larghezza, altezza e profondità per vedere il prezzo.'}
            </p>
          )}
        </section>
      </aside>

      {preventivo && !riepilogoVisibile && (
        <button
          type="button"
          className="barra-totale"
          onClick={() => riepilogo.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          <span>Totale IVA inclusa</span>
          <strong>{formattaEuro(preventivo.totaleCent)}</strong>
          <span className="barra-totale__azione">Vedi dettaglio</span>
        </button>
      )}
    </div>
  )
}
